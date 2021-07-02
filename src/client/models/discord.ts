import { filterBetween_nonDecreasingMap } from "../../common/algorithms";
import { cached, omitUndefined, singletonPromise } from "../../common/utils";
import { Message, RequestBody, routes } from "../../endpoints";
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
    new MessageManager(guildId, channelId),
  ({ guildId, channelId }) => `${guildId},${channelId}`
);

class MessageManager {
  private cache_: Message[] = [];
  private relativeIndices = new Map<string, number>();
  private referenceIndex = 0;

  get cache() {
    return Object.assign(this.cache_ as readonly Message[], {
      findIndexById: (id: string) => this.findIndexById(id),
      last: () => this.last,
    });
  }

  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly pageSize = 10
  ) {}

  private get last() {
    return this.cache_.length && this.cache_[this.cache_.length - 1];
  }

  private get first() {
    return this.cache_[0];
  }

  private push(messages: Message[]) {
    messages.forEach((message) => {
      const i = this.cache_.length - this.referenceIndex;
      this.cache_.push(message);
      this.relativeIndices.set(message.id, i);
    });
  }

  private unshift(messages: Message[]) {
    [...messages].reverse().forEach((message) => {
      this.referenceIndex++;
      const i = -this.referenceIndex;

      this.cache_.unshift(message);
      this.relativeIndices.set(message.id, i);
    });
  }

  private findIndexById(id: string) {
    return this.relativeIndices.has(id)
      ? this.relativeIndices.get(id) + this.referenceIndex
      : -1;
  }

  private findById(id: string) {
    const i = this.findIndexById(id);
    return i === -1 ? null : this.cache_[i];
  }

  private hasReachedBeginning_: boolean;
  get hasReachedBeginning() {
    return this.hasReachedBeginning_;
  }

  /**
   * Expands the cache with older messages
   *
   * Tries to fetch `this.pageSize` messages
   * @returns true if older messages may exist. false if oldest message has been loaded
   */
  expandBack = singletonPromise(async () => {
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

    this.push(messages);

    const result = messages.length >= this.pageSize;
    this.hasReachedBeginning_ = !result;
    return result;
  });

  private lastExpandFrontTime = 0;

  /**
   * Expands the cache with newer messages
   *
   * Tries to fetch `this.pageSize` messages
   * @returns true if newer messages might exist. false if newest message has been loaded
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

    this.unshift(messages);

    const result = messages.length >= this.pageSize;
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
      while (!this.findById(id) && (await this.expandFront()));
    }

    if (!this.last || message.createdTimestamp <= this.last.createdTimestamp) {
      while (!this.findById(id) && (await this.expandBack()));
    }
  }

  /**
   * Fetches all new messages and stores them in the cache
   */
  async fastForward() {
    while (await this.expandFront());
  }

  async filterByTime(oldestTime: number, newestTime: number) {
    while (
      (!this.last || this.last.createdTimestamp > oldestTime) &&
      (await this.expandBack())
    );
    while (this.lastExpandFrontTime < newestTime && (await this.expandFront()));

    return filterBetween_nonDecreasingMap(
      this.cache_,
      (message) => -message.createdTimestamp,
      -newestTime,
      -oldestTime
    );
  }

  async fetchBetween(oldest: string, newest?: string) {
    await this.expandToMessage(oldest);
    if (newest) await this.expandToMessage(newest);

    const oldestIdx = this.findIndexById(oldest);
    const newestIdx = newest ? this.findIndexById(newest) : 0;

    return this.cache_.slice(newestIdx, oldestIdx);
  }

  async fetchBefore(before?: string, limit = 100) {
    if (!before) return await this.fetchRecent(limit);

    await this.expandToMessage(before);
    const idx = this.findIndexById(before);
    while (this.cache_.length - idx - 1 < limit && (await this.expandBack()));
    return this.cache_.slice(idx + 1, idx + limit + 1);
  }

  async fetchRecent(limit = 100) {
    await this.fastForward();
    while (this.cache_.length < limit && (await this.expandBack()));
    return this.cache_.slice(0, limit);
  }
}
