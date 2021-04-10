import io from "socket.io-client";
import { rootURL } from "../utils";

const URL = rootURL();
const socket = io(URL, { autoConnect: false }) as SocketIOClient.Socket & {
  onAny: (handler: (event: unknown, ...args: unknown[]) => void) => void;
};

socket.onAny((event, ...args) => {
  console.log(event, args);
});
