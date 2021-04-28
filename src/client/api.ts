import * as config from "../config";
import { APIRoutes, RequestBody, ResponseBody } from "../endpoints";
import { resolveEndpoint, ValueOf } from "../utils";

export async function api<R extends ValueOf<APIRoutes>>(
  endpoint: R,
  body?: RequestBody[R]
): Promise<ResponseBody[R]> {
  const url = resolveEndpoint(endpoint);

  const response = await fetch(url, {
    credentials:
      config.mode === "remote-development" ? "include" : "same-origin",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) throw new APIError(response);

  return await response.json();
}

export class APIError extends Error {
  constructor(readonly response: Response) {
    super(response.statusText);
  }
  get isUnauthorized() {
    return this.response.status === 401;
  }
  get isForbidden() {
    return this.response.status === 403;
  }
}
