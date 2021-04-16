import { User } from "discord.js";
import express from "express";
import asyncHandler from "express-async-handler";
import passport from "passport";
import { resolve } from "path";
import * as config from "../../config";
import { routes } from "../../endpoints";
import { asyncFilter } from "../../utils";
import { sessionMiddleware } from "../middlewares/sessions";
import * as Discord from "./discord";
import * as Perspective from "./perspective";

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

const requirePermission = (permission: Discord.Permission) =>
  asyncHandler(async (req, res, next) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

    const { guildId, channelId } = req.body;
    const { id: userId } = req.user as User;

    if (
      !(await Discord.hasPermission(
        {
          userId,
          guildId,
          channelId,
        },
        permission
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
    const { id: userId } = req.user as User;
    const guilds = await asyncFilter(Discord.listGuilds(), ({ id: guildId }) =>
      Discord.hasPermission(
        {
          userId,
          guildId,
        },
        "canView"
      )
    );
    return res.send(guilds);
  })
);

app.post(
  routes.apiFetchGuild,
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.body;
    const guild = await Discord.fetchGuild(guildId);
    return res.send(guild);
  })
);

app.post(
  routes.apiFetchChannel,
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId, channelId } = req.body;

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    return res.send(channel);
  })
);

app.post(
  routes.apiListMessages,
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId, channelId, limit = 100 } = req.body;

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    if (!channel.isText())
      return res.status(500).send("Channel is not a text channel");

    const messages = await channel.messages.fetch({ limit });

    return res.send(messages);
  })
);

/////////////////////
// Perspective API //
/////////////////////

app.post(
  routes.apiAnalyze,
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId, channelId, messageIds } = req.body as {
      guildId: string;
      channelId: string;
      messageIds: string[];
    };

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    if (!channel.isText())
      return res.status(500).send("Channel is not a text channel");

    const analyses = await Promise.all(
      messageIds
        .map((messageId) => channel.messages.fetch(messageId))
        .map(async (message) => await Perspective.analyzeMessage(await message))
    );

    return res.send(analyses);
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
