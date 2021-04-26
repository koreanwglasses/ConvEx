import * as d3 from "d3";
import React, { useEffect, useRef }  from "react";
import { Message } from "../../../endpoints";
import { ListScroller, useMessages } from "../helpers/list-scroller";
import {useAnalyses} from "../../hooks/use-analyses"
import { analyzeMessages } from "../../models/analysis";
import { Result } from "perspective-api-client";

import { svg } from "d3";
import { message } from "../dashboard.module.scss";
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

  <ListScroller guildId={guildId} channelId={channelId}>
    <Tempo />
  </ListScroller>
);



const Tempo = () => {

  //grab the messages we need
  const message_set = useMessages()
  const temp = useAnalyses(message_set)

  

  //perform metric test on each message
    //also, find min and max metric scores of the data


  var outputs = new Array<number>()
  var metric_min = -1
  var metric_max = -1

  type dual_type = {
    m: Message;
    o: number;
  };

  var combo = new Array<dual_type>()

  var num_messages = 0
  message_set.forEach(message => {
    var curr = temp?.get(message.id)?.result?.attributeScores.TOXICITY.summaryScore.value
    if (metric_min == -1 || metric_min > curr)
      metric_min = curr

    if (metric_max == -1 || metric_max < curr)
      metric_max = curr
    
    outputs.push(curr)
    //console.log(curr)


    var construct: dual_type = {
      m: message,
      o: curr
    };
    
    combo.push(construct)

    num_messages += 1
  });

  //console.log(metric_max)
  //outputs has the list of metric scores for each message

  var bar_height = 5
  const padding = { left: 0, top: 20, bottom: 20, right: 20, height: 1000, width: 1000, bar_height: bar_height, spacing: (bar_height * 4)};

  // used to put the messages in place
  const y = d3
    //because we just map messages to screen locations
    .scaleLinear()
    //input domain scales on number of messages to display
    .domain([0, num_messages])
    //output domain is based on screen/window size
    .range([padding.height - padding.top, padding.bottom]);

  // used for the toxicity metric
  const x = d3
    //another linear scale, metric scores to locations
    .scaleLinear()
    //domain is based on 'span' of metric scores we're dealing with
      //alternatively, we can use the maximum + minimum possible toxicity scores instead
    .domain([0, metric_max])
    //output domain is again based on screen/window size
    .range([padding.left, padding.width - padding.right]);


  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    //yAxisG: d3.Selection<SVGGElement, unknown, null, undefined>;
  }>();

  const svg = d3.select(svgRef.current);
  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    selections.current = { svg };
  }, []);

  if (selections.current && message_set.length > 0) {   
    const { svg } = selections.current;
    svg.append("g")
      .call(d3.axisBottom(x))
      .attr("transform", `translate(${padding.left}, ${padding.bottom})`); // TODO xTranslation

      svg.append("text")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("x", padding.width/2)
        .attr("y", padding.bottom/2)
        .text("Toxicity Score")
        .style("fill", "white")

    svg
      .selectAll("rect")
      .data(outputs)
      .join("rect")
      //.attr("x", x(0))
      .attr("width", (data) => x(data))
      .attr("y", (data, i) => y(i) + padding.spacing)
      .attr("height", padding.bar_height)
      .attr("fill", "steelblue")
      
  }

  //return <i>WIP</i>
  return <svg ref={svgRef} width={padding.width} height={padding.height}></svg>
};