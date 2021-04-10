import * as config from "./config";
import * as Discord from "./controllers/discord";
import * as Server from "./controllers/server";

(async () => {
  console.log(`Server running in ${config.mode} mode`);

  console.log("Initializing...");
  Server.init();

  console.log("Logging into Discord...");
  await Discord.start();

  console.log("Starting server...");
  await Server.start();

  console.log(`Server listening at ${config.baseURL}:${config.port}`);
})();
