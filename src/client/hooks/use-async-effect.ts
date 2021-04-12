import React, { useEffect } from "react";

export const useAsyncEffect = (
  effect: () => void,
  deps?: React.DependencyList
) => {
  useEffect(() => {
    effect();
  }, deps);
};
