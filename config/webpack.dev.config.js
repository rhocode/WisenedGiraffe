const commonPaths = require('./common-paths');
const webpack = require('webpack');

const config = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    host: '0.0.0.0',
    contentBase: commonPaths.outputPath,
    compress: true,
    hot: false,
    port: 9000
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
};

module.exports = config;