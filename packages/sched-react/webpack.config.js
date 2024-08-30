const path = require("path");

module.exports = {
  entry: "./src/index.js", // Update to your entry file
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    libraryTarget: "commonjs2", // Important for npm packages
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // This will match both .js and .jsx files
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      // Add additional loaders if needed, e.g., for CSS or images
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"], // Resolve these file types without specifying extensions in imports
  },
  externals: {
    react: "react", // Prevent bundling React in your package
  },
};
