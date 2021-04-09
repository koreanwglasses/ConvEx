import * as React from "react";
import { Layout } from "./layout";
import { Guild } from "discord.js";
import { useAPI } from "../hooks/use-api";
import {
  Link,
  Route,
  Switch,
  useParams,
  useRouteMatch,
} from "react-router-dom";
import { join } from "../../utils";

export const Dashboard = () => {
  const { path } = useRouteMatch();
  return (
    <Layout>
      <h2>Dashboard</h2>
      <Switch>
        <Route exact path={path}>
          <GuildSelector />
        </Route>
        <Route path={`${path}/:guildId`}>
          <GuildDashboard />
        </Route>
      </Switch>
    </Layout>
  );
};

const GuildSelector = () => {
  const [err, guilds] = useAPI<Guild[]>("/api/guild/list");
  const { url } = useRouteMatch();
  return (
    <>
      <h3>Your Guilds</h3>
      {err ? (
        <i>Error fetching guilds: {err.message}</i>
      ) : !guilds ? (
        <i>Loading...</i>
      ) : !guilds.length ? (
        <i>No applicable guilds found</i>
      ) : (
        guilds.map((guild) => (
          <Link to={join(url, guild.id)} key={guild.id}>
            {guild.name}
          </Link>
        ))
      )}
    </>
  );
};

const GuildDashboard = () => {
  const { guildId } = useParams() as { guildId: string };
  const [err, guild] = useAPI<Guild>(`/api/guild/fetch/${guildId}`);

  return (
    <>
      {err ? (
        <i>Error fetching guild : {err.message}</i>
      ) : !guild ? (
        <i>Loading...</i>
      ) : (
        <h3>{guild.id}</h3>
      )}
    </>
  );
};
