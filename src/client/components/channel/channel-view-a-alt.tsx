import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { ChartContainer, useChartSize } from "../charts/chart-container";
import {
  MessageScroller,
  useAxes,
  useMessages,
} from "../charts/message-scroller";
import { YAxis } from "../charts/y-axis";

export const ChannelViewA = ({
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
    <YAxis />
    <ChartContainer>
      <Chart />
    </ChartContainer>
  </MessageScroller>
);

const Chart = () => {
  const { width, height } = useChartSize();

  const padding = { left: 0, top: 20, bottom: 20, right: 20 };

  const { y } = useAxes([padding.top, height - padding.bottom]);

  const x = d3
    .scaleLinear()
    .domain([0, 1])
    .range([padding.left, width - padding.right]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    selections.current = { svg };
  }, []);

  const messages = useMessages();
  const analyses = useAnalyses(messages);
  const data = messages.map(
    (message) => [message, analyses?.get(message.id)?.result] as const
  );

  if (selections.current && data) {
    /* Drawing. Runs whenever height, width, data, etc. are updated */
    const { svg } = selections.current;

    svg
      .selectAll("rect")
      .data(data, ([message]) => message.id)
      .join("rect")
      // .transition()
      .attr("x", x(0))
      .attr(
        "width",
        ([, analysis]) =>
          x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) - x(0)
      )
      .attr("y", ([message]) => y(message))
      .attr("height", 1)
      .attr("fill", ([, analysis]) =>
        analysis
          ? d3.interpolateYlOrRd(
              analysis.attributeScores.TOXICITY.summaryScore.value
            )
          : "white"
      );
  }

  return <svg ref={svgRef} width={width} height={height} />;
};
