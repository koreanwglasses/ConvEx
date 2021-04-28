import { Box } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import React from "react";
import { Route, Switch, useRouteMatch } from "react-router-dom";
import { routes } from "../../../endpoints";
import { useAPI } from "../../hooks/use-api";
import { LoginButton } from "../header";
import { Layout } from "../layout";
import { ChannelDashboard } from "./channel-dashboard";
import { GuildDashboard } from "./guild-dashboard";
import { GuildSelector } from "./guild-selector";

export const Dashboard = () => {
  const { path } = useRouteMatch();
  const [err] = useAPI(routes.apiCurrentUser);
  return (
    <Layout>
      {err?.isUnauthorized ? (
        <>
          <Alert severity="error">You must logged in to view this page</Alert>
          <Box m={2}>
            <LoginButton />
          </Box>
        </>
      ) : (
        <Switch>
          <Route exact path={path}>
            <GuildSelector />
          </Route>
          <Route exact path={`${path}/:guildId`}>
            <GuildDashboard />
          </Route>
          <Route path={`${path}/:guildId/:channelId`}>
            <ChannelDashboard />
          </Route>
        </Switch>
      )}
    </Layout>
  );
};
