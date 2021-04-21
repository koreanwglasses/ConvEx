import * as Perspective from "perspective-api-client";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { useAsyncEffect } from "../../hooks/utility-hooks";
import { messageManager } from "../../models/discord";
import * as Sockets from "../../sockets";

const TimeScrollerContext = React.createContext<{
  width: number;
  height: number;
  maxTime: number;
  timeSpan: number;
  data: (readonly [Message, Perspective.Result])[];
}>(null);

export const useChartProps = () => useContext(TimeScrollerContext);

export const TimeScroller = ({
  channelId,
  guildId,
  children,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
}>) => {
  /* These lines are for dynamically setting the width/height of the chart */
  const [[width, height], setSize] = useState([0, 0]);

  useEffect(() => {
    setSize([
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    ]);
  }, []);

  const containerRef = useRef<HTMLDivElement>();
  useEffect(() => {
    const updateSize = () => {
      setSize([
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      ]);
    };
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [setSize]);

  /* These lines control the timespan shown in the graph
   * Currently, the time span is continuously updating to reflect the current
   * time */
  const [maxTime, setMaxTime] = useState(Date.now());
  const [timeSpan, setTimeSpan] = useState(1000 * 60 * 60);
  useEffect(() => {
    const rc = setInterval(() => {
      setMaxTime(Date.now());
    }, 1000);
    return () => clearInterval(rc);
  }, [setMaxTime]);

  /* These lines fetch the relevant messages and adds new messages as they come
   * in. Currently, if the timespan changes, the messages does not change. */
  const [messages, setMessages] = useState<Message[]>([]);
  useAsyncEffect(async () => {
    setMessages(
      await messageManager({ guildId, channelId }).filterByTime(
        maxTime - timeSpan,
        maxTime
      )
    );
  }, []);
  useEffect(() => {
    const subscription = Sockets.subscribeToMessages(
      { guildId, channelId },
      (message) => {
        setMessages([message, ...messages]);
      }
    );
    return () => subscription.unsubscribe();
  }, [messages, setMessages]);

  /* The analyzes the messages retrieved above. The result automatically updates
   * when messages updates */
  const analyses = useAnalyses(messages);

  /* This compiles the messages and analyses in a data format that is then
   * passed into the chart */
  const data = messages?.map(
    (message) => [message, analyses?.get(message.id)?.result] as const
  );

  return (
    <TimeScrollerContext.Provider
      value={{ width, height, maxTime, timeSpan, data }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "75vh" }}>
        {children}
      </div>
    </TimeScrollerContext.Provider>
  );
};
