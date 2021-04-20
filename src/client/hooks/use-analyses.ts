import { Message } from "../../endpoints";
import { analyzeMessages } from "../models/analysis";
import { useAwait } from "./utility-hooks";

export const useAnalyses = (messages: Message[]) =>
  useAwait(async () => messages && (await analyzeMessages(messages)), [
    messages,
  ]);
