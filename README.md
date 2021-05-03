# Quickstart

*Try it out here! http://dev.fred-choi.com/*

**Prerequisites.** Ensure that you have `node` and `yarn` installed on your
command line.

**Development.** Once you have verified that `node` and `yarn` are installed,
navigate to the root folder of this project and run `yarn install` to install 
the required packages. Set the variables in `src/server/config.local.sample.ts`
and rename it to `config.local.ts`. Then run `yarn dev` to compile and start 
a local server. Navigate to <http://localhost:9000/> to view.

**Production.** Edit `src/server/config.ts` to reflect your server configuration.
Run `yarn build:client` to build the front-end code and run `yarn start:server` 
to start the server in production mode.
