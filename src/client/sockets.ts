import io from "socket.io-client";
import { Message } from "../endpoints";
import { rootURL } from "../utils";

const URL = rootURL();
const socket = io(URL, { autoConnect: false }) as SocketIOClient.Socket & {
  onAny: (handler: (event: unknown, ...args: unknown[]) => void) => void;
};

socket.onAny((event, ...args) => {
  console.log(event, args);
});

export const connect = () => socket.connect();

const subscribedChannels = new Set<string>();
export const listenForMessages = (
  { guildId, channelId }: { guildId: string; channelId: string },
  callback: (message: Message) => void
) => {
  if (!subscribedChannels.has(channelId)) {
    /** Prevent subscribing is already subscribed */
    socket.emit("listen-for-messages", { guildId, channelId });
    subscribedChannels.add(channelId);
  }

  const listener = (message: Message) => {
    if (message.channelID === channelId && message.guildID === guildId)
      callback(message);
  };
  socket.on("message", listener);

  return {
    removeListener() {
      socket.off("message", listener);
    },
  };
};
