export const baseURL = "http://localhost";
export const port = process.env.PORT || 9000;
export const mode =
  (process.env.NODE_ENV as "production" | "development") || "production";
