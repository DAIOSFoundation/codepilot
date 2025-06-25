# codepilot README

VSCode base code assistant plugin with LLM and LM support.

## Features

<img src="https://drive.google.com/uc?export=view&id=1Qnb_rdSzjfSR34o4lZB5nDCCTuwD7lLJ" width="700" height="500"/>
<img src="https://drive.google.com/uc?export=view&id=1BpN9SVQiEnxi0R67NFzQceRkhgQyogic" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1KYN5wO_lE8lBgyrldAtMpKReJYUYnwTO" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1sADJQZCmOatGiHyeop1pa0dipg_Zs5SP" width="700" height="500"/><br>

### 🤖 AI-Powered Code Assistance
- **Gemini AI Integration**: Powered by Google's Gemini LLM for intelligent code generation and analysis. Lowest cost for maximum performance.
- **Dual-Mode Interface**: 
  - **CODE Tab**: Specialized for code generation, modification, and project-specific tasks
  - **ASK Tab**: General Q&A and real-time information queries
- **Context-Aware Responses**: Analyzes your project structure and existing code for relevant suggestions
- **Natural Language Processing**: Understands complex requests in plain English

### 📁 Advanced File Management
- **Smart File Selection**: Use the @ button to select specific files for context inclusion
- **Persistent File Context**: Selected files remain available across multiple conversations
- **Multi-File Operations**: Support for creating, modifying, and deleting multiple files simultaneously
- **Project Root Configuration**: Configurable project root path for accurate file operations
- **Auto File Updates**: Optional automatic file creation and modification based on AI suggestions

### 🖼️ Visual Code Analysis
- **Image Support**: Upload images for code analysis and debugging
- **Drag & Drop Interface**: Easy image attachment via clipboard paste
- **Visual Context**: AI can analyze screenshots, diagrams, and code images

### 🌐 Real-Time Information Services
- **Weather Information**: Korean Meteorological Administration API integration
  - Current weather conditions and forecasts
  - 7-day weather predictions
  - Location-specific weather data
- **News Updates**: NewsAPI integration for latest headlines
  - Topic-specific news searches
  - Real-time news aggregation
  - Source attribution and timestamps
- **Stock Market Data**: Alpha Vantage API integration
  - Real-time stock prices and changes
  - Major stock tracking (AAPL, GOOGL, MSFT, TSLA, AMZN)
  - Percentage change calculations

### ⚙️ Comprehensive Configuration
- **API Key Management**: Secure storage for multiple external API keys
  - Weather API key configuration
  - News API credentials (Client ID & Secret)
  - Stock API key management
- **Source Path Configuration**: Customizable paths for code context inclusion
- **Auto-Update Settings**: Toggle automatic file operations on/off
- **Project Root Settings**: Flexible project directory configuration

### 💻 Enhanced Development Experience
- **Code Block Display**: Syntax-highlighted code blocks with language detection
- **Copy-to-Clipboard**: One-click code copying functionality
- **File Operation Tracking**: Real-time feedback on file creation, modification, and deletion
- **Diff Viewing**: Side-by-side comparison of original vs. AI-suggested code
- **Error Handling**: Comprehensive error reporting and user feedback

### 🔒 Security & Privacy
- **Secure API Storage**: VS Code SecretStorage for sensitive API keys
- **Local Processing**: No internet required for core functionality
- **Privacy-First**: Local code analysis without external data transmission

### 🎨 Modern User Interface
- **VS Code Integration**: Native VS Code theming and styling
- **Responsive Design**: Adapts to different screen sizes and themes
- **Intuitive Navigation**: Easy switching between CODE and ASK modes
- **Loading Indicators**: Visual feedback during AI processing
- **Message History**: Persistent chat history with clear conversation flow

### 🚀 Performance Features
- **Abort Controller**: Ability to cancel ongoing AI requests
- **Context Optimization**: Smart context length management for optimal performance
- **File Type Filtering**: Automatic exclusion of binary and non-code files
- **Memory Management**: Efficient handling of large codebases

### 📋 Usage Examples
- **Code Generation**: "Create a React component for user authentication"
- **Code Modification**: "Add error handling to this function"
- **Real-time Info**: "What's the weather in Seoul?" or "Show me the latest tech news"
- **Stock Queries**: "What are the current stock prices?"
- **File Operations**: "Create a new utility file for date formatting"

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


### For more information


[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)

**Enjoy!**
