/**
 * This file contains convenience methods to make code look cleaner
 */

import * as config from "../config";
import { indexOfFirstPositive_nonDecreasingMap } from "./algorithms";

export const asyncFilter = async <T>(
  arr: T[],
  predicate: (value: T) => Promise<boolean>
) =>
  arr.reduce(
    async (filtered, value) =>
      (await predicate(value)) ? [...(await filtered), value] : filtered,
    Promise.resolve([] as T[])
  );

export const removeTrailingSlashes = (path: string) =>
  path.match(/^(.*?)\/*$/)[1];
export const join = (path0: string, ...paths: string[]) =>
  paths.reduce((a, b) => `${removeTrailingSlashes(a)}/${b}`, path0);

export const rootURL = () =>
  `${
    config.mode === "remote-development" ? config.remoteBaseURL : config.baseURL
  }${+config.port === 80 ? "" : `:${config.port}`}`;

export const resolveEndpoint = (path: string) =>
  config.mode === "remote-development" ? `${rootURL()}${path}` : path;

export const absoluteUrl = (path: string) => `${rootURL()}${path}`;

export type ValueOf<T> = T[keyof T];

export const cached = <S extends unknown[], T>(
  func: (...args: S) => T,
  key: (...args: S) => string = (...args: S) => JSON.stringify(args)
) => {
  const cache = new Map<string, T>();
  return Object.assign(
    function (...args: S) {
      const key_ = key(...args);
      if (cache.has(key_)) return cache.get(key_);

      const value = func(...args);
      cache.set(key_, value);
      return value;
    },
    {
      clear: () => cache.clear(),
    }
  );
};

export const omitUndefined = <T>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => value !== undefined)
  ) as Partial<T>;

/**
 * Returns a function that ensures only one instance of the promise is running at once
 */
export const singletonPromise = <P extends unknown[], R>(
  func: (...args: P) => Promise<R>
) => {
  let pendingPromise: Promise<R> = null;
  return (...args: P) => {
    if (!pendingPromise) {
      pendingPromise = (async () => {
        const result = await func(...args);
        pendingPromise = null;
        return result;
      })();
    }
    return pendingPromise;
  };
};

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: K[]
) =>
  Object.fromEntries(
    Object.entries(source).filter(([key]) => keys.includes(key as K))
  ) as Pick<T, K>;

export const hasDuplicates = (array: unknown[]) =>
  new Set(array).size !== array.length;

export const minBy = <T>(arr: readonly T[], key: (value: T) => unknown) =>
  arr.length === 0
    ? undefined
    : arr.length === 1
    ? arr[0]
    : arr.reduce((a, b) => (key(b) < key(a) ? b : a));

// export const createReducer = <S, A extends { type: string }>(handlers: {
//   [type: string]: (state: S, action: unknown) => S;
// }) => (state: S, action: A) =>
//   action.type in handlers ? handlers[action.type](state, action) : state;

type Action<
  S,
  H extends {
    [type: string]: (state: S, action: unknown) => S;
  }
> = { [K in keyof H]: { type: K } & Parameters<H[K]>[1] }[keyof H];

export const createReducer = <
  S,
  H extends {
    [type: string]: (state: S, action: unknown) => S;
  }
>(
  handlers: H
) => (state: S, action: Action<S, H>) =>
  action.type in handlers ? handlers[action.type](state, action) : state;

export class RateLimiter {
  private queue: (() => void)[] = [];
  private history: number[] = [];
  private flushing: boolean;

  constructor(private limit = 1000, private timespan = 1000) {}

  enqueue(callback: () => void) {
    if (this.minDelay() === 0) this.exec(callback);
    else {
      this.queue.push(callback);
      this.flushQueue();
    }
  }

  ready() {
    return new Promise<void>((res) => this.enqueue(res));
  }

  private exec(callback: () => void) {
    this.history.push(Date.now());
    callback();
  }

  private minDelay() {
    const now = Date.now();
    const i = indexOfFirstPositive_nonDecreasingMap(
      this.history,
      (x) => x - (now - this.timespan)
    );
    if (i === -1) return 0;

    this.history = this.history.slice(i);
    return this.history.length < this.limit
      ? 0
      : this.timespan - (now - this.history[0]);
  }

  private async flushQueue() {
    if (!this.queue.length || this.flushing) return;
    this.flushing = true;
    const popExec = () => {
      if (this.queue.length > 0) {
        this.exec(this.queue.shift());
        setTimeout(popExec, Math.ceil(this.timespan / this.limit));
      } else {
        this.flushing = false;
      }
    };
    setTimeout(popExec, this.minDelay());
  }
}

export const groupBy = <T>(arr: T[], key: (value: T) => unknown) => {
  const groups = new Map<unknown, T[]>();
  arr.forEach((value) => {
    const key_ = key(value);
    if (!groups.has(key_)) groups.set(key_, [value]);
    else groups.get(key_).push(value);
  });
  return groups;
};
