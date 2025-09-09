# Change Log

All notable changes to the "codepilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.5.0] - 2025-01-27

### 🔐 Added - License Protection System
- **Banya License Verification**: Firebase Firestore-based license validation system
- **Encrypted License Storage**: AES-256-CBC encryption for license serial numbers with SHA-256 key hashing
- **License Access Control**: CODE and ASK tabs now require valid Banya license for activation
- **License Management Interface**: 
  - License serial input with validation
  - Read-only display of stored licenses
  - License deletion and re-verification capabilities
  - Visual feedback for license operations

### 🌍 Added - Multi-Language Support
- **Complete Internationalization**: Full support for 7 languages
  - Korean (한국어)
  - English (English)
  - Japanese (日本語)
  - German (Deutsch)
  - Spanish (Español)
  - French (Français)
  - Chinese (中文)
- **Dynamic Language Switching**: Real-time language change with immediate UI updates
- **Localized License Messages**: All license-related messages and status indicators are internationalized

### 🔒 Enhanced - Security Features
- **Modern Crypto API**: Updated from deprecated `createCipher`/`createDecipher` to `createCipheriv`/`createDecipheriv`
- **Enhanced Encryption**: Improved AES-256-CBC implementation with proper IV handling
- **License Format Validation**: 16-digit serial number format with hyphens validation
- **Secure Error Handling**: Graceful error handling for encryption/decryption failures

### 🎨 Enhanced - User Interface
- **License Status Indicators**: Visual feedback for license verification status
- **Read-Only License Fields**: Stored licenses are displayed in read-only mode with visual distinction
- **License Operation Feedback**: Clear status messages for license save, verify, and delete operations
- **Improved Error Messages**: Multi-language error messages for better user experience

### 📚 Updated - Documentation
- **README Enhancement**: Comprehensive documentation of license protection system
- **Security Documentation**: Detailed explanation of encryption and security features
- **Usage Examples**: Updated examples including license management

### 🛠️ Technical Improvements
- **Crypto Utils Module**: New dedicated module for encryption/decryption operations
- **Storage Service Enhancement**: Updated to handle encrypted license storage
- **Webview Safety**: Improved message handling to prevent disposed webview errors
- **Code Organization**: Better separation of concerns with dedicated utility modules

## [2.5.8] - 2025-01-09

### 🤖 Added - Enhanced AI Model Support
- **DeepSeek R1:70B Integration**: Added support for DeepSeek R1:70B model via Ollama
  - 200K token limit for enhanced processing capacity
  - Korean language optimization with automatic Korean-only responses
  - Special language instruction to prevent Chinese/English responses
- **Improved Model Selection UI**: 
  - Simplified two-tier selection: Gemini vs Ollama
  - Specific model selection (Gemma3:27b or DeepSeek R1:70B) below Ollama option
  - Dynamic settings panel activation based on model selection

### 🔧 Enhanced - Token Management
- **Safe Fallback System**: Added automatic fallback to default token limits for unknown model types
- **Legacy Migration**: Automatic conversion of legacy 'ollama' settings to specific model types
- **Enhanced Error Handling**: Improved error handling for undefined token limit scenarios
- **Model-Specific Token Limits**:
  - Gemini 2.5 Pro Flash: 1,000,000 input tokens, 500,000 output tokens
  - Gemma3:27b: 128,000 input/output tokens
  - DeepSeek R1:70B: 200,000 input/output tokens

### 🎨 Improved - User Experience
- **Intuitive Model Selection**: Cleaner UI with main model type selection and specific model dropdown
- **Automatic Model Synchronization**: Ollama model changes automatically update AI model selection
- **Korean Language Optimization**: DeepSeek model specifically configured for Korean-only responses
- **Real-time Settings Updates**: Immediate UI updates when switching between model types

### 🛠️ Technical Improvements
- **Dynamic Model Detection**: Enhanced model type detection for proper token limit application
- **Safe Token Utils**: Added safety guards in token calculation utilities
- **Extension Initialization**: Improved startup process with legacy setting migration
- **Error Prevention**: Better handling of undefined model types and token limits

### 📚 Updated - Documentation
- **README Enhancement**: Updated with new model support and improved UI descriptions
- **Installation Guide**: Added DeepSeek R1:70B model installation instructions
- **Configuration Examples**: Updated configuration examples for new model selection UI

## [Unreleased]

- Initial release