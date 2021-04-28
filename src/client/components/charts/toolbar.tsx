import { Button, Toolbar } from "@material-ui/core";
import UnfoldLessOutlinedIcon from "@material-ui/icons/UnfoldLessOutlined";
import UnfoldMoreOutlinedIcon from "@material-ui/icons/UnfoldMoreOutlined";
import React from "react";
import { useAxes, useDispatch } from "./message-scroller";

export const MessageScrollerToolbar = () => {
  const { yAxis } = useAxes();
  const { setYAxisType } = useDispatch();
  return (
    <Toolbar>
      <Button
        variant="contained"
        onClick={() => setYAxisType(yAxis.type === "time" ? "point" : "time")}
      >
        {yAxis.type === "time" ? (
          <UnfoldLessOutlinedIcon />
        ) : (
          <UnfoldMoreOutlinedIcon />
        )}
      </Button>
    </Toolbar>
  );
};
