import React from "react";
import { useAxes, useDispatch } from "./message-scroller";

export const Toolbar = () => {
  const { yAxis } = useAxes();
  const { setYAxisType } = useDispatch();
  return (
    <div>
      <input
        type="button"
        onClick={() => setYAxisType(yAxis.type === "time" ? "point" : "time")}
      />
    </div>
  );
};
