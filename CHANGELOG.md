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

## [Unreleased]

- Initial release