import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  makeStyles,
  Typography,
} from "@material-ui/core";
import { Alert, Skeleton } from "@material-ui/lab";
import React from "react";
import { useParams } from "react-router-dom";
import { Channel, Guild, routes } from "../../../endpoints";
import { useAPI } from "../../hooks/use-api";
import { useAwaitAll } from "../../hooks/utility-hooks";
import { fetchChannel } from "../../models/discord";
import { ChannelListView } from "../channel/channel-list-view";
import { UnstyledLink } from "../ui/unstyled-link";

const useStyles = makeStyles((theme) => ({
  titleBox: {
    padding: theme.spacing(4, 0, 2),
    display: "flex",
    alignItems: "center",
  },
  titleText: {
    marginLeft: theme.spacing(2),
  },
  guildAvatar: {
    height: 150,
    width: 150,
    marginBottom: theme.spacing(1),
  },
  channelsContainer: {
    display: "flex",
    justifyContent: "space-around",
    flexWrap: "wrap",
    margin: theme.spacing(2, 0, 4),
  },
  channelCard: {
    width: 400,
    height: 800,
  },
}));

export const GuildDashboard = () => {
  const classes = useStyles();
  const { guildId } = useParams<{ guildId: string }>();
  const [err, guild] = useAPI(routes.apiFetchGuild, { guildId });
  const channels = useAwaitAll(
    () =>
      guild?.channels.map((channelId) => fetchChannel({ guildId, channelId })),
    [guild]
  );
  const textChannels = channels?.filter((channel) => channel.type === "text");

  return (
    <Container>
      {err && (
        <Alert severity={"error"}>There was a problem loading the guild</Alert>
      )}

      {!err && !guild && (
        <>
          <Box className={classes.titleBox}>
            <Skeleton variant="circle" className={classes.guildAvatar} />
            <Skeleton
              variant="rect"
              className={classes.titleText}
              height={60}
              width={400}
            />
          </Box>
          <Box className={classes.channelsContainer}>
            <Skeleton
              variant="rect"
              className={classes.channelCard}
              width="100%"
            />
          </Box>
        </>
      )}

      {guild && (
        <>
          <Box className={classes.titleBox}>
            <Avatar
              className={classes.guildAvatar}
              alt={guild.name}
              src={guild.iconURL}
            >
              {guild.name[0]}
            </Avatar>
            <Typography
              component="h3"
              variant="h3"
              className={classes.titleText}
            >
              {guild.name}
            </Typography>
          </Box>
          <Box className={classes.channelsContainer}>
            {textChannels?.map((channel) => (
              <CompactChannelView
                guild={guild}
                channel={channel}
                key={channel.id}
              />
            ))}
          </Box>
        </>
      )}
    </Container>
  );
};

const CompactChannelView = ({
  guild,
  channel,
}: {
  guild: Guild;
  channel: Channel;
}) => {
  const classes = useStyles();
  return (
    <UnstyledLink to={(location) => `${location.pathname}/${channel.id}`}>
      <Card className={classes.channelCard}>
        <CardActionArea>
          <CardContent>
            <Typography variant="h6">#{channel.name}</Typography>
          </CardContent>
        </CardActionArea>
        <ChannelListView guildId={guild.id} channelId={channel.id} />
      </Card>
    </UnstyledLink>
  );
};
