import { Message, routes } from "../../endpoints";
import { api } from "../api";
import { useAwaitTo } from "./utility-hooks";

export const useAnalyses = (
  guildId: string,
  channelId: string,
  messages: Message[]
) =>
  useAwaitTo(
    () =>
      messages?.length &&
      api(routes.apiAnalyze, {
        guildId,
        channelId,
        messageIds: messages.map((messages) => messages.id),
      }),
    [messages]
  );
