import * as React from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { ListScroller, useMessages } from "../helpers/list-scroller";
import { MessageView } from "../message/message-view";
import styles from "./channel-list-view.module.scss";

export const ChannelListView = ({
  guildId,
  channelId,
  showHeatmap = true,
}: {
  guildId: string;
  channelId: string;
  showHeatmap?: boolean;
}) => (
  <ListScroller
    guildId={guildId}
    channelId={channelId}
    className={styles.scrollContainer}
  >
    <MessageList showHeatmap={showHeatmap} />
  </ListScroller>
);

const MessageList = ({ showHeatmap }: { showHeatmap: boolean }) => {
  const messages = useMessages();
  const analyses = showHeatmap && useAnalyses(messages);
  return (
    <div className={styles.listContainer}>
      {messages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          analysis={analyses?.get(message.id)}
        />
      ))}
    </div>
  );
};
