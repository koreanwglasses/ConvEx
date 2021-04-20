import { Client, Message, PermissionString } from "discord.js";
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

export type Permission = PermissionString | "IS_MEMBER";

/**
 * Checks for a user's permission within a guild/channel. Returns false if user
 * is not member of guild
 */
export const hasPermission = async (
  {
    userId,
    guildId,
    channelId,
  }: {
    userId: string;
    guildId: string;
    channelId?: string;
  },
  permission?: Permission
) => {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);

  if (!member) return false;
  if (permission === "IS_MEMBER") return true;

  if (channelId) {
    return member.permissionsIn(channelId).has(permission);
  }

  return member.hasPermission(permission);
};

export const hasPermissions = async (
  {
    userId,
    guildId,
    channelId,
  }: {
    userId: string;
    guildId: string;
    channelId?: string;
  },
  permissions: Permission[]
) => {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);

  if (!member) return false;

  return await permissions
    .map((permission) =>
      hasPermission({ userId, guildId, channelId }, permission)
    )
    .reduce(async (a, b) => (await a) && (await b), Promise.resolve(true));
};

//////////
// User //
//////////

export const fetchUser = (userId: string) => client.users.fetch(userId);

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

export const listMessages = async ({
  guildId,
  channelId,
  limit = 100,
  before,
  after,
  around,
}: {
  guildId: string;
  channelId: string;
  limit?: number;
  before?: string;
  after?: string;
  around?: string;
}) => {
  const guild = await client.guilds.fetch(guildId);
  const channel = guild.channels.resolve(channelId);

  if (!channel.isText()) throw new Error("Channel is not text channel");

  const messages = await channel.messages.fetch({
    limit,
    before,
    after,
    around,
  });

  return messages;
};

export const fetchMessage = async ({
  guildId,
  channelId,
  messageId,
}: {
  guildId: string;
  channelId: string;
  messageId: string;
}) => {
  const guild = await client.guilds.fetch(guildId);
  const channel = guild.channels.resolve(channelId);

  if (!channel.isText()) throw new Error("Channel is not text channel");

  const message = await channel.messages.fetch(messageId);

  return message;
};
