//@ts-check

'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context
	mode: 'none', // will be overridden by npm scripts

  entry: './src/extension.ts', // the entry point of this extension
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module must be excluded
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [ { loader: 'ts-loader' } ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: { level: "log" },
};


/** @type WebpackConfig */
const webviewConfig = {
  target: 'web', // Webview runs in a browser-like environment
	mode: 'none', // will be overridden by npm scripts

  // <-- 추가: 웹뷰 스크립트 entry point -->
  // 웹뷰의 JS 파일 경로를 지정합니다.
  entry: './webview/chat.js',
  // <-- 추가 끝 -->

  output: {
    // <-- 수정: 웹뷰 파일이 저장될 경로 -->
    // dist 폴더 아래의 webview 폴더에 저장되도록 설정합니다.
    path: path.resolve(__dirname, 'dist', 'webview'),
    // <-- 수정 끝 -->

    // <-- 수정: 웹뷰 번들 파일 이름 -->
    // chat.js 라는 이름으로 출력되도록 설정합니다.
    filename: 'chat.js',
    // <-- 수정 끝 -->

    libraryTarget: 'umd', // 웹 환경에 맞는 라이브러리 타겟
    devtoolModuleFilenameTemplate: '../../[resource-path]',
  },
  devtool: 'source-map', // 웹뷰 JS 디버깅을 위해 source-map 사용

  // external은 필요하지 않습니다. 웹뷰 JS는 모든 의존성(dompurify 등)을 번들링해야 합니다.
  // vscode 모듈은 웹뷰 환경에 없습니다.

  resolve: {
    extensions: ['.js'] // 웹뷰 JS 파일 확장자
  },
  module: {
    rules: [
      // 웹뷰 JS 파일에 필요한 로더 추가 (예: Babel for older JS features if needed)
      // DOMPurify 등 NPM 모듈은 별도 로더 없이 기본적으로 번들링될 가능성이 높습니다.
      // {
      //   test: /\.js$/,
      //   exclude: /node_modules/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       presets: ['@babel/preset-env']
      //     }
      //   }
      // }
    ]
  },
  // development/watch 모드에서 웹뷰 파일 변경 감지
  watchOptions: {
    ignored: /node_modules|dist/ // node_modules와 dist는 무시
  },
};

// <-- 수정: Webpack이 두 개의 설정을 모두 처리하도록 배열로 내보냅니다. -->
module.exports = [ extensionConfig, webviewConfig ];
// <-- 수정 끝 -->