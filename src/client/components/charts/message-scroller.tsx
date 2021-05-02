import * as d3 from "d3";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { unstable_batchedUpdates } from "react-dom";
import useThunkReducer, { Thunk } from "react-hook-thunk-reducer";
import { filterBetween_nonDecreasingMap } from "../../../common/algorithms";
import { createReducer, minBy, pick } from "../../../common/utils";
import { Message } from "../../../endpoints";
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

    originMessageId?: string;
    offset?: number;
    step?: number;
  };
  autoscroll: boolean;
  containerHeight: number;
  isExpanding: boolean;
  transitionAlpha: number;
  transitionPivot?: string;
  messageCount: number;
  focus?: Message;
};

type Action = Parameters<typeof reducer>[1];
const reducer = createReducer({
  setOffset(state: State, action: { offset: number }) {
    if (state.yAxis.type != "point")
      throw new Error('setOffset should only be used with "point" mode');
    return { ...state, yAxis: { ...state.yAxis, offset: action.offset } };
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateMessages(state: State, _: unknown) {
    const { guildId, channelId } = state;
    return {
      ...state,
      messageCount: messageManager({ guildId, channelId }).cache.length,
    };
  },

  setOriginMessageId(state: State, action: { id: string }) {
    return { ...state, yAxis: { ...state.yAxis, originMessageId: action.id } };
  },

  setTimeDomain(state: State, action: { domain: [number, number] }) {
    return { ...state, yAxis: { ...state.yAxis, domain: action.domain } };
  },

  setAutoscroll(state: State, action: { autoscroll: boolean }) {
    return { ...state, autoscroll: action.autoscroll };
  },

  setContainerHeight(state: State, action: { height: number }) {
    return { ...state, containerHeight: action.height };
  },

  setIsExpanding(state: State, action: { value: boolean }) {
    if (DEBUG && state.isExpanding && action.value) {
      console.error(
        "isExpanding has been set to true twice in a row. This is indicative of a bug."
      );
    }
    return { ...state, isExpanding: action.value };
  },

  setFocus(state: State, action: { focus?: Message }) {
    return { ...state, focus: action.focus };
  },

  setYAxisType(
    state: State,
    action: { value: State["yAxis"]["type"]; pivot?: string }
  ) {
    const { guildId, channelId, containerHeight, yAxis } = state;
    const mm = messageManager({ guildId, channelId });

    const switchToPointScale = (): State => {
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

      const { computeOffset } = axes(state);
      const offset = computeOffset(pivotMessageId, containerHeight / 2);

      return {
        ...state,
        yAxis: { ...yAxis, type: "point", offset },
        transitionPivot: action.pivot,
      };
    };

    const switchToTimeScale = (): State => {
      const { yInvPoint } = axes(state);
      const i =
        Math.round(yInvPoint(containerHeight / 2)) +
        mm.cache.findIndexById(yAxis.originMessageId);
      const centerTimestamp = mm.cache[i]?.createdTimestamp ?? Date.now();

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
        autoscroll: centerTimestamp + timespan / 2 >= Date.now(),
      };
    };

    if (yAxis.type === action.value) return state;
    if (action.value === "point") return switchToPointScale();
    if (action.value === "time") return switchToTimeScale();
  },

  setTransitionAlpha(state: State, action: { value: number }) {
    return { ...state, transitionAlpha: Math.min(action.value, 1) };
  },
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
  })();
};

const expand = (): Thunk<State, Action> => async (dispatch, getState) => {
  const { guildId, channelId, yAxis, isExpanding } = getState();

  if (yAxis.type !== "point")
    throw new Error('expand should only be used with "point" mode');

  if (DEBUG && isExpanding) {
    console.warn("A previous call to expand is still in progress. Skipping...");
    return;
  }

  unstable_batchedUpdates(async () => {
    dispatch({ type: "setIsExpanding", value: true });
    await messageManager({ guildId, channelId }).expandBack();
    dispatch({ type: "setIsExpanding", value: false });
    dispatch({ type: "updateMessages" });
  });
};

