import * as d3 from "d3";
import * as Perspective from "perspective-api-client";
import * as React from "react";
import { useEffect } from "react";
import {
  Link,
  Route,
  Switch,
  useParams,
  useRouteMatch,
} from "react-router-dom";
import { Channel, Guild, Message, routes } from "../../endpoints";
import { join } from "../../utils";
import { useAnalyses } from "../hooks/use-analyses";
import { useAPI } from "../hooks/use-api";
import { useAwait, useAwaitAll } from "../hooks/utility-hooks";
import { fetchChannel, fetchUser } from "../models/discord";
import * as Sockets from "../sockets";
import styles from "./dashboard.module.scss";
import { InfiniteScroll, useMessages } from "./infinite-scroll";
import { Layout } from "./layout";
import { Card } from "./styling/card";
import { ColorDiv } from "./styling/color-div";

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
          <Route path={`${path}/:guildId`}>
            <GuildDashboard />
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

  useEffect(() => {
    Sockets.connect();
  }, []);

  return (
    <div className={styles.guildDashboard}>
      {guildErr && <i>Error fetching guild : {guildErr.message}</i>}
      {!guildErr && !guild && <i>Loading...</i>}
      {guild && (
        <>
          <h3>{guild.name}</h3>
          <div className={styles.guildDashboardChannelsContainer}>
            {textChannels?.map((channel) => (
              <ChannelView guild={guild} channel={channel} key={channel.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ChannelView = ({
  guild,
  channel,
}: {
  guild: Guild;
  channel: Channel;
}) => {
  return (
    <div className={styles.channelView}>
      <Card>
        <h4>#{channel.name}</h4>
        <InfiniteScroll
          guildId={guild.id}
          channelId={channel.id}
          className={styles.channelViewContentWrapper}
        >
          <MessageList />
        </InfiniteScroll>
      </Card>
    </div>
  );
};

const MessageList = () => {
  const messages = useMessages();
  const analyses = useAnalyses(messages);
  return (
    <div className={styles.channelViewContentContainer}>
      {messages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          analysis={analyses.get(message.id)}
        />
      ))}
    </div>
  );
};

const MessageView = ({
  message,
  analysis,
}: {
  message: Message;
  analysis: [Error, Perspective.Result];
}) => {
  const user = useAwait(() => fetchUser(message.authorID), []);

  const heatmapColor = analysis?.[1]
    ? d3.interpolateYlOrRd(
        analysis[1].attributeScores.TOXICITY.summaryScore.value
      )
    : "white";

  const time = new Intl.DateTimeFormat("default", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(message.createdTimestamp));

  return (
    <ColorDiv
      className={styles.message}
      backgroundColor={heatmapColor}
      lightClass={styles.light}
    >
      <img src={user?.avatarURL} className={styles.messageProfile} />
      <div>
        <div>
          <span className={styles.messageUsername}>{user?.username}</span>
          <span className={styles.messageTime}>{time}</span>
        </div>
        <div>{message.content}</div>
      </div>
    </ColorDiv>
  );
};
