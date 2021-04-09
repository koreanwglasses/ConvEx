import express from "express";
import { resolve } from "path";
import { createServer } from "http";
import passport from "passport";
import { Strategy } from "passport-discord";
import * as localConfig from "./config.local";
import * as config from "./config";
import * as Discord from "./discord";
import createMemoryStore from "memorystore";
import session from "express-session";
import { User } from "discord.js";
import { asyncFilter } from "../utils";

const app = express();

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

app.get("/api/guild/list", async (req, res) => {
  if (req.isUnauthenticated()) return res.sendStatus(401);

  const user = req.user as User;
  const guilds = await asyncFilter(Discord.listGuilds(), (guild) =>
    Discord.hasPermission(user.id, guild.id, "canView")
  );
  return res.send(guilds);
});

app.get("/api/guild/fetch/:guildId", async (req, res) => {
  const { guildId } = req.params;

  if (req.isUnauthenticated()) return res.sendStatus(401);

  const user = req.user as User;

  if (!(await Discord.hasPermission(user.id, guildId, "canView")))
    return res.sendStatus(401);

  const guild = await Discord.fetchGuild(guildId);
  return res.send(guild);
});

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

export const http = createServer(app);

export const start = () => http.listen(config.port);
