import { Result } from "perspective-api-client";
import { Message, routes } from "../../endpoints";
import { api } from "../api";

const analysisCache = new Map<string, Promise<[Error, Result]>>();
export const analyzeMessages = (messages: Message[]) => {
  const uncached = messages.filter((message) => !analysisCache.has(message.id));
  if (uncached.length) {
    const resultsPromise = api(
      routes.apiAnalyze,
      uncached.map((message) => ({
        guildId: message.guildID,
        channelId: message.channelID,
        messageId: message.id,
      }))
    );

    uncached.forEach((message, i) =>
      analysisCache.set(
        message.id,
        resultsPromise.then((results) => results[i])
      )
    );
  }

  return messages.map((message) => analysisCache.get(message.id));
};
