import express from "express";
import { resolve } from "path";
import passport from "passport";
import { Strategy } from "passport-discord";
import * as localConfig from "../config.local";
import * as config from "../config";
import * as Discord from "./discord";
import createMemoryStore from "memorystore";
import session from "express-session";
import { User } from "discord.js";
import { asyncFilter } from "../../utils";
import asyncHandler from "express-async-handler";

export const app = express();

app.use(express.json());

//////////////
// Sessions //
//////////////

const MemoryStore = createMemoryStore(session);

app.use(
  session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: "7A039460D488C46AAB1A70265BF960D045684B20FF94C89E65A284F6A788A069",
    resave: false,
    saveUninitialized: false,
  })
);

////////////////////
// Authentication //
////////////////////

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new Strategy(
    {
      clientID: localConfig.clientID,
      clientSecret: localConfig.clientSecret,
      callbackURL: `${config.baseURL}${
        +config.port === 80 ? "" : `:${config.port}`
      }/login/callback`,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

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

app.post(
  "/api/guild/list",
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);

    const user = req.user as User;
    const guilds = await asyncFilter(Discord.listGuilds(), (guild) =>
      Discord.hasPermission(user.id, guild.id, "canView")
    );
    return res.send(guilds);
  })
);

app.post(
  "/api/guild",
  asyncHandler(async (req, res) => {
    const { guildId } = req.body;

    if (req.isUnauthenticated()) return res.sendStatus(401);

    const user = req.user as User;

    if (!(await Discord.hasPermission(user.id, guildId, "canView")))
      return res.sendStatus(401);

    const guild = await Discord.fetchGuild(guildId);
    return res.send(guild);
  })
);

app.post(
  "/api/channel",
  asyncHandler(async (req, res) => {
    const { guildId, channelId } = req.body;

    if (req.isUnauthenticated()) return res.sendStatus(401);

    const user = req.user as User;

    if (!(await Discord.hasPermission(user.id, guildId, "canView")))
      return res.sendStatus(401);

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    return res.send(channel);
  })
);

app.post(
  "/api/message/list",
  asyncHandler(async (req, res) => {
    const { guildId, channelId, limit = 100 } = req.body;

    if (req.isUnauthenticated()) return res.sendStatus(401);

    const user = req.user as User;

    if (!(await Discord.hasPermission(user.id, guildId, "canView")))
      return res.sendStatus(401);

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
