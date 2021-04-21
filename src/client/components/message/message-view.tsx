import * as d3 from "d3";
import * as Perspective from "perspective-api-client";
import React from "react";
import { Message } from "../../../endpoints";
import { useAwait } from "../../hooks/utility-hooks";
import { fetchUser } from "../../models/discord";
import styles from "../dashboard.module.scss";
import { ColorDiv } from "../styling/color-div";

export const MessageView = ({
  message,
  analysis,
}: {
  message: Message;
  analysis?: { error: Error; result: Perspective.Result };
}) => {
  const user = useAwait(() => fetchUser(message.authorID), []);

  const heatmapColor = analysis?.result
    ? d3.interpolateYlOrRd(
        analysis.result.attributeScores.TOXICITY.summaryScore.value
      )
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
      className={styles.message}
      backgroundColor={heatmapColor}
      lightClass={styles.light}
    >
      <img src={user?.avatarURL} className={styles.messageProfile} />
      <div>
        <div>
          <span className={styles.messageUsername}>{user?.username}</span>
          <span className={styles.messageTime}>{time}</span>
        </div>
        <div>{message.content}</div>
      </div>
    </ColorDiv>
  );
};
