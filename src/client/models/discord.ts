import { Message, routes } from "../../endpoints";
import { cached } from "../../utils";
import { api } from "../api";

export const fetchUser = cached((userId: string) =>
  api(routes.apiUser, { userId })
);

export const fetchChannel = cached(
  ({ guildId, channelId }: { guildId: string; channelId: string }) =>
    api(routes.apiFetchChannel, { guildId, channelId })
);

const messageCache = new Map<string, Message[]>();
const fetchMessagesByTime = async ({
  guildId,
  channelId,
  createdAfter,
  createdBefore,
}: {
  guildId: string;
  channelId: string;
  createdAfter: number;
  createdBefore: number;
}) => {
  const key = JSON.stringify({ guildId, channelId });
  if (!messageCache.has(key)) messageCache.set(key, []);

  let messages = messageCache.get(key);

  const pageSize = 100;

  while (true) {
    const lastMessage = messages.length && messages[messages.length - 1];

    if (lastMessage?.createdTimestamp <= createdAfter) break;

    const oldMessages = await api(routes.apiListMessages, {
      guildId,
      channelId,
      limit: pageSize,
      before: lastMessage?.id,
    });

    messages = [...messages, ...oldMessages];

    if (oldMessages.length < pageSize) /* reached beginning of channel */ break;
  }

  while (true) {
    const firstMessage = messages[0];

    if (firstMessage?.createdTimestamp >= createdBefore) break;

    const newMessages = await api(routes.apiListMessages, {
      guildId,
      channelId,
      limit: pageSize,
      after: firstMessage?.id,
    });

    messages = [...newMessages, ...messages];

    if (newMessages.length < pageSize) /* reached end of channel */ break;
  }

  messageCache.set(key, messages);

  return messages.filter(
    (message) =>
      createdAfter <= message.createdTimestamp &&
      message.createdTimestamp <= createdBefore
  );
};
