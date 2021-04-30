/**
 * This file contains specialized algorithms for performance optimization
 */

/**
 * Finds the index of the first element that maps to a positive value.  The
 * values in the array must map to strictly increasing values
 */

// -------+
export const indexOfFirstPositive_increasingMap = <T>(
  arr: readonly T[],
  mapFunc: (value: T) => number
) => {
  let start = 0;
  let end = arr.length - 1;

  while (true) {
    if (end - start < 0) return -1;

    const startValue = mapFunc(arr[start]);
    if (startValue > 0) return start;

    const endValue = mapFunc(arr[end]);
    if (endValue <= 0) return -1;

    if (end - start === 1) return end;

    const pivot = Math.floor((start + end) / 2);
    const pivotValue = mapFunc(arr[pivot]);

    if (pivotValue <= 0) {
      start = pivot + 1;
      continue;
    }
    if (pivotValue > 0) {
      start = start + 1;
      end = pivot;
      continue;
    }
  }
};

export const filterBetween_increasingMap = <T>(
  arr: readonly T[],
  mapFunc: (value: T) => number,
  min: number,
  max: number
) => {
  const start = indexOfFirstPositive_increasingMap(
    arr,
    (value) => max - mapFunc(value)
  );
  if (start === -1) return [];

  const end = indexOfFirstPositive_increasingMap(
    arr,
    (value) => min - mapFunc(value)
  );
  return arr.slice(start, end === -1 ? arr.length : end);
};
