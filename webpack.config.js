const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  target: "web",
  mode: "development",
  devtool: "source-map",
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "example"),
    filename: "[name].bundle.js",
    sourceMapFilename: "[file].map",
  },
  devServer: {
    contentBase: ".",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: true,
      template: "./index.html",
      chunks: ["main"],
    }),
    new HtmlWebpackPlugin({
      filename: "assisted.html",
      template: "./assisted.html",
      chunks: ["exampleEntry"],
    }),
  ],
};
