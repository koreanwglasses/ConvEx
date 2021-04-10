import * as config from "./config";
import * as App from "./controllers/app";
import * as Discord from "./controllers/discord";
import * as Server from "./controllers/server";
import * as Sockets from "./controllers/sockets";

(async () => {
  console.log(`Server running in ${config.mode} mode`);
  console.log("Initializing...");

  const app = App.init();
  const httpServer = Server.init({ app });
  Sockets.init({ httpServer });

  console.log("Logging into Discord...");
  await Discord.start();
  console.log("Starting server...");
  await Server.start();

  console.log(`Server listening at ${config.baseURL}:${config.port}`);
})();
