import to from "await-to-js";
import React, { useEffect, useState } from "react";

export const useAsyncEffect = (
  effect: () => void,
  deps?: React.DependencyList
) => {
  useEffect(() => {
    effect();
  }, deps);
};

export const useAwait = <T = unknown>(
  callback: () => Promise<T>,
  deps: React.DependencyList = [],
  initial?: T
) => {
  const [result, setResult] = useState(initial);
  useAsyncEffect(async () => {
    const promise = callback();
    if (promise) setResult(await promise);
  }, deps);
  return result;
};

export const useAwaitAll = <T = unknown>(
  callback: () => Promise<T>[],
  deps: React.DependencyList = [],
  initial?: T[]
) => {
  const [result, setResult] = useState(initial);
  useAsyncEffect(async () => {
    const promises = callback();
    if (promises) setResult(await Promise.all(promises));
  }, deps);
  return result;
};

export const useAwaitTo = <T>(
  callback: () => Promise<T>,
  deps: React.DependencyList = [],
  initial?: T
) =>
  useAwait(
    () => {
      const promise = callback();
      if (promise) return to(promise);
    },
    deps,
    [null, initial]
  );
