import { User } from "discord.js";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { Session } from "express-session";
import passport from "passport";
import * as SocketIO from "socket.io";
import { sessionMiddleware } from "../middlewares/sessions";
import * as Discord from "./discord";
import httpServer from "./server";

let io: SocketIO.Server;

export const init = () => {
  io = new SocketIO.Server(httpServer);

  type Socket = SocketIO.Socket & {
    request: { user: User; session: Session & { socketId: string } };
  };

  // convert a connect middleware to a Socket.IO middleware
  const wrap = (middleware: RequestHandler) => (
    socket: SocketIO.Socket,
    next: NextFunction
  ) => middleware(socket.request as Request, {} as Response, next);

  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  io.use((socket: Socket, next) => {
    if (socket.request.user) {
      next();
    } else {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connect", (socket: Socket) => {
    socket.on(
      "listen-for-messages",
      async ({
        guildId,
        channelId,
      }: {
        guildId: string;
        channelId: string;
      }) => {
        if (
          !(await Discord.hasPermission(
            {
              userId: socket.request.user.id,
              guildId,
            },
            "canView"
          ))
        ) {
          return socket.emit("error", "Forbidden");
        }

        Discord.listenForMessages(guildId, channelId, (message) => {
          socket.emit("message", message);
        });
      }
    );

    const session = socket.request.session;
    session.socketId = socket.id;
    session.save();
  });
};
