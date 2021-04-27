import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { ChartContainer, useChartSize } from "../charts/chart-container";
import {
  MessageScroller,
  useAxes,
  useMessages,
} from "../charts/message-scroller";

/**
 * Notes: A key challenge for this one is dynamically loading messages as the
 * user scrolls back. After all, we don't want to load thousands of messages at
 * once, so we need some way of fetching messages when necessary. Don't worry,
 * this is all handled for you in ../helpers/list-scroller.tsx. Take a look at
 * ./channel-list-view.tsx for an example of how to use it.
 */

/**
 * - Hybrid view where messages are stacked on top of one another.
 * - Bar chart is displayed alongside messages
 * - When the user hovers over a bar, it should highlight all the bars of the
 *   same user while dimming other bars
 */
export const ChannelViewB = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => (
  <MessageScroller
    guildId={guildId}
    channelId={channelId}
    defaultYAxis={{ type: "point", offset: 0, step: 20 }}
  >
    <ChartContainer>
      <Tempo />
    </ChartContainer>
  </MessageScroller>
);

const Tempo = () => {
  const { width, height } = useChartSize();

  //grab the messages we need
  const messages = useMessages();
  const analyses = useAnalyses(messages);

  //perform metric test on each message
  //also, find min and max metric scores of the data

  const outputs = messages.map(
    (message) =>
      analyses?.get(message.id)?.result?.attributeScores.TOXICITY.summaryScore
        .value
  );
  const metricMax = Math.max(
    ...outputs.filter((output) => output !== undefined)
  );

  const data = messages.map((message, i) => [message, outputs[i]] as const);
  //console.log(metric_max)
  //outputs has the list of metric scores for each message

  const bar_height = 5;
  const padding = {
    left: 0,
    top: 20,
    bottom: 20,
    right: 20,
    height,
    width,
    bar_height: bar_height,
    spacing: bar_height * 4,
  };

  // used to put the messages in place
  const { y } = useAxes([padding.top, height - padding.bottom]);

  // used for the toxicity metric
  const x = d3
    //another linear scale, metric scores to locations
    .scaleLinear()
    //domain is based on 'span' of metric scores we're dealing with
    //alternatively, we can use the maximum + minimum possible toxicity scores instead
    .domain([0, 1])
    //output domain is again based on screen/window size
    .range([padding.left, padding.width - padding.right]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    xAxisG: d3.Selection<SVGGElement, unknown, null, undefined>;
    xAxisLabelText: d3.Selection<SVGTextElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    const xAxisG = svg.append("g");
    const xAxisLabelText = svg.append("text");

    selections.current = { svg, xAxisG, xAxisLabelText };
  }, []);

  if (selections.current && messages.length > 0) {
    const { svg, xAxisG, xAxisLabelText } = selections.current;

    xAxisG
      .call(d3.axisBottom(x))
      .attr("transform", `translate(${padding.left}, ${padding.bottom})`); // TODO xTranslation

    xAxisLabelText
      .attr("font-size", 12)
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .attr("x", padding.width / 2)
      .attr("y", padding.bottom / 2)
      .text("Toxicity Score")
      .style("fill", "white");

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      //.attr("x", x(0))
      .attr("width", ([, score]) => x(score))
      .attr("y", ([message]) => y(message))
      .attr("height", padding.bar_height)
      .attr("fill", "steelblue");
  }

  return <svg ref={svgRef} width={padding.width} height={padding.height}></svg>;
};
