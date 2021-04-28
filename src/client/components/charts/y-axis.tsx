import * as d3 from "d3";
import { ScaleTime } from "d3";
import React, { useEffect, useRef } from "react";
import { ChartContainer, useChartSize } from "./chart-container";
import { useAxes, useDispatch } from "./message-scroller";

export const YAxis = ({
  padding = {},
}: {
  padding?: { top?: number; bottom?: number };
}) => {
  const containerRef = useRef<HTMLDivElement>();
  const { top = 20, bottom = 20 } = padding;
  const { yAxis, yScale } = useAxes([
    top,
    containerRef.current?.clientHeight - bottom,
  ]);
  const { scrollTimeScale } = useDispatch();
  return (
    <ChartContainer
      onWheel={(e) => {
        e.preventDefault();

        const mouseY =
          e.clientY - containerRef.current.getBoundingClientRect().top;

        if (yAxis?.type === "time") {
          scrollTimeScale(
            e.deltaY,
            +(yScale as ScaleTime<number, number, never>).invert(mouseY)
          );
        }
      }}
      style={{
        width: "60px",
        flexGrow: 0,
      }}
      ref={containerRef}
    >
      {yAxis?.type === "time" && (
        <YTimeChart yScale={yScale as ScaleTime<number, number, never>} />
      )}
    </ChartContainer>
  );
};

const YTimeChart = ({
  yScale,
}: {
  yScale: ScaleTime<number, number, never>;
}) => {
  const { width, height } = useChartSize();
  const svgRef = useRef<SVGSVGElement>();

  const selectionsRef = useRef<{
    yAxisG: d3.Selection<SVGGElement, unknown, null, unknown>;
  }>();
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const yAxisG = svg.append("g");
    selectionsRef.current = { yAxisG };
  }, []);

  if (yScale && selectionsRef.current) {
    const { yAxisG } = selectionsRef.current;
    yAxisG
      .attr("transform", `translate(${width - 1}, 0)`)
      .call(d3.axisLeft(yScale as d3.ScaleTime<number, number, never>));
  }

  return <svg width={width} height={height} ref={svgRef}></svg>;
};
