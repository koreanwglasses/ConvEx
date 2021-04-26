import { Message, RequestBody, routes } from "../../endpoints";
import { cached, omitUndefined, singletonPromise } from "../../utils";
import { api } from "../api";

export const fetchUser = cached((userId: string) =>
  api(routes.apiUser, { userId })
);

export const fetchChannel = cached(
  ({ guildId, channelId }: { guildId: string; channelId: string }) =>
    api(routes.apiFetchChannel, { guildId, channelId })
);

export const messageManager = cached(
  ({ guildId, channelId }: { guildId: string; channelId: string }) =>
    new MessageManager(guildId, channelId)
);

class MessageManager {
  private cache_: Message[] = [];
  get cache() {
    return [...this.cache_];
  }

  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly pageSize = 100
  ) {}

  private get last() {
    return this.cache_.length && this.cache_[this.cache_.length - 1];
  }

  private get first() {
    return this.cache_[0];
  }

  private findById(id: string) {
    return this.cache_.find((message) => id === message.id);
  }

  private hasReachedBeginning_: boolean;
  get hasReachedBeginning() {
    return this.hasReachedBeginning_;
  }

  /**
   * Expands the cache with older messages
   *
   * Tries to fetch `this.pageSize` messages
   * @returns true if oldest message has been loaded
   */
  private expandBack = singletonPromise(async () => {
    if (this.hasReachedBeginning_) return;

    const messages = await api(
      routes.apiListMessages,
      omitUndefined({
        guildId: this.guildId,
        channelId: this.channelId,
        limit: this.pageSize,
        before: this.last?.id,
      }) as RequestBody[typeof routes.apiListMessages]
    );
    this.cache_.push(...messages);

    const result = messages.length < this.pageSize;
    this.hasReachedBeginning_ = result;
    return result;
  });

  private lastExpandFrontTime = 0;

  /**
   * Expands the cache with newer messages
   *
   * Tries to fetch `this.pageSize` messages
   * @returns true if newest message has been loaded
   */
  private expandFront = singletonPromise(async () => {
    this.lastExpandFrontTime = Date.now();

    const messages = await api(
      routes.apiListMessages,
      omitUndefined({
        guildId: this.guildId,
        channelId: this.channelId,
        limit: this.pageSize,
        after: this.first?.id,
      }) as RequestBody[typeof routes.apiListMessages]
    );
    this.cache_.unshift(...messages);

    const result = messages.length < this.pageSize;
    return result;
  });

  private async expandToMessage(id: string) {
    if (this.findById(id)) return;

    const message = await api(routes.apiFetchMessage, {
      guildId: this.guildId,
      channelId: this.channelId,
      messageId: id,
    });

    if (
      !this.first ||
      message.createdTimestamp >= this.first.createdTimestamp
    ) {
      while (!this.findById(id) && !(await this.expandFront()));
    }

    if (!this.last || message.createdTimestamp <= this.last.createdTimestamp) {
      while (!this.findById(id) && !(await this.expandBack()));
    }
  }

  /**
   * Fetches all new messages and stores them in the cache
   */
  private async update() {
    while (!(await this.expandFront()));
  }

  async filterByTime(oldestTime: number, newestTime: number) {
    while (
      (!this.last || this.last.createdTimestamp > oldestTime) &&
      !(await this.expandBack())
    );
    while (
      this.lastExpandFrontTime < newestTime &&
      !(await this.expandFront())
    );
    return this.cache_.filter(
      (message) =>
        oldestTime <= message.createdTimestamp &&
        message.createdTimestamp <= newestTime
    );
  }

  async fetchBetween(oldest: string, newest?: string) {
    await this.expandToMessage(oldest);
    if (newest) await this.expandToMessage(newest);

    const oldestIdx = this.cache_.findIndex((message) => message.id === oldest);
    const newestIdx = newest
      ? this.cache_.findIndex((message) => message.id === newest)
      : 0;

    return this.cache_.slice(newestIdx, oldestIdx);
  }

  async fetchBefore(before: string, limit = 100) {
    await this.expandToMessage(before);
    const idx = this.cache_.findIndex((message) => message.id === before);
    while (this.cache_.length - idx - 1 < limit && (await this.expandBack()));
    return this.cache_.slice(idx, idx + limit);
  }

  async fetchRecent(limit = 100) {
    await this.update();
    while (this.cache_.length < limit && (await this.expandBack()));
    return this.cache_.slice(0, limit);
  }
}
