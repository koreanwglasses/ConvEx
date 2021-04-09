import * as React from "react";
import "./layout.css";

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <div>{children}</div>
);
