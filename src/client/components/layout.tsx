import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  createMuiTheme,
  CssBaseline,
  makeStyles,
  ThemeProvider,
  Toolbar,
} from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { routes } from "../../endpoints";
import { resolveEndpoint } from "../../utils";
import { useAPI } from "../hooks/use-api";
import { UnstyledLink } from "./ui/unstyled-link";

const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#2E303E",
    },
    secondary: {
      main: "#F43E5C",
      contrastText: "#fff",
    },
    background: { default: "#232530" },
  },
});

const useStyles = makeStyles((theme) => ({
  toolbar: {},
  toolbarTitle: {
    flexGrow: 1,
    fontSize: 36,
  },
  button: {
    margin: theme.spacing(1, 1),
  },
  avatar: {
    margin: theme.spacing(1, 1),
  },
}));

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Header />
    <Container>
      <main>{children}</main>
    </Container>
    <Footer />
  </ThemeProvider>
);

const Header = () => {
  const classes = useStyles();
  return (
    <>
      <AppBar>
        <Toolbar className={classes.toolbar}>
          <div className={classes.toolbarTitle}>
            <UnstyledLink to={"/"}>
              <Box fontWeight={800} component="span">
                CON
              </Box>
              <Box fontWeight={"fontWeightLight"} component="span">
                CORD
              </Box>
            </UnstyledLink>
          </div>
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
            width={140}
            height={35}
            className={classes.button}
          />
          <Skeleton
            variant="rect"
            width={120}
            height={35}
            className={classes.button}
          />
          <Skeleton
            variant="circle"
            width={40}
            height={40}
            className={classes.avatar}
          />
        </>
      )}

      {(err || user) && (
        <Button variant="outlined" className={classes.button}>
          Add to Server
        </Button>
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
          className={classes.avatar}
        ></Avatar>
      )}
    </>
  );
};

const Footer = () => <div />;
