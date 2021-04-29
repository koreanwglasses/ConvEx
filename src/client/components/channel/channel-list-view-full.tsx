import React from "react";
import { AnalysesBars } from "../charts/analysis-bars";
import { MessageList } from "../charts/message-list";
import { MessageScroller } from "../charts/message-scroller";
import { YAxis } from "../charts/y-axis";

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
    defaultYAxis={{ type: "point", offset: 0, step: 60 }}
    showToolbar
  >
    <YAxis />
    <MessageList />
    <YAxis compact />
    <AnalysesBars />
  </MessageScroller>
);
