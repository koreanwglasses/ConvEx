const { merge } = require("webpack-merge");
const common = require("../webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  output: {
    path: path.resolve(__dirname, "./client/dist"),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
});
