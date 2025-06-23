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

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 1.0.0

Initial release of CodePilot

### 1.1.0

- Added support for custom LLM models
- Improved code generation accuracy
- Enhanced natural language processing

### 1.2.0

- Added project scope code watching
- Implemented auto debug functionality
- Fixed various UI issues

### 1.3.0

- Enhanced chat interface with better code block display
- Added file operation tracking
- Improved error handling

### 1.4.0

- Added image support for code analysis
- Implemented file picker functionality
- Enhanced context management

### 2.0.0

- Complete UI redesign with modern interface
- Added dedicated view container with CODE and ASK tabs
- Implemented persistent file selection feature
- Enhanced code block display with copy functionality
- Added real-time information features

### 2.1b 2025/01/27

- CHAT panel
  - File selection feature with @ button in CODE tab
  - Selected files are displayed as context tags with white borders
  - Selected files remain persistent across messages for continuous context
  - Horizontal divider line between file selection area and input area
  - Vertical center alignment for selected file tags
  - File picker starts at configured project root path
  - Multiple file selection support
- AI
  - Selected files from @ button are included as additional context to LLM
  - File context works in both CODE and ASK tabs
  - Enhanced context processing for better file operation tracking

### 2.2b 2025/01/27

- AI
  - Fixed Gemini API error related to unsupported webSearch tools
  - Temporarily removed web search functionality due to API compatibility issues
  - ASK tab now works without web search grounding
  - Improved error handling for API calls

### 2.3b 2025/01/27

- ASK tab real-time information features added
  - Weather information lookup (Korean Meteorological Administration API integration)
  - News information lookup (NewsAPI integration)
  - Stock information lookup (Alpha Vantage API integration)
  - Natural language queries for real-time information
- Settings
  - External API key configuration options added (weather, news, stock)
  - API keys are securely managed in VS Code settings
  - New API key management section in settings page
  - Individual save buttons for each API key type
  - Real-time status display for API key configuration
- Usage
  - "Seoul weather" → Current weather information for Seoul
  - "News" → Latest news headlines
  - "Stock" → Major stock information (AAPL, GOOGL, MSFT, TSLA, AMZN)

## Following extension guidelines

Keep in mind that extensions should be self-contained and should not make assumptions about the system. Extensions should also be data efficient, so any large datasets should be ignored by the extension.

## Working with Markdown

**Note:** You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+CMD+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (macOS) to see a list of Markdown snippets

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
