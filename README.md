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
  - **Ollama Integration**: Local Ollama server integration for offline AI processing
    - **Gemma3:27b**: 128K token limit for code generation and analysis
    - **DeepSeek R1:70B**: 200K token limit with Korean language optimization
    - **CodeLlama 7B**: 8K token limit optimized for code generation and analysis
  - **Dynamic Model Selection**: Switch between cloud and local AI models in settings
  - **Intuitive UI**: Simplified model selection (Gemini vs Ollama) with specific model selection below
- **Dual-Mode Interface**: 
  - **CODE Tab**: Specialized for code generation, modification, and project-specific tasks
  - **ASK Tab**: General Q&A and real-time information queries
- **Context-Aware Responses**: Analyzes your project structure and existing code for relevant suggestions
- **Natural Language Processing**: Understands complex requests in plain English
- **Local AI Processing**: Full offline capability with Ollama integration

### 📁 Advanced File Management
- **Smart File Selection**: Use the @ button to select specific files for context inclusion
  - **CODE Tab**: Full file operations with context-aware code generation and modification
  - **ASK Tab**: File selection for context-aware queries (read-only, no file operations)
- **Persistent File Context**: Selected files remain available across multiple conversations
- **Multi-File Operations**: Support for creating, modifying, and deleting multiple files simultaneously
- **Project Root Configuration**: Configurable project root path for accurate file operations
- **Auto File Updates**: Optional automatic file creation and modification based on AI suggestions
- **File Tag Management**: Visual file tags with individual remove and clear all functionality

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

### 🔢 Token Management System
- **Input Token Calculation**: Automatic token counting for both Gemini and Ollama models
- **Model-Specific Limits**: 
  - Gemini 2.5 Flash: 1,000,000 input tokens, 500,000 output tokens
  - Gemma3:27b: 128,000 input/output tokens
  - DeepSeek R1:70B: 200,000 input/output tokens
  - CodeLlama 7B: 8,192 input/output tokens
- **Token Limit Warnings**: Automatic detection and user warnings when input tokens exceed model limits
- **Usage Monitoring**: Real-time token usage logging and percentage tracking
- **Safe Fallback**: Automatic fallback to default token limits for unknown model types

### ⚙️ Comprehensive Configuration
- **Multi-Model AI Configuration**:
  - **AI Model Selection**: Choose between Gemini 2.5 Pro Flash and Ollama
  - **Ollama Model Selection**: Select specific Ollama model (Gemma3:27b, DeepSeek R1:70B, or CodeLlama 7B)
  - **Ollama Server Setup**: Configure Ollama API URL and endpoint selection
    - Local Ollama: `http://localhost:11434` + `/api/generate`
    - External Server: `https://your-server.com` + `/api/chat`
    - Vessl AI Cluster: `https://model-service-gateway-xxx.eu.h100-cluster.vessl.ai` + `/api/chat`
  - **Dynamic Settings**: Enable/disable model-specific settings based on selection
  - **Automatic Migration**: Legacy 'ollama' settings automatically converted to specific model types
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
- **File Selection**: Use the @ button to select specific files for context inclusion
- **CODE Tab Operations**: "Analyze and refactor this code" (full file operations)
- **ASK Tab Queries**: "Analyze the performance of this code" (read-only analysis)
- **Token Management**: Automatic token usage monitoring and limit warnings

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
   
   # Pull models
   ollama pull gemma3:27b
   ollama pull deepseek-r1:70b
   ollama pull codellama:7b
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
Please see [RELEASE.md](RELEASE.md).

### Latest Release
- **Version 2.5.9** (2025/09/15): [Download](release/codepilot-2.5.9.vsix)
  - Added CodeLlama 7B support via Ollama integration
  - Improved Ollama model management with unified interface
  - Enhanced multi-language support (7 languages)
  - Optimized token management for code generation tasks

### For more information
I'm seeking individuals to help me grow this source code. Please contact me at: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)

**Enjoy!**
