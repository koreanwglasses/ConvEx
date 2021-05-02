export const mode =
  (process.env.NODE_ENV as
    | "production"
    | "development"
    | "remote-development") || "production";
export const baseURL =
  mode === "production" ? "http://dev.fred-choi.com" : "http://localhost";
export const port = mode === "production" ? 80 : 9000;

export const remoteBaseURL = "http://dev.fred-choi.com";
export const localFrontEndUrl = "http://localhost:8080";
