import { createServer, Server } from "http";
import * as config from "../config";
import * as App from "./app";
import * as Sockets from "./sockets";

let server: Server;
export const start = () =>
  new Promise<void>((res) => {
    server.listen(config.port);
    server.once("listening", res);
  });

export const init = () => {
  const app = App.init();
  server = createServer(app);
  Sockets.init({ httpServer: server });
};
