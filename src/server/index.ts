import * as config from "../config";
import * as Server from "./controllers/server";
import * as Sockets from "./controllers/sockets";
import * as Auth from "./middlewares/auth";
import * as Discord from "./models/discord";

(async () => {
  console.log(`Server running in ${config.mode} mode`);

  Auth.init();
  Sockets.init();

  console.log("Logging into Discord...");
  await Discord.start();

  console.log("Starting server...");
  await Server.start();

  console.log(
    `Server listening at ${
      config.mode === "remote-development"
        ? config.remoteBaseURL
        : config.baseURL
    }:${config.port}`
  );
})();
