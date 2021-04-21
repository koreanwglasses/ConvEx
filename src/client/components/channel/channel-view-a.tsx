import * as d3 from "d3";
import * as Perspective from "perspective-api-client";
import * as React from "react";
import { useRef, useState } from "react";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { useAwait } from "../../hooks/utility-hooks";
import { messageManager } from "../../models/discord";

export const ChannelViewA = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => {
  const [maxTime, setMaxTime] = useState(Date.parse("4/20/2021"));
  const [timeSpan, setTimeSpan] = useState(
    Date.parse("4/20/2021") - Date.parse("4/19/2021")
  );
  const messages = useAwait(() =>
    messageManager({ guildId, channelId }).filterByTime(
      maxTime - timeSpan,
      maxTime
    )
  );
  const analyses = useAnalyses(messages);
  const data = messages?.map(
    (message) => [message, analyses?.get(message.id).result] as const
  );

  return (
    <Chart
      height={600}
      width={800}
      data={data}
      maxTime={maxTime}
      timeSpan={timeSpan}
    />
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
  const y = d3
    .scaleLinear()
    .domain([maxTime - timeSpan, maxTime])
    .range([0, height]);

  const svgRef = useRef<SVGSVGElement>();
  const svg = d3.select(svgRef.current);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};
