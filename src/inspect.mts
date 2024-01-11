import {
  Frame,
  Operation,
  Signal,
  createSignal,
  each,
  getframe,
  spawn,
  Instruction,
  Task,
  suspend,
} from "effection";
import { useWebSocket } from "./webSocket.mjs";

// @todo: pass args thru
export function inspect(op: (...args: any[]) => Operation<void>) {
  return function* () {
    const events: InspectorEventSignal = createSignal();
    yield* spawn(function* () {
      yield* useWebSocket(events);
      yield* suspend();
    });

    yield* spawn(function* bar() {
      const taskMap = new Map<Task<unknown>, Frame>();

      for (let event of yield* each(events)) {
        if (event.type === "CREATE_CHILD") {
          // todo: delete entry when child frame is destroyed
          taskMap.set(event.child.getTask(), event.child);
        }

        // If Instruction returned a Task, use it determine which Frame it 'owns'
        if (event.type === "INSTRUCTION_RESULT" && isTask(event.result)) {
          const child = taskMap.get(event.result);
          if (child) {
            events.send({
              at: Date.now(),
              type: "INSTRUCTION_FRAME",
              frame: event.frame,
              seq: event.seq,
              child,
            });
          }
        }

        yield* each.next();
      }
    });

    const rootFrame = yield* getframe();
    return yield* inspectFrame(rootFrame, events, op);
  };
}

export function* inspectFrame(
  frame: Frame,
  signal: InspectorEventSignal,
  op: () => Operation<any>
) {
  const { createChild } = frame;

  frame.createChild = (op) => {
    const child: Frame<any> = createChild(function* Wrapper() {
      return yield* tapOp(child, signal, op);
    });

    signal.send({ at: Date.now(), type: "CREATE_CHILD", frame, child });

    inspectFrame(child, signal, op);

    return child;
  };

  return yield* tapOp(frame, signal, op);
}

export function* tapOp(
  frame: Frame,
  signal: InspectorEventSignal,
  op: () => Operation<any>
): Generator<Instruction, any, any> {
  signal.send({
    at: Date.now(),
    type: "OP_START",
    frame,
    op,
  });

  // I have no idea what I'm doing...
  const iterator = op()[Symbol.iterator]();
  let seq = 0;
  let next = iterator.next();
  while (!next.done) {
    signal.send({
      at: Date.now(),
      type: "INSTRUCTION",
      frame,
      seq,
      instruction: next.value,
    });

    const result = yield next.value;

    signal.send({
      at: Date.now(),
      type: "INSTRUCTION_RESULT",
      frame,
      seq,
      result,
    });

    next = iterator.next(result);
    seq += 1;
  }

  return next.value;
}

const isTask = (obj: unknown): obj is Task<unknown> =>
  obj instanceof Object &&
  Symbol.toStringTag in obj &&
  obj[Symbol.toStringTag] === "Task";

export type InspectorEvent = {
  at: number;
  frame: Frame;
} & (
  | {
      type: "CREATE_CHILD";
      child: Frame;
    }
  | {
      type: "OP_START";
      op: () => Operation<any>;
    }
  | {
      type: "INSTRUCTION";
      seq: number;
      instruction: Instruction;
    }
  | {
      type: "INSTRUCTION_RESULT";
      seq: number;
      result: unknown;
    }
  | {
      type: "INSTRUCTION_FRAME";
      seq: number;
      child: Frame;
    }
);

export type InspectorEventSignal = Signal<InspectorEvent, never>;
