import * as React from "react";
import { useRef, useState } from "react";

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
  // const data = useAwait(() =>
  //   fetchMessagesByTime({
  //     guildId,
  //     channelId,
  //     createdAfter: maxTime - timeSpan,
  //     createdBefore: maxTime,
  //   })
  // );

  const svgRef = useRef<SVGSVGElement>();

  // const svg = d3.select(svgRef.current);

  return <svg ref={svgRef} width={800} height={600}></svg>;
};
