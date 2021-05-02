import { Container, makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { useParams } from "react-router-dom";
import { useAwait } from "../../hooks/utility-hooks";
import { fetchChannel } from "../../models/discord";
import { ChannelListView } from "../channel/channel-list-view-full";

const useStyles = makeStyles((theme) => ({
  title: {
    padding: theme.spacing(4, 0, 2),
  },
}));

export const ChannelDashboard = () => {
  const classes = useStyles();
  const { guildId, channelId } = useParams<{
    guildId: string;
    channelId: string;
  }>();

  const channel = useAwait(() => fetchChannel({ guildId, channelId }), []);

  return (
    <Container>
      <Typography variant="h5" className={classes.title}>
        #{channel?.name}
      </Typography>
      <ChannelListView guildId={guildId} channelId={channelId} />
    </Container>
  );
};
