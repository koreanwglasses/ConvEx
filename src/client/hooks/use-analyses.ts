import { Message } from "../../endpoints";
import { analyzeMessages } from "../models/analysis";
import { useAwait } from "./utility-hooks";

export const useAnalyses = (messages: Message[]) =>
  useAwait(async () => messages && (await analyzeMessages(messages)), [
    /* Use a string dependency to messages is compared by value */
    messages.map(({ id }) => `${id}`).join(","),
  ]);
