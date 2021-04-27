import {
  AppBar,
  Avatar,
  Button,
  Container,
  createMuiTheme,
  CssBaseline,
  makeStyles,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { routes } from "../../endpoints";
import { resolveEndpoint } from "../../utils";
import { useAPI } from "../hooks/use-api";
import { UnstyledLink } from "./ui/unstyled-link";

const theme = createMuiTheme({ palette: { type: "dark" } });

const useStyles = makeStyles((theme) => ({
  toolbar: {},
  toolbarTitle: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1, 1.5),
  },
}));

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Header />
    <Container>{children}</Container>
    <Footer />
  </ThemeProvider>
);

const Header = () => {
  const classes = useStyles();
  return (
    <>
      <AppBar>
        <Toolbar className={classes.toolbar}>
          <Typography variant={"h4"} className={classes.toolbarTitle}>
            <UnstyledLink to={"/"}>
              <b>CON</b>CORD
            </UnstyledLink>
          </Typography>
          <UserNav />
        </Toolbar>
      </AppBar>
    </>
  );
};

const UserNav = () => {
  const classes = useStyles();
  const [err, user] = useAPI(routes.apiCurrentUser);
  return (
    <>
      {!err && !user && (
        <>
          <Skeleton
            variant="rect"
            width={120}
            height={35}
            className={classes.button}
          />
          <Skeleton variant="circle" width={40} height={40} />
        </>
      )}

      {err && (
        <Button
          color="secondary"
          variant="contained"
          href={resolveEndpoint(routes.auth)}
          className={classes.button}
        >
          Login with Discord
        </Button>
      )}

      {user && (
        <Button
          color="secondary"
          variant="contained"
          component={RouterLink}
          to={"/dashboard"}
          className={classes.button}
        >
          Dashboard
        </Button>
      )}
      {user && (
        <Avatar
          alt={`${user.username}#${user.discriminator}`}
          src={user.avatarURL}
        ></Avatar>
      )}
    </>
  );
};

const Footer = () => <div />;
