import { indexOfFirstPositive_nonDecreasingMap } from "../../../common/algorithms";
import { Message } from "../../../endpoints";

type SortedArray<T> = readonly T[] & { insert: (item: T) => number };
/**
 * An array that remains sorted ascending by key
 */
const sortedArray = <T>(
  key: (item: T) => number = (item) => +item,
  arr: T[] = []
): SortedArray<T> =>
  Object.assign(arr as readonly T[], {
    insert: (item: T) => {
      const i = indexOfFirstPositive_nonDecreasingMap(
        arr,
        (item2) => key(item2) - key(item)
      );
      if (i === -1) {
        arr.push(item);
        return arr.length - 1;
      } else {
        arr.splice(i, 0, item);
        return i;
      }
    },
  });

type MessageAggregationData = {
  /**
   * The first message this message is hidden by
   */
  parent: MessageAggregationData;

  /**
   * Minimum spacing ratio at which this message becomes visible
   *
   * spacingRatio = (scalingFactor (px/ms)) / ((1 - overlap (unitless)) * messageHeight (px))
   */
  minSpacingRatio: number;
};
type MAD = MessageAggregationData;

class Aggregator {
  private mads = new Map<string, MAD>();
  private messages = sortedArray<Message>(
    (message) => message.createdTimestamp
  );

  constructor(private priority: (message: Message) => number) {}

  insertMessage(message: Message) {
    /** Ensure no duplicates are added */
    if (this.mads.has(message.id)) return;

    const i = this.messages.insert(message);
    
  }
}
