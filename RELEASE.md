# CodePilot Release Notes

This document contains the complete release history for CodePilot VSCode extension.

## Version 2.5.6 (2025/08/26) - Markdown File Generation Fix

<details>
<summary>Markdown File Generation Fix</summary>

- **3-Stage Regex System**: Implemented a robust 3-stage regular expression system for markdown file detection
- **Sequential Fallback Mechanism**: If one regex pattern fails, the system automatically tries the next pattern
- **Enhanced Pattern Matching**: 
  - Stage 1: Strict pattern with work summary and description sections
  - Stage 2: Medium pattern with basic directives only
  - Stage 3: Simple pattern capturing all content
- **Improved Debugging**: Added comprehensive logging to track regex matching process
- **Reliable File Creation**: Markdown files are now consistently created when requested

</details>

<details>
<summary>Technical Improvements</summary>

- **Regex Pattern Optimization**: Simplified and improved markdown file detection patterns
- **Error Handling**: Better error handling for file creation operations
- **Debug Logging**: Enhanced logging system for troubleshooting file generation issues
- **Code Stability**: Improved overall stability of file generation system

</details>

## Version 2.5.4 (2025/08/21) - ASK Tab File Selection & Enhanced Settings

<details>
<summary>ASK Tab File Selection Feature</summary>

- **File Selection in ASK Tab**: Added @ file selection functionality to ASK tab for context-aware queries
- **Unified File Selection UI**: Consistent file selection interface across CODE and ASK tabs
- **Context-Aware Responses**: Selected files are included as context for better AI responses
- **File Tag Management**: Visual file tags with individual remove and clear all functionality
- **Multi-File Support**: Select multiple files for comprehensive context
- **File Picker Integration**: Native VSCode file picker with project root detection

</details>

<details>
<summary>ASK Tab Function Restrictions</summary>

- **Purpose-Specific Design**: ASK tab restricted to query-response functionality only
- **File Operation Prevention**: Blocks file creation, modification, and deletion in ASK tab
- **Terminal Command Prevention**: Prevents terminal command execution in ASK tab
- **Warning System**: Displays helpful warnings when restricted operations are attempted
- **Clear Tab Distinction**: Clear separation between CODE tab (full functionality) and ASK tab (query only)

</details>

<details>
<summary>Enhanced Settings Management</summary>

- **License Verification State Persistence**: Settings buttons now properly maintain enabled state after license verification
- **Improved Button State Management**: Fixed issue where buttons remained disabled after page reload
- **Real-time License Status**: License verification status is checked and applied on settings page load
- **Better User Experience**: No need to re-verify license when reopening settings

</details>

<details>
<summary>ASK Tab Response Display Fix</summary>

- **Response Output Fix**: Resolved issue where AI responses were not displaying in ASK tab UI despite successful generation
- **Message Handler Optimization**: Fixed duplicate message handlers causing response display conflicts
- **UI State Management**: Improved loading state management and response rendering
- **File Context Integration**: Enhanced file content processing and context integration for ASK tab queries

</details>

<details>
<summary>Token Management System</summary>

- **Input Token Calculation**: Added comprehensive token counting system for both Gemini and Ollama models
- **Model-Specific Limits**: 
  - Gemini 2.5 Flash: 1,000,000 input tokens, 500,000 output tokens
  - Gemma3:27b: 128,000 input/output tokens
- **Token Limit Warnings**: Automatic detection and user warnings when input tokens exceed model limits
- **Usage Monitoring**: Real-time token usage logging and percentage tracking

</details>

<details>
<summary>Technical Improvements</summary>

- **Type Safety**: Separated `AiModelType` and `PromptType` enums into dedicated `types.ts` file
- **Circular Dependency Resolution**: Fixed circular import issues between modules
- **Enhanced Error Handling**: Improved error messages and user feedback for token limit violations
- **Code Architecture**: Improved modular structure and dependency management

</details>

## Version 2.5.3 (2025/08/19) - Interactive Command Handling

<details>
<summary>Interactive Command Handling</summary>

- **Interactive Command Detection**: Automatically detects interactive commands like npm create, git clone, SSH, Docker, etc.
- **Automatic Response System**: Provides default responses for common interactive scenarios
- **Command Sequence Execution**: Handles multiple commands in sequence with proper timing
- **Default Response Support**: 
  - npm create commands: Default response 'y' (yes)
  - git clone: Enter key only
  - SSH connections: 'yes' for host key verification
  - Docker interactive commands: 'exit' to leave container
- **Command Sequence Management**: Status tracking and stop functionality for command sequences
- **Enhanced User Experience**: Real-time notifications for interactive command execution

</details>

<details>
<summary>Technical Improvements</summary>

