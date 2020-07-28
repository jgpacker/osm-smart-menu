const path = require("path");

module.exports = {
  optimization: {
    minimize: false, // ease code review by webextension stores
  },
  devtool: false, // related to optimization.minimize=false and https://bugzilla.mozilla.org/show_bug.cgi?id=1437937
  entry: {
    "injectable-content-script": "./src/injectable-content-script.ts",
    "options/script": "./src/options/main.ts",
    "popup/script": "./src/popup/main.ts",
    "background": "./src/setup.ts"
  },
  output: {
    path: path.resolve(__dirname, "addon"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
