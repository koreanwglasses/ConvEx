// import React from "react";
import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { TimeScroller, useChartProps } from "../helpers/time-scroller";
import { ListScroller, useMessages } from "../helpers/list-scroller";
import { useAnalyses } from "../../hooks/use-analyses";
import { MessageView } from "../message/message-view";
import styles from "../dashboard.module.scss";

const toxicityThreshold = 0.7;

/**
 * - Displays a line graph representation of message toxicity
 * - y-axis represents absolute time
 * - only messages above a certain threshold are shown
 */
export const ChannelViewD = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => (
  <ListScroller
    guildId={guildId}
    channelId={channelId}
    // className={styles.channelView}
  >
    {/* <MessageListByUser
      userId={"310213952850231296"}
    /> */}
    <Chart/>
  </ListScroller>
  
);


const MessageListByUser = ({userId} : {userId: string}) => {
  const messages = useMessages();
  // get messages from a single user
  const singleUserMessages = messages.filter(m => m.authorID === userId);
  console.log(singleUserMessages);
  // const analyses = useAnalyses(singleUserMessages);
  const analyses = useAnalyses(messages);
  
  return (
    <div className={styles.channelView}>
      {singleUserMessages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          analysis={analyses?.get(message.id)}
        />
      ))}
    </div>
  );
};

// const ToxicityScoreHistogram = ({userId} : {userId: string}) => {
//   const messages = useMessages();
//   // get messages from a single user
//   const singleUserMessages = messages.filter(m => m.authorID === userId);
//   console.log(singleUserMessages);
//   const analyses = useAnalyses(messages);
  
//   return (
//     <div className={styles.channelView}>
//       {singleUserMessages.map((message) => (
//         <MessageView
//           key={message.id}
//           message={message}
//           analysis={analyses?.get(message.id)}
//         />
//       ))}
//     </div>
//   );
// };

const Chart = () => {
  /* Use this pattern to get the drawing parameters from the TimeScroller */
  const { height, width, maxTime, timeSpan, data } = useChartProps();

  const padding = { left: 50, top: 20, bottom: 20, right: 20 };

  const y = d3
    .scaleTime()
    .domain([maxTime - timeSpan, maxTime])
    .range([padding.top, height - padding.bottom]);

  const x = d3
    .scaleLinear()
    .domain([0, 1])
    .range([padding.left, width - padding.right]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    yAxisG: d3.Selection<SVGGElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    const yAxisG = svg.append("g");
    selections.current = { svg, yAxisG };
  }, []);

  if (selections.current && data) {
    /* Drawing. Runs whenever height, width, data, etc. are updated */
    const { svg, yAxisG } = selections.current;

    yAxisG
      .attr("transform", `translate(${padding.left}, 0)`)
      .call(d3.axisLeft(y));

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", x(0))
      .attr(
        "width",
        ([, analysis]) =>
          x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) - x(0)
      )
      .attr("y", ([message]) => y(message.createdTimestamp))
      .attr("height", 1)
      .attr("fill", ([, analysis]) =>
        analysis
          ? d3.interpolateYlOrRd(
              analysis.attributeScores.TOXICITY.summaryScore.value
            )
          : "white"
      );
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};