- **New Functions Added**:
  - `isInteractiveCommand()`: Detects interactive commands
  - `getDefaultResponseForCommand()`: Provides default responses
  - `handleInteractiveCommand()`: Processes interactive commands
  - `executeCommandSequence()`: Executes command sequences
  - `getCommandSequenceStatus()`: Tracks execution status
  - `stopCommandSequence()`: Stops command sequences
- **Enhanced Terminal Management**: Improved command execution with timing and response handling
- **Better Error Handling**: Comprehensive error reporting for interactive commands

</details>

## Version 2.5.2 (2025/08/19) - Multi-Model AI Support & Ollama Integration

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
<summary>Automatic Bash Command Execution</summary>

- **Bash Command Detection**: Automatically detects ```bash code blocks in LLM responses
- **Terminal Integration**: Executes detected commands in VSCode's integrated terminal
- **Multi-Command Support**: Handles multiple commands in sequence from single response
- **Interactive Command Handling**: Automatically responds to interactive commands like npm create, git clone, SSH connections
- **User Notifications**: Real-time feedback on executed commands with success/error status
- **CodePilot Terminal**: Dedicated terminal instance for CodePilot command execution
- **Automatic Terminal Activation**: Shows terminal when commands are being executed
- **Error Handling**: Comprehensive error reporting for failed command execution
- **System Prompt Enhancement**: Updated AI instructions to include bash command format examples

</details>

<details>
<summary>Technical Improvements</summary>

- **Network Resilience**: Replaced fetch with Node.js HTTP module for reliable local connections
- **Webview Safety**: Added safePostMessage function to prevent disposed webview errors
- **Error Handling**: Enhanced error handling for network connectivity issues
- **Type Safety**: Improved TypeScript type definitions and error checking
- **Performance**: Optimized message handling and webview communication
- **Terminal Management**: New terminal manager with bash command extraction and execution capabilities

</details>

<details>
<summary>Ollama Setup Instructions</summary>

- **Server Installation**: curl -fsSL https://ollama.ai/install.sh | sh
- **Model Download**: ollama pull gemma3:27b
- **Server Start**: ollama serve
- **API URL**: Default http://localhost:11434
- **Network Configuration**: Support for local network addresses

</details>

## Version 2.5.0 (2025/08/18) - Ollama File Operations Fix & Enhanced Regex Support

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

## Version 2.4.1 (2024/07/10) - Improved LLM Prompt Structure & Code Generation/Modification Requests

<details>
<summary>LLM Prompt and Code Generation/Modification Request Enhancements</summary>

- Enhanced system prompt for LLM (Large Language Model) to strictly specify output format and rules for code generation, modification, and deletion requests
- Reinforced prompt structure to require full file code, per-file directives (Modified File/New File/Deleted File), work summary, and detailed explanation in every response
- Actual code context, user request, and project structure information are now always included, improving AI reliability and automation
- Work summary (created/modified/deleted files) and work description (logic, key functions/classes, improvements, test instructions, etc.) are now mandatory in responses
- Example and rules for prompt are clearly included in the system prompt to ensure consistent response format
- Directly improved and customized the prompt generation logic in geminiService.ts (user customization applied)

</details>

## Version 2.4.0 (2025/06/26) - Enhanced AI response structure & UX improvements

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

## Version 2.3b (2025/6/15) - Real-time information features

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

## Version 2.2b (2025/06/10) - API compatibility fixes

<details>
<summary>AI</summary>

- Fixed Gemini API error related to unsupported webSearch tools
- Temporarily removed web search functionality due to API compatibility issues
- ASK tab now works without web search grounding
- Improved error handling for API calls

</details>

## Version 2.1b (2025/06/5) - File selection & context

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

## Version 2.0.0 - Complete UI redesign

<details>
<summary>Major Changes</summary>

- Complete UI redesign with modern interface
- Added dedicated view container with CODE and ASK tabs
- Implemented persistent file selection feature
- Enhanced code block display with copy functionality
- Added real-time information features

</details>

## Version 1.4.0 - Image support & file picker

<details>
<summary>Features</summary>

- Added image support for code analysis
- Implemented file picker functionality
- Enhanced context management

</details>

## Version 1.3.0 - Enhanced chat interface

<details>
<summary>Improvements</summary>

- Enhanced chat interface with better code block display
- Added file operation tracking
- Improved error handling

</details>

## Version 1.2.0 - Project scope features

<details>
<summary>Features</summary>

- Added project scope code watching
- Implemented auto debug functionality
- Fixed various UI issues

</details>

## Version 1.1.0 - Enhanced LLM support

<details>
<summary>Enhancements</summary>

- Added support for custom LLM models
- Improved code generation accuracy
- Enhanced natural language processing

</details>

## Version 1.0.0 - Initial release

<details>
<summary>Initial Features</summary>

Initial release of CodePilot

</details>

---

## Support

For more information or support, please contact: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)
