# 🏺 古文翻译截图工具 (Classical Chinese Translator App)

基于 Electron + Node.js 开发的极简截图工具，专为古文翻译场景设计。

## ✨ 核心功能

- 🔥 **Alt + Q** 全局快捷键截图
- 🎯 拖拽选择任意区域
- 📁 自动弹出保存对话框
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
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本
├── renderer/        # 渲染进程文件
│   ├── index.html   # 主界面
│   ├── renderer.js  # 主界面逻辑
│   └── styles.css   # 样式文件
├── screenshot.html  # 截图选择界面
├── modules/         # 功能模块
│   ├── ocr.js      # OCR 识别模块
│   ├── translation.js # 翻译模块
│   └── config.js   # 配置管理
├── models/          # OCR 模型文件
├── package.json     # 项目配置
└── README.md        # 说明文档
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

## 🔄 从 Chrome 扩展迁移

本项目是从 Ultra-Simple-Screenshot Chrome 扩展迁移而来：

| Chrome 扩展 API | Electron API |
|---|---|
| `chrome.commands` | `globalShortcut` |
| `chrome.tabs.captureVisibleTab` | `desktopCapturer` |
| 浏览器下载 | `dialog.showSaveDialog` + `fs.writeFile` |
| 扩展页面注入 | Electron BrowserWindow |

## 📄 许可证

MIT License