import express from "express";
import { resolve } from "path";
import { createServer } from "http";
import passport from "passport";
import { Strategy } from "passport-discord";
import * as localConfig from "./config.local";
import * as config from "./config";

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

const app = express();

app.use(passport.initialize());
app.use(passport.session());

app.get("/login", passport.authenticate("discord"));

app.get(
  "/login/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.use("/static", express.static(resolve("static")));

// Used for loading scripts with index.html
app.use(
  express.static(resolve(config.mode === "development" ? "dist" : "build"))
);

// Handle routing with react routes
app.get("*", (_, response) => {
  response.sendFile(
    resolve(config.mode === "development" ? "dist" : "build", "index.html")
  );
});

export const http = createServer(app);
