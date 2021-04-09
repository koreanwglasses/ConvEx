import { useEffect, useState } from "react";

class APIError extends Error {
  constructor(readonly response: Response) {
    super(response.statusText);
  }
  get isUnauthorized() {
    return this.response.status === 401;
  }
}

export const useAPI = <T = unknown>(endpoint: string) => {
  const [result, setResult] = useState<T>();
  const [err, setErr] = useState<APIError>();
  useEffect(() => {
    (async () => {
      const response = await fetch(endpoint, {
        credentials: "same-origin",
      });

      if (response.status !== 200) return setErr(new APIError(response));

      const result = await response.json();
      setResult(result);
    })();
  }, []);
  return [err, result] as const;
};