const fastForward = (): Thunk<State, Action> => async (dispatch, getState) => {
  const { guildId, channelId, yAxis } = getState();

  if (yAxis.type === "time") {
    const timespan = yAxis.domain[1] - yAxis.domain[0];
    dispatch(setTimeDomain([Date.now() - timespan, Date.now()]));
  }

  if (yAxis.type === "point") {
    const mm = messageManager({ guildId, channelId });
    await mm.fastForward();
    dispatch({ type: "setOriginMessageId", id: mm.cache[0].id });
  }
};

const setAutoScroll = (autoscroll: boolean): Thunk<State, Action> => (
  dispatch,
  getState
) => {
  const state = getState();
  const { yAxis } = state;

  dispatch({ type: "setAutoscroll", autoscroll });
  if (!state.autoscroll && autoscroll && yAxis.type === "point") {
    unstable_batchedUpdates(() => {
      dispatch(setOffset(0));
      dispatch(fastForward());
    });
  }
};

const setTimeDomain = (
  domain: [min: number, max: number]
): Thunk<State, Action> => async (dispatch, getState) => {
  const { yAxis, guildId, channelId } = getState();

  dispatch({ type: "setTimeDomain", domain });
  if (yAxis.type === "time") {
    await messageManager({ guildId, channelId }).filterByTime(
      domain[0],
      domain[1]
    );
    dispatch({ type: "updateMessages" });
  }
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
  const { guildId, channelId, yAxis } = state;
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
  const mm = messageManager({ guildId, channelId });
  if (y(mm.cache.last()) > 0) {
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
  { yAxis, containerHeight, transitionAlpha, guildId, channelId }: State,
  yBounds: [top: number, bottom: number] = [0, containerHeight]
): {
  yScale?:
    | d3.ScaleTime<number, number, never>
    | d3.ScaleLinear<number, number, never>;
  y?: (message: Message) => number;
  yInvPoint?: (y: number) => number;
  yInvTime?: (y: number) => Date;
  yTime?: (timestamp: number) => number;
  yPoint?: (messageId: string) => number;
  computeOffset?: (messageId: string, targetY: number) => number;
} => {
  const [top, bottom] = yBounds;

  if (isNaN(top) || isNaN(bottom)) return {};

  const mm = messageManager({ guildId, channelId });

  const yScaleTime = d3.scaleTime().domain(yAxis.domain).range(yBounds);
  const yTime = (timestamp: number) => yScaleTime(timestamp);
  const yInvTime = (y: number) => yScaleTime.invert(y);

  const yPoint = (messageId: string) => {
    const originIdx = mm.cache.findIndexById(yAxis.originMessageId);
    const messageIdx = mm.cache.findIndexById(messageId);
    return (
      bottom +
      yAxis.offset -
      yAxis.step / 2 -
      (messageIdx - originIdx) * yAxis.step
    );
  };
  const yInvPoint = (y: number) => {
    const originIdx = mm.cache.findIndexById(yAxis.originMessageId);
    return originIdx + (bottom + yAxis.offset - y) / yAxis.step + 1 / 2;
  };
  const computeOffset = (messageId: string, targetY: number) => {
    const originIdx = mm.cache.findIndexById(yAxis.originMessageId);
    const messageIdx = mm.cache.findIndexById(messageId);
    return (
      targetY - bottom + yAxis.step / 2 + (messageIdx - originIdx) * yAxis.step
    );
  };
  const yScalePoint = d3
    .scaleLinear()
    .domain([yInvPoint(bottom), yInvPoint(top)])
    .range([bottom, top]);

  const timeFactor =
    yAxis.type === "time" ? transitionAlpha : 1 - transitionAlpha;
  const pointFactor =
    yAxis.type === "point" ? transitionAlpha : 1 - transitionAlpha;

  return {
    yScale: yAxis.type === "time" ? yScaleTime : yScalePoint,
    y: (message: Message) =>
      timeFactor * yTime(message.createdTimestamp) +
      pointFactor * yPoint(message.id),
    yInvPoint,
    yInvTime,
    yTime,
    yPoint,
    computeOffset,
  };
};

///////////
// Hooks //
///////////

const MessageScrollerContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action | Thunk<State, Action>>;
}>(undefined);

