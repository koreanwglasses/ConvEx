import * as Server from "./controllers/server";
import * as Discord from "./controllers/discord";

(async () => {
  await Discord.start();
  Server.start();

  console.log("Server started!");
})();
