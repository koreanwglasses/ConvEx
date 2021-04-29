import * as d3 from "d3";
import React, {
  createContext,
  Reducer,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { unstable_batchedUpdates } from "react-dom";
import useThunkReducer, { Thunk } from "react-hook-thunk-reducer";
import { Message } from "../../../endpoints";
import { hasDuplicates, minBy } from "../../../utils";
import { messageManager } from "../../models/discord";
import * as Sockets from "../../sockets";
import { MessageScrollerToolbar } from "./toolbar";

const DEBUG = true;
const DEFAULT_STEP = 60;
const DEFAULT_TIMESPAN = 1000 * 60 * 60 * 24;

/////////////
// Reducer //
/////////////

type State = {
  guildId: string;
  channelId: string;
  yAxis: {
    type: "time" | "point";
    domain?: [min: number, max: number];
    offset?: number;
    step?: number;
  };
  messages: Message[];
  autoscroll: boolean;
  containerHeight: number;
  isExpanding: boolean;
  transitionAlpha: number;
};
type Action =
  | { type: "setMessages"; messages: Message[] }
  | { type: "pushMessages"; messages: Message[] }
  | { type: "unshiftMessages"; messages: Message[] }
  | { type: "setOffset"; offset: number }
  | { type: "setTimeDomain"; domain: [number, number] }
  | { type: "setAutoscroll"; autoscroll: boolean }
  | { type: "setContainerHeight"; height: number }
  | { type: "setIsExpanding"; value: boolean }
  | { type: "setYAxisType"; value: State["yAxis"]["type"]; pivot?: string }
  | { type: "setTransitionAlpha"; value: number };

const reducer: Reducer<State, Action> = (state, action) => {
  const { guildId, channelId, yAxis, messages, containerHeight } = state;

  switch (action.type) {
    case "setMessages":
      return { ...state, messages: action.messages };

    case "pushMessages":
      if (
        DEBUG &&
        hasDuplicates([...messages, ...action.messages].map(({ id }) => id))
      ) {
        console.error(
          "Adding duplicate messages. This is indicative of a bug."
        );
      }
      return { ...state, messages: [...state.messages, ...action.messages] };

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

    case "setIsExpanding":
      if (DEBUG && state.isExpanding && action.value) {
        console.error(
          "isExpanding has been set to true twice in a row. This is indicative of a bug."
        );
      }
      return { ...state, isExpanding: action.value };

    case "setYAxisType":
      /* TODO: Optimize and clean up transition code */
      if (yAxis.type === action.value) return state;
      if (yAxis.type === "point" && action.value === "time") {
        const i = (containerHeight / 2 + yAxis.offset) / yAxis.step - 1;
        const centerTimestamp =
          messages[Math.round(i)]?.createdTimestamp ?? Date.now();

        const timespan = ((domain) =>
          domain ? domain[1] - domain[0] : DEFAULT_TIMESPAN)(yAxis.domain);

        const newMaxTime = Math.min(centerTimestamp + timespan / 2, Date.now());

        return {
          ...state,
          yAxis: {
            ...yAxis,
            type: "time",
            domain: [newMaxTime - timespan, newMaxTime],
          },
          autoscroll: newMaxTime + timespan / 2 >= Date.now(),
        };
      }
      if (yAxis.type === "time" && action.value === "point") {
        const newMessages = messageManager({ guildId, channelId }).cache;
        let pivotMessageId: string;
        if (action.pivot) {
          pivotMessageId = action.pivot;
        } else {
          const pivot = (yAxis.domain[1] + yAxis.domain[0]) / 2;
          pivotMessageId = minBy(newMessages, (message) =>
            Math.abs(message.createdTimestamp - pivot)
          ).id;
        }
        const pivotIdx = newMessages.findIndex(
          ({ id }) => pivotMessageId === id
        );

        const step = yAxis.step ?? DEFAULT_STEP;
        const offset = step * (pivotIdx + 1) - containerHeight / 2;
        return {
          ...state,
          yAxis: { ...yAxis, type: "point", step, offset },
          messages: newMessages,
        };
      }
      break;

    case "setTransitionAlpha":
      return { ...state, transitionAlpha: Math.min(action.value, 1) };

    default:
      return state;
  }
};

const setMessages = (messages: Message[]): Action => ({
  type: "setMessages",
  messages,
});

const pushMessages = (messages: Message[]): Action => ({
  type: "pushMessages",
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

const setYAxisType = (
  type: State["yAxis"]["type"],
  pivot?: string
): Thunk<State, Action> => (dispatch, getState) => {
  /* TODO: Optimize and clean up transition code */
  const { yAxis } = getState();
  if (yAxis.type === type) return;

  dispatch({
    type: "setYAxisType",
    value: type,
    pivot,
  });

  const animationStartTime = Date.now();
  (function animate() {
    const t = Date.now() - animationStartTime;
    const ease = (x: number) =>
      x < 0 || x > 1 ? x : Math.sin((Math.PI * x) / 2) ** 2;
    const alpha = ease(t / 1000);
    dispatch({ type: "setTransitionAlpha", value: alpha });

    if (alpha < 1) return requestAnimationFrame(animate);
    if (type === "time") return dispatch(refetch());
  })();
};

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
  const { guildId, channelId, yAxis, messages, isExpanding } = getState();

  if (yAxis.type !== "point")
    throw new Error('expand should only be used with "point" mode');

  if (DEBUG && isExpanding) {
    console.warn("A previous call to expand is still in progress. Skipping...");
    return;
  }

  unstable_batchedUpdates(async () => {
    dispatch({ type: "setIsExpanding", value: true });
    dispatch(
      pushMessages(
        await messageManager({ guildId, channelId }).fetchBefore(
          messages.length && messages[messages.length - 1].id
        )
      )
    );
    dispatch({ type: "setIsExpanding", value: false });
  });
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
      unstable_batchedUpdates(() => {
        dispatch(setOffset(0));
        dispatch(fastForward());
      });
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
    unstable_batchedUpdates(() => {
      dispatch(setTimeDomain([Date.now() - timespan, Date.now()]));
      dispatch(setAutoScroll(true));
    });
  } else {
    unstable_batchedUpdates(() => {
      dispatch(setTimeDomain([newMaxTime - timespan, newMaxTime]));
      dispatch(setAutoScroll(false));
    });
  }
};

const scrollOffset = (deltaY: number): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const state = getState();
  const { yAxis, messages } = state;
  if (yAxis.type !== "point")
    throw new Error('scrollOffset should only be used with "point" mode');

  const newOffset = yAxis.offset - deltaY;
  if (newOffset <= 0) {
    unstable_batchedUpdates(() => {
      dispatch(setOffset(0));
      dispatch(setAutoScroll(true));
    });
  } else {
    unstable_batchedUpdates(() => {
      dispatch(setOffset(yAxis.offset - deltaY));
      dispatch(setAutoScroll(false));
    });
  }

  const { y } = axes(state);
  if (messages.length && y && y(messages[messages.length - 1]) > 0) {
    dispatch(expand());
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
  { yAxis, messages, containerHeight, transitionAlpha }: State,
  yBounds: [top: number, bottom: number] = [0, containerHeight]
) => {
  /* TODO: Optimize with useMemo */
  const time = () => {
    const yScale =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? d3.scaleTime().domain(yAxis.domain).range(yBounds)
        : undefined;
    const y =
      !isNaN(yBounds[0]) && !isNaN(yBounds[1])
        ? (message: Message) => yScale(message.createdTimestamp)
        : undefined;
    return { yAxis, yScale, y, transitionAlpha };
  };
  const point = () => {
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
    return { yAxis, yScale, y, transitionAlpha };
  };

  /* TODO: Optimize and clean up transition code */
  if (yAxis.type === "time") {
    if (transitionAlpha < 1) {
      const { y: yPoint } = point();
      const { yAxis, yScale, y: yTime } = time();
      return {
        yAxis,
        yScale,
        y: (message: Message) =>
          (1 - transitionAlpha) * yPoint(message) +
          transitionAlpha * yTime(message),
        transitionAlpha,
      };
    } else {
      return time();
    }
  }
  if (yAxis.type === "point") {
    if (transitionAlpha < 1) {
      const { yAxis, yScale, y: yPoint } = point();
      const { y: yTime } = time();
      return {
        yAxis,
        yScale,
        y: (message: Message) =>
          (1 - transitionAlpha) * yTime(message) +
          transitionAlpha * yPoint(message),
        transitionAlpha,
      };
    } else {
      return point();
    }
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
  /* TODO: Optimize with useMemo */
  const context = useContext(MessageScrollerContext);

  const {
    guildId,
    channelId,
    yAxis,
    containerHeight,
    messages,
    transitionAlpha,
  } = context.state;

  /* Improve performance by filtering out messages that would be offscreen */
  const { y } = axes(context.state);

  /* TODO: Optimize and clean up transition code */
  if (transitionAlpha < 1) {
    return messageManager({ guildId, channelId }).cache.filter((message) => {
      const y_ = y(message);
      return 0 < y_ && y_ < containerHeight;
    });
  }

  if (yAxis.type === "point") {
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

  const dispatches = useMemo(
    () => ({
      scroll: (deltaY: number) => dispatch(scroll(deltaY)),
      scrollTimeScale: (deltaY: number, origin?: number) =>
        dispatch(scrollTimeScale(deltaY, origin)),
      setYAxisType: (type: State["yAxis"]["type"], pivot?: string) =>
        dispatch(setYAxisType(type, pivot)),
    }),
    [dispatch]
  );

  return dispatches;
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
    domain: [Date.now() - DEFAULT_TIMESPAN, Date.now()],
  },
  showToolbar = false,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
  defaultYAxis?: State["yAxis"];
  showToolbar?: boolean;
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
    isExpanding: false,
    transitionAlpha: 1,
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

  const context = useMemo(() => ({ state, dispatch }), [
    state.yAxis,
    state.messages,
    state.containerHeight,
    state.autoscroll,
    state.transitionAlpha,
    dispatch,
  ]);

  return (
    <MessageScrollerContext.Provider value={context}>
      {showToolbar && <MessageScrollerToolbar />}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "75vh",
          display: "flex",
          position: "relative",
          alignItems: "stretch",
        }}
      >
        {children}
      </div>
    </MessageScrollerContext.Provider>
  );
};
