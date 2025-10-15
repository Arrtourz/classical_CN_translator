# 🏺 Classical Chinese Translator

[中文](README.zh-CN.md) | **English**

A complete toolkit for Classical Chinese translation, including an Electron desktop app and Chrome browser extension, designed specifically for translating ancient Chinese texts.

## 📦 Project Components

This repository contains two independent applications:

### 1. Desktop Application (Electron App)
Full-featured desktop application with screenshot, OCR recognition, and AI translation capabilities.

### 2. Chrome Browser Extension
Lightweight browser extension for quick translation and search, located in the `chrome-extension/` directory.

---

## ✨ Desktop App Features

- 🔥 **Alt + Q** Global screenshot hotkey
- 📸 **PP-OCRv5** High-precision text recognition
- 🤖 **DeepSeek AI** Intelligent translation
- 🎯 Drag to select any area
- 💾 Local history management
- 🔍 Quick search engine integration
- ⚡ Minimalist modern interface
- 🚀 Cross-platform support with Electron

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Launch Application
```bash
npm start
```

## 📁 Project Structure

```
classical_CN_translator/
├── main.js              # Electron main process
├── preload.js           # Preload script
├── renderer/            # Renderer process files
│   ├── index.html       # Main interface
│   ├── renderer.js      # Main interface logic
│   └── styles.css       # Styles
├── screenshot.html      # Screenshot selection interface
├── modules/             # Feature modules
│   ├── ocr.js          # OCR recognition module
│   ├── translation.js  # Translation module
│   ├── config.js       # Configuration management
│   ├── history.js      # History records
│   └── search.js       # Search engines
├── models/              # OCR model files
│   ├── ch_PP-OCRv5_rec_server_infer.onnx
│   └── ch_PP-OCRv5_server_det.onnx
├── chrome-extension/    # Chrome browser extension
│   ├── manifest.json   # Extension config
│   ├── background.js   # Background script
│   ├── content.js      # Content script
│   ├── popup.html      # Popup page
│   └── search_engine.js # Search engine config
├── package.json         # Project configuration
└── README.md            # Documentation
```

## 🎯 How to Use

### Desktop Application

1. Launch the app and minimize the main window
2. Press **Alt + Q** to trigger screenshot
3. Drag mouse to select the text area
4. OCR will automatically recognize and translate the text

### Configuration

1. Open Settings
2. Enter your DeepSeek API Key
3. Configure text layout (horizontal/vertical)
4. Choose preferred search engines

## ⌨️ Keyboard Shortcuts

- **Alt + Q**: Start screenshot
- **ESC**: Cancel screenshot selection
- **Mouse Drag**: Select screenshot area

## 🔧 Tech Stack

- **Electron 27**: Desktop application framework
- **Node.js**: Backend runtime
- **PP-OCRv5 (ONNX)**: High-precision OCR engine
- **Sharp**: High-performance image processing
- **DeepSeek API**: AI translation engine
- **HTML5 Canvas**: Image cropping

## 📦 Build and Deploy

### Build Unpacked Version
```bash
npm run build:win
```

### Build Installer
```bash
npm run build:installer
```

## 🎨 Design Features

- **Minimalist Interface**: Focus on core functionality
- **Modern Design**: Glass morphism effects, gradient backgrounds
- **User-Friendly**: Clear operation guidance and keyboard shortcuts
- **High Performance**: Fast screenshot and OCR based on Electron and Sharp

## 🌐 Chrome Browser Extension

### Installation

1. Open Chrome extensions page: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### Extension Features

- 🖱️ Right-click menu for quick translation
- 🔍 Integrated search engines (Baidu, Google, Bing, etc.)
- 📚 Multi-language translation support
- ⚡ Lightweight and fast

### How to Use

1. Select text on a webpage
2. Right-click the selection
3. Choose "Translate selected text" or search engine option
4. View results in a new tab

---

## 🔄 Feature Comparison

This project includes two implementations:

| Feature | Chrome Extension | Electron Desktop App |
|---|---|---|
| Screenshot | `chrome.tabs.captureVisibleTab` | `desktopCapturer` |
| OCR Recognition | ❌ | ✅ PP-OCRv5 |
| AI Translation | ❌ | ✅ DeepSeek API |
| Global Hotkey | ❌ | ✅ `globalShortcut` |
| History Records | ❌ | ✅ Local storage |
| Cross-platform | Browser only | Windows/Mac/Linux |

## 📥 Download

Visit [Releases](https://github.com/Arrtourz/classical_CN_translator/releases) to download:

- **古文翻译器 Setup 1.0.0.exe** (302MB) - Windows Installer (Recommended)
- **classical_CN_translator-v1.0.0-win-unpacked.zip** (363MB) - Portable Version

## ⚠️ Notes

- **DeepSeek API Key required** for translation features
- OCR model files are large (165MB), first load may take time
- Stable internet connection recommended for translation
- App configuration saved in user data directory: `%APPDATA%\古文翻译器`

## 🔐 Privacy

- **No API keys included**, users must configure their own
- OCR processing is local, no images uploaded
- Only text is sent to DeepSeek API for translation
- History records stored locally, not uploaded to cloud

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📧 Contact

- GitHub Issues: [Report Issues](https://github.com/Arrtourz/classical_CN_translator/issues)
- Repository: [classical_CN_translator](https://github.com/Arrtourz/classical_CN_translator)
