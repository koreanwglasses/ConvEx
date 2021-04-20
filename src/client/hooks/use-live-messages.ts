import { useEffect, useRef, useState } from "react";
import { Message } from "../../endpoints";
import { messageManager } from "../models/discord";
import * as Sockets from "../sockets";
import { useAsyncEffect } from "./utility-hooks";

export const useLiveMessages = ({
  guildId,
  channelId,
  onNewMessage,
}: {
  guildId: string;
  channelId: string;
  onNewMessage?: (message: Message) => void;
}) => {
  const messageManagerRef = useRef(messageManager({ guildId, channelId }));

  const [oldest, setOldest] = useState<string>();
  const [newest, setNewest] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);

  const [paused, setPaused] = useState(false);

  useAsyncEffect(async () => {
    const messages = await messageManagerRef.current.fetchRecent();
    setOldest(messages[messages.length - 1].id);
    setNewest(messages[0].id);
  }, []);

  useAsyncEffect(async () => {
    if (oldest && newest) {
      setMessages(await messageManagerRef.current.fetchBetween(oldest, newest));
    }
  }, [oldest, newest]);

  useEffect(() => {
    const subscription = Sockets.subscribeToMessages(
      { guildId, channelId },
      (message) => {
        if (!paused) setNewest(message.id);
        onNewMessage?.(message);
      }
    );
    return () => subscription.unsubscribe();
  }, [onNewMessage, paused, setNewest]);

  return [
    {
      messages,
      hasReachedBeginning: messageManagerRef.current?.hasReachedBeginning,
    },
    {
      async setPaused(value: boolean) {
        setPaused(value);
        if (paused && !value) {
          const messages = await messageManagerRef.current.fetchRecent(1);
          setNewest(messages[0].id);
        }
      },
      async expand() {
        const messages = await messageManagerRef.current.fetchBefore(oldest);
        setOldest(messages[messages.length - 1].id);
      },
    },
  ] as const;
};
