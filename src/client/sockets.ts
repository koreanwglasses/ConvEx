import io from "socket.io-client";
import { rootURL } from "../utils";
import { Message } from "./api";

const URL = rootURL();
const socket = io(URL, { autoConnect: false }) as SocketIOClient.Socket & {
  onAny: (handler: (event: unknown, ...args: unknown[]) => void) => void;
};

socket.onAny((event, ...args) => {
  console.log(event, args);
});

export const connect = () => socket.connect();
export const listenForMessages = (
  guildId: string,
  channelId: string,
  callback: (message: Message) => void
) => {
  socket.emit("listen-for-messages", { guildId, channelId });
  socket.on("message", callback);
};
