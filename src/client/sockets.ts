import io from "socket.io-client";
import { rootURL } from "../utils";

const URL = rootURL();
const socket = io(URL, { autoConnect: false });

