//@ts-check

'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context
	mode: 'none', // will be overridden by npm scripts (e.g., development or production)

  entry: './src/extension.ts', // the entry point of the extension's main process
  output: {
    // the bundle is stored in the 'dist' folder
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js', // the output bundle for the extension
    libraryTarget: 'commonjs2', // the type of the generated bundle (CommonJS for Node.js)
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is provided by VS Code and must be excluded
    // List other modules here that should not be bundled (e.g., large native modules)
  },
  resolve: {
    // support reading TypeScript and JavaScript files
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // rule for TypeScript files
        exclude: /node_modules/,
        use: [ { loader: 'ts-loader' } ] // use ts-loader for TypeScript
      }
      // Add other rules here for different file types (e.g., CSS, images) if needed by the extension's main code
    ]
  },
  devtool: 'nosources-source-map', // Source maps for debugging (adjust as needed)
  infrastructureLogging: { level: "log" }, // Logging level for webpack
};


/** @type WebpackConfig */
const webviewConfig = {
  target: 'web', // Webview runs in a browser-like environment

	mode: 'none', // will be overridden by npm scripts (e.g., development or production)

  // <-- 웹뷰 스크립트 entry point -->
  // webview/chat.js 파일을 이 번들의 진입점으로 설정
  entry: './webview/chat.js',
  // <-- 끝 -->

  output: {
    // <-- 웹뷰 번들 파일이 저장될 경로 -->
    // dist 폴더 아래의 webview 서브폴더에 저장
    path: path.resolve(__dirname, 'dist', 'webview'),
    // <-- 끝 -->

    // <-- 웹뷰 번들 파일 이름 -->
    // chat.js 라는 이름으로 출력 (extension.ts에서 이 이름을 예상)
    filename: 'chat.js',
    // <-- 끝 -->

    libraryTarget: 'umd', // 웹 환경에 맞는 라이브러리 타겟 (UMD, var 등)
    devtoolModuleFilenameTemplate: '../../[resource-path]', // Source maps path relative to the new output path
  },
  devtool: 'source-map', // 웹뷰 JS 디버깅을 위해 source-map 사용 (nosources-source-map 대신)

  // external은 일반적으로 필요하지 않습니다. 웹뷰 JS는 모든 의존성(dompurify 등)을 번들링해야 합니다.
  // vscode 모듈은 웹뷰 환경에 없습니다.

  resolve: {
    extensions: ['.js'] // 웹뷰 JS 파일 확장자 (chat.js는 JS)
    // 만약 웹뷰 코드를 TypeScript로 작성했다면 ['.ts', '.js'] 추가
  },
  module: {
    rules: [
      // 웹뷰 JS 파일에 필요한 로더 (babel 등)
      // NPM 모듈(dompurify)은 별도 로더 없이 기본적으로 번들링됩니다.
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
      // 웹뷰 코드를 TypeScript로 작성했다면 여기에 TypeScript 로더 규칙 추가
      // {
      //   test: /\.ts$/,
      //   exclude: /node_modules/,
      //   use: [{ loader: 'ts-loader' }]
      // }
    ]
    // 만약 웹뷰에서 CSS나 다른 리소스를 import 한다면 해당 로더(css-loader, style-loader, asset/resource 등) 규칙 추가
  },
  // development/watch 모드에서 파일 변경 감지 설정 (optional)
  watchOptions: {
    ignored: /node_modules|dist/ // node_modules와 dist는 무시
  },
};

// <-- Webpack이 두 개의 설정을 모두 처리하도록 배열로 내보냅니다. -->
module.exports = [ extensionConfig, webviewConfig ];
// <-- 끝 -->