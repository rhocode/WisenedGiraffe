const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const ChunkManifestPlugin = require('chunk-manifest-webpack-plugin');
const WebpackChunkHash = require('webpack-chunk-hash');

const config = {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    // new webpack.HashedModuleIdsPlugin(),
    // new WebpackChunkHash(),
    // new ChunkManifestPlugin({
    //   filename: 'chunk-manifest.json',
    //   manifestVariable: 'webpackManifest',
    //   inlineManifest: true,
    // }),
  ],
  output: {
    filename: '[name].[chunkhash].js'
  },
  optimization: {
    splitChunks: {
      chunks: "initial",
    },
    minimizer: [new TerserPlugin({
      sourceMap: true,
      parallel: true,
    })],
  },
};

module.exports = config;