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

export const fetchMessages = async ({
  guildId,
  channelId,
  limit = 100,
  before,
  after,
}: {
  guildId: string;
  channelId: string;
  limit?: number;
  before?: string;
  after?: string;
}) => {
  if (before && after)
    throw new Error("AT MOST ONE of `before` and `after` must be defined");

  const key = JSON.stringify({ guildId, channelId });
  if (!messageCache.has(key)) messageCache.set(key, []);

  let messages = messageCache.get(key);

  const pageSize = 100;

  if (before) {
    while (true) {
      const lastMessage = messages.length && messages[messages.length - 1];

      const idx = messages.findIndex(({ id }) => id === before);
      if (idx !== -1 && messages.length - idx - 1 >= limit) break;

      const oldMessages = await api(routes.apiListMessages, {
        guildId,
        channelId,
        limit: pageSize,
        before: lastMessage?.id,
      });

      messages = [...messages, ...oldMessages];

      if (oldMessages.length < pageSize)
        /* reached beginning of channel */ break;
    }
  } else {
    while (true) {
      const firstMessage = messages[0];

      if (after) {
        const idx = messages.findIndex(({ id }) => id === after);
        if (idx !== -1 && idx >= limit) break;
      }

      const newMessages = await api(routes.apiListMessages, {
        guildId,
        channelId,
        limit: pageSize,
        after: firstMessage?.id,
      });

      messages = [...newMessages, ...messages];

      if (newMessages.length < pageSize) /* reached end of channel */ break;
    }
  }

  messageCache.set(key, messages);

  if (before) {
    const idx = messages.findIndex(({ id }) => id === before);
    return messages.slice(idx + 1, Math.min(idx + 1 + limit, messages.length));
  } else if (after) {
    const idx = messages.findIndex(({ id }) => id === after);
    return messages.slice(Math.max(idx - limit, 0), idx);
  } else {
    return messages.slice(0, Math.min(limit, messages.length));
  }
};

export const fetchMessagesByTime = async ({
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

    const oldMessages = await fetchMessages({
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

    const newMessages = await fetchMessages({
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
