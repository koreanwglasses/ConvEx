import { Message, routes } from "../../endpoints";
import { cached } from "../../utils";
import { api } from "../api";
import * as Sockets from "../sockets";

export const fetchUser = cached((userId: string) =>
  api(routes.apiUser, { userId })
);

export const fetchChannel = cached(
  ({ guildId, channelId }: { guildId: string; channelId: string }) =>
    api(routes.apiFetchChannel, { guildId, channelId })
);

// const messageCache = new Map<string, Message[]>();
// export const fetchMessages = async ({
//   guildId,
//   channelId,
//   createdAfter,
//   before,
//   limit,
// }: {
//   guildId: string;
//   channelId: string;
//   createdAfter?: number;
//   before?: string;
//   limit?: number;
// }) => {
//   const key = JSON.stringify({ guildId, channelId });
//   if (!messageCache.has(key)) messageCache.set(key, []);

//   let messages = messageCache.get(key);

//   const pageSize = 100;

//   while (true) {
//     const lastMessage = messages.length && messages[messages.length - 1];

//     if (lastMessage?.createdTimestamp <= createdAfter) break;

//     const oldMessages = await api(routes.apiListMessages, {
//       guildId,
//       channelId,
//       limit: pageSize,
//       before: lastMessage?.id,
//     });

//     messages = [...messages, ...oldMessages];

//     if (oldMessages.length < pageSize) /* reached beginning of channel */ break;
//   }

//   if (createdAfter) {
//     while (true) {
//       const firstMessage = messages[0];

//       const newMessages = await api(routes.apiListMessages, {
//         guildId,
//         channelId,
//         limit: pageSize,
//         after: firstMessage?.id,
//       });

//       messages = [...newMessages, ...messages];

//       if (newMessages.length < pageSize) /* reached end of channel */ break;
//     }

//     messageCache.set(key, messages);

//     return messages.filter(
//       (message) => createdAfter <= message.createdTimestamp
//     );
//   }
// };

export const MessageCollection = ({
  guildId,
  channelId,
}: {
  guildId: string;
  channelId: string;
}) => {
  const messages: Message[] = [];
  let newMessages: Message[] = [];

  let messageHandler_: (message: Message) => void;
  Sockets.listenForMessages({ guildId, channelId }, (message) => {
    newMessages.unshift(message);
    if (messageHandler_) messageHandler_(message);
  });

  const expand = async (limit = 10) => {
    const lastMessage = messages.length && messages[messages.length - 1];
    if (lastMessage === null) /* already at beginning */ return 0;

    const olderMessages = await api(routes.apiListMessages, {
      guildId,
      channelId,
      limit,
      before: lastMessage?.id,
    });

    messages.push(...olderMessages);

    if (olderMessages.length < limit) {
      /* reached beginning of channel */
      messages.push(null);
    }

    return olderMessages.length;
  };

  const flushNewMessages = () => {
    messages.unshift(...newMessages);
    newMessages = [];
  };

  const setMessageHandler = (messageHandler?: (message: Message) => void) => {
    messageHandler_ = messageHandler;
  };

  return { expand, messages, flushNewMessages, setMessageHandler } as const;
};
