import React from "react";
import { Link } from "react-router-dom";

export const UnstyledLink = ({
  children,
  ...linkProps
}: React.PropsWithChildren<React.ComponentProps<Link>>) => (
  <Link style={{ textDecoration: "inherit", color: "inherit" }} {...linkProps}>
    {children}
  </Link>
);
