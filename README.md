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

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### Version 2.4.0 (2025/06/26) - Enhanced AI response structure & UX improvements

<details>
<summary>Enhanced AI Response Structure</summary>

- Improved system prompts for better code generation and file operations
- Structured response format with clear file operation directives
- Mandatory work summary and detailed operation descriptions
- Enhanced error handling and user feedback

</details>

<details>
<summary>Improved User Experience</summary>

- Fixed chat interface scrolling issues for immediate response visibility
- Optimized message display order: AI response → file operations → work summary → operation description
- Added emoji indicators for better visual organization:
  - 📁 File update results
  - 📋 AI work summary  
  - 💡 Work execution description
- Enhanced thinking animation with proper timing and visibility

</details>

<details>
<summary>Code Generation Enhancements</summary>

- Mandatory file operation directives: "수정 파일:", "새 파일:", "삭제 파일:"
- Complete file content output instead of partial changes
- Automatic work summary generation for all operations
- Detailed operation explanations for better understanding

</details>

<details>
<summary>File Operation Improvements</summary>

- Sequential processing: thinking animation removal → file operations → result display
- Enhanced file operation feedback with success/error indicators
- Better error handling for file creation, modification, and deletion
- Improved diff viewing for code modifications

</details>

<details>
<summary>API Key Management</summary>

- Moved Gemini API key configuration from License to Settings menu
- Centralized API key management in Settings panel
- Enhanced security with VS Code SecretStorage
- Improved API key validation and error handling

</details>

<details>
<summary>Real-time Information Enhancements</summary>

- Enhanced weather information with 7-day forecasts
- Improved news search with topic-specific queries
- Better stock information display with change indicators
- Natural language processing for information queries

</details>

<details>
<summary>Technical Improvements</summary>

- Fixed webview message handling and display issues
- Enhanced code block rendering with proper syntax highlighting
- Improved context management for better AI responses
- Better error recovery and user notification system

</details>

### Version 2.3b (2025/6/26) - Real-time information features

<details>
<summary>ASK tab real-time information features added</summary>

- Weather information lookup (Korean Meteorological Administration API integration)
- News information lookup (NewsAPI integration)
- Stock information lookup (Alpha Vantage API integration)
- Natural language queries for real-time information

</details>

<details>
<summary>Settings</summary>

- External API key configuration options added (weather, news, stock)
- API keys are securely managed in VS Code settings
- New API key management section in settings page
- Individual save buttons for each API key type
- Real-time status display for API key configuration

</details>

<details>
<summary>Usage</summary>

- "Seoul weather" → Current weather information for Seoul
- "News" → Latest news headlines
- "Stock" → Major stock information (AAPL, GOOGL, MSFT, TSLA, AMZN)

</details>

### Version 2.2b (2025/06/10) - API compatibility fixes

<details>
<summary>AI</summary>

- Fixed Gemini API error related to unsupported webSearch tools
- Temporarily removed web search functionality due to API compatibility issues
- ASK tab now works without web search grounding
- Improved error handling for API calls

</details>

### Version 2.1b (2025/06/5) - File selection & context

<details>
<summary>CHAT panel</summary>

- File selection feature with @ button in CODE tab
- Selected files are displayed as context tags with white borders
- Selected files remain persistent across messages for continuous context
- Horizontal divider line between file selection area and input area
- Vertical center alignment for selected file tags
- File picker starts at configured project root path
- Multiple file selection support

</details>

<details>
<summary>AI</summary>

- Selected files from @ button are included as additional context to LLM
- File context works in both CODE and ASK tabs
- Enhanced context processing for better file operation tracking

</details>

### Version 2.0.0 - Complete UI redesign

<details>
<summary>Major Changes</summary>

- Complete UI redesign with modern interface
- Added dedicated view container with CODE and ASK tabs
- Implemented persistent file selection feature
- Enhanced code block display with copy functionality
- Added real-time information features

</details>

### Version 1.4.0 - Image support & file picker

<details>
<summary>Features</summary>

- Added image support for code analysis
- Implemented file picker functionality
- Enhanced context management

</details>

### Version 1.3.0 - Enhanced chat interface

<details>
<summary>Improvements</summary>

- Enhanced chat interface with better code block display
- Added file operation tracking
- Improved error handling

</details>

### Version 1.2.0 - Project scope features

<details>
<summary>Features</summary>

- Added project scope code watching
- Implemented auto debug functionality
- Fixed various UI issues

</details>

### Version 1.1.0 - Enhanced LLM support

<details>
<summary>Enhancements</summary>

- Added support for custom LLM models
- Improved code generation accuracy
- Enhanced natural language processing

</details>

### Version 1.0.0 - Initial release

<details>
<summary>Initial Features</summary>

Initial release of CodePilot

</details>


### For more information
I'm seeking individuals to help me grow this source code. Please contact me at: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)

**Enjoy!**
