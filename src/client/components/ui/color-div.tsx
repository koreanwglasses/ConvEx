import * as d3 from "d3";
import React from "react";

export const ColorDiv = ({
  backgroundColor,
  lightClass,
  darkClass,
  ...divProps
}: {
  backgroundColor: string;
  lightClass?: string;
  darkClass?: string;
} & React.ComponentProps<"div">) => {
  const lightnessClass =
    d3.lab(backgroundColor).l < 50 ? darkClass : lightClass;

  const classes = [divProps.className, lightnessClass];

  return (
    <div
      {...divProps}
      style={{ ...divProps.style, backgroundColor }}
      className={classes.filter((x) => x /* keep non-null */).join(" ")}
    ></div>
  );
};
