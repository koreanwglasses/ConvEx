import * as React from "react";
import { routes } from "../../endpoints";
import { Layout } from "./layout";

export const Home = () => (
  <Layout>
    <a href={routes.auth}>login</a>
  </Layout>
);
