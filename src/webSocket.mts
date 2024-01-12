import {
  Operation,
  action,
  each,
  ensure,
  spawn,
  suspend,
  useScope,
} from "effection";
import { WebSocketServer } from "ws";
import { InspectorEvent, InspectorEventSignal } from "./inspect.mjs";

export function* useWebSocket(events: InspectorEventSignal): Operation<void> {
  const server = new WebSocketServer({ port: 8081 });
  yield* ensure(function* () {
    yield* action(function* (resolve, reject) {
      server.close((err) => (err ? reject(err) : resolve(undefined)));
    });
  });

  const buffer: SerializedEvent[] = [];

  // Buffer received events
  yield* spawn(function* () {
    for (const event of yield* each(events)) {
      buffer.push(serializeEvent(event));
      yield* each.next();
    }
  });

  const scope = yield* useScope();
  server.on("connection", (client) => {
    // When a client connects, send the buffered events immediately
    client.send(JSON.stringify(["events", buffer]));

    // Whenever a new event is received, send it to the client
    scope.run(function* () {
      // Explicitly close each connection when stopping
      yield* ensure(() => client.close());

      for (const event of yield* each(events)) {
        client.send(JSON.stringify(["event", serializeEvent(event)]));
        yield* each.next();
      }
    });
  });
}

export const serializeEvent = (event: InspectorEvent): SerializedEvent => {
  const { at, type } = event;
  const frame = event.frame.id;

  if (type === "CREATE_CHILD") {
    return { at, type, frame, child: event.child.id };
  }

  if (type === "INSTRUCTION") {
    return {
      at,
      type,
      frame,
      seq: event.seq,
      instruction: event.instruction.name || "<anonymous>",
    };
  }

  if (type === "INSTRUCTION_FRAME") {
    return {
      at,
      type,
      frame,
      seq: event.seq,
      child: event.child.id,
    };
  }

  if (type === "INSTRUCTION_RESULT") {
    return {
      at,
      type,
      frame,
      seq: event.seq,
      result: event.result, // @todo: serialize here?
    };
  }

  if (type === "OP_START") {
    return {
      type,
      at,
      frame,
      op: event.op.name || "<anonymous>",
    };
  }

  throw new Error("Unserializable Event", { cause: event });
};

export type SerializedEvent = {
  at: number;
  frame: number;
} & (
  | {
      type: "CREATE_CHILD";
      child: number;
    }
  | {
      type: "OP_START";
      op: string;
    }
  | {
      type: "INSTRUCTION";
      seq: number;
      instruction: string;
    }
  | {
      type: "INSTRUCTION_RESULT";
      seq: number;
      result: unknown;
    }
  | {
      type: "INSTRUCTION_FRAME";
      seq: number;
      child: number;
    }
);
