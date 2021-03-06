import { makeStyles } from "@material-ui/core";
import { Result } from "perspective-api-client";
import React, { useMemo, useRef } from "react";
import { compareTuple } from "../../../common/utils";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
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
  const { y, transitionAlpha, transitionPivot, yAxis } = useAxes([
    padding.top,
    height - padding.bottom,
  ]);

  const messages = useMessages();
  const analyses = useAnalyses(messages);

  const [focus] = useFocus();

  /* Remove messages that run into each other */
  const computeBounds = (message: Message) => {
    const y_ = y(message);
    const top = y_ - messageHeight / 2;
    const bottom = y_ + messageHeight / 2;
    return [top, bottom] as const;
  };
  const overlap = (message1: Message, message2: Message) => {
    const [top1, bottom1] = computeBounds(message1);
    const [top2, bottom2] = computeBounds(message2);
    const x = (bottom2 - top1) / messageHeight;
    const y = (bottom1 - top2) / messageHeight;

    if (x < 0 || y < 0) return 0;
    return Math.min(x, y);
  };
  const score = (message: Message) =>
    analyses?.get(message.id)?.result?.attributeScores.TOXICITY.summaryScore
      .value ?? 0;

  const overlapThreshold = 0.2;

  const messagesToShow = useMemo(() => {
    if (yAxis.type === "point" && transitionAlpha === 1) return messages;

    const messagesToShow: Message[] = [];
    messages.forEach((message) => {
      if (!messagesToShow.length) {
        messagesToShow.push(message);
        return;
      }
      const lastMessage = messagesToShow[messagesToShow.length - 1];
      if (overlap(message, lastMessage) < overlapThreshold) {
        messagesToShow.push(message);
        return;
      }

      const isFocused = message.authorID === focus?.authorID;
      const isLastFocused = lastMessage.authorID === focus?.authorID;
      if (
        compareTuple(
          [isFocused, score(message)],
          [isLastFocused, score(lastMessage)]
        ) > 0
      ) {
        messagesToShow[messagesToShow.length - 1] = message;
      }
    });
    return messagesToShow;
  }, [
    messages[0]?.id,
    messages.length && messages[messages.length - 1].id,
    y,
    analyses,
    overlapThreshold,
    transitionAlpha,
    focus,
  ]);

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
