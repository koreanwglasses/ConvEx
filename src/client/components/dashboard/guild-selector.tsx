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
import { useRouteMatch } from "react-router-dom";
import { join } from "../../../common/utils";
import { Guild, routes } from "../../../endpoints";
import { useAPI } from "../../hooks/use-api";
import { UnstyledLink } from "../ui/unstyled-link";

const useStyles = makeStyles((theme) => ({
  title: {
    padding: theme.spacing(4, 0, 2),
  },
  guildCard: {
    width: 150 + theme.spacing(4),
    height: 218,
    textAlign: "center",
    margin: theme.spacing(1),
  },
  guildCardBox: {
    display: "flex",
    flexWrap: "wrap",
  },
  guildAvatar: {
    height: 150,
    width: 150,
    marginBottom: theme.spacing(1),
  },
}));

export const GuildSelector = () => {
  const classes = useStyles();
  const [err, guilds] = useAPI(routes.apiListGuilds);
  return (
    <Container maxWidth="md">
      <Typography component="h3" variant="h3" className={classes.title}>
        Your Guilds
      </Typography>

      {err && (
        <Alert severity="error">There was a problem loading your guilds</Alert>
      )}

      {guilds && !guilds.length && (
        <Alert severity="info">No guilds found</Alert>
      )}

      {!err && !guilds && (
        <Box className={classes.guildCardBox}>
          <Skeleton variant="rect" className={classes.guildCard} width="100%" />
        </Box>
      )}

      {guilds && (
        <Box className={classes.guildCardBox}>
          {guilds.map((guild) => (
            <GuildLink guild={guild} key={guild.id} />
          ))}
        </Box>
      )}
    </Container>
  );
};

const GuildLink = ({ guild }: { guild: Guild }) => {
  const classes = useStyles();
  const { url } = useRouteMatch();
  return (
    <UnstyledLink to={join(url, guild.id)}>
      <Card className={classes.guildCard}>
        <CardActionArea>
          <CardContent>
            <Avatar
              className={classes.guildAvatar}
              alt={guild.name}
              src={guild.iconURL}
            >
              {guild.name[0]}
            </Avatar>
            <Typography variant="subtitle1">{guild.name}</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </UnstyledLink>
  );
};
