import passport from "passport";
import { Strategy } from "passport-discord";
import * as config from "../../config";
import { routes } from "../../endpoints";
import * as localConfig from "../config.local";

export const init = () => {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new Strategy(
      {
        clientID: localConfig.clientID,
        clientSecret: localConfig.clientSecret,
        callbackURL: `${
          config.mode === "remote-development"
            ? config.remoteBaseURL
            : config.baseURL
        }${+config.port === 80 ? "" : `:${config.port}`}${routes.authCallback}`,
        scope: ["identify", "guilds"],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
};
