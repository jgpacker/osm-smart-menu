const path = require("path");

module.exports = {
  entry: {
    "injectable-content-script": "./lib/injectable-content-script.ts",
    "panel/script": "./lib/panel/script.ts"
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
  }
};