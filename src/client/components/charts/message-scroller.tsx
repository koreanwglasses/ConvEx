import * as d3 from "d3";
import React, {
  createContext,
  Reducer,
  useContext,
  useEffect,
  useRef,
} from "react";
import useThunkReducer, { Thunk } from "react-hook-thunk-reducer";
import { Message } from "../../../endpoints";
import { messageManager } from "../../models/discord";
import * as Sockets from "../../sockets";

/////////////
// Reducer //
/////////////

type State = {
  guildId: string;
  channelId: string;
  yAxis:
    | { type: "time"; domain: [min: number, max: number] }
    | { type: "point"; offset: number; step: number };
  messages: Message[];
  autoscroll: boolean;
  containerHeight: number;
};
type Action =
  | { type: "setMessages"; messages: Message[] }
  | { type: "unshiftMessages"; messages: Message[] }
  | { type: "setOffset"; offset: number }
  | { type: "setTimeDomain"; domain: [number, number] }
  | { type: "setAutoscroll"; autoscroll: boolean }
  | { type: "setContainerHeight"; height: number };
const reducer: Reducer<State, Action> = (state, action) => {
  const { yAxis } = state;

  switch (action.type) {
    case "setMessages":
      return { ...state, messages: action.messages };

    case "unshiftMessages":
      return { ...state, messages: [...action.messages, ...state.messages] };

    case "setOffset":
      if (yAxis.type != "point")
        throw new Error('setOffset should only be used with "point" mode');
      return { ...state, yAxis: { ...yAxis, offset: action.offset } };

    case "setTimeDomain":
      if (yAxis.type != "time")
        throw new Error('setTimeDomain should only be used with "time" mode');
      return { ...state, yAxis: { ...yAxis, domain: action.domain } };

    case "setAutoscroll":
      return { ...state, autoscroll: action.autoscroll };

    case "setContainerHeight":
      return { ...state, containerHeight: action.height };

    default:
      return state;
  }
};

const setMessages = (messages: Message[]): Action => ({
  type: "setMessages",
  messages,
});

const unshiftMessages = (messages: Message[]): Action => ({
  type: "unshiftMessages",
  messages,
});

const setOffset = (offset: number): Action => ({ type: "setOffset", offset });

const setContainerHeight = (height: number): Action => ({
  type: "setContainerHeight",
  height,
});

const refetch = (): Thunk<State, Action> => async (dispatch, getState) => {
  const { guildId, channelId, yAxis } = getState();

  if (yAxis.type !== "time")
    throw new Error('refetch should only be used with "time" mode');

  dispatch(
    setMessages(
      await messageManager({ guildId, channelId }).filterByTime(
        yAxis.domain[0],
        yAxis.domain[1]
      )
    )
  );
};

const expand = (): Thunk<State, Action> => async (dispatch, getState) => {
  const { guildId, channelId, yAxis, messages } = getState();

  if (yAxis.type !== "point")
    throw new Error('expand should only be used with "point" mode');

  dispatch(
    unshiftMessages(
      await messageManager({ guildId, channelId }).fetchBefore(
        messages?.length && messages[messages.length - 1].id
      )
    )
  );
};

const fastForward = (): Thunk<State, Action> => async (dispatch, getState) => {
  const { guildId, channelId, yAxis } = getState();
  if (yAxis.type !== "point")
    throw new Error('fastForward should only be used with "point" mode');

  dispatch(
    setMessages(await messageManager({ guildId, channelId }).fetchRecent())
  );
};

const setAutoScroll = (autoscroll: boolean): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const state = getState();
  const { yAxis } = state;

  dispatch({ type: "setAutoscroll", autoscroll });
  if (!state.autoscroll && autoscroll) {
    if (yAxis.type === "time") {
      dispatch(refetch());
    }
    if (state.yAxis.type === "point") {
      dispatch(fastForward());
      dispatch(setOffset(0));
    }
  }
};

const setTimeDomain = (
  domain: [min: number, max: number],
  doRefetch = true
): Thunk<State, Action> => (dispatch, getState) => {
  const { yAxis } = getState();

  if (yAxis.type !== "time")
    throw new Error('setTimespan should only be used with "time" mode');

  dispatch({ type: "setTimeDomain", domain });
  if (doRefetch) dispatch(refetch());
};

const scrollTime = (deltaY: number): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const { yAxis } = getState();

  if (yAxis.type !== "time")
    throw new Error('scrollTime should only be used with "time" mode');

  const [minTime, maxTime] = yAxis.domain;
  const timespan = maxTime - minTime;
  const newMaxTime = maxTime + deltaY * timespan * 0.001;
  if (newMaxTime >= Date.now()) {
    dispatch(setTimeDomain([Date.now() - timespan, Date.now()]));
    dispatch(setAutoScroll(true));
  } else {
    dispatch(setTimeDomain([newMaxTime - timespan, newMaxTime]));
    dispatch(setAutoScroll(false));
  }
};

