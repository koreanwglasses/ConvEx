import * as React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import { Message } from "../../endpoints";
import { useMessagesAdvanced } from "../hooks/use-messages-advanced";

const InfiniteScrollContext = React.createContext<Message[]>([]);

export const useMessages = () => useContext(InfiniteScrollContext);

export const InfiniteScroll = ({
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
  ] = useMessagesAdvanced({
    guildId,
    channelId,
  });
  const [scrollPos, setScrollPos] = useState(0);

  const contentWrapperRef = useRef<HTMLDivElement>();
  useEffect(() => {
    if (contentWrapperRef.current)
      contentWrapperRef.current.scrollTop =
        contentWrapperRef.current.scrollHeight - scrollPos;
  }, [messages]);

  const scrollHandler = () => {
    const contentWrapper = contentWrapperRef.current;

    if (lastExpandResult > 0 && contentWrapper.scrollTop == 0) {
      expand();
    }

    setScrollPos(contentWrapper.scrollHeight - contentWrapper.scrollTop);

    const isScrolledToBottom =
      contentWrapper.scrollHeight - contentWrapper.scrollTop <=
      contentWrapper.clientHeight;

    if (isScrolledToBottom && paused) resumeStream();
    if (!isScrolledToBottom && !paused) pauseStream();
  };

  return (
    <InfiniteScrollContext.Provider value={messages}>
      <div
        ref={contentWrapperRef}
        onScroll={scrollHandler}
        style={{ overflowY: "scroll" }}
        className={className}
      >
        {children}
      </div>
    </InfiniteScrollContext.Provider>
  );
};
