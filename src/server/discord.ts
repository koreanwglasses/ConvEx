import { Client } from "discord.js";
import * as localConfig from "./config.local";

const client = new Client();

export const start = () =>
  new Promise<void>((res) => {
    client.login(localConfig.token);
    client.once("ready", res);
  });

type Permission = "canView";

export const getPermissions = async (
  userId: string,
  guildId: string
): Promise<Record<Permission, boolean>> => {
  // TODO: Have stricter restrictions on who can access Concord
  // Right now, anyone in a guild can access Concord for that guild
  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch();
  return {
    canView: members.has(userId),
  };
};

export const hasPermission = async (
  userId: string,
  guildId: string,
  permission: Permission
) => (await getPermissions(userId, guildId))[permission];

export const listGuilds = () => client.guilds.cache.array();

export const fetchGuild = (guildId: string) => client.guilds.fetch(guildId);
