import { createServer } from "http";
import * as config from "../../config";
import app from "./app";
import * as Sockets from "./sockets";

const server = createServer(app);
Sockets.init();

export const start = () =>
  new Promise<void>((res) => {
    server.listen(config.port);
    server.once("listening", res);
  });

export default server;
