import { Tree as RTree, TreeApi } from "react-arborist";
import { SerializedEvent } from "./types";
import { useEffect, useMemo } from "react";

export const Tree = ({ events }: Props) => {
  const tree = useMemo(() => eventsToTree(events), [events]);

  return <RTree data={tree} />;
};

export const eventsToTree = (events: SerializedEvent[]): TreeItem[] => {
  // the first `op_start` event should tell us the root frame ID
  const root = events.find((event) => event.type === "OP_START");
  if (!root || root.type !== "OP_START") {
    return [];
  }

  const instructionsOf = (frameId: number) =>
    events.flatMap((event) => {
      if (event.type === "INSTRUCTION" && event.frame === frameId) {
        return event;
      }

      return [];
    });

  const childFramesOf = (frameId: number, seq: number) =>
    events.flatMap((event) => {
      if (
        event.type === "INSTRUCTION_FRAME" &&
        event.frame === frameId &&
        event.seq === seq
      ) {
        return event;
      }

      return [];
    });

  const toTreeItem = (event: SerializedEvent): TreeItem[] => {
    if (event.type === "OP_START") {
      return [
        {
          id: event.frame.toString(),
          name: event.op,
          children: instructionsOf(event.frame).flatMap(toTreeItem),
        },
      ];
    }

    if (event.type === "INSTRUCTION") {
      return [
        {
          id: `${event.frame}:${event.seq}`,
          name: event.instruction,
          children: childFramesOf(event.frame, event.seq)
            .map((iFrame) => {
              return events.find(
                (event) =>
                  event.type === "OP_START" && event.frame === iFrame.child
              )!;
            })
            .flatMap(toTreeItem),
        },
      ];
    }

    return [];
  };

  return toTreeItem(root);
};

export type Props = {
  events: SerializedEvent[];
};

export type TreeItem = {
  id: string;
  name: string;
  children: TreeItem[];
};
