export const asyncFilter = async <T>(
  arr: T[],
  predicate: (value: T) => Promise<boolean>
) =>
  arr.reduce(
    async (filtered, value) =>
      (await predicate(value)) ? [...(await filtered), value] : filtered,
    Promise.resolve([] as T[])
  );

/**
 * Joins paths while removing traling slashes
 */
export const join = (...paths: string[]) =>
  paths.reduce(
    (previousValue, currentValue) =>
      (previousValue.endsWith("/")
        ? previousValue.substring(0, previousValue.length - 1)
        : previousValue) +
      "/" +
      currentValue,
    ""
  );
