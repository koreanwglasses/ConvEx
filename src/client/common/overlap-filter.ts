import { indexOfFirstPositive_nonDecreasingMap } from "../../common/algorithms";
import { Message } from "../../endpoints";

type OverlapDatum = {
  message: Message;
  /** Minimum spacing ratio at which this message becomes visible, in units of ms^(-1) */
  minSpacingRatio: number;
};
class OverlapFilter {
  private overlapData: OverlapDatum[] = [];

  private insertMessageWithSpacing(datum: OverlapDatum) {
    if (this.overlapData.length === 0) this.overlapData.push(datum);

    const i = indexOfFirstPositive_nonDecreasingMap(
      this.overlapData,
      (datum2) => datum2.minSpacingRatio - datum.minSpacingRatio
    );

    if (i === -1) this.overlapData.push(datum);
    else this.overlapData.splice(i, 0, datum);
  }

  filter(
    messageHeight: number,
    yBounds: [top: number, bottom: number],
    timeDomain: [minTime: number, maxTime: number]
  ) {
    /**
     * Spacing in px/ms
     */
    const spacing = (yBounds[1] - yBounds[0]) / (timeDomain[1] - timeDomain[0]);
    const spacingRatio = spacing / messageHeight;

    const i = indexOfFirstPositive_nonDecreasingMap(
      this.overlapData,
      (datum) => datum.minSpacingRatio - spacingRatio
    );
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
