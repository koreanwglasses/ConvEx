import { makeStyles } from "@material-ui/core";
import * as d3 from "d3";
import { Result } from "perspective-api-client";
import React, { useEffect, useMemo, useRef } from "react";
import { Message } from "../../../endpoints";
import { useAnalyses } from "../../hooks/use-analyses";
import { MessageView } from "../message/message-view";
import { ChartContainer, useChartSize } from "./chart-container";
import { useAxes, useDispatch, useMessages } from "./message-scroller";

const useStyles = makeStyles((theme) => ({
  listContainer: {
    display: "flex",
    flexDirection: "column-reverse",
    minHeight: "70vh",
  },
}));

export const MessageList = () => (
  <ChartContainer>
    <Chart />
  </ChartContainer>
);

const padding = { top: 20, bottom: 20 };
const messageHeight = 56;

const Chart = () => {
  const { height } = useChartSize();
  const { y, transitionAlpha, transitionPivot } = useAxes([
    padding.top,
    height - padding.bottom,
  ]);

  const messages = useMessages();
  const analyses = useAnalyses(messages);

  /* Remove messages that run into each other */
  const computeBounds = (message: Message) => {
    const y_ = y(message);
    const top = y_ - messageHeight / 2;
    const bottom = y_ + messageHeight / 2;
    return [top, bottom] as const;
  };
  const overlap = (message1: Message, message2: Message) => {
    const [top1, bottom1] = computeBounds(message1);
    const [top2, bottom2] = computeBounds(message2);
    const x = (bottom2 - top1) / messageHeight;
    const y = (bottom1 - top2) / messageHeight;

    if (x < 0 || y < 0) return 0;
    return Math.min(x, y);
  };
  const score = (message: Message) =>
    analyses?.get(message.id)?.result?.attributeScores.TOXICITY.summaryScore
      .value ?? 0;

  const messagesToShow = useMemo(() => {
    const startTime = performance.now();
    const messagesToShow: Message[] = [];
    messages.forEach((message) => {
      if (!messagesToShow.length) {
        messagesToShow.push(message);
        return;
      }
      const lastMessage = messagesToShow[messagesToShow.length - 1];
      if (overlap(message, lastMessage) < 0.5) {
        messagesToShow.push(message);
        return;
      }

      if (score(message) > score(lastMessage)) {
        messagesToShow[messagesToShow.length - 1] = message;
      }
    });
    const endTime = performance.now();
    console.log(
      `Overlap filtering took ${endTime - startTime}ms for ${
        messages.length
      } messages or ${(endTime - startTime) / messages.length}ms per message`
    );
    return messagesToShow;
  }, [messages[0]?.id, messages.length && messages[messages.length - 1].id, y]);

  return transitionAlpha < 1 ? (
    <TransitionMessageList
      messages={messagesToShow}
      analyses={analyses}
      pivot={transitionPivot}
    />
  ) : (
    <FullMessageList messages={messagesToShow} analyses={analyses} />
  );
};

const FullMessageList = ({
  messages,
  analyses,
}: {
  messages: Message[];
  analyses: Map<
    string,
    {
      error: Error;
      result: Result;
    }
  >;
}) => {
  const classes = useStyles();

  const { width, height } = useChartSize();
  const { y } = useAxes([padding.top, height - padding.bottom]);
  const { setYAxisType } = useDispatch();

  return (
    <div
      className={classes.listContainer}
      style={{ position: "relative", overflow: "hidden", width, height }}
    >
      {messages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          analysis={analyses?.get(message.id)}
          style={{
            top: y?.(message) - messageHeight / 2,
            position: "absolute",
            width,
          }}
          onDoubleClick={() => {
            setYAxisType("point", message.id);
          }}
        />
      ))}
    </div>
  );
};

const TransitionMessageList = ({
  messages,
  analyses,
  pivot,
}: {
  messages: Message[];
  analyses: Map<
    string,
    {
      error: Error;
      result: Result;
    }
  >;
  pivot?: string;
}) => {
  const { width, height } = useChartSize();
  const { y } = useAxes([padding.top, height - padding.bottom]);

  const svgRef = useRef<SVGSVGElement>();
  const selections = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  }>();

  useEffect(() => {
    /* Initialization. Runs once */
    const svg = d3.select(svgRef.current);
    selections.current = { svg };
  }, []);

  if (selections.current && y) {
    /* Drawing. Runs whenever height, width, data, etc. are updated */
    const { svg } = selections.current;

    svg
      .selectAll("rect")
      .data(messages, (message: Message) => message.id)
      .join("rect")
      .attr("x", 0)
      .attr("width", width)
      .attr("y", (message) => y(message) - messageHeight / 2)
      .attr("height", messageHeight)
      .attr("rx", messageHeight / 2)
      .attr("ry", messageHeight / 2)
      .attr("fill", (message) => {
        const analysis = analyses.get(message.id)?.result;
        return analysis
          ? d3.interpolateYlOrRd(
              analysis.attributeScores.TOXICITY.summaryScore.value
            )
          : "white";
      });
  }

  const pivotMessage = messages.find(({ id }) => id === pivot);

  return (
    <>
      <svg ref={svgRef} width={width} height={height} />
      {pivotMessage && (
        <MessageView
          message={pivotMessage}
          analysis={analyses?.get(pivot)}
          style={{
            top: y?.(pivotMessage) - messageHeight / 2,
            position: "absolute",
            width,
          }}
        />
      )}
    </>
  );
};
