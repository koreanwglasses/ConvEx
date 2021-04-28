import * as config from "./config";

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

export const cached = <S extends unknown[], T>(func: (...args: S) => T) => {
  const cache = new Map<string, T>();
  return Object.assign(
    function (...args: S) {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);

      const value = func(...args);
      cache.set(key, value);
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
