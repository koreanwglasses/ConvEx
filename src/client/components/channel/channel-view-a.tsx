import * as d3 from "d3";
import * as Perspective from "perspective-api-client";
import React, { useEffect, useRef, useState } from "react";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { useAsyncEffect } from "../../hooks/utility-hooks";
import { messageManager } from "../../models/discord";
import * as Sockets from "../../sockets";

export const ChannelViewA = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => {
  const [[width, height], setSize] = useState([0, 0]);

  useEffect(() => {
    setSize([
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    ]);
  }, []);

  const containerRef = useRef<HTMLDivElement>();
  useEffect(() => {
    const updateSize = () => {
      setSize([
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      ]);
    };
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [setSize]);

  const [maxTime, setMaxTime] = useState(Date.now());
  const [timeSpan, setTimeSpan] = useState(1000 * 60 * 60);
  useEffect(() => {
    const rc = setInterval(() => {
      setMaxTime(Date.now());
    }, 1000);
    return () => clearInterval(rc);
  }, [setMaxTime]);

  const [messages, setMessages] = useState<Message[]>([]);
  useAsyncEffect(async () => {
    setMessages(
      await messageManager({ guildId, channelId }).filterByTime(
        maxTime - timeSpan,
        maxTime
      )
    );
  }, []);
  useEffect(() => {
    const subscription = Sockets.subscribeToMessages(
      { guildId, channelId },
      (message) => {
        setMessages([message, ...messages]);
      }
    );
    return () => subscription.unsubscribe();
  }, [messages, setMessages]);

  const analyses = useAnalyses(messages);
  const data = messages?.map(
    (message) => [message, analyses?.get(message.id)?.result] as const
  );

  return (
    <div ref={containerRef} style={{ width: "100%", height: "75vh" }}>
      <Chart
        height={height}
        width={width}
        data={data}
        maxTime={maxTime}
        timeSpan={timeSpan}
      />
    </div>
  );
};

const Chart = ({
  data,
  height,
  width,
  maxTime,
  timeSpan,
}: {
  data: (readonly [Message, Perspective.Result])[];
  height: number;
  width: number;
  maxTime: number;
  timeSpan: number;
}) => {
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
