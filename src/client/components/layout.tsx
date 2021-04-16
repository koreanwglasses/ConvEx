import * as React from "react";
import styles from "./layout.module.scss";
import "./layout.scss";

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <div>
    <div className={styles.header}>
      <h1>Concord</h1>
    </div>
    {children}
  </div>
);
