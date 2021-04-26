import * as d3 from "d3";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Message } from "../../../endpoints";
import { messageManager } from "../../models/discord";
import * as Sockets from "../../sockets";

type State = {
  yAxis:
    | { type: "time"; domain: [min: number, max: number] }
    | { type: "point"; offset: number; step: number };
  messages: Message[];
  autoScroll: boolean;
};
type Dispatch = {
  scrollTime: (state: State, deltaY: number) => void;
  scrollTimeScale: (state: State, deltaY: number, origin?: number) => void;
};
const MessageScrollerContext = createContext({
  state: {} as State,
  dispatch: {} as Dispatch,
});

export const useMessages = () =>
  useContext(MessageScrollerContext).state.messages;

const axes = (
  { yAxis, messages }: State,
  yBounds?: [top: number, bottom: number]
) => {
  if (yAxis.type === "time") {
    const yScale =
      yBounds[0] &&
      yBounds[1] &&
      d3.scaleTime().domain(yAxis.domain).range(yBounds);
    const y =
      yBounds[0] &&
      yBounds[1] &&
      ((message: Message) => yScale(message.createdTimestamp));
    return { yAxis, yScale, y };
  }
  if (yAxis.type === "point") {
    const yScale =
      yBounds[0] &&
      yBounds[1] &&
      d3
        .scalePoint()
        .domain(messages.map(({ id }) => id))
        .range([
          yBounds[1] + yAxis.offset,
          yBounds[1] - messages.length * yAxis.step + yAxis.offset,
        ]);
    const y =
      yBounds[0] && yBounds[1] && ((message: Message) => yScale(message.id));
    return { yAxis, yScale, y };
  }
};
export const useAxes = (yBounds?: [top: number, bottom: number]) =>
  axes(useContext(MessageScrollerContext).state, yBounds);

export const useDispatch = () => {
  const { state, dispatch } = useContext(MessageScrollerContext);

  return {
    scrollTime: (deltaY: number) => dispatch.scrollTime(state, deltaY),
    scrollTimeScale: (deltaY: number, origin?: number) =>
      dispatch.scrollTimeScale(state, deltaY, origin),
  };
};

export const MessageScroller = ({
  channelId,
  guildId,
  children,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
}>) => {
  const containerRef = useRef<HTMLDivElement>();

  ///////////
  // State //
  ///////////
  const [yAxis, setYAxis] = useState<State["yAxis"]>({
    type: "time",
    domain: [Date.now() - 1000 * 60 * 60, Date.now()],
  });
  const [messages, setMessages] = useState<State["messages"]>([]);
  const [autoScroll, setAutoScroll_] = useState<State["autoScroll"]>();

  /////////////
  // Helpers //
  /////////////

  // Note: Until React allows dispatches within a reducer, this is the
  // cleanest solution

  /* Fetches messages within timespan and updates state */
  const refetch = async ({ yAxis }: Pick<State, "yAxis">) => {
    if (yAxis.type !== "time")
      throw new Error('refetch should only be used with "time" mode');

    setMessages(
      await messageManager({ guildId, channelId }).filterByTime(
        yAxis.domain[0],
        yAxis.domain[1]
      )
    );
  };

  ////////////////
  // Dispatches //
  ////////////////

  const setAutoScroll = (
    state: Pick<State, "yAxis" | "autoScroll">,
    autoScroll: boolean
  ) => {
    setAutoScroll_(autoScroll);
    if (!state.autoScroll && autoScroll) refetch(state);
  };

  const setTimeDomain = (
    state: Pick<State, "yAxis">,
    domain: [min: number, max: number],
    doRefetch = true
  ) => {
    const { yAxis } = state;

    if (yAxis.type !== "time")
      throw new Error('setTimespan should only be used with "time" mode');

    const newYAxis = { ...yAxis, domain };
    setYAxis(newYAxis);
    if (doRefetch) refetch(state);
  };

  const scrollTime = (
    state: Pick<State, "yAxis" | "autoScroll">,
    deltaY: number
  ) => {
    const { yAxis } = state;

    if (yAxis.type !== "time")
      throw new Error('scrollTime should only be used with "time" mode');

    const [minTime, maxTime] = yAxis.domain;
    const timespan = maxTime - minTime;
    const newMaxTime = maxTime + deltaY * timespan * 0.001;
    if (newMaxTime >= Date.now()) {
      setTimeDomain(state, [Date.now() - timespan, Date.now()]);
      setAutoScroll(state, true);
    } else {
      setTimeDomain(state, [newMaxTime - timespan, newMaxTime]);
      setAutoScroll(state, false);
    }
  };

  const scrollTimeScale = (
    state: Pick<State, "yAxis">,
    deltaY: number,
    origin?: number
  ) => {
    const { yAxis } = state;

    if (yAxis.type !== "time")
      throw new Error('scrollTimeScale should only be used with "time" mode');

    const [minTime, maxTime] = yAxis.domain;
    const timespan = maxTime - minTime;

    const newTimespan = Math.min(
      timespan * Math.exp(deltaY * 0.002),
      /** 1 year */ 3.154e10
    );

    const origin_ = origin === undefined ? (minTime + maxTime) / 2 : origin;
    const newMaxTime = Math.min(
      origin_ + (maxTime - origin_) * (newTimespan / timespan),
      Date.now()
    );

    setTimeDomain(state, [newMaxTime - newTimespan, newMaxTime]);
  };

  /////////////
  // Effects //
  /////////////

  /* Start with autoscroll */
  useEffect(() => {
    setAutoScroll({ yAxis, autoScroll }, true);
  }, []);

  /* Handle autoscrolling in time mode */
  useEffect(() => {
    if (autoScroll && yAxis.type === "time") {
      const rc = setInterval(() => {
        const timespan = yAxis.domain[1] - yAxis.domain[0];
        const maxTime = Date.now();
        setTimeDomain({ yAxis }, [maxTime - timespan, maxTime], false);
      }, 1000);
      return () => clearInterval(rc);
    }
  }, [autoScroll, yAxis]);

  /* Livestream messages instead of refetching if autoscroll */
  useEffect(() => {
    if (autoScroll) {
      const subscription = Sockets.subscribeToMessages(
        { guildId, channelId },
        (message) => {
          setMessages([message, ...messages]);
        }
      );
      return () => subscription.unsubscribe();
    }
  }, [messages, autoScroll]);

  return (
    <MessageScrollerContext.Provider
      value={{
        state: { yAxis, messages, autoScroll },
        dispatch: { scrollTime, scrollTimeScale },
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "75vh", display: "flex" }}
      >
        {children}
      </div>
    </MessageScrollerContext.Provider>
  );
};
