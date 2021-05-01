import { Result } from "perspective-api-client";
import { Message, routes } from "../../endpoints";
import { api } from "../api";

const analysisCache = new Map<
  string,
  Promise<{ error: Error; result: Result }>
>();
export const analyzeMessages = async (messages: Message[]) => {
  const uncached = messages.filter((message) => !analysisCache.has(message.id));
  if (uncached.length) {
    const sliceSize = 100;
    for (let i = 0; i < uncached.length; i += sliceSize) {
      const slice = uncached.slice(i, i + sliceSize);
      const resultsPromise = api(
        routes.apiAnalyze,
        slice.map((message) => ({
          guildId: message.guildID,
          channelId: message.channelID,
          messageId: message.id,
        }))
      );
      slice.forEach((message, i) =>
        analysisCache.set(
          message.id,
          resultsPromise.then((results) => results[i])
        )
      );
    }
  }

  const entries = await Promise.all(
    messages.map(
      async (message) =>
        [message.id, await analysisCache.get(message.id)] as const
    )
  );

  return new Map(entries);
};
