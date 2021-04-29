import React, { useContext, useEffect, useRef, useState } from "react";
import { Message } from "../../../endpoints";
import { useLiveMessages } from "../../hooks/use-live-messages";

/**
 * @depcreated Use ../charts/message-scroller instead
 */
const ListScrollerContext = React.createContext<Message[]>([]);

/**
 * @depcreated Use ../charts/message-scroller instead
 */
export const useMessages = () => useContext(ListScrollerContext);

/**
 * @depcreated Use ../charts/message-scroller instead
 */
export const ListScroller = ({
  children,
  guildId,
  channelId,
  className,
}: React.PropsWithChildren<{
  guildId: string;
  channelId: string;
  className?: string;
}>) => {
  const [
    { messages, hasReachedBeginning },
    { setPaused, expand },
  ] = useLiveMessages({
    guildId,
    channelId,
  });

  const [scrollPos, setScrollPos] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>();
  useEffect(() => {
    if (scrollContainerRef.current)
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight - scrollPos;
  }, [messages]);

  const scrollHandler = () => {
    const scrollContainer = scrollContainerRef.current;

    if (!hasReachedBeginning && scrollContainer.scrollTop == 0) {
      expand();
    }

    setScrollPos(scrollContainer.scrollHeight - scrollContainer.scrollTop);

    const isScrolledToBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop <=
      scrollContainer.clientHeight;

    setPaused(!isScrolledToBottom);
  };

  return (
    <ListScrollerContext.Provider value={messages}>
      <div
        ref={scrollContainerRef}
        onScroll={scrollHandler}
        style={{ overflowY: "scroll" }}
        className={className}
      >
        {children}
      </div>
    </ListScrollerContext.Provider>
  );
};
