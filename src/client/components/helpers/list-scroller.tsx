import * as React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import { Message } from "../../../endpoints";
import { useMessageCollection } from "../../hooks/use-message-collection";

const ListScrollerContext = React.createContext<Message[]>([]);

export const useMessages = () => useContext(ListScrollerContext);

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
    { messages, lastExpandResult, paused },
    { expand, pauseStream, resumeStream },
  ] = useMessageCollection({
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

    if (lastExpandResult > 0 && scrollContainer.scrollTop == 0) {
      expand();
    }

    setScrollPos(scrollContainer.scrollHeight - scrollContainer.scrollTop);

    const isScrolledToBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop <=
      scrollContainer.clientHeight;

    if (isScrolledToBottom && paused) resumeStream();
    if (!isScrolledToBottom && !paused) pauseStream();
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
