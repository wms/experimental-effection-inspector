/**
 * BIG TODO: Duplicated from websocket module on debuggee side; make this a common module
 */
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
