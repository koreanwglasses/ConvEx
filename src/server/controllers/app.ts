import { User } from "discord.js";
import express from "express";
import asyncHandler from "express-async-handler";
import passport from "passport";
import { resolve } from "path";
import * as config from "../../config";
import { asyncFilter } from "../../utils";
import { sessionMiddleware } from "../middlewares/sessions";
import * as Discord from "./discord";

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

app.get("/login", passport.authenticate("discord"));

app.get(
  "/login/callback",
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

app.post(
  "/api/guild/list",
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

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
  "/api/guild",
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.body;
    const guild = await Discord.fetchGuild(guildId);
    return res.send(guild);
  })
);

app.post(
  "/api/channel",
  requirePermission("canView"),
  asyncHandler(async (req, res) => {
    const { guildId, channelId } = req.body;

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    return res.send(channel);
  })
);

app.post(
  "/api/message/list",
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
