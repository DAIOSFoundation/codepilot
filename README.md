<p align="right">
  🇰🇷 <a href="README.ko.md">한국어로 보기</a>
</p>

# codepilot README

VSCode base code assistant plugin with LLM and LM support.

## Features

<img src="https://drive.google.com/uc?export=view&id=1Qnb_rdSzjfSR34o4lZB5nDCCTuwD7lLJ" width="700" height="500"/>
<img src="https://drive.google.com/uc?export=view&id=1BpN9SVQiEnxi0R67NFzQceRkhgQyogic" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1KYN5wO_lE8lBgyrldAtMpKReJYUYnwTO" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1sADJQZCmOatGiHyeop1pa0dipg_Zs5SP" width="700" height="500"/><br>

### 🤖 AI-Powered Code Assistance
- **Multi-Model AI Support**: 
  - **Gemini 2.5 Pro Flash**: Google's advanced LLM for intelligent code generation and analysis
  - **Ollama Gemma3:27b**: Local Ollama server integration for offline AI processing
  - **Dynamic Model Selection**: Switch between cloud and local AI models in settings
- **Dual-Mode Interface**: 
  - **CODE Tab**: Specialized for code generation, modification, and project-specific tasks
  - **ASK Tab**: General Q&A and real-time information queries
- **Context-Aware Responses**: Analyzes your project structure and existing code for relevant suggestions
- **Natural Language Processing**: Understands complex requests in plain English
- **Local AI Processing**: Full offline capability with Ollama integration

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
- **Multi-Model AI Configuration**:
  - **AI Model Selection**: Choose between Gemini 2.5 Pro Flash and Ollama Gemma3:27b
  - **Ollama Server Setup**: Configure Ollama API URL and endpoint selection
    - Local Ollama: `http://localhost:11434` + `/api/generate`
    - External Server: `https://your-server.com` + `/api/chat`
    - Vessl AI Cluster: `https://model-service-gateway-xxx.eu.h100-cluster.vessl.ai` + `/api/chat`
  - **Dynamic Settings**: Enable/disable model-specific settings based on selection
- **API Key Management**: Secure storage for multiple external API keys
  - Gemini API key configuration
  - Weather API key configuration
  - News API credentials (Client ID & Secret)
  - Stock API key management
  - **Banya License Management**: 
    - Encrypted license serial storage with AES-256-CBC
    - Firebase Firestore verification system
    - Read-only display of stored licenses
    - License deletion and re-verification capabilities
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
- **Encrypted License Storage**: AES-256-CBC encryption for Banya license serial numbers
- **License Protection**: CODE and ASK tabs require valid Banya license for activation
- **Local Processing**: No internet required for core functionality
- **Privacy-First**: Local code analysis without external data transmission

### 🎨 Modern User Interface
- **VS Code Integration**: Native VS Code theming and styling
- **Responsive Design**: Adapts to different screen sizes and themes
- **Intuitive Navigation**: Easy switching between CODE and ASK modes
- **Loading Indicators**: Visual feedback during AI processing
- **Message History**: Persistent chat history with clear conversation flow
- **Multi-Language Support**: Complete internationalization for 7 languages (Korean, English, Japanese, German, Spanish, French, Chinese)
- **License Status Display**: Visual indicators for license verification status and read-only license fields

### 🚀 Performance Features
- **Abort Controller**: Ability to cancel ongoing AI requests
- **Context Optimization**: Smart context length management for optimal performance
- **File Type Filtering**: Automatic exclusion of binary and non-code files
- **Memory Management**: Efficient handling of large codebases
- **Network Resilience**: Node.js HTTP module for reliable local network connections
- **Webview Safety**: Protected message handling to prevent disposed webview errors

### 🔐 License Protection System
- **Banya License Verification**: 
  - Firebase Firestore-based license validation
  - 16-digit serial number format with hyphens
  - Real-time license verification against cloud database
- **Encrypted Storage**: 
  - AES-256-CBC encryption for license serial numbers
  - Secure storage in VS Code SecretStorage
  - Automatic encryption/decryption with SHA-256 key hashing
- **Access Control**: 
  - CODE and ASK tabs require valid license for activation
  - Graceful error handling with multi-language support
  - License status indicators and read-only display
- **License Management**: 
  - License serial input with validation
  - License deletion and re-verification
  - Visual feedback for license operations

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

## Installation & Setup

