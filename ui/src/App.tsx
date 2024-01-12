import SturdyWebSocket from "sturdy-websocket";
import { Fragment, useEffect, useState } from "react";

import { Tree } from "./Tree";
import { Scrubber } from "./Scrubber";

import { SerializedEvent } from "./types";

export const App = () => {
  const [events, setEvents] = useState<SerializedEvent[]>([]);
  const [scrub, setScrub] = useState(0);
  const [treeEvents, setTreeEvents] = useState<SerializedEvent[]>([]);

  useEffect(() => {
    const ws = new SturdyWebSocket("ws://localhost:8081");

    ws.addEventListener("message", ({ data }) => {
      const payload = JSON.parse(data);
      if (!(payload instanceof Array)) {
        console.error("invalid payload", payload);
        return;
      }

      if (payload[0] === "events") {
        const backlog = payload[1];
        console.info("got message backlog", backlog);
        setEvents(backlog);
        setScrub(backlog.length);
        return;
      }

      if (payload[0] === "event") {
        const event = payload[1];
        console.info("got new event", event);
        setEvents((events) => events.concat(event));
      }
    });

    ws.addEventListener("down", () => {
      console.warn("ws connection is down");
    });

    ws.addEventListener("reopen", () => {
      console.info("ws connection is back up");
    });

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    setTreeEvents(events.slice(0, scrub));
  }, [events, scrub]);

  return (
    <Fragment>
      <Tree events={treeEvents} />
      <Scrubber events={events} value={scrub} onChange={setScrub} />
    </Fragment>
  );
};
