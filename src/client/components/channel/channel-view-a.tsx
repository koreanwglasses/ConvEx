import * as React from "react";
import { useRef, useState } from "react";
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
  const data = useAwait(() =>
    messageManager({ guildId, channelId }).filterByTime(
      maxTime - timeSpan,
      maxTime
    )
  );

  const svgRef = useRef<SVGSVGElement>();

  // const svg = d3.select(svgRef.current);

  return <svg ref={svgRef} width={800} height={600}></svg>;
};
