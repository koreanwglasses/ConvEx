import { ValueOf } from "../../common/utils";
import { APIRoutes, RequestBody, ResponseBody } from "../../endpoints";
import { api, APIError } from "../api";
import { useAwaitTo } from "./utility-hooks";

export const useAPI = <R extends ValueOf<APIRoutes>>(
  endpoint: R,
  body?: RequestBody[R]
): [null, ResponseBody[R]] | [APIError, undefined] =>
  useAwaitTo(() => api(endpoint, body), [endpoint, JSON.stringify(body)]);