/**
 * Fetches messages whose y position (as determined by useAxes) is within the
 * given bounds.  By default, the bounds are minY = 0, maxY = maxChartHeight.
 * This function filters out messages some messages that are only partially
 * visible, so be sure to set the bounds with enough padding.
 */
export const useMessages = (minY?: number, maxY?: number) => {
  const state = useContext(MessageScrollerContext).state;
  const { guildId, channelId, containerHeight, yAxis } = state;

  const minY_ = minY ?? -yAxis.step;
  const maxY_ = maxY ?? containerHeight + yAxis.step;

  const { y } = axes(state);

  return useMemo(() => {
    if (!y) return [];
    const cache = messageManager({ guildId, channelId }).cache;
    return filterBetween_nonDecreasingMap(
      cache,
      (message) => -y(message),
      -maxY_,
      -minY_
    );
  }, [y, minY_, maxY_, state.messageCount]);
};

export const useAxes = (yBounds?: [top: number, bottom: number]) => {
  const state = useContext(MessageScrollerContext).state;
  return useMemo(
    () => ({
      ...pick(axes(state, yBounds), ["y", "yScale", "yTime"]),
      ...pick(state, ["yAxis", "transitionAlpha", "transitionPivot"]),
    }),
    [
      state.yAxis,
      state.containerHeight,
      state.transitionAlpha,
      state.transitionPivot,
    ]
  );
};

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

export const useFocus = () => {
  const { state, dispatch } = useContext(MessageScrollerContext);
  const setFocus = useMemo(
    () => (focus?: Message) => dispatch({ type: "setFocus", focus }),
    [dispatch]
  );
  const focus = state.focus;
  return useMemo(() => [focus, setFocus] as const, [focus]);
};

export const useContainerSize = () =>
  pick(useContext(MessageScrollerContext).state, ["containerHeight"]);

///////////////
// Component //
///////////////

export const MessageScroller = ({
  channelId,
  guildId,
  children,
  defaultYAxis,
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
    yAxis: {
      type: "time",
      domain: [Date.now() - DEFAULT_TIMESPAN, Date.now()],
      step: 60,
      offset: 0,
      originMessageId: null,
      ...(defaultYAxis ?? {}),
    },
    autoscroll: undefined,
    containerHeight: undefined,
    isExpanding: false,
    transitionAlpha: 1,
    messageCount: 0,
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
      dispatch(
        setContainerHeight(
          Math.max(
            window.innerHeight -
              window.pageYOffset -
              containerRef.current.getBoundingClientRect().top -
              32,
            400
          )
        )
      );

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
        dispatch(setTimeDomain([maxTime - timespan, maxTime]));
      }, 1000);
      return () => clearInterval(rc);
    }
  }, [autoscroll, yAxis]);

  /* Livestream messages instead of refetching if autoscroll */
  useEffect(() => {
    if (autoscroll) {
      const subscription = Sockets.subscribeToMessages(
        { guildId, channelId },
        () => {
          dispatch(fastForward());
        }
      );
      return () => subscription.unsubscribe();
    }
  }, [autoscroll]);

  const context = useMemo(() => ({ state, dispatch }), [
    state.yAxis,
    state.containerHeight,
    state.autoscroll,
    state.transitionAlpha,
    state.messageCount,
    state.focus,
    dispatch,
  ]);

  return (
    <MessageScrollerContext.Provider value={context}>
      {showToolbar && <MessageScrollerToolbar />}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: state.containerHeight,
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
