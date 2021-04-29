import { IconButton, makeStyles, Toolbar } from "@material-ui/core";
import UnfoldLessOutlinedIcon from "@material-ui/icons/UnfoldLessOutlined";
import UnfoldMoreOutlinedIcon from "@material-ui/icons/UnfoldMoreOutlined";
import React from "react";
import { useAxes, useDispatch } from "./message-scroller";

const useStyles = makeStyles((theme) => ({
  toolbar: { backgroundColor: theme.palette.primary.main },
}));

export const MessageScrollerToolbar = () => {
  const classes = useStyles();
  const { yAxis } = useAxes();
  const { setYAxisType } = useDispatch();
  return (
    <Toolbar className={classes.toolbar} variant="dense">
      <IconButton
        onClick={() => setYAxisType(yAxis.type === "time" ? "point" : "time")}
        size="small"
      >
        {yAxis.type === "point" ? (
          <UnfoldLessOutlinedIcon />
        ) : (
          <UnfoldMoreOutlinedIcon />
        )}
      </IconButton>
    </Toolbar>
  );
};
