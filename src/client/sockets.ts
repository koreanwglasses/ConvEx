import io from "socket.io-client";
import { Message } from "../endpoints";
import { rootURL } from "../utils";

const URL = rootURL();
const socket = io(URL, {
  autoConnect: false,
}) as SocketIOClient.Socket & {
  onAny: (handler: (event: unknown, ...args: unknown[]) => void) => void;
};

socket.onAny((event, ...args) => {
  console.log(event, args);
});

let hasConnected = false;
const connect = () => {
  if (!hasConnected) socket.connect();
  hasConnected = true;
};

const subscribedChannels = new Set<string>();
export const subscribeToMessages = (
  { guildId, channelId }: { guildId: string; channelId: string },
  callback: (message: Message) => void
) => {
  connect();

  if (!subscribedChannels.has(channelId)) {
    /** Prevent subscribing if already subscribed */
    socket.emit("listen-for-messages", { guildId, channelId });
    subscribedChannels.add(channelId);
  }

  const listener = (message: Message) => {
    if (message.channelID === channelId && message.guildID === guildId)
      callback(message);
  };
  socket.on("message", listener);

  return {
    unsubscribe() {
      socket.off("message", listener);
    },
  };
};
