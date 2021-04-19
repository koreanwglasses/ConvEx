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
   * If false, new messages are pushed directly into messages. Else messages
   * are stored in buffer. This is to prevent unnecessary changes when
   * rendering.
   */
  paused: boolean;

  /** New messages are stored in buffer if live is false */
  newMessageBuffer: Message[];

  /** Stores the number of items fetched on the last call to expand. -1 if there was an error */
  lastExpandResult: number;

  /** A reference to the current running expand */
  expandPromise: Promise<number>;
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
  | { type: "expandStart"; expandPromise: Promise<number> }
  | { type: "pause" }
  | { type: "resume" };
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
    state.expandPromise = null;
  } else if (action.type === "newMessage") {
    state.newMessageBuffer = [action.message, ...state.newMessageBuffer];
    if (!state.paused) {
      flush();
    }
  } else if (action.type === "flush") {
    flush();
  } else if (action.type === "expandStart") {
    state.expandPromise = action.expandPromise;
  } else if (action.type === "pause") {
    state.paused = true;
  } else if (action.type === "resume") {
    state.paused = false;
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
    paused: defaultLive,
    newMessageBuffer: [],
    lastExpandResult: 0,
    expandPromise: null,
  });

  const expand = async ({
    limit = 100,
    force = false,
  }: {
    limit?: number;
    force?: boolean;
  }) => {
    if (!force && state.lastExpandResult === 0) {
      dispatch({ type: "expandFinish", olderMessages: [], result: 0 });
      return 0;
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
      dispatch({ type: "expandFinish", result: -1, error: err });
      return -1;
    }

    dispatch({
      type: "expandFinish",
      olderMessages,
      result: olderMessages.length,
    });
    return olderMessages.length;
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

  const { error, messages, paused, lastExpandResult } = state;
  return [
    {
      error,
      messages,
      paused,
      lastExpandResult,
    } as Pick<State, "error" | "messages" | "paused" | "lastExpandResult">,
    {
      expand: ({ limit, force }: { limit: number; force: boolean }) => {
        if (!state.expandPromise) {
          const expandPromise = expand({ limit, force });
          dispatch({ type: "expandStart", expandPromise });
          return expandPromise;
        }
        return state.expandPromise;
      },
      /**
       * Flush new messages to message array. Called automatically if paused is false
       */
      flush: () => dispatch({ type: "flush" }),
      pause: () => dispatch({ type: "pause" }),
      resume: () => dispatch({ type: "resume" }),
    },
  ] as const;
};
