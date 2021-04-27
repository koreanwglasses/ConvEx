import {
  AppBar,
  Avatar,
  Button,
  createMuiTheme,
  CssBaseline,
  makeStyles,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@material-ui/core";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { routes } from "../../endpoints";
import { resolveEndpoint } from "../../utils";
import { useAPI } from "../hooks/use-api";
// import styles from "./layout.module.scss";
// import "./layout.scss";
import { UnstyledLink } from "./ui/unstyled-link";

const theme = createMuiTheme({ palette: { type: "dark" } });

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1, 1.5),
  },
}));

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Header />
    <main>{children}</main>
    <Footer />
  </ThemeProvider>
);

const Header = () => {
  const classes = useStyles();
  const [err, user] = useAPI(routes.apiCurrentUser);
  return (
    <>
      <AppBar>
        <Toolbar>
          <UnstyledLink to={"/"}>
            <Typography variant={"h3"}>
              <b>CON</b>CORD
            </Typography>
          </UnstyledLink>

          {!user && (
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
            />
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

const Footer = () => <div />;
