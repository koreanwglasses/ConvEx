import to from "await-to-js";
import { useAwait } from "./use-await";

export const useAPI = <T>(apiPromise: Promise<T>) =>
  useAwait(to(apiPromise), [null, undefined], []);
