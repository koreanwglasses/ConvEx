import { createServer, Server } from "http";
import * as config from "../config";

let server: Server;
export const start = () =>
  new Promise<void>((res) => {
    server.listen(config.port);
    server.once("listening", res);
  });

export const init = ({ app }: { app: Express.Application }) => {
  server = createServer(app);
  return server;
};
