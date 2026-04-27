/// <reference types="node" />
import process from 'process';
import * as webpack from 'webpack';


export const webpackConfig: webpack.Configuration = {
  resolve: {
    fallback: {
      stream: require.resolve('stream-browserify'),
      zlib: require.resolve('browserify-zlib'),
      path: require.resolve('path-browserify'),
      crypto: require.resolve("crypto-browserify"),
      os: require.resolve("os-browserify/browser"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      fs: false,
      child_process: false,
      readline: false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      Stream: ['stream-browserify', 'Stream']
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    })
  ]
};

export default webpackConfig;