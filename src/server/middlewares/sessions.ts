import { RequestHandler } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";

let sessionMiddleware: RequestHandler;

export const init = () => {
  const MemoryStore = createMemoryStore(session);

  sessionMiddleware = session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: "7A039460D488C46AAB1A70265BF960D045684B20FF94C89E65A284F6A788A069",
    resave: false,
    saveUninitialized: false,
  });
};

export { sessionMiddleware };
