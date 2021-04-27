import React from "react";
import {
  Link,
  Route,
  Switch,
  useParams,
  useRouteMatch,
} from "react-router-dom";
import { Channel, Guild, routes } from "../../endpoints";
import { join } from "../../utils";
import { useAPI } from "../hooks/use-api";
import { useAwait, useAwaitAll } from "../hooks/utility-hooks";
import { fetchChannel } from "../models/discord";
import { ChannelListView } from "./channel/channel-list-view-alt";
import { ChannelViewA } from "./channel/channel-view-a";
import { ChannelViewB } from "./channel/channel-view-b";
import { ChannelViewC } from "./channel/channel-view-c";
import { ChannelViewD } from "./channel/channel-view-d";
import styles from "./dashboard.module.scss";
import { Layout } from "./layout";
import { Card } from "./ui/card";
import { UnstyledLink } from "./ui/unstyled-link";

export const Dashboard = () => {
  const { path } = useRouteMatch();
  return (
    <Layout>
      <div className={styles.dashboard}>
        <h2>Dashboard</h2>
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
      </div>
    </Layout>
  );
};

const GuildSelector = () => {
  const [err, guilds] = useAPI(routes.apiListGuilds);
  const { url } = useRouteMatch();
  return (
    <div className={styles.guildSelector}>
      <h3>Your Guilds</h3>
      {err && <i>Error fetching guilds: {err.message}</i>}
      {!err && !guilds && <i>Loading...</i>}
      {guilds && !guilds.length && <i>No applicable guilds found</i>}
      {guilds?.length &&
        guilds.map((guild) => (
          <Link to={join(url, guild.id)} key={guild.id}>
            {guild.name}
          </Link>
        ))}
    </div>
  );
};

const GuildDashboard = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const [guildErr, guild] = useAPI(routes.apiFetchGuild, { guildId });
  const channels = useAwaitAll(
    () =>
      guild?.channels.map((channelId) => fetchChannel({ guildId, channelId })),
    [guild]
  );
  const textChannels = channels?.filter((channel) => channel.type === "text");

  return (
    <div className={styles.guildDashboard}>
      {guildErr && <i>Error fetching guild : {guildErr.message}</i>}
      {!guildErr && !guild && <i>Loading...</i>}
      {guild && (
        <>
          <h3>{guild.name}</h3>
          <div className={styles.guildDashboardChannelsContainer}>
            {textChannels?.map((channel) => (
              <CompactChannelView
                guild={guild}
                channel={channel}
                key={channel.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * For use within GuildDashboard
 */
const CompactChannelView = ({
  guild,
  channel,
}: {
  guild: Guild;
  channel: Channel;
}) => {
  return (
    <div className={styles.channelView}>
      <UnstyledLink to={(location) => `${location.pathname}/${channel.id}`}>
        <Card>
          <h4>#{channel.name}</h4>
          <ChannelListView guildId={guild.id} channelId={channel.id} />
        </Card>
      </UnstyledLink>
    </div>
  );
};

const ChannelDashboard = () => {
  const { path } = useRouteMatch();
  const { guildId, channelId } = useParams<{
    guildId: string;
    channelId: string;
  }>();

  const channel = useAwait(() => fetchChannel({ guildId, channelId }), []);

  return (
    <div>
      <Card>
        <h4>#{channel?.name}</h4>
        <Switch>
          <Route exact path={path}>
            <ChannelListView guildId={guildId} channelId={channelId} />
          </Route>
          <Route exact path={`${path}/view-a`}>
            <ChannelViewA guildId={guildId} channelId={channelId} />
          </Route>
          <Route exact path={`${path}/view-b`}>
            <ChannelViewB guildId={guildId} channelId={channelId} />
          </Route>
          <Route exact path={`${path}/view-c`}>
            <ChannelViewC guildId={guildId} channelId={channelId} />
          </Route>
          <Route exact path={`${path}/view-d`}>
            <ChannelViewD guildId={guildId} channelId={channelId} />
          </Route>
        </Switch>
      </Card>
    </div>
  );
};
