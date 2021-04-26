import { createServer } from "http";
import * as config from "../../config";
import app from "./app";

const server = createServer(app);

export const start = () =>
  new Promise<void>((res) => {
    try {
      server.listen(config.port);
    } catch (e) {
      console.error(e);
    }
    server.once("listening", res);
  });

export default server;
