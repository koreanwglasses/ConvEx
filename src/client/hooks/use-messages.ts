import to from "await-to-js";
import React, { useEffect, useReducer } from "react";
import { Message, routes } from "../../endpoints";
import { api } from "../api";
import * as Sockets from "../sockets";

type State = {
  /** non-null if an error was raised after a dispatch */
  error: Error;

  messages: Message[];

  /**
   * If true, new messages are pushed directly into messages. Else messages
   * are stored in buffer. This is to prevent unnecessary changes when
   * rendering.
   */
  live: boolean;

  /** New messages are stored in buffer if live is false */
  newMessageBuffer: Message[];

  /** Stores the number of items fetched on the last call to expand. -1 if there was an error */
  lastExpandResult: number;

  /** Indicated whether or not an expand action is currently running */
  isExpanding: boolean;
};
type Action =
  | {
      type: "expandFinish";
      olderMessages?: Message[];
      result?: number;
      error?: Error;
    }
  | { type: "newMessage"; message: Message }
  | { type: "flush" }
  | { type: "expandStart" }
  | { type: "setLive"; live: boolean };
const reducer: React.Reducer<State, Action> = (state, action) => {
  const flush = () => {
    state.messages = [...state.newMessageBuffer, ...state.messages];
    state.newMessageBuffer = [];
  };

  if (action.type === "expandFinish") {
    state.error = action.error;
    if (!action.error) {
      state.messages = [...state.messages, ...action.olderMessages];
    }
    state.lastExpandResult = action.result;
    state.isExpanding = false;
  } else if (action.type === "newMessage") {
    state.newMessageBuffer = [action.message, ...state.newMessageBuffer];
    if (state.live) {
      flush();
    }
  } else if (action.type === "flush") {
    flush();
  } else if (action.type === "expandStart") {
    state.isExpanding = true;
  } else if (action.type === "setLive") {
    state.live = action.live;
  }

  return { ...state };
};

export const useMessages = ({
  guildId,
  channelId,
  defaultLive = true,
}: {
  guildId: string;
  channelId: string;
  defaultLive?: boolean;
}) => {
  const [state, dispatch] = useReducer(reducer, {
    error: null,
    messages: [],
    live: defaultLive,
    newMessageBuffer: [],
    lastExpandResult: 0,
    isExpanding: false,
  });

  const expand = async ({
    limit = 100,
    force = false,
  }: {
    limit?: number;
    force?: boolean;
  }) => {
    if (!force && state.lastExpandResult === 0) {
      return dispatch({ type: "expandFinish", olderMessages: [], result: 0 });
    }

    const lastMessage =
      state.messages.length && state.messages[state.messages.length - 1];

    const [err, olderMessages] = await to(
      api(routes.apiListMessages, {
        guildId,
        channelId,
        limit,
        before: lastMessage?.id,
      })
    );

    if (err) {
      return dispatch({ type: "expandFinish", result: -1, error: err });
    }

    return dispatch({
      type: "expandFinish",
      olderMessages,
      result: olderMessages.length,
    });
  };

  useEffect(() => {
    const listenerControls = Sockets.listenForMessages(
      { guildId, channelId },
      (message) => {
        dispatch({ type: "newMessage", message });
      }
    );
    return () => listenerControls.removeListener();
  }, []);

  useEffect(() => {
    expand({ force: true });
  }, []);

  const { error, messages, live, lastExpandResult, isExpanding } = state;
  return [
    {
      error,
      messages,
      live,
      lastExpandResult,
    } as Pick<State, "error" | "messages" | "live" | "lastExpandResult">,
    {
      expand: ({ limit, force }: { limit: number; force: boolean }) => {
        if (!isExpanding) {
          dispatch({ type: "expandStart" });
          return expand({ limit, force });
        }
      },
      /**
       * Flush new messages to message array. Called automatically if live is true
       */
      flush: () => dispatch({ type: "flush" }),
      setLive: (live: boolean) => dispatch({ type: "setLive", live }),
    },
  ] as const;
};
