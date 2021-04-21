import to from "await-to-js";
import { User } from "discord.js";
import express from "express";
import asyncHandler from "express-async-handler";
import passport from "passport";
import { resolve } from "path";
import * as config from "../../config";
import { RequestBody, routes } from "../../endpoints";
import { asyncFilter } from "../../utils";
import { sessionMiddleware } from "../middlewares/sessions";
import * as Discord from "../models/discord";
import * as Perspective from "../models/perspective";

const app = express();

app.use(express.json());

//////////////
// Sessions //
//////////////

app.use(sessionMiddleware);

////////////////////
// Authentication //
////////////////////

app.use(passport.initialize());
app.use(passport.session());

app.get(routes.auth, passport.authenticate("discord"));

app.get(
  routes.authCallback,
  passport.authenticate("discord", {
    failureRedirect: "/",
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

/////////////
// Discord //
/////////////
const requirePermission = (permission?: Discord.Permission) =>
  asyncHandler(async (req, res, next) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

    const { guildId, channelId } = req.body;
    const { id: userId } = req.user as User;

    if (
      !(await Discord.hasPermission({ userId, guildId, channelId }, permission))
    ) {
      return res.sendStatus(403);
    }

    next();
  });

const requirePermissions = (permissions: Discord.Permission[]) =>
  asyncHandler(async (req, res, next) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

    const { guildId, channelId } = req.body;
    const { id: userId } = req.user as User;

    if (
      !(await Discord.hasPermissions(
        { userId, guildId, channelId },
        permissions
      ))
    ) {
      return res.sendStatus(403);
    }

    next();
  });

app.post(routes.apiCurrentUser, (req, res) => {
  if (req.isUnauthenticated()) return res.sendStatus(401);
  res.send(req.user);
});

app.post(
  routes.apiUser,
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const user = await Discord.fetchUser(userId);
    return res.send(user);
  })
);

app.post(
  routes.apiListGuilds,
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

    const { id: userId } = req.user as User;
    const guilds = await asyncFilter(Discord.listGuilds(), ({ id: guildId }) =>
      Discord.hasPermission(
        {
          userId,
          guildId,
        },
        "IS_MEMBER"
      )
    );

    return res.send(guilds);
  })
);

app.post(
  routes.apiFetchGuild,
  requirePermission("IS_MEMBER"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.body;
    const guild = await Discord.fetchGuild(guildId);
    return res.send(guild);
  })
);

app.post(
  routes.apiFetchChannel,
  requirePermission("VIEW_CHANNEL"),
  asyncHandler(async (req, res) => {
    const { guildId, channelId } = req.body;

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    return res.send(channel);
  })
);

app.post(
  routes.apiListMessages,
  requirePermissions(["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]),
  asyncHandler(async (req, res) => {
    const {
      guildId,
      channelId,
      limit,
      before,
      after,
      around,
    } = req.body as RequestBody[typeof routes.apiListMessages];

    const messages = await Discord.listMessages({
      guildId,
      channelId,
      limit,
      before,
      after,
      around,
    });

    return res.send(messages);
  })
);

app.post(
  routes.apiFetchMessage,
  requirePermissions(["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]),
  asyncHandler(async (req, res) => {
    const {
      guildId,
      channelId,
      messageId,
    } = req.body as RequestBody[typeof routes.apiFetchMessage];

    const message = await Discord.fetchMessage({
      guildId,
      channelId,
      messageId,
    });

    return res.send(message);
  })
);

/////////////////////
// Perspective API //
/////////////////////

app.post(
  routes.apiAnalyze,
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);
    const { id: userId } = req.user as User;

    const requests = req.body as RequestBody[typeof routes.apiAnalyze];

    const results = (
      await Promise.all(
        requests.map(async ({ guildId, channelId, messageId }) => {
          if (
            !(await Discord.hasPermissions({ userId, guildId, channelId }, [
              "VIEW_CHANNEL",
              "READ_MESSAGE_HISTORY",
            ]))
          )
            return [new Error("Forbidden"), undefined] as const;

          const message = await Discord.fetchMessage({
            guildId,
            channelId,
            messageId,
          });
          const [err, result] = await to(Perspective.analyzeMessage(message));

          return [err, result] as const;
        })
      )
    ).map(([err, result]) => ({
      error: err && { name: err.name, message: err.message },
      result,
    }));

    return res.send(results);
  })
);

////////////
// Client //
////////////

app.use("/static", express.static(resolve("static")));

// Prevents socket.io endpoint from being captured by the * below
app.use("/socket.io", (req, res, next) => next());

// Used for loading scripts with index.html
app.use(
  express.static(resolve(config.mode === "development" ? "dist" : "build"))
);

// Let react handle routing
app.get("*", (req, res) => {
  res.sendFile(
    resolve(config.mode === "development" ? "dist" : "build", "index.html")
  );
});

export default app;
