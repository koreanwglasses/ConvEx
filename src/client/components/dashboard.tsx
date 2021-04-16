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
import { join, zip } from "../../utils";
import { api } from "../api";
import { useAnalyses } from "../hooks/use-analyses";
import { useAPI } from "../hooks/use-api";
import { useMessages } from "../hooks/use-messages";
import { useAwaitAll } from "../hooks/utility-hooks";
import * as Sockets from "../sockets";
import styles from "./dashboard.module.scss";
import { Layout } from "./layout";

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
      guild?.channels.map((channelId) =>
        api("/api/channel", { guildId, channelId })
      ),
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
          {textChannels?.map((channel) => (
            <ChannelView guild={guild} channel={channel} key={channel.id} />
          ))}
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
  const [err, messages] = useMessages({
    guildId: guild.id,
    channelId: channel.id,
  });
  const [err2, analyses] = useAnalyses(guild.id, channel.id, messages);

  return (
    <div className={styles.channelView}>
      <h4>#{channel.name}</h4>
      {err && <i>Error loading messages: {err.message}</i>}
      {err2 && <i>Error loading analyses: {err2.message}</i>}
      {!(err || err2) && !(messages && analyses) && <i>Loading...</i>}
      {messages &&
        analyses &&
        zip(messages, analyses).map(([message, analysis]) => (
          <MessageView key={message.id} message={message} analysis={analysis} />
        ))}
    </div>
  );
};

const MessageView = ({
  message,
  analysis,
}: {
  message: Message;
  analysis: { error: Error; result: Perspective.Result };
}) => {
  const [err, user] = useAPI(routes.apiUser, { userId: message.authorID });

  const time = new Intl.DateTimeFormat("default", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(message.createdTimestamp));

  return (
    <div className={styles.message}>
      <img src={user?.avatarURL} className={styles.messageProfile} />
      <div>
        <div>
          <span className={styles.messageUsername}>{user?.username}</span>
          <span className={styles.messageTime}>{time}</span>
        </div>
        <div>{message.content}</div>
      </div>
      <div>{analysis?.result?.attributeScores.TOXICITY.summaryScore.value}</div>
    </div>
  );
};
