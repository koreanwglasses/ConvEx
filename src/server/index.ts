import * as App from "./app";
import * as Discord from "./discord";

(async () => {
  await Discord.start();
  App.start();

  console.log("Server started!");
})();
