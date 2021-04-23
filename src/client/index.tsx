import React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app";

console.log(process.env.NODE_ENV);
ReactDOM.render(<App />, document.getElementById("react-root"));
