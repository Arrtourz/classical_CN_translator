# 🏺 古文翻译截图工具 (Classical Chinese Translator)

基于 Electron + Node.js 开发的古文翻译工具套件，包含桌面应用和 Chrome 浏览器扩展，专为古文翻译场景设计。

## 📦 项目组成

本仓库包含两个独立的应用：

### 1. 桌面应用 (Electron App)
完整的桌面应用，支持截图、OCR 识别和 AI 翻译。

### 2. Chrome 浏览器扩展 (Chrome Extension)
轻量级浏览器扩展，提供快速截图和翻译功能，位于 `chrome-extension/` 目录。

---

## ✨ 桌面应用核心功能

- 🔥 **Alt + Q** 全局快捷键截图
- 📸 **PP-OCRv5** 高精度文字识别
- 🤖 **DeepSeek AI** 智能翻译
- 🎯 拖拽选择任意区域
- 💾 本地历史记录管理
- 🔍 搜索引擎快速查询
- ⚡ 极简现代界面设计
- 🚀 基于 Electron，跨平台支持

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动应用
```bash
npm start
```

## 📁 项目结构

```
classical_CN_translator/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── renderer/            # 渲染进程文件
│   ├── index.html       # 主界面
│   ├── renderer.js      # 主界面逻辑
│   └── styles.css       # 样式文件
├── screenshot.html      # 截图选择界面
├── modules/             # 功能模块
│   ├── ocr.js          # OCR 识别模块
│   ├── translation.js  # 翻译模块
│   ├── config.js       # 配置管理
│   ├── history.js      # 历史记录
│   └── search.js       # 搜索引擎
├── models/              # OCR 模型文件
│   ├── ch_PP-OCRv5_rec_server_infer.onnx
│   └── ch_PP-OCRv5_server_det.onnx
├── chrome-extension/    # Chrome 浏览器扩展
│   ├── manifest.json   # 扩展配置
│   ├── background.js   # 后台脚本
│   ├── content.js      # 内容脚本
│   ├── popup.html      # 弹出页面
│   └── search_engine.js # 搜索引擎配置
├── package.json         # 项目配置
└── README.md            # 说明文档
```

## 🎯 使用方法

1. 启动应用后可最小化主窗口
2. 按 **Alt + Q** 触发截图功能
3. 用鼠标拖拽选择需要截图的区域
4. 松开鼠标后自动弹出保存对话框
5. 选择保存位置，完成截图

## ⌨️ 快捷键

- **Alt + Q**: 开始截图
- **ESC**: 取消当前截图选择
- **鼠标拖拽**: 选择截图区域

## 🔧 技术栈

- **Electron**: 桌面应用框架
- **Node.js**: 后端运行时
- **Sharp**: 图像处理库
- **HTML5 Canvas**: 图像裁剪
- **ES6 Modules**: 现代 JavaScript

## 📦 打包部署

```bash
# 安装打包工具
npm install electron-builder --save-dev

# 打包应用
npm run build
```

## 🎨 设计特色

- **极简界面**: 无冗余功能，专注截图核心需求
- **现代设计**: 毛玻璃效果，渐变背景
- **用户友好**: 清晰的操作指引和快捷键提示
- **高性能**: 基于 Electron 和 Sharp，截图速度快

## 🌐 Chrome 浏览器扩展

### 安装方法

1. 进入 Chrome 扩展管理页面：`chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `chrome-extension` 文件夹

### 扩展功能

- 🖱️ 右键菜单快速翻译选中文本
- 🔍 集成多个搜索引擎（百度、谷歌、必应等）
- 📚 支持多语言翻译
- ⚡ 轻量快速，无需安装桌面应用

### 使用方法

1. 在网页上选中需要翻译的文本
2. 右键点击选中内容
3. 选择"翻译选中文本"或搜索引擎选项
4. 在新标签页中查看结果

---

## 🔄 技术对比

本项目包含两种实现方式：

| 功能 | Chrome 扩展 | Electron 桌面应用 |
|---|---|---|
| 截图方式 | `chrome.tabs.captureVisibleTab` | `desktopCapturer` |
| OCR 识别 | ❌ | ✅ PP-OCRv5 |
| AI 翻译 | ❌ | ✅ DeepSeek API |
| 全局快捷键 | ❌ | ✅ `globalShortcut` |
| 历史记录 | ❌ | ✅ 本地存储 |
| 跨平台 | 仅浏览器 | Windows/Mac/Linux |

## 📄 许可证

MIT License