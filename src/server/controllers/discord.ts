import { Client, Message } from "discord.js";
import * as localConfig from "../config.local";

const client = new Client();

export const start = () =>
  new Promise<void>((res) => {
    client.login(localConfig.token);
    client.once("ready", res);
  });

/////////////////
// Permissions //
/////////////////

type Permission = "canView";

export const getPermissions = async ({
  userId,
  guildId,
}: {
  userId: string;
  guildId: string;
}): Promise<Record<Permission, boolean>> => {
  // TODO: Have stricter restrictions on who can access Concord
  // Right now, anyone in a guild can access Concord for that guild
  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch();
  return {
    canView: members.has(userId),
  };
};

export const hasPermission = async ({
  userId,
  guildId,
  permission,
}: {
  userId: string;
  guildId: string;
  permission: Permission;
}) => (await getPermissions({ userId, guildId }))[permission];

////////////
// Guilds //
////////////

export const listGuilds = () => client.guilds.cache.array();

export const fetchGuild = (guildId: string) => client.guilds.fetch(guildId);

//////////////
// Messages //
//////////////

const messageListeners = new Map<string, ((message: Message) => void)[]>();

export const listenForMessages = (
  guildId: string,
  channelId: string,
  callback: (message: Message) => void
) => {
  const key = `${guildId},${channelId}`;
  if (!messageListeners.has(key)) messageListeners.set(key, []);
  messageListeners.get(key).push(callback);
};

client.on("message", (message) => {
  const key = `${message.guild.id},${message.channel.id}`;
  messageListeners.get(key)?.forEach((callback) => callback(message));
});
