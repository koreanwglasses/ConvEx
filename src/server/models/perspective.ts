import to from "await-to-js";
import { Message } from "discord.js";
import Perspective, { Result } from "perspective-api-client";
import * as localConfig from "../config.local";

const perspective = new Perspective({ apiKey: localConfig.perspectiveAPIKey });

const analyzeMessageCache = new Map<string, [Error, Result]>();
export const analyzeMessage = async (message: Message) => {
  if (!analyzeMessageCache.has(message.id)) {
    const [err, result] = await to(perspective.analyze(message.content));
    analyzeMessageCache.set(message.id, [err, result]);
  }

  const [err, result] = analyzeMessageCache.get(message.id);
  if (err) throw err;
  return result;
};
