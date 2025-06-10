# codepilot README

VSCode base code assistant plugin with LLM and LM support.

## Features

<img src="https://drive.google.com/uc?export=view&id=1qV7VZvm806HlfrpBSi7BdQxyBlBKnNt7" width="700" height="500"/>

> TBD...

- No internet installation package support
- Custom LLM support
- User define code generation support
- Natural language commands support
- Code block indicator in response
- Project scope codes watching and auto debug by LLM

## Requirements

- nvm 0.39.1
- node v21.7.1
- npm install

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Not yet

## Release Notes

### 0.5b 2025/06/01

- Settings, License, Custom menu
- Banya API registration
- CHAT panel
  - Webview implementation with javascript bundle(Look over webpack configuration webpack.config.js)
  - Gemini response
  - Loading animation while LLM responses
  - Multiline message input with scroll
  - Markdown read and view wigh Gemini response
  - Code block indicator
  - Code block copy with cliipboard

### 1.3b 2025/06/06

- Settings
  - Project root setting
  - Source directory and file path recognizble
  - Source path update and rendering bug fixed
- CHAT panel
  - Cancel button and API canceling feature implemented
  - Chat contents clear feature added
  - Loading animation bug fixed
- AI
  - Creating new files according to the context of LLM outputs
  - Auto updating after LLM output response(User can determine if he can update codes immediately or check the difference with Diff)
  - Notification for updated files by AI

### 2.0b 2025/06/10

- Main
  - Implement call cancellation feature
  - Fix abort option argument issue in "@google/generative-ai": "^0.16.0" version
- Settings
  - Source path update and rendering bug fixed
- CHAT panel
  - Code block html tag expression bug fixed
  - Code copy bug fixed
  - Cancel button added
  - ASK tab added. ASK feature is that user can ask AI general knowledge.
  - Image copy with clipboard
  - Image thumbnail in the input message and chat window
- AI
  - Code generation by image analysis
  - Swfit language support
  - Git Diff support
- Etc
  - Fixed a bug where the thinking animation would not reappear after clearing

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
