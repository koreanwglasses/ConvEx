import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import mergeRefs from "react-merge-refs";
import { useContainerSize, useDispatch } from "./message-scroller";

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
    const [[width, height], setSize] = useState([
      undefined as number,
      undefined as number,
    ]);

    const { containerHeight } = useContainerSize();
    useEffect(() => {
      const updateSize = () => {
        setSize([
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        ]);
      };
      updateSize();

      addEventListener("resize", updateSize);
      return () => removeEventListener("resize", updateSize);
    }, [containerHeight]);

    const { scroll } = useDispatch();
    useEffect(() => {
      const listener =
        onWheel ||
        ((e: WheelEvent) => {
          e.preventDefault();
          scroll(e.deltaY);
        });
      containerRef.current.addEventListener("wheel", listener);
      return () => containerRef.current?.removeEventListener("wheel", listener);
    }, [scroll, onWheel]);

    return (
      <ChartContainerContext.Provider
        value={{
          width,
          height,
        }}
      >
        <div
          ref={mergeRefs([containerRef, ref])}
          style={{ height: "100%", width: "300px", flexGrow: 1, ...style }}
          {...divProps}
        >
          {children}
        </div>
      </ChartContainerContext.Provider>
    );
  }
);
