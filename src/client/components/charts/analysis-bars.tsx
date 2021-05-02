import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { useAnalyses } from "../../hooks/use-analyses";
import { ChartContainer, useChartSize } from "../charts/chart-container";
import {
  useAxes,
  useDispatch,
  useFocus,
  useMessages,
} from "../charts/message-scroller";

export const AnalysesBars = ({
  showScale = false,
}: {
  showScale?: boolean;
}) => (
  <ChartContainer>
    <Chart showScale={showScale} />
  </ChartContainer>
);

const Chart = ({ showScale }: { showScale: boolean }) => {
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
    barsG: d3.Selection<SVGGElement, unknown, null, undefined>;
    xAxisG: d3.Selection<SVGGElement, unknown, null, undefined>;
    xAxisLabelText: d3.Selection<SVGTextElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    const barsG = svg.append("g");
    const xAxisG = svg.append("g");
    const xAxisLabelText = svg.append("text");
    selections.current = { svg, barsG, xAxisG, xAxisLabelText };
  }, []);

  const messages = useMessages();
  const analyses = useAnalyses(messages);
  const data = messages.map(
    (message) => [message, analyses?.get(message.id)?.result] as const
  );

  const barHeight = 20;

  const [focus, setFocus] = useFocus();
  const { setYAxisType } = useDispatch();

  if (selections.current && data) {
    /* Drawing. Runs whenever height, width, data, etc. are updated */
    const { barsG, xAxisG, xAxisLabelText } = selections.current;

    barsG
      .selectAll("rect")
      .data(data, ([message]) => message.id)
      .join("rect")
      .attr("x", x(0))
      .attr(
        "width",
        ([, analysis]) =>
          x(analysis?.attributeScores.TOXICITY.summaryScore.value || 0) - x(0)
      )
      .attr("y", ([message]) => y(message) - barHeight / 2)
      .attr("height", barHeight)
      .attr("fill", ([, analysis]) =>
        analysis
          ? d3.interpolateYlOrRd(
              analysis.attributeScores.TOXICITY.summaryScore.value
            )
          : "white"
      )
      .on("mouseenter", (event, [message]) => setFocus(message))
      .on("mouseleave", () => setFocus(null))
      .on("dblclick", (event, [message]) =>
        setYAxisType(yAxis.type === "point" ? "time" : "point", message.id)
      )
      .transition()
      .attr("opacity", ([message]) =>
        !focus || message.authorID === focus.authorID ? 1 : 0.1
      );

    if (showScale) {
      xAxisG
        .call(d3.axisBottom(x))
        .attr("transform", `translate(${padding.left}, ${padding.top})`); // TODO xTranslation

      xAxisLabelText
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("x", width / 2)
        .attr("y", padding.top / 2)
        .text("Toxicity Score")
        .style("text-anchor", "middle")
        .style("fill", "white");
    }
  }

  return <svg ref={svgRef} width={width} height={height} />;
};
