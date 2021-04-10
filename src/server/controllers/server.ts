import { createServer } from "http";
import * as config from "../config";
import app from "./app";

const server = createServer(app);

export const start = () =>
  new Promise<void>((res) => {
    server.listen(config.port);
    server.once("listening", res);
  });

export default server;
