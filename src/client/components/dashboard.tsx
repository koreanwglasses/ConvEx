import * as React from "react";
import { Layout } from "./layout";
import {
  Link,
  Route,
  Switch,
  useParams,
  useRouteMatch,
} from "react-router-dom";
import { asyncFilter, join } from "../../utils";
import { api, Channel } from "../api";
import to from "await-to-js";
import { useAPI } from "../hooks/use-api";
import { useAwait } from "../hooks/use-await";

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
  const [err, guilds] = useAPI(api("/api/guild/list"));
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
  const [guildErr, guild] = useAPI(api("/api/guild", { guildId }));
  const channels = useAwait(
    guild &&
      Promise.all(
        guild.channels.map((channelId) =>
          api("/api/channel", { guildId, channelId })
        )
      ),
    undefined,
    [guild]
  );
  const textChannels = channels?.filter((channel) => channel.type === "text");

  return (
    <>
      {guildErr ? (
        <i>Error fetching guild : {guildErr.message}</i>
      ) : !guild ? (
        <i>Loading...</i>
      ) : (
        <>
          <h3>{guild.name}</h3>
          {textChannels?.map((channel) => (
            <ChannelView channel={channel} key={channel.id} />
          ))}
        </>
      )}
    </>
  );
};

const ChannelView = ({ channel }: { channel: Channel }) => {
  return <div style={{ borderStyle: "solid" }}>{channel.id}</div>;
};
