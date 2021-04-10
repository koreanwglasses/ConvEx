import to from "await-to-js";
import { api } from "../api";
import { useAwait } from "./use-await";

export const useAPI = <T>(apiPromise: ReturnType<typeof api> & Promise<T>) =>
  useAwait(to(apiPromise), [null, undefined], []);