### Prerequisites
1. **Node.js Environment**
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   
   # Install Node.js v21.7.1
   nvm install 21.7.1
   nvm use 21.7.1
   ```

2. **VS Code Extension Development Tools**
   ```bash
   # Install VS Code Extension Generator
   npm install -g yo generator-code
   ```

### Development Setup
1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/DAIOSFoundation/codepilot.git
   cd codepilot
   npm install
   ```

2. **Build the Extension**
   ```bash
   # Development build with watch mode
   npm run watch
   
   # Production build
   npm run package
   ```

3. **Run in Development Mode**
   ```bash
   # Press F5 in VS Code to launch extension host
   # Or use the command palette: "Developer: Reload Window"
   ```

### Configuration
1. **AI Model Setup**
   - Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run "CodePilot: Open Settings Panel"
   - **For Gemini**: Enter your Gemini API key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))
   - **For Ollama**: Install Ollama and set API URL (default: http://localhost:11434)

2. **Ollama Setup (Optional)**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama server
   ollama serve
   
   # Pull Gemma3:27b model
   ollama pull gemma3:27b
   ```

3. **Optional External APIs**
   - **Weather API**: Get API key from [KMA API Hub](https://apihub.kma.go.kr/)
   - **News API**: Get Client ID & Secret from [Naver Developers](https://developers.naver.com/)
   - **Stock API**: Get API key from [Alpha Vantage](https://www.alphavantage.co/)

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run watch-tests

# Run linting
npm run lint
```

### Manual Testing
1. **Extension Activation**
   - Open VS Code
   - Navigate to Extensions view (`Ctrl+Shift+X`)
   - Find "CodePilot" in the activity bar
   - Verify both CODE and ASK tabs are visible

2. **CODE Tab Testing**
   ```bash
   # Test code generation
   - Open CODE tab
   - Type: "Create a simple React component"
   - Verify AI response with code blocks
   
   # Test file operations
   - Use @ button to select files
   - Request file modifications
   - Verify file creation/modification
   ```

3. **ASK Tab Testing**
   ```bash
   # Test general Q&A
   - Open ASK tab
   - Ask: "What is TypeScript?"
   - Verify informative response
   
   # Test real-time information
   - Ask: "What's the weather in Seoul?"
   - Ask: "Show me latest tech news"
   - Ask: "What are current stock prices?"
   ```

4. **Settings Testing**
   ```bash
   # Test API key management
   - Open Settings panel
   - Add/update API keys
   - Verify secure storage
   
   # Test language switching
   - Change language setting
   - Verify UI updates immediately
   ```

### Integration Testing
1. **File Context Testing**
   - Create a test project with multiple files
   - Use @ button to select specific files
   - Verify context is included in AI responses

2. **Image Analysis Testing**
   - Upload code screenshots or diagrams
   - Request code analysis
   - Verify AI understands visual content

3. **Multi-language Testing**
   - Test all supported languages
   - Verify proper localization
   - Test language persistence

### Performance Testing
1. **Large Codebase Testing**
   - Test with projects containing 100+ files
   - Monitor memory usage
   - Verify response times

2. **API Rate Limiting**
   - Test multiple rapid requests
   - Verify proper error handling
   - Check abort functionality

### Debugging
```bash
# Enable debug logging
# Add to VS Code settings.json:
{
  "codepilot.debug": true
}

# View extension logs
# In VS Code: Help > Toggle Developer Tools > Console
```

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### Version 2.5.0 (2025/08/19) - Ollama File Operations Fix & Enhanced Regex Support

<details>
<summary>Ollama File Operations Fix</summary>

- **Fixed File Path Parsing**: Resolved issue where Ollama responses included `**` suffix in file names
- **Enhanced Regex Pattern**: Improved regex to handle markdown headers (`##`) in Ollama responses
- **File Name Cleaning**: Added automatic removal of `**` suffix from file paths for accurate matching
- **Context File Matching**: Fixed issue where modified files couldn't be found in context file list
- **Debug Logging**: Added detailed logging for regex match groups to improve troubleshooting

</details>

<details>
<summary>Technical Improvements</summary>

- **Regex Pattern Enhancement**: Updated pattern to `(?:##\s*)?(새 파일|수정 파일):\s+([^\r\n]+?)(?:\r?\n\s*\r?\n```[^\n]*\r?\n([\s\S]*?)\r?\n```)/g`
- **File Path Processing**: Added `llmSpecifiedPath.replace(/\*\*$/, '')` to clean file names
- **PromptType Import Fix**: Corrected import path from `geminiService` to `llmService`
- **Duplicate Type Definition Removal**: Removed duplicate `PromptType` definition in `ollamaService.ts`
- **System Prompt Enhancement**: Improved Ollama system prompt with explicit file creation instructions

</details>

<details>
<summary>Ollama Integration Improvements</summary>

- **External Server Support**: Enhanced support for external Ollama servers (Vessl AI, etc.)
- **SSL Certificate Handling**: Added SSL certificate bypass for external HTTPS servers
- **API Endpoint Flexibility**: Support for both `/api/generate` (local) and `/api/chat` (external) endpoints
- **User-Configurable Endpoints**: Added dropdown in settings for endpoint selection
- **Response Format Handling**: Automatic detection and handling of different response formats

</details>

<details>
<summary>File Operation Enhancements</summary>

- **Accurate File Matching**: Fixed context file list matching for file modifications
- **Multi-File Support**: Improved handling of multiple file operations in single response
- **Error Handling**: Enhanced error messages for file operation failures
- **Success Indicators**: Clear success/error indicators for file creation, modification, and deletion
- **Debug Information**: Added comprehensive logging for file operation debugging

</details>

### Version 2.4.2 (2025/07/29) - Multi-Model AI Support & Ollama Integration

<details>
<summary>Multi-Model AI Support</summary>

- **Ollama Integration**: Added support for local Ollama Gemma3:27b model
- **Dynamic Model Selection**: AI model dropdown in settings to choose between Gemini and Ollama
- **Model-Specific Settings**: Automatic enabling/disabling of relevant settings based on selected model
- **Unified LLM Service**: Centralized service to handle both Gemini and Ollama API calls
- **Offline Capability**: Full offline AI processing with local Ollama server

</details>

<details>
<summary>Enhanced Settings Interface</summary>

- **AI Model Configuration**: New dropdown for selecting AI model (Gemini 2.5 Pro Flash / Gemma3:27b)
- **Ollama API URL Setup**: Input field for configuring local Ollama server address
- **Banya License Management**: License serial input and verification system
- **Dynamic UI**: Settings sections automatically enable/disable based on model selection
- **Default Configuration**: Gemini 2.5 Pro Flash set as default model

</details>

<details>
<summary>Technical Improvements</summary>

- **Network Resilience**: Replaced fetch with Node.js HTTP module for reliable local connections
- **Webview Safety**: Added safePostMessage function to prevent disposed webview errors
- **Error Handling**: Enhanced error handling for network connectivity issues
- **Type Safety**: Improved TypeScript type definitions and error checking
- **Performance**: Optimized message handling and webview communication

</details>

<details>
<summary>Ollama Setup Instructions</summary>

- **Server Installation**: curl -fsSL https://ollama.ai/install.sh | sh
- **Model Download**: ollama pull gemma3:27b
- **Server Start**: ollama serve
- **API URL**: Default http://localhost:11434
- **Network Configuration**: Support for local network addresses

</details>

### Version 2.4.1 (2024/07/10) - Improved LLM Prompt Structure & Code Generation/Modification Requests

<details>
<summary>LLM Prompt and Code Generation/Modification Request Enhancements</summary>

- Enhanced system prompt for LLM (Large Language Model) to strictly specify output format and rules for code generation, modification, and deletion requests
- Reinforced prompt structure to require full file code, per-file directives (Modified File/New File/Deleted File), work summary, and detailed explanation in every response
- Actual code context, user request, and project structure information are now always included, improving AI reliability and automation
- Work summary (created/modified/deleted files) and work description (logic, key functions/classes, improvements, test instructions, etc.) are now mandatory in responses
- Example and rules for prompt are clearly included in the system prompt to ensure consistent response format
- Directly improved and customized the prompt generation logic in geminiService.ts (user customization applied)

</details>

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
<summary>Multi-Language Support</summary>

- Added comprehensive internationalization (i18n) support
- Supported languages: Korean, English, Chinese, Spanish, German, French, Japanese
- Dynamic language switching with immediate UI updates
- Localized settings interface with translated labels and descriptions
- Persistent language preference storage
- Real-time language change without requiring page reload

</details>

<details>
<summary>Technical Improvements</summary>

- Fixed webview message handling and display issues
- Enhanced code block rendering with proper syntax highlighting
- Improved context management for better AI responses
- Better error recovery and user notification system
- Optimized language data loading and caching
- Enhanced UI responsiveness for language changes

</details>

### Version 2.3b (2025/6/15) - Real-time information features

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
