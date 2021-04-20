import { Message } from "../../endpoints";
import { analyzeMessages } from "../models/analysis";
import { useAwaitTo } from "./utility-hooks";

export const useAnalyses = (messages: Message[]) =>
  useAwaitTo(async () => messages && (await analyzeMessages(messages)), [
    messages,
  ]);
