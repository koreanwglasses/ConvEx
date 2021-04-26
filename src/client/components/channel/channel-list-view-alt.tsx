import React from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { ChartContainer, useChartSize } from "../charts/chart-container";
import {
  MessageScroller,
  useAxes,
  useMessages,
} from "../charts/message-scroller";
import { MessageView } from "../message/message-view";
import styles from "./channel-list-view.module.scss";

export const ChannelListView = ({
  guildId,
  channelId,
}: {
  guildId: string;
  channelId: string;
  showHeatmap?: boolean;
}) => (
  <MessageScroller
    guildId={guildId}
    channelId={channelId}
    defaultYAxis={{ type: "point", offset: 0, step: 80 }}
  >
    <ChartContainer>
      <MessageList />
    </ChartContainer>
  </MessageScroller>
);

const MessageList = () => {
  const { width, height } = useChartSize();
  const padding = { top: 20, bottom: 20 };

  const { y, yAxis } = useAxes([padding.top, height - padding.bottom]);

  const messages = useMessages();
  const analyses = useAnalyses(messages);
  return (
    <div
      className={styles.listContainer}
      style={{ position: "relative", overflow: "hidden", width, height }}
    >
      {messages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          analysis={analyses?.get(message.id)}
          style={{
            top: y(message),
            position: "absolute",
            width,
            height: yAxis.type === "point" && yAxis.step,
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
};
