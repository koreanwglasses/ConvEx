import React from "react";
import { MessageList } from "../charts/message-list";
import { MessageScroller } from "../charts/message-scroller";

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
    height={600}
  >
    <MessageList />
  </MessageScroller>
);
