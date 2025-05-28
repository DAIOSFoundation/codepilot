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

  // <-- 수정: 웹뷰 스크립트 entry point를 객체로 설정 -->
  // chat.js와 codeCopy.js를 각각 별도의 번들로 출력합니다.
  entry: {
    chat: './webview/chat.js', // chat 번들
    codeCopy: './webview/codeCopy.js', // codeCopy 번들
  },
  // <-- 수정 끝 -->

  output: {
    // <-- 웹뷰 번들 파일이 저장될 경로 -->
    // dist 폴더 아래의 webview 서브폴더에 저장
    path: path.resolve(__dirname, 'dist', 'webview'),
    // <-- 끝 -->

    // <-- 수정: 웹뷰 번들 파일 이름을 [name].js 형태로 설정 -->
    // entry 객체의 키 (chat, codeCopy)를 사용하여 파일 이름이 결정됩니다.
    filename: '[name].js', // 예: chat.js, codeCopy.js
    // <-- 수정 끝 -->

    libraryTarget: 'umd', // 웹 환경에 맞는 라이브러리 타겟 (UMD, var 등)
    devtoolModuleFilenameTemplate: '../../[resource-path]', // Source maps path relative to the new output path
  },
  devtool: 'source-map', // 웹뷰 JS 디버깅을 위해 source-map 사용 (nosources-source-map 대신)

  // external은 일반적으로 필요하지 않습니다. 웹뷰 JS는 모든 의존성(dompurify, markdown-it 등)을 번들링해야 합니다.
  // vscode 모듈은 웹뷰 환경에 없습니다.

  resolve: {
    // <-- 추가/수정: 웹뷰에서 import하는 파일들의 확장자 해결 -->
    // chat.js와 codeCopy.js는 .js 파일입니다. import를 사용하므로 .js 확장이 필요합니다.
    extensions: ['.js']
    // 만약 웹뷰 코드를 TypeScript로 작성했다면 ['.ts', '.js'] 추가
    // <-- 추가/수정 끝 -->
  },
  module: {
    rules: [
      // <-- 추가: 웹뷰 JS 파일에 필요한 로더 (babel 등) -->
      // `.js` 파일을 babel 등으로 트랜스파일링 할 필요가 있다면 여기에 추가합니다.
      // chat.js 파일에 ES 모듈 import 및 async/await 등이 사용되므로,
      // 브라우저 호환성을 위해 babel-loader가 필요할 수 있습니다.
       {
         test: /\.js$/,
         exclude: /node_modules/,
         use: {
           loader: 'babel-loader', // npm install -D babel-loader @babel/core @babel/preset-env
           options: {
             presets: [['@babel/preset-env', { targets: "defaults" }]] // 기본 브라우저 지원 설정
           }
         }
       }
      // <-- 추가 끝 -->
      // 만약 웹뷰 코드를 TypeScript로 작성했다면 여기에 TypeScript 로더 규칙 추가
      // {
      //   test: /\.ts$/,
      //   exclude: /node_modules/,
      //   use: [{ loader: 'ts-loader' }]
      // }
      // 만약 웹뷰에서 CSS나 다른 리소스를 import 한다면 해당 로더(css-loader, style-loader, asset/resource 등) 규칙 추가
    ]
  },
  // development/watch 모드에서 파일 변경 감지 설정 (optional)
  watchOptions: {
    ignored: /node_modules|dist/ // node_modules와 dist는 무시
  },
};

// <-- Webpack이 두 개의 설정을 모두 처리하도록 배열로 내보냅니다. -->
module.exports = [ extensionConfig, webviewConfig ];