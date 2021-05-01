// src: https://gist.github.com/wlchn/ee15de1da59b8d6981a400eee4376ea4

export const selectMedian = <T>(
  arr: T[],
  compare: (a: T, b: T) => number = defaultCompare
) => {
  return selectK(arr, Math.floor(arr.length / 2), compare);
};

export const selectK = <T>(
  arr: T[],
  k: number,
  compare: (a: T, b: T) => number = defaultCompare
) => {
  if (!Array.isArray(arr) || arr.length === 0 || arr.length - 1 < k) {
    return;
  }
  if (arr.length === 1) {
    return arr[0];
  }
  const idx = selectIdx(arr, 0, arr.length - 1, k, compare);
  return arr[idx];
};

const partition = <T>(
  arr: T[],
  left: number,
  right: number,
  pivot: number,
  compare: (a: T, b: T) => number
) => {
  let temp = arr[pivot];
  arr[pivot] = arr[right];
  arr[right] = temp;
  let track = left;
  for (let i = left; i < right; i++) {
    if (compare(arr[i], arr[right]) === -1) {
      const t = arr[i];
      arr[i] = arr[track];
      arr[track] = t;
      track++;
    }
  }
  temp = arr[track];
  arr[track] = arr[right];
  arr[right] = temp;
  return track;
};

const selectIdx = <T>(
  arr: T[],
  left: number,
  right: number,
  k: number,
  compare: (a: T, b: T) => number
): number => {
  if (left === right) {
    return left;
  }
  const dest = left + k;
  while (true) {
    let pivotIndex =
      right - left + 1 <= 5
        ? Math.floor(Math.random() * (right - left + 1)) + left
        : medianOfMedians(arr, left, right, compare);
    pivotIndex = partition(arr, left, right, pivotIndex, compare);
    if (pivotIndex === dest) {
      return pivotIndex;
    } else if (pivotIndex < dest) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }
};

const medianOfMedians = <T>(
  arr: T[],
  left: number,
  right: number,
  compare: (a: T, b: T) => number
) => {
  const numMedians = Math.ceil((right - left) / 5);
  for (let i = 0; i < numMedians; i++) {
    const subLeft = left + i * 5;
    let subRight = subLeft + 4;
    if (subRight > right) {
      subRight = right;
    }
    const medianIdx = selectIdx(
      arr,
      subLeft,
      subRight,
      Math.floor((subRight - subLeft) / 2),
      compare
    );
    const temp = arr[medianIdx];
    arr[medianIdx] = arr[left + i];
    arr[left + i] = temp;
  }
  return selectIdx(
    arr,
    left,
    left + numMedians - 1,
    Math.floor(numMedians / 2),
    compare
  );
};

const defaultCompare = <T>(a: T, b: T) => {
  return a < b ? -1 : a > b ? 1 : 0;
};
