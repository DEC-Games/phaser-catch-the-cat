const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const babelLoader = {
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    presets: [
      '@babel/preset-env'
    ]
  }
};

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'catch-the-cat.js'
  },
  performance: {
    maxAssetSize: 1000000, // Set to 1 MB (1000000 bytes) to allow phaser.min.js
    hints: 'warning', // Keep warnings for other potential issues
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
          babelLoader,
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          babelLoader
        ]
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'raw-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'public'
      },
      {
        from: 'node_modules/phaser/dist/phaser.min.js'
      }
    ])
  ],
  resolve: {
    extensions: ['.ts', '.js']
  }
};
