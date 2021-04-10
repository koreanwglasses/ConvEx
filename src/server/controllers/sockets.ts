import { User } from "discord.js";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { Session } from "express-session";
import * as HTTP from "http";
import passport from "passport";
import * as SocketIO from "socket.io";
import { sessionMiddleware } from "../middlewares/sessions";

let io: SocketIO.Server;
export const init = ({ httpServer }: { httpServer: HTTP.Server }) => {
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
    console.log(`new connection ${socket.id}`);
    socket.on("whoami", (cb) => {
      cb(socket.request.user ? socket.request.user.username : "");
    });

    const session = socket.request.session;
    console.log(`saving sid ${socket.id} in session ${session.id}`);
    session.socketId = socket.id;
    session.save();
  });
};
