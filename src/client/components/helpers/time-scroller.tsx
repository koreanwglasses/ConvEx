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
  }, []);

  /* These states control the timespan shown in the graph */
  const [maxTime, setMaxTime] = useState(Date.now());
  const [timeSpan, setTimeSpan] = useState(1000 * 60 * 60);

  /* This state stores the messages within the timespan */
  const [messages, setMessages] = useState<Message[]>([]);

  /* fetches messages within timespan and updates state */
  const refetch = async ({
    maxTime,
    timeSpan,
  }: {
    maxTime: number;
    timeSpan: number;
  }) => {
    setMessages(
      await messageManager({ guildId, channelId }).filterByTime(
        maxTime - timeSpan,
        maxTime
      )
    );
  };

  /* These lines handle realtime/autoscrolling */
  const [autoScroll, setAutoScroll] = useState(true);
  useEffect(() => {
    if (autoScroll) {
      const rc = setInterval(() => {
        setMaxTime(Date.now());
      }, 1000);
      return () => clearInterval(rc);
    }
  }, [autoScroll]);

  useEffect(() => {
    if (autoScroll) {
      const subscription = Sockets.subscribeToMessages(
        { guildId, channelId },
        (message) => {
          setMessages([message, ...messages]);
        }
      );
      return () => subscription.unsubscribe();
    }
  }, [messages, autoScroll]);

  /* Perform an initial fetch if autoscroll is enabled */
  useEffect(() => {
    if (autoScroll) refetch({ maxTime, timeSpan });
  }, []);

  /* This allows the user to manually scroll to different times*/
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const newMaxTime = maxTime + e.deltaY * timeSpan * 0.001;
      if (newMaxTime >= Date.now()) {
        setAutoScroll(true);
        if (!autoScroll) refetch({ maxTime: Date.now(), timeSpan });
      } else {
        setMaxTime(newMaxTime);
        setAutoScroll(false);
      }
    };
    containerRef.current.addEventListener("wheel", onWheel);
    return () => containerRef.current.removeEventListener("wheel", onWheel);
  }, [timeSpan, maxTime, autoScroll]);

  /* These lines fetch the relevant messages and adds new messages as they come
   * in */
  useAsyncEffect(async () => {
    if (!autoScroll) {
      refetch({ maxTime, timeSpan });
    }
  }, [maxTime, timeSpan, autoScroll]);

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
