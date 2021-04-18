import * as React from "react";
import style from "./card.module.scss";

export const Card = ({ children }: { children: React.ReactNode }) => (
  <div className={style.card}>{children}</div>
);
