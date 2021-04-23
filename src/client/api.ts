import * as config from "../config";
import { APIRoutes, RequestBody, ResponseBody } from "../endpoints";
import { ValueOf } from "../utils";

export async function api<R extends ValueOf<APIRoutes>>(
  endpoint: R,
  body?: RequestBody[R]
): Promise<ResponseBody[R]> {
  const url =
    process.env.NODE_ENV === "remote-development"
      ? `${config.remoteBaseURL}:${config.port}${endpoint}`
      : endpoint;

  const response = await fetch(url, {
    credentials: "same-origin",
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
}
