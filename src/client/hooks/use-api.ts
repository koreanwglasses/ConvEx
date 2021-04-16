import { APIRoutes, RequestBody, ResponseBody } from "../../endpoints";
import { ValueOf } from "../../utils";
import { api } from "../api";
import { useAwaitTo } from "./utility-hooks";

export const useAPI = <R extends ValueOf<APIRoutes>>(
  endpoint: R,
  body?: RequestBody[R]
): [null, ResponseBody[R]] | [Error, undefined] =>
  useAwaitTo(() => api(endpoint, body), [endpoint, JSON.stringify(body)]);
