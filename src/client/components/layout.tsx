import React from "react";
import { routes, User as Account } from "../../endpoints";
import { resolveEndpoint } from "../../utils";
import { useAPI } from "../hooks/use-api";
import styles from "./layout.module.scss";
import "./layout.scss";
import { UnstyledLink } from "./styling/unstyled-link";

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <div>
    <Header />
    <div className={styles.content}>{children}</div>
    <div className={styles.footer} />
  </div>
);

const Header = () => {
  const [err, user] = useAPI(routes.apiCurrentUser);
  return (
    <div className={styles.header}>
      <UnstyledLink to={"/"}>
        <h1>
          <b>Con</b>cord
        </h1>
      </UnstyledLink>
      <Account user={user} />
    </div>
  );
};

const Account = ({ user }: { user: Account }) =>
  user ? (
    <span>
      Logged in as {user.username}#{user.discriminator}
    </span>
  ) : (
    <a href={resolveEndpoint(routes.auth)} className={styles.login}>
      Login with Discord
    </a>
  );
