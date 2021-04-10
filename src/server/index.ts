import * as config from "../config";
import * as Discord from "./controllers/discord";
import * as Server from "./controllers/server";
import * as Sockets from "./controllers/sockets";
import * as Auth from "./middlewares/auth";

(async () => {
  console.log(`Server running in ${config.mode} mode`);

  Auth.init();
  Sockets.init();

  console.log("Logging into Discord...");
  await Discord.start();

  console.log("Starting server...");
  await Server.start();

  console.log(`Server listening at ${config.baseURL}:${config.port}`);
})();
