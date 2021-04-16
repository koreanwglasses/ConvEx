import * as React from "react";
import styles from "./layout.module.scss";
import "./layout.scss";

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <div>
    <div className={styles.header}>
      <h1>
        <b>Con</b>cord
      </h1>
    </div>
    <div className={styles.content}>{children}</div>
  </div>
);
