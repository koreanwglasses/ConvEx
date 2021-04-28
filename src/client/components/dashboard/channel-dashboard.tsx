import { Container, makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { Route, Switch, useParams, useRouteMatch } from "react-router-dom";
import { useAwait } from "../../hooks/utility-hooks";
import { fetchChannel } from "../../models/discord";
import { ChannelListView } from "../channel/channel-list-view-alt";
import { ChannelViewA } from "../channel/channel-view-a-alt";
import { ChannelViewB } from "../channel/channel-view-b";
import { ChannelViewC } from "../channel/channel-view-c";
import { ChannelViewD } from "../channel/channel-view-d";

const useStyles = makeStyles((theme) => ({
  title: {
    padding: theme.spacing(4, 0, 2),
  },
}));

export const ChannelDashboard = () => {
  const classes = useStyles();
  const { path } = useRouteMatch();
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
    </Container>
  );
};
