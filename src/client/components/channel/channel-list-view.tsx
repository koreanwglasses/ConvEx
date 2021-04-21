import React from "react";
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
  /**
   * This component will handle scrolling/loading messages for us. See below for
   * more on how to access the messages.
   */
  <ListScroller
    guildId={guildId}
    channelId={channelId}
    className={styles.scrollContainer}
  >
    <MessageList showHeatmap={showHeatmap} />
  </ListScroller>
);

const MessageList = ({ showHeatmap }: { showHeatmap: boolean }) => {
  /**
   * Use the `useMessages` hook to retrieve the messages fetched by the ListScroller
   */
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
