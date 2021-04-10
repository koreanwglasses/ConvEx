import * as config from "./config";
import * as App from "./controllers/app";
import * as Discord from "./controllers/discord";
import * as Server from "./controllers/server";
import * as Sockets from "./controllers/sockets";
import * as Auth from "./middlewares/auth";
import * as Sessions from "./middlewares/sessions";

(async () => {
  console.log(`Server running in ${config.mode} mode`);
  console.log("Initializing...");
  Discord.init();

  Sessions.init();
  Auth.init();

  const { app } = App.init();
  const { server: httpServer } = Server.init({ app });
  Sockets.init({ httpServer });

  console.log("Logging into Discord...");
  await Discord.start();
  console.log("Starting server...");
  await Server.start();

  console.log(`Server listening at ${config.baseURL}:${config.port}`);
})();
