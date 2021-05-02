import * as d3 from "d3";
import { Result } from "perspective-api-client";
import React, { useEffect, useRef } from "react";
import { groupBy } from "../../../common/utils";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { ChartContainer, useChartSize } from "./chart-container";
import {
  useAxes,
  useDispatch,
  useFocus,
  useMessages,
} from "./message-scroller";

export const UserLines = () => (
  <ChartContainer>
    <Chart />
  </ChartContainer>
);

const Chart = () => {
  const { width, height } = useChartSize();

  const padding = { left: 0, top: 20, bottom: 20, right: 20 };

  const { y, yAxis } = useAxes([padding.top, height - padding.bottom]);

  const x = d3
    .scaleLinear()
    .domain([0, 1])
    .range([padding.left, width - padding.right]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    circleG: d3.Selection<SVGGElement, unknown, null, undefined>;
    interactionG: d3.Selection<SVGGElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    const circleG = svg.append("g");
    const interactionG = svg.append("g");
    selections.current = { svg, circleG, interactionG };
  }, []);

  const messages = useMessages();
  const analyses = useAnalyses(messages);
  const flatData = messages.map(
    (message) => [message, analyses?.get(message.id)?.result] as const
  );
  const data = [...groupBy(flatData, ([message]) => message.authorID).values()];

  const [focus, setFocus] = useFocus();
  const { setYAxisType } = useDispatch();

  const pointRadius = 6;
  const interactionRadius = 24;

  if (selections.current && data) {
    /* Drawing. Runs whenever height, width, data, etc. are updated */
    const { svg, circleG, interactionG } = selections.current;

    svg
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr(
        "d",
        d3
          .line<readonly [Message, Result]>()
          .x(
            ([, analysis]) =>
              x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) -
              x(0)
          )
          .y(([message]) => y(message))
      )
      .transition()
      .attr("opacity", (messages) =>
        !focus || messages[0][0].authorID === focus.authorID ? 1 : 0.1
      );

    circleG
      .selectAll("circle")
      .data(flatData)
      .join("circle")
      .attr(
        "cx",
        ([, analysis]) =>
          x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) - x(0)
      )
      .attr("cy", ([message]) => y(message))
      .attr("r", pointRadius)
      .style("fill", ([, analysis]) =>
        analysis
          ? d3.interpolateYlOrRd(
              analysis.attributeScores.TOXICITY.summaryScore.value
            )
          : "white"
      )
      .transition()
      .attr("opacity", ([message]) =>
        !focus || message.authorID === focus.authorID ? 1 : 0.1
      );

    interactionG
      .selectAll("circle")
      .data(flatData)
      .join("circle")
      .attr(
        "cx",
        ([, analysis]) =>
          x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) - x(0)
      )
      .attr("cy", ([message]) => y(message))
      .attr("r", interactionRadius)
      .style("fill", "transparent")
      .on("mouseenter", (event, [message]) => setFocus(message))
      .on("mouseleave", () => setFocus(null))
      .on("dblclick", (event, [message]) =>
        setYAxisType(yAxis.type === "point" ? "time" : "point", message.id)
      );
  }

  return <svg ref={svgRef} width={width} height={height} />;
};
