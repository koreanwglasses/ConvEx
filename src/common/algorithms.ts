/**
 * This file contains specialized algorithms for performance optimization
 */

/**
 * Finds the index of the first element that maps to a positive value.  The
 * values in the array must map to non-decreasing (i.e. increasing or equal)
 * values.
 *
 * Choose the method "BISECTION" or "FALSE_POSITION" based on the expected distrib
 */
export const indexOfFirstPositive_nonDecreasingMap = <T>(
  arr: readonly T[],
  mapFunc: (value: T) => number,
  method: "BISECTION" | "FALSE_POSITION" = "BISECTION"
) => {
  let start = 0;
  let end = arr.length - 1;

  if (end - start < 0) return -1;

  let endValue = mapFunc(arr[end]);
  if (endValue <= 0) return -1;

  let startValue = mapFunc(arr[start]);
  if (startValue > 0) return start;

  while (true) {
    if (end - start === 1) return end;

    let pivot: number;
    if (method === "BISECTION") {
      pivot = Math.floor((start + end) / 2);
    }
    if (method === "FALSE_POSITION") {
      pivot = Math.round(
        (start * endValue - end * startValue) / (endValue - startValue)
      );
      pivot = Math.min(Math.max(pivot, start + 1), end - 1);
    }

    const pivotValue = mapFunc(arr[pivot]);

    if (pivotValue <= 0) {
      start = pivot;
      startValue = pivotValue;
      continue;
    }
    if (pivotValue > 0) {
      end = pivot;
      endValue = pivotValue;
      continue;
    }
  }
};

export const filterBetween_nonDecreasingMap = <T>(
  arr: readonly T[],
  mapFunc: (value: T) => number,
  min: number,
  max: number,
  method?: Parameters<typeof indexOfFirstPositive_nonDecreasingMap>[2]
) => {
  const start = indexOfFirstPositive_nonDecreasingMap(
    arr,
    (value) => mapFunc(value) - min,
    method
  );
  if (start === -1) return [];

  const end = indexOfFirstPositive_nonDecreasingMap(
    arr,
    (value) => mapFunc(value) - max,
    method
  );
  return arr.slice(start, end === -1 ? arr.length : end);
};
