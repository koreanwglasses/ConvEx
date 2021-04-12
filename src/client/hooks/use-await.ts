import to from "await-to-js";
import React, { useState } from "react";
import { useAsyncEffect } from "./use-async-effect";

export const useAwait = <T = unknown>(
  promise: Promise<T>,
  initial?: T,
  deps?: React.DependencyList
) => {
  const [result, setResult] = useState(initial);
  useAsyncEffect(async () => setResult(await promise), deps);
  return result;
};

export const useAwaitAll = <T = unknown>(
  promises: Promise<T>[],
  initial?: T[],
  deps?: React.DependencyList
) => {
  const [result, setResult] = useState(initial);
  useAsyncEffect(
    async () => promises && setResult(await Promise.all(promises)),
    deps
  );
  return result;
};

export const useAwaitTo = <T>(promise: Promise<T>) =>
  useAwait(to(promise), [null, undefined], []);
