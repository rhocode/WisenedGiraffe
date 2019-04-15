const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const config = {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  optimization: {
    minimizer: [new TerserPlugin({
      sourceMap: true,
      parallel: true,
    })],
  },
};

module.exports = config;