import { Message } from "discord.js";
import Perspective, { Result } from "perspective-api-client";
import * as localConfig from "../config.local";

const perspective = new Perspective({ apiKey: localConfig.perspectiveAPIKey });

const analyzeMessageCache = new Map<string, Result>();
export const analyzeMessage = async (message: Message) => {
  if (analyzeMessageCache.has(message.id)) {
    return analyzeMessageCache.get(message.id);
  }

  const result = await perspective.analyze(message.content);
  analyzeMessageCache.set(message.id, result);
  return result;
};
