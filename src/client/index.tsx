import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app";
import socket from "./sockets";

socket.connect();
ReactDOM.render(<App />, document.getElementById("react-root"));