const scrollOffset = (deltaY: number): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const { yAxis } = getState();
  if (yAxis.type !== "point")
    throw new Error('scrollOffset should only be used with "point" mode');

  const newOffset = yAxis.offset - deltaY;
  if (newOffset <= 0) {
    dispatch(setOffset(0));
    dispatch(setAutoScroll(true));
  } else {
    dispatch(setOffset(yAxis.offset - deltaY));
    dispatch(setAutoScroll(false));
  }
};

const scroll = (deltaY: number): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const { yAxis } = getState();
  if (yAxis.type === "time") dispatch(scrollTime(deltaY));
  if (yAxis.type === "point") dispatch(scrollOffset(deltaY));
};

const scrollTimeScale = (
  deltaY: number,
  origin?: number
): Thunk<State, Action> => (dispatch, getState) => {
  const { yAxis } = getState();

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

  dispatch(setTimeDomain([newMaxTime - newTimespan, newMaxTime]));
};

/////////////
// Helpers //
/////////////

const axes = (
  { yAxis, messages }: State,
  yBounds?: [top: number, bottom: number]
) => {
  if (yAxis.type === "time") {
    const yScale =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? d3.scaleTime().domain(yAxis.domain).range(yBounds)
        : undefined;
    const y =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? (message: Message) => yScale(message.createdTimestamp)
        : undefined;
    return { yAxis, yScale, y };
  }
  if (yAxis.type === "point") {
    const yScale =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? d3
            .scalePoint()
            .domain(messages.map(({ id }) => id))
            .range([
              yBounds[1] + yAxis.offset - yAxis.step,
              yBounds[1] - messages.length * yAxis.step + yAxis.offset,
            ])
        : undefined;
    const y =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? (message: Message) => yScale(message.id)
        : undefined;
    return { yAxis, yScale, y };
  }
};

///////////
// Hooks //
///////////

const MessageScrollerContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action | Thunk<State, Action>>;
}>(undefined);

export const useMessages = () => {
  const context = useContext(MessageScrollerContext);

  const { yAxis, containerHeight, messages } = context.state;
  if (yAxis.type === "point") {
    /* Improve performance by filtering out messages that would be offscreen */
    const { y } = axes(context.state, [0, containerHeight]);
    return y
      ? messages.filter((message) => {
          const y_ = y(message);
          return -yAxis.step < y_ && y_ < containerHeight + yAxis.step;
        })
      : [];
  }

  return messages;
};

export const useAxes = (yBounds?: [top: number, bottom: number]) =>
  axes(useContext(MessageScrollerContext).state, yBounds);

export const useDispatch = () => {
  const { dispatch } = useContext(MessageScrollerContext);

  const createDispatches = () => ({
    scroll: (deltaY: number) => dispatch(scroll(deltaY)),
    scrollTimeScale: (deltaY: number, origin?: number) =>
      dispatch(scrollTimeScale(deltaY, origin)),
  });
  const dispatches = useRef(createDispatches());

  useEffect(() => {
    dispatches.current = createDispatches();
  }, [dispatch]);

  return dispatches.current;
};

///////////////
// Component //
///////////////

export const MessageScroller = ({
  channelId,
  guildId,
  children,
  defaultYAxis = {
    type: "time",
    domain: [Date.now() - 1000 * 60 * 60, Date.now()],
  },
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
  defaultYAxis?: State["yAxis"];
}>) => {
  const containerRef = useRef<HTMLDivElement>();

  ///////////
  // State //
  ///////////

  const [state, dispatch] = useThunkReducer(reducer, {
    guildId,
    channelId,
    yAxis: defaultYAxis,
    messages: [],
    autoscroll: undefined,
    containerHeight: undefined,
  });

  const { autoscroll, yAxis } = state;

  /////////////
  // Effects //
  /////////////

  /* Start with autoscroll */
  useEffect(() => {
    dispatch(setAutoScroll(true));
  }, []);

  /* Keep track of height */
  useEffect(() => {
    const updateHeight = () =>
      dispatch(setContainerHeight(containerRef.current.clientHeight));

    updateHeight();

    addEventListener("resize", updateHeight);
    return () => removeEventListener("resize", updateHeight);
  }, []);

  /* Handle autoscrolling in time mode */
  useEffect(() => {
    if (autoscroll && yAxis.type === "time") {
      const rc = setInterval(() => {
        const timespan = yAxis.domain[1] - yAxis.domain[0];
        const maxTime = Date.now();
        dispatch(setTimeDomain([maxTime - timespan, maxTime], false));
      }, 1000);
      return () => clearInterval(rc);
    }
  }, [autoscroll, yAxis]);

  /* Livestream messages instead of refetching if autoscroll */
  useEffect(() => {
    if (autoscroll) {
      const subscription = Sockets.subscribeToMessages(
        { guildId, channelId },
        (message) => {
          dispatch(unshiftMessages([message]));
        }
      );
      return () => subscription.unsubscribe();
    }
  }, [autoscroll]);

  return (
    <MessageScrollerContext.Provider value={{ state, dispatch }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "75vh",
          display: "flex",
          position: "relative",
        }}
      >
        {children}
      </div>
    </MessageScrollerContext.Provider>
  );
};
