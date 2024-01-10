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
} from "effection";

// @todo: pass args thru
export function inspect(op: (...args: any[]) => Operation<void>) {
  return function* () {
    const events = createSignal<InspectorEvent, never>();

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
              type: "INSTRUCTION_FRAME",
              frame: event.frame,
              seq: event.seq,
              child,
            });
          }
        }

        console.log("***", event);
        yield* each.next();
      }
    });

    const rootFrame = yield* getframe();
    return yield* inspectFrame(rootFrame, events, op);
  };
}

export function* inspectFrame(
  frame: Frame,
  signal: Signal<InspectorEvent, never>,
  op: () => Operation<any>
) {
  const { createChild } = frame;

  frame.createChild = (op) => {
    const child: Frame<any> = createChild(function* Wrapper() {
      return yield* tapOp(child, signal, op);
    });

    signal.send({ type: "CREATE_CHILD", frame, child });

    inspectFrame(child, signal, op);

    return child;
  };

  return yield* tapOp(frame, signal, op);
}

export function* tapOp(
  frame: Frame,
  signal: Signal<InspectorEvent, never>,
  op: () => Operation<any>
): Generator<Instruction, any, any> {
  signal.send({
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
      type: "INSTRUCTION",
      frame,
      seq,
      instruction: next.value,
    });

    const result = yield next.value;

    signal.send({
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

export type InspectorEvent =
  | {
      type: "CREATE_CHILD";
      frame: Frame;
      child: Frame;
    }
  | {
      type: "OP_START";
      frame: Frame;
      op: () => Operation<any>;
    }
  | {
      type: "INSTRUCTION";
      frame: Frame;
      seq: number;
      instruction: Instruction;
    }
  | {
      type: "INSTRUCTION_RESULT";
      frame: Frame;
      seq: number;
      result: unknown;
    }
  | {
      type: "INSTRUCTION_FRAME";
      frame: Frame;
      seq: number;
      child: Frame;
    };
