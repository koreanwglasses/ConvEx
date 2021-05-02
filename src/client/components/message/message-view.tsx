import { Avatar, makeStyles } from "@material-ui/core";
import * as d3 from "d3";
import * as Perspective from "perspective-api-client";
import React from "react";
import { Message } from "../../../endpoints";
import { useAwait } from "../../hooks/utility-hooks";
import { fetchUser } from "../../models/discord";
import { ColorDiv } from "../ui/color-div";

const useStyles = makeStyles((theme) => ({
  censored: {
    filter: "blur(3px)",
  },
  "@keyframes fadeIn": {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  root: {
    padding: theme.spacing(1),
    display: "flex",
    maxHeight: 56,
    height: "fit-content",
    opacity: 0,
    transition: "max-height 500ms, opacity 250ms",
    animation: "$fadeIn 500ms",
    overflow: "hidden",
    boxSizing: "border-box",
    borderRadius: 28,
    "&:hover": {
      maxHeight: 500,
      zIndex: 1,
      filter: "drop-shadow(0 0 10px black)",

      "& $censored": {
        filter: "none",
      },
    },
  },
  avatar: {
    marginRight: theme.spacing(1),
  },
  username: {
    fontWeight: "bold",
    marginRight: theme.spacing(1),
  },
  time: {
    color: "rgb(202, 202, 202)",
    fontSize: "smaller",
  },
  light: {
    color: "black",
    "& $time": {
      color: "rgb(119, 119, 119)",
    },
  },
}));

export const MessageView = ({
  message,
  analysis,
  ...divProps
}: {
  message: Message;
  analysis?: { error: Error; result: Perspective.Result };
} & React.ComponentProps<"div">) => {
  const classes = useStyles();

  const user = useAwait(() => fetchUser(message.authorID), []);

  const toxicity =
    analysis?.result?.attributeScores.TOXICITY.summaryScore.value;
  const heatmapColor = analysis?.result
    ? d3.interpolateYlOrRd(toxicity)
    : "white";

  const time = new Intl.DateTimeFormat("default", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(message.createdTimestamp));

  return (
    <ColorDiv
      className={classes.root}
      backgroundColor={heatmapColor}
      lightClass={classes.light}
      {...divProps}
    >
      <Avatar
        alt={user?.username}
        src={user?.avatarURL}
        className={classes.avatar}
      >
        {user?.username[0]}
      </Avatar>
      <div>
        <div>
          <span className={classes.username}>{user?.username}</span>
          <span className={classes.time}>{time}</span>
        </div>
        <div className={toxicity > 0.9 ? classes.censored : undefined}>
          {message.content}
        </div>
      </div>
    </ColorDiv>
  );
};
