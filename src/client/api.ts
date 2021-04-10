import * as Discord from "discord.js";

export function api(
  endpoint: "/api/guild",
  body: { guildId: string }
): Promise<Guild>;

export function api(endpoint: "/api/guild/list"): Promise<Guild[]>;

export function api(
  endpoint: "/api/channel",
  body: { guildId: string; channelId: string }
): Promise<Channel>;

export function api(
  endpoint: "/api/message",
  body: { guildId: string; channelId: string; limit?: number }
): Promise<Message>;

export function api<T = unknown>(endpoint: string, body?: unknown): Promise<T>;

export async function api<T = unknown>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(endpoint, {
    credentials: "same-origin",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) throw new APIError(response);

  const result = await response.json();

  return result as T;
}

export class APIError extends Error {
  constructor(readonly response: Response) {
    super(response.statusText);
  }
  get isUnauthorized() {
    return this.response.status === 401;
  }
}

export type Guild = Pick<Discord.Guild, "name" | "id"> & { channels: string[] };
export type Channel = Pick<Discord.GuildChannel, "type" | "id">;
export type Message = Pick<Discord.Message, never>;
