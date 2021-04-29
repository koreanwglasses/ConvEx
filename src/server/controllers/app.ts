import to from "await-to-js";
import { User } from "discord.js";
import express from "express";
import asyncHandler from "express-async-handler";
import methodOverride from "method-override";
import passport from "passport";
import { resolve } from "path";
import * as config from "../../config";
import { RequestBody, routes } from "../../endpoints";
import { asyncFilter } from "../../utils";
import * as localConfig from "../config.local";
import { sessionMiddleware } from "../middlewares/sessions";
import * as Discord from "../models/discord";
import * as Perspective from "../models/perspective";

const app = express();

if (config.mode === "remote-development") {
  app.use(methodOverride());
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Credentials", (true as unknown) as string);
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET,POST");
    res.header(
      "Access-Control-Allow-Headers",
      "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
    );
    if ("OPTIONS" == req.method) {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}
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

app.get(routes.logout, (req, res) => {
  req.logout();
  res.redirect("/");
});

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

app.get(routes.invite, (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${localConfig.clientID}&permissions=66560&scope=bot`;
  return res.redirect(url);
});

app.post(
  routes.apiCurrentUser,
  asyncHandler(async (req, res) => {
    if (req.isUnauthenticated()) return res.sendStatus(401);
    const user = await Discord.fetchUser((req.user as User).id);
    return res.send(user);
  })
);

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
        "MANAGE_GUILD"
      )
    );

    return res.send(guilds);
  })
);

app.post(
  routes.apiFetchGuild,
  requirePermission("MANAGE_GUILD"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.body;
    const guild = await Discord.fetchGuild(guildId);
    return res.send(guild);
  })
);

app.post(
  routes.apiFetchChannel,
  requirePermissions(["MANAGE_GUILD", "VIEW_CHANNEL"]),
  asyncHandler(async (req, res) => {
    const { guildId, channelId } = req.body;

    const guild = await Discord.fetchGuild(guildId);
    const channel = guild.channels.resolve(channelId);

    return res.send(channel);
  })
);

app.post(
  routes.apiListMessages,
  requirePermissions(["MANAGE_GUILD", "VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]),
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
  requirePermissions(["MANAGE_GUILD", "VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]),
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
              "MANAGE_GUILD",
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
  if (config.mode === "remote-development") {
    console.log(
      `Received a request for ${req.path} from ${req.ip}. Redirecting to ${config.localFrontEndUrl}${req.path}...`
    );
    return res.redirect(`${config.localFrontEndUrl}${req.path}`);
  }

  return res.sendFile(
    resolve(config.mode === "development" ? "dist" : "build", "index.html")
  );
});

export default app;
