import * as Server from "./server";
import * as Discord from "./discord";

(async () => {
  await Discord.start();
  Server.start();

  console.log("Server started!");
})();
