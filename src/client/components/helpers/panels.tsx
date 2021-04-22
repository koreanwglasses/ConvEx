import React, { createContext, useContext, useRef } from "react";

const PanelContainerContext = createContext();
export const PanelContainer = ({ children }: { children: React.ReactNode }) => {
  console.log(children);
  return <div>{children}</div>;
};

const PanelContext = createContext<{ width: number; height: number }>({
  width: undefined,
  height: undefined,
});
export const usePanelSize = () => useContext(PanelContext);
export const Panel = ({
  children,
  defaultWidth,
}: {
  children?: React.ReactNode;
  defaultWidth?: number | string;
}) => {
  const containerRef = useRef<HTMLDivElement>();
  return (
    <PanelContext.Provider
      value={{
        width: containerRef.current?.clientWidth,
        height: containerRef.current?.clientHeight,
      }}
    >
      <div ref={containerRef}>{children}</div>
    </PanelContext.Provider>
  );
};
