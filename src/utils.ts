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
  `${config.baseURL}${+config.port === 80 ? "" : `:${config.port}`}`;

export type ValueOf<T> = T[keyof T];

export const zip = <S, T>(arr1: S[], arr2: T[]) =>
  arr1.map((value, i) => [value, arr2[i]] as const);

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
