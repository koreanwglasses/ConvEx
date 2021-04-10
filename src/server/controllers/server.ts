import { createServer } from "http";
import * as config from "../config";
import { app } from "./app";

export const server = createServer(app);

export const start = () => server.listen(config.port);
