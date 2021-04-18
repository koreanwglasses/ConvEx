import * as Discord from "discord.js";
import * as Perspective from "perspective-api-client";

const apiRoutes = {
  // Discord
  apiCurrentUser: "/api/user/current",
  apiUser: "/api/user",
  apiListGuilds: "/api/guild/list",
  apiFetchGuild: "/api/guild",
  apiFetchChannel: "/api/channel",
  apiListMessages: "/api/message/list",

  // Analysis
  apiAnalyze: "/api/analyze",
} as const;

export const routes = {
  auth: "/auth",
  authCallback: "/return",
  ...apiRoutes,
} as const;

export type APIRoutes = typeof apiRoutes;

export type RequestBody = {
  // Discord
  [routes.apiCurrentUser]: undefined;
  [routes.apiUser]: { userId: string };
  [routes.apiListGuilds]: undefined;
  [routes.apiFetchGuild]: { guildId: string };
  [routes.apiFetchChannel]: { guildId: string; channelId: string };
  [routes.apiListMessages]: {
    guildId: string;
    channelId: string;
    limit?: number;
    before?: string;
    after?: string;
    around?: string;
  };

  // Analysis
  [routes.apiAnalyze]: {
    guildId: string;
    channelId: string;
    messageId: string;
  }[];
};

export type ResponseBody = {
  // Discord
  [routes.apiCurrentUser]: User;
  [routes.apiUser]: User;
  [routes.apiListGuilds]: Guild[];
  [routes.apiFetchGuild]: Guild;
  [routes.apiFetchChannel]: Channel;
  [routes.apiListMessages]: Message[];

  // Analysis
  [routes.apiAnalyze]: ([null, Perspective.Result] | [Error, undefined])[];
};

export type User = Pick<Discord.User, "username" | "discriminator"> & {
  avatarURL: "string";
};
export type Guild = Pick<Discord.Guild, "name" | "id"> & { channels: string[] };
export type Channel = Pick<Discord.GuildChannel, "type" | "id" | "name">;
export type Message = Pick<
  Discord.Message,
  "content" | "id" | "createdTimestamp"
> & {
  authorID: string;
  channelID: string;
  guildID: string;
};
