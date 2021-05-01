import { filterBetween_nonDecreasingMap } from "../../common/algorithms";
import { selectMedian } from "../../common/median";

class RangeTree2DNode<T extends { x: number; y: number }> {
  private minX: number;
  private maxX: number;

  private split: number;
  private left: RangeTree2DNode<T> = null;
  private right: RangeTree2DNode<T> = null;
  /**
   * @param items Items must have ascending y-values
   */
  constructor(private items: readonly T[], private splitThreshold = 2000) {
    if (items.length === 0) return;
    if (items.length === 1) {
      this.minX = this.split = this.maxX = items[0].x;
      return;
    }

    const xValues = items.map(({ x }) => x);
    this.minX = Math.min(...xValues);
    this.maxX = Math.max(...xValues);

    if (items.length > splitThreshold) {
      this.split =
        xValues.length === 2
          ? (xValues[0] + xValues[1]) / 2
          : selectMedian(xValues);
      this.left = new RangeTree2DNode(
        items.filter(({ x }) => x <= this.split),
        splitThreshold
      );
      this.right = new RangeTree2DNode(
        items.filter(({ x }) => x > this.split),
        splitThreshold
      );
    }
  }

  query(xMin: number, xMax: number, yMin: number, yMax: number) {
    if (this.items.length === 0) return [];
    if (xMin <= this.minX && this.maxX <= xMax) {
      return filterBetween_nonDecreasingMap(
        this.items,
        (item) => item.y,
        yMin,
        yMax
      );
    }
    if (this.items.length <= this.splitThreshold) {
      return this.items.filter(
        ({ x, y }) => xMin <= x && x <= xMax && yMin <= y && y <= yMax
      );
    }

    const results: T[] = [];
    if (xMin <= this.split) {
      results.push(...this.left.query(xMin, xMax, yMin, yMax));
    }
    if (xMax > this.split) {
      results.push(...this.right.query(xMin, xMax, yMin, yMax));
    }
    return results;
  }
}

export class RangeTree2D<T extends { x: number; y: number }> {
  private root: RangeTree2DNode<T>;
  /**
   * @param sortY Pass in false if the y-values of items is already sorted ascending
   */
  constructor(items: readonly T[], sortY = true) {
    const items_ = sortY ? [...items].sort((a, b) => a.y - b.y) : items;
    this.root = new RangeTree2DNode(items_);
  }

  query(xMin: number, xMax: number, yMin: number, yMax: number) {
    return this.root.query(xMin, xMax, yMin, yMax);
  }
}
