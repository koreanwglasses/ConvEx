import { SortedArray, sortedArray } from "../../common/utils";
import { Message } from "../../endpoints";

type OverlapDatum = {
  message: Message;
  priority: number;
  /** Minimum spacing ratio at which this message becomes visible, in units of
   * ms^(-1).
   *
   * Formula:
   * spacingRatio = (scalingFactor (px/ms)) / ((1 - overlap (unitless)) * messageHeight (px))
   */
  minSpacingRatio: number;
  minSpacingRatioWithinUser: number;
};
class OverlapFilter {
  /** Array of overlap data, sorted **ascending** by time */
  private overlapData = sortedArray<OverlapDatum>(
    (datum) => datum.message.createdTimestamp
  );
  private overlapDataByUser = new Map<string, SortedArray<OverlapDatum>>();

  private insertMessage(message: Message, priority: number) {
    const datum = {
      message,
      priority,
      minSpacingRatio: 0,
      minSpacingRatioWithinUser: 0,
    };
    const { globalIndex, userIndex } = this.insertMessageWithSpacing(datum);

    const process = (datum2: OverlapDatum, withinUser = false) => {
      const minSpacingRatio =
        1 /
        Math.abs(
          datum.message.createdTimestamp - datum2.message.createdTimestamp
        );
      if (datum.priority > datum2.priority) {
        if (withinUser)
          datum2.minSpacingRatioWithinUser = Math.max(
            datum2.minSpacingRatioWithinUser,
            minSpacingRatio
          );
        else
          datum2.minSpacingRatio = Math.max(
            datum2.minSpacingRatio,
            minSpacingRatio
          );
        return false;
      } else {
        if (withinUser)
          datum.minSpacingRatioWithinUser = Math.max(
            datum.minSpacingRatioWithinUser,
            minSpacingRatio
          );
        else
          datum.minSpacingRatio = Math.max(
            datum.minSpacingRatio,
            minSpacingRatio
          );
        return true;
      }
    };

    for (let i = globalIndex - 1; i >= 0; i--) {
      const datum2 = this.overlapData[i];
      if (process(datum2)) break;
    }

    for (let i = globalIndex + 1; i < this.overlapData.length; i++) {
      const datum2 = this.overlapData[i];
      if (process(datum2)) break;
    }

    const withinUserData = this.overlapDataByUser.get(message.authorID);
    for (let i = userIndex - 1; i >= 0; i--) {
      const datum2 = withinUserData[i];
      if (process(datum2, true)) break;
    }

    for (let i = userIndex + 1; i < this.overlapData.length; i++) {
      const datum2 = withinUserData[i];
      if (process(datum2, true)) break;
    }
  }

  private insertMessageWithSpacing(datum: OverlapDatum) {
    const globalIndex = this.overlapData.insert(datum);
    if (!this.overlapDataByUser.has(datum.message.authorID))
      this.overlapDataByUser.set(
        datum.message.authorID,
        sortedArray((datum) => datum.message.createdTimestamp)
      );
    const userIndex = this.overlapDataByUser
      .get(datum.message.authorID)
      .insert(datum);
    return { globalIndex, userIndex };
  }

  filter(
    messageHeight: number,
    yBounds: [top: number, bottom: number],
    timeDomain: [minTime: number, maxTime: number],
    overlap: number,
    userId?: string
  ) {
    /**
     * Spacing in px/ms
     */
    const scalingFactor =
      (yBounds[1] - yBounds[0]) / (timeDomain[1] - timeDomain[0]);
    const spacingRatio = scalingFactor / ((1 - overlap) * messageHeight);

    if (userId)
      return (
        this.overlapDataByUser
          .get(userId)
          ?.filter(
            (datum) =>
              timeDomain[0] <= datum.message.createdTimestamp &&
              datum.message.createdTimestamp <= timeDomain[1] &&
              spacingRatio > datum.minSpacingRatioWithinUser
          )
          .map((datum) => datum.message) ?? []
      );
    else
      return this.overlapData
        .filter(
          (datum) =>
            timeDomain[0] <= datum.message.createdTimestamp &&
            datum.message.createdTimestamp <= timeDomain[1] &&
            spacingRatio > datum.minSpacingRatio
        )
        .map((datum) => datum.message);
  }
}

// import { performance } from "perf_hooks";
// const n = 100000;
// const items = new Array(n)
//   .fill(null)
//   .map(() => ({ x: Math.random(), y: Math.random() }))
//   .sort((a, b) => a.y - b.y);
// const rt = new RangeTree2D(items, false);
// let start = performance.now();
// let result = rt.query(0.7, 0.8, 0.1, 0.2);
// let end = performance.now();
// console.log(`Found ${result.length} matches. Time elapsed: ${end - start}ms`);
// start = performance.now();
// result = items.filter(
//   ({ x, y }) => 0.7 <= x && x <= 0.8 && 0.1 <= y && y <= 0.2
// );
// end = performance.now();
// console.log(`Found ${result.length} matches. Time elapsed: ${end - start}ms`);
