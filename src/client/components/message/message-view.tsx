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
  root: {
    padding: theme.spacing(1),
    display: "flex",
    maxHeight: 60,
    height: "fit-content",
    transition: "max-height 300ms",
    overflow: "hidden",
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
  style,
}: {
  message: Message;
  analysis?: { error: Error; result: Perspective.Result };
} & Pick<React.ComponentProps<"div">, "style">) => {
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
      style={style}
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
