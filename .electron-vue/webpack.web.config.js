'use strict'

process.env.BABEL_ENV = 'web'

const path = require('node:path')
const { dependencies } = require('../package.json')
const Webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const devMode = process.env.NODE_ENV !== 'production'

/**
 * List of node_modules to include in webpack bundle
 *
 * Required for specific packages like Vue UI libraries
 * that provide pure *.vue files that need compiling
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/webpack-configurations.html#white-listing-externals
 */
let whiteListedModules = ['vue']

let webConfig = {
  entry: {
    index: path.join(__dirname, '../src/renderer/pages/index/main.js')
  },
  externals: [],
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: { filename: '[name].js' }
        }
      },
      {
        test: /\.scss$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              additionalData: '@import "@/components/Theme/Variables.scss";',
              sassOptions: {
                includePaths:[__dirname, 'src']
              }
            },
          }
        ]
      },
      {
        test: /\.sass$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              indentedSyntax: true,
              additionalData: '@import "@/components/Theme/Variables.scss";',
              sassOptions: {
                includePaths:[__dirname, 'src']
              }
            },
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        include: [
          path.resolve(__dirname, '../src/renderer'),
          path.resolve(__dirname, '../src/shared')
        ],
        exclude: /node_modules/
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            extractCSS: true,
            loaders: {
              sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1',
              scss: 'vue-style-loader!css-loader!sass-loader',
              less: 'vue-style-loader!css-loader!less-loader'
            }
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: 'asset/inline'
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset/inline'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    }),
    new HtmlWebpackPlugin({
      title: 'Motrix',
      filename: 'index.html',
      chunks: ['index'],
      template: path.resolve(__dirname, '../src/index.ejs'),
      // minify: {
      //   collapseWhitespace: true,
      //   removeAttributeQuotes: true,
      //   removeComments: true
      // },
      isBrowser: true,
      isDev: process.env.NODE_ENV !== 'production',
      nodeModules: devMode
        ? path.resolve(__dirname, '../node_modules')
        : false
    }),
    new Webpack.DefinePlugin({
      'process.env.PORTABLE_EXECUTABLE_DIR': '""',
      'process.env.IS_WEB': 'true'
    }),
    new Webpack.NormalModuleReplacementPlugin(
      /^node:events$/,
      path.join(__dirname, '../src/renderer/web/shims/events.js')
    ),
    new Webpack.NormalModuleReplacementPlugin(
      /^node:fs$/,
      path.join(__dirname, '../src/renderer/web/shims/fs.js')
    ),
    new Webpack.NormalModuleReplacementPlugin(
      /^node:path$/,
      path.join(__dirname, '../src/renderer/web/shims/path.js')
    ),
    new Webpack.HotModuleReplacementPlugin(),
    new Webpack.NoEmitOnErrorsPlugin(),
    new ESLintPlugin({
      extensions: ['js', 'vue'],
      formatter: require('eslint-friendly-formatter')
    })
  ],
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../dist/web'),
    globalObject: 'this',
    publicPath: ''
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src/renderer'),
      '@shared': path.join(__dirname, '../src/shared'),
      'electron$': path.join(__dirname, '../src/renderer/web/shims/electron.js'),
      '@electron/remote$': path.join(__dirname, '../src/renderer/web/shims/remote.js'),
      'electron-is$': path.join(__dirname, '../src/renderer/web/shims/electron-is.js'),
      '@/utils/native$': path.join(__dirname, '../src/renderer/web/native.js'),
      'node:events$': path.join(__dirname, '../src/renderer/web/shims/events.js'),
      'node-fetch$': path.join(__dirname, '../src/renderer/web/shims/node-fetch.js'),
      'parse-torrent$': path.join(__dirname, '../src/renderer/web/shims/parse-torrent.js'),
      'ws$': path.join(__dirname, '../src/renderer/web/shims/ws.js'),
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['.js', '.vue', '.json', '.css']
  },
  devServer: {
    host: '0.0.0.0',
    port: 47000,
    allowedHosts: 'all',
    hot: true,
    proxy: {
      '/jsonrpc': {
        target: 'http://127.0.0.1:16800',
        changeOrigin: true,
        ws: true
      }
    },
    static: {
      directory: path.join(__dirname, '../static'),
      publicPath: '/static'
    },
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
      overlay: false
    }
  },
  target: 'web',
  optimization: {
    minimize: !devMode,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
}

/**
 * Adjust webConfig for development settings
 */
if (devMode) {
  webConfig.devtool = 'eval-cheap-module-source-map'
}

/**
 * Adjust webConfig for production settings
 */
if (!devMode) {
  webConfig.plugins.push(
    new CopyWebpackPlugin({
      patterns: [{
        from: path.join(__dirname, '../static'),
        to: path.join(__dirname, '../dist/web/static'),
        globOptions: { ignore: [ '.*' ] }
      }]
    }),
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new Webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
}

module.exports = webConfig
