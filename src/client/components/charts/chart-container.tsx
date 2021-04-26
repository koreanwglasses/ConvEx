import React, { createContext, useContext, useEffect, useRef } from "react";
import mergeRefs from "react-merge-refs";
import { useDispatch } from "./message-scroller";

const ChartContainerContext = createContext<{ width: number; height: number }>({
  width: undefined,
  height: undefined,
});

export const useChartSize = () => useContext(ChartContainerContext);

export const ChartContainer = React.forwardRef(
  (
    {
      children,
      style = {},
      onWheel,
      ...divProps
    }: React.PropsWithChildren<
      Omit<React.ComponentProps<"div">, "onWheel"> & {
        onWheel?: (ev: WheelEvent) => void;
      }
    >,
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>();

    const { scrollTime } = useDispatch();
    useEffect(() => {
      const listener =
        onWheel ||
        ((e: WheelEvent) => {
          e.preventDefault();
          scrollTime(e.deltaY);
        });
      containerRef.current.addEventListener("wheel", listener);
      return () => containerRef.current.removeEventListener("wheel", listener);
    }, [scrollTime, onWheel]);

    return (
      <ChartContainerContext.Provider
        value={{
          width: containerRef.current?.clientWidth,
          height: containerRef.current?.clientHeight,
        }}
      >
        <div
          ref={mergeRefs([containerRef, ref])}
          style={{ flexGrow: 1, height: "100%", ...style }}
          {...divProps}
        >
          {children}
        </div>
      </ChartContainerContext.Provider>
    );
  }
);
