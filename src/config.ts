export const baseURL = "http://localhost";
export const port = 9000;
export const mode =
  (process.env.NODE_ENV as
    | "production"
    | "development"
    | "remote-development") || "production";
export const localFrontEndUrl = "http://localhost:8080";
export const remoteBaseURL = "http://dev.fred-choi.com";
