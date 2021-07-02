import { useMemo } from "react";
import { compareTuple } from "../../../common/utils";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { useFocus, useMessages } from "../charts/message-scroller";

const overlapFactor = (
  [min1, max1]: [number, number],
  [min2, max2]: [number, number]
) => {
  const diameter = Math.max(Math.abs(max1 - min2), Math.abs(max2 - min1));
  const combinedSize = Math.abs(max1 - min1) + Math.abs(max2 - min2);
  return 2 - (2 * diameter) / combinedSize;
};

const groupOverlapping = <T>({
  items,
  bounds,
  comparePriority,
  overlapThreshold,
  presorted = false,
}: {
  items: readonly T[];
  bounds: (item: T) => [min: number, max: number];
  comparePriority: (a: T, b: T) => number;
  overlapThreshold: number;
  presorted?: boolean;
}) => {
  const sortedItems = presorted
    ? items
    : [...items].sort((a, b) => bounds(a)[0] - bounds(b)[0]);

  const groups: { top: T; members: T[] }[] = [];

  sortedItems.forEach((item) => {
    const lastGroup = groups.length === 0 ? null : groups[groups.length - 1];

    if (!lastGroup) {
      // First group
      groups.push({ top: item, members: [item] });
      return;
    }

    if (overlapFactor(bounds(item), bounds(lastGroup.top)) > overlapThreshold) {
      // Overlaps with last group
      lastGroup.members.push(item);

      if (comparePriority(item, lastGroup.top) > 0) {
        // Takes precedence over top item
        lastGroup.top = item;
      }
    } else {
      // Creates new group
      groups.push({ top: item, members: [item] });
    }
  });

  return groups;
};

export const groupOverlappingMessages = ({
  messages,
  y,
  messageHeight,
  overlapThreshold = 0.2,
  presorted = false,
  priority,
  focus,
}: {
  messages: Message[];
  y: (message: Message) => number;
  messageHeight: number;
  overlapThreshold?: number;
  presorted?: boolean;
  priority: (message: Message) => number;
  focus?: Message;
}) =>
  groupOverlapping({
    items: messages,
    bounds: (message) => [
      y(message) - messageHeight / 2,
      y(message) + messageHeight / 2,
    ],
    comparePriority: (a, b) =>
      compareTuple(
        [a.authorID === focus?.authorID, priority(a)],
        [b.authorID === focus?.authorID, priority(b)]
      ),
    presorted,
    overlapThreshold,
  });

export const useGroupedMessages = ({
  y,
  messageHeight,
  overlapThreshold,
}: {
  y: (message: Message) => number;
  messageHeight: number;
  overlapThreshold: number;
}) => {
  const messages = useMessages();
  const analyses = useAnalyses(messages);

  const [focus] = useFocus();

  const priority = (message: Message) =>
    analyses?.get(message.id)?.result?.attributeScores.TOXICITY.summaryScore
      .value ?? 0;

  return useMemo(
    () =>
      groupOverlappingMessages({
        messages,
        y,
        messageHeight,
        overlapThreshold,
        presorted: true,
        priority,
        focus,
      }),
    [
      messages[0]?.id,
      messages.length && messages[messages.length - 1].id,
      y,
      analyses,
      overlapThreshold,
      focus,
    ]
  );
};
