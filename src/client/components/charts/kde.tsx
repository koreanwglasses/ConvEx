import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { ChartContainer, useChartSize } from "./chart-container";
import { useAxes, useMessages } from "./message-scroller";

export const KDE = () => (
  <ChartContainer>
    <Chart />
  </ChartContainer>
);

// Function to compute density
const kernelDensityEstimator = (kernel: (v: number) => number, X: number[]) => {
  return (V: number[]) => {
    return X.map(
      (x) => [x, d3.mean(V, (v) => kernel(x - v))] as [number, number]
    );
  };
};

const kernelEpanechnikov = (k: number) => {
  return (v: number) => {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
};

const Chart = () => {
  const { width, height } = useChartSize();

  const padding = { left: 0, top: 20, bottom: 20, right: 20 };

  const { yAxis, yTime, yScale } = useAxes([
    padding.top,
    height - padding.bottom,
  ]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    path: d3.Selection<SVGPathElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    const path = svg.append("path");
    selections.current = { svg, path };
  }, []);

  const messages = useMessages();

  const numSamples = 500;

  if (selections.current && yAxis.type === "time") {
    const timespan = yAxis.domain[1] - yAxis.domain[0];

    // Compute kernel density estimation
    const kde = kernelDensityEstimator(
      kernelEpanechnikov((4 * timespan) / numSamples),
      yScale.ticks(numSamples).map((tick: Date | number) => +tick)
    );
    const density = kde(messages.map((message) => message.createdTimestamp));

    const x = d3
      .scaleLinear()
      .domain(d3.extent(density.map(([, d]) => d)))
      .range([padding.left, width - padding.right]);

    const { path } = selections.current;
    path
      .attr("opacity", 1)
      .datum(density)
      .attr("fill", "#69b3a2")
      .attr(
        "d",
        d3
          .line()
          .curve(d3.curveBasis)
          .x((d, i, data) =>
            i === 0 || i === data.length - 1 ? x(0) : x(d[1])
          )
          .y((d) => yTime(d[0]))
      );
  }
  if (selections.current && yAxis.type === "point") {
    const { path } = selections.current;
    path.attr("opacity", 0);
  }

  return <svg ref={svgRef} width={width} height={height} />;
};
