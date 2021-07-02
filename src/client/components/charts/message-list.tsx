import { makeStyles } from "@material-ui/core";
import { Result } from "perspective-api-client";
import React, { useRef } from "react";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { useGroupedMessages } from "../common/aggregator";
import { MessageView } from "../message/message-view";
import { ChartContainer, useChartSize } from "./chart-container";
import {
  useAxes,
  useDispatch,
  useFocus,
  useMessages,
} from "./message-scroller";

const useStyles = makeStyles((theme) => ({
  listContainer: {
    position: "relative",
    overflow: "hidden",
  },
}));

export const MessageList = () => (
  <ChartContainer>
    <Chart />
  </ChartContainer>
);

const padding = { top: 20, bottom: 20 };
const messageHeight = 56;

const Chart = () => {
  const { height } = useChartSize();
  const { y } = useAxes([padding.top, height - padding.bottom]);

  const messages = useMessages();
  const analyses = useAnalyses(messages);

  const overlapThreshold = 0.2;

  const messagesToShow = useGroupedMessages({
    y,
    messageHeight,
    overlapThreshold,
  }).map((group) => group.top);

  return <FullMessageList messages={messagesToShow} analyses={analyses} />;
};

const FullMessageList = ({
  messages,
  analyses,
}: {
  messages: Message[];
  analyses: Map<
    string,
    {
      error: Error;
      result: Result;
    }
  >;
}) => {
  const classes = useStyles();

  const { width, height } = useChartSize();
  const { y, yAxis, transitionAlpha } = useAxes([
    padding.top,
    height - padding.bottom,
  ]);
  const { setYAxisType } = useDispatch();

  const removedMessages = useRef(new Map<Message, NodeJS.Timeout>());
  const prevMessages = useRef(new Set<Message>());
  const currentMessages = new Set(messages);

  /** Determine which messages were removed and add to remove list */
  if (transitionAlpha >= 1) {
    prevMessages.current.forEach((message) => {
      if (
        !currentMessages.has(message) &&
        !removedMessages.current.has(message)
      ) {
        removedMessages.current.set(
          message,
          setTimeout(() => {
            removedMessages.current.delete(message);
          }, 250)
        );
      }
    });
  } else {
    removedMessages.current.forEach(clearTimeout);
    removedMessages.current.clear();
  }

  /** Determine which removed messages are back */
  removedMessages.current.forEach((timeout, message) => {
    if (currentMessages.has(message)) {
      clearTimeout(timeout);
      removedMessages.current.delete(message);
    }
  });

  prevMessages.current = currentMessages;

  const [focus, setFocus] = useFocus();
  return (
    <div className={classes.listContainer} style={{ width, height }}>
      {[...messages, ...removedMessages.current.keys()]
        .sort((a, b) => +a.id - +b.id)
        .map((message) => (
          <MessageView
            key={message.id}
            message={message}
            analysis={analyses?.get(message.id)}
            style={{
              top: y?.(message) - messageHeight / 2,
              position: "absolute",
              width,
              opacity: removedMessages.current.has(message)
                ? 0
                : !focus || focus.authorID === message.authorID
                ? 1
                : 0.1,
              pointerEvents: removedMessages.current.has(message)
                ? "none"
                : undefined,
              zIndex: removedMessages.current.has(message) ? -1 : undefined,
            }}
            onDoubleClick={() => {
              setYAxisType(
                yAxis.type === "point" ? "time" : "point",
                message.id
              );
            }}
            onMouseEnter={() => setFocus(message)}
            onMouseLeave={() => setFocus()}
          />
        ))}
    </div>
  );
};
