import { Server } from "socket.io";
import { server as httpServer } from "./server";

const io = new Server(httpServer);
