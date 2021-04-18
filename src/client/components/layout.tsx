import * as React from "react";
import { routes, User as Account } from "../../endpoints";
import { useAPI } from "../hooks/use-api";
import styles from "./layout.module.scss";
import "./layout.scss";

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
      <h1>
        <b>Con</b>cord
      </h1>
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
    <a href={routes.auth} className={styles.login}>
      Login with Discord
    </a>
  );
