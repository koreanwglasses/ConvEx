import React, { useEffect, useState } from "react";

export const useAwait = <T = unknown>(
  promise: Promise<T>,
  initial?: T,
  deps?: React.DependencyList
) => {
  const [result, setResult] = useState(initial);
  useEffect(() => {
    (async () => setResult(await promise))();
  }, deps);
  return result;
};

export const useAwaitAll = <T = unknown>(
  promises: Promise<T>[],
  initial?: T[],
  deps?: React.DependencyList
) => {
  const [result, setResult] = useState(initial);
  useEffect(() => {
    if (promises) Promise.all(promises).then(setResult);
  }, deps);
  return result;
};
