import * as Discord from "discord.js";
import * as Perspective from "perspective-api-client";

const apiRoutes = {
  // Discord
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
  [routes.apiListGuilds]: null;
  [routes.apiFetchGuild]: { guildId: string };
  [routes.apiFetchChannel]: { guildId: string; channelId: string };
  [routes.apiListMessages]: { guildId: string; channelId: string };

  // Analysis
  [routes.apiAnalyze]: {
    guildId: string;
    channelId: string;
    messageId: string;
  };
};

export type ResponseBody = {
  // Discord
  [routes.apiListGuilds]: Guild[];
  [routes.apiFetchGuild]: Guild;
  [routes.apiFetchChannel]: Channel;
  [routes.apiListMessages]: Message[];

  // Analysis
  [routes.apiAnalyze]: Perspective.Result;
};

export type Guild = Pick<Discord.Guild, "name" | "id"> & { channels: string[] };
export type Channel = Pick<Discord.GuildChannel, "type" | "id" | "name">;
export type Message = Pick<Discord.Message, "content" | "id">;
