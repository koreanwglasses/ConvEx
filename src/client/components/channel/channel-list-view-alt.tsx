import React from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { AnalysesBars } from "../charts/analysis-bars";
import { ChartContainer, useChartSize } from "../charts/chart-container";
import {
  MessageScroller,
  useAxes,
  useMessages,
} from "../charts/message-scroller";
import { YAxis } from "../charts/y-axis";
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
    <YAxis />
    <ChartContainer>
      <MessageList />
    </ChartContainer>
    <YAxis compact />
    <AnalysesBars />
  </MessageScroller>
);

const MessageList = () => {
  const { width, height } = useChartSize();
  const padding = { top: 20, bottom: 20 };

  const { y, yAxis } = useAxes([padding.top, height - padding.bottom]);

  const messages = useMessages();
  const analyses = useAnalyses(messages);

  const messageHeight = yAxis.type === "point" ? yAxis.step - 5 : 50;
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
            top: y?.(message) - 40,
            position: "absolute",
            width,
            height: messageHeight,
            boxSizing: "border-box",
            borderRadius: messageHeight / 2,
          }}
        />
      ))}
    </div>
  );
};
