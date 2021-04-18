import { APIRoutes, RequestBody, ResponseBody, routes } from "../endpoints";
import { cached, ValueOf } from "../utils";

export async function api<R extends ValueOf<APIRoutes>>(
  endpoint: R,
  body?: RequestBody[R]
): Promise<ResponseBody[R]> {
  const response = await fetch(endpoint, {
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

export const fetchUser = cached((userId: string) =>
  api(routes.apiUser, { userId })
);
