const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain } = require('electron');
const { join } = require('path');
const sharp = require('sharp');
const OCRModule = require('./modules/ocr.js');
const TranslationModule = require('./modules/translation.js');
const ConfigManager = require('./modules/config.js');

// 禁用GPU以确保稳定性（GPU进程会崩溃）
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--no-sandbox');

let mainWindow;
let screenshotWindow;
let isCapturing = false;
let ocrInstance = null;
let translationModule = null;

// 立即注册IPC处理器（在app ready之前）
setupIPC();

function setupIPC() {
  // 翻译模块IPC处理
  ipcMain.handle('initialize-translation', async () => {
    try {
      if (!translationModule) {
        await initializeTranslation();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('translate-text', async (event, { text, stream = false }) => {
    try {
      if (!translationModule) {
        throw new Error('Translation module not initialized');
      }

      if (stream) {
        // 流式翻译，通过事件发送进度
        const result = await translationModule.translate(text, { 
          stream: true,
          onProgress: (progressData) => {
            // 发送流式进度到渲染进程
            event.sender.send('translation-progress', progressData);
          }
        });

        return {
          success: true,
          originalText: result.originalText,
          translatedText: result.translatedText,
          isComplete: result.isComplete,
          duration: result.duration
        };
      } else {
        // 非流式翻译
        const result = await translationModule.translate(text, { stream: false });
        return {
          success: true,
          originalText: result.originalText,
          translatedText: result.translatedText,
          isComplete: result.isComplete,
          duration: result.duration
        };
      }
    } catch (error) {
      console.error('Translation error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('take-screenshot', async () => {
    try {
      await takeScreenshot();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-config', async () => {
    try {
      if (!translationModule) return {};
      return translationModule.getConfig();
    } catch (error) {
      console.error('Get config error:', error);
      return {};
    }
  });

  ipcMain.handle('update-config', async (event, key, value) => {
    try {
      if (!translationModule) {
        throw new Error('Translation module not initialized');
      }
      await translationModule.updateConfig(key, value);
      return { success: true };
    } catch (error) {
      console.error('Update config error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clear-history', async () => {
    try {
      if (!translationModule || !translationModule.historyManager) {
        throw new Error('History manager not available');
      }
      await translationModule.historyManager.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('Clear history error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('abort-translation', async () => {
    try {
      if (!translationModule) {
        throw new Error('Translation module not available');
      }
      translationModule.abortTranslation();
      return { success: true };
    } catch (error) {
      console.error('Abort translation error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('test-api-connection', async () => {
    try {
      if (!translationModule || !translationModule.deepseekAPI) {
        return { success: false, error: 'API not configured' };
      }

      // 测试连接
      const testResult = await translationModule.deepseekAPI.translate([
        { role: 'user', content: '测试' }
      ], { stream: false });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 窗口控制IPC处理器
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle('window-close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });


  // 截图相关IPC处理器
  ipcMain.handle('save-screenshot', async (event, { imageData, area }) => {
    try {
      if (!imageData || !area) {
        return { success: false, message: 'Invalid data' };
      }

      console.log('[SCREENSHOT] Selection area:', area);

      // 前端已经裁剪好了，直接解码使用
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const croppedBuffer = Buffer.from(base64Data, 'base64');

      console.log('[SCREENSHOT] Received cropped image from frontend');

      // 保存临时截图用于OCR
      const fs = require('fs').promises;
      // 使用应用数据目录，避免asar包内无法写入的问题
      const tempDir = join(app.getPath('userData'), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      const timestamp = Date.now();
      const tempImagePath = join(tempDir, `screenshot_${timestamp}.png`);
      await fs.writeFile(tempImagePath, croppedBuffer);
      console.log('[TEMP] Saved temp screenshot for OCR:', tempImagePath);

      // 关闭截图窗口
      if (screenshotWindow) {
        screenshotWindow.close();
      }

      // 恢复主窗口显示
      resetCaptureState();

      // 发送OCR开始通知到前端
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ocr-started');
      }

      // 立即返回成功，然后异步执行OCR（不阻塞前端）
      // 这样前端可以立即显示"正在识别文字..."的状态
      setImmediate(async () => {
        try {
          console.log('[SCREENSHOT] Starting OCR...');
          await performOCR(croppedBuffer, 'screenshot', tempImagePath);
        } catch (error) {
          console.error('[OCR] Error:', error);
          // 发送OCR失败通知到前端
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ocr-result', {
              text: '',
              textCount: 0,
              avgConfidence: 0,
              error: error.message
            });
          }
        }
      });

      return { success: true };

    } catch (error) {
      console.error('[SCREENSHOT] Save error:', error);
      resetCaptureState();
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('cancel-screenshot', () => {
    if (screenshotWindow) {
      screenshotWindow.close();
    }
    resetCaptureState();
  });
}

function resetCaptureState() {
  isCapturing = false;
  console.log('🔄 Capture state reset');

  // 恢复显示主窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
}


// 初始化翻译模块
async function initializeTranslation() {
  try {
    console.log('[INFO] Initializing translation module...');
    translationModule = new TranslationModule();
    await translationModule.initialize();
    console.log('[SUCCESS] Translation module initialized');
  } catch (error) {
    console.error('[ERROR] Translation module initialization failed:', error);
    translationModule = null;
  }
}

// 初始化OCR模块
async function initializeOCR() {
  try {
    console.log('[INFO] Preloading OCR engine...');

    console.log(`[INFO] Using PP-OCRv5 model`);

    ocrInstance = await OCRModule.create();
    console.log('[SUCCESS] OCR engine preloaded');
  } catch (error) {
    console.error('[ERROR] OCR engine preload failed:', error);
    ocrInstance = null;
  }
}

// 执行OCR识别
async function performOCR(imageBuffer, filename, tempImagePath = null) {
  try {
    if (!ocrInstance) {
      console.warn('[WARNING] OCR engine not initialized, initializing...');
      await initializeOCR();
    }

    if (!ocrInstance) {
      throw new Error('OCR engine initialization failed');
    }

    // 获取文本布局配置
    const config = new ConfigManager();
    await config.load();
    const textLayout = config.get('textLayout', 'horizontal');

    console.log('[OCR] Starting recognition...');
    const result = await ocrInstance.detect(imageBuffer, { textLayout });

    if (result.textCount > 0) {
      console.log(`[SUCCESS] OCR completed: ${result.textCount} lines detected`);

      // 发送OCR结果到主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ocr-result', {
          text: result.fullText,
          textCount: result.textCount,
          avgConfidence: result.avgConfidence
        });
        console.log('[INFO] OCR result sent to main window');
      }

      return result;
    } else {
      console.log('[WARNING] No text detected');

      // 即使没有检测到文字也通知前端
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ocr-result', {
          text: '',
          textCount: 0,
          avgConfidence: 0
        });
      }

      return result;
    }
  } finally {
    // OCR完成后删除临时截图文件
    if (tempImagePath) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(tempImagePath);
        console.log('[CLEANUP] Deleted temp screenshot:', tempImagePath);
      } catch (error) {
        console.warn('[CLEANUP] Failed to delete temp file:', error.message);
      }
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      backgroundThrottling: false
    },
    show: true,
    title: '古文翻译器',
    frame: false, // 移除系统标题栏
    titleBarStyle: 'hidden', // 隐藏标题栏
    autoHideMenuBar: true
  });

  mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));
  
  globalShortcut.register('Alt+Q', takeScreenshot);
  console.log('🚀 App ready');
}

async function takeScreenshot() {
  if (isCapturing) {
    console.log('[SCREENSHOT] Already in progress');
    return;
  }

  try {
    isCapturing = true;
    console.log('[SCREENSHOT] Starting...');

    // 隐藏主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // 获取屏幕信息
    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.bounds;
    const scaleFactor = display.scaleFactor;

    console.log(`[SCREENSHOT] Screen: ${width}x${height} @ ${scaleFactor}x`);

    // 截取原始分辨率
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: width * scaleFactor,
        height: height * scaleFactor
      }
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    const thumbnail = sources[0].thumbnail;
    const size = thumbnail.getSize();
    console.log(`[SCREENSHOT] Captured: ${size.width}x${size.height}`);

    // 传递截图数据和元信息给选择窗口（不保存完整截图）
    const imageDataUrl = thumbnail.toDataURL();
    createScreenshotWindow({
      imageDataUrl: imageDataUrl,
      imageWidth: size.width,
      imageHeight: size.height,
      screenWidth: width,
      screenHeight: height,
      scaleFactor: scaleFactor
    });

  } catch (error) {
    console.error('[SCREENSHOT] Error:', error);
    resetCaptureState();
  }
}

function createScreenshotWindow(data) {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }

  screenshotWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  screenshotWindow.webContents.on('console-message', (e, level, msg) => {
    console.log(`[Screenshot] ${msg}`);
  });

  screenshotWindow.loadFile(join(__dirname, 'screenshot.html'));

  screenshotWindow.webContents.once('did-finish-load', () => {
    if (!screenshotWindow || screenshotWindow.isDestroyed()) return;

    screenshotWindow.webContents.send('init-screenshot', data);

    setTimeout(() => {
      if (screenshotWindow && !screenshotWindow.isDestroyed()) {
        screenshotWindow.show();
        screenshotWindow.focus();
      }
    }, 100);
  });

  screenshotWindow.on('closed', () => {
    screenshotWindow = null;
    resetCaptureState();
  });
}

app.whenReady().then(async () => {
  createWindow();

  // 初始化翻译模块和OCR引擎
  await initializeTranslation();
  await initializeOCR();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', async () => {
  globalShortcut.unregisterAll();
  
  // 清理翻译模块资源
  if (translationModule) {
    try {
      await translationModule.destroy();
      console.log('[CLEANUP] Translation module destroyed');
    } catch (error) {
      console.error('[ERROR] Translation module cleanup failed:', error);
    }
  }
  
  // 清理OCR资源
  if (ocrInstance) {
    try {
      await ocrInstance.destroy();
      console.log('[CLEANUP] OCR resources released');
    } catch (error) {
      console.error('[ERROR] OCR resource cleanup failed:', error);
    }
  }
  
  // 清理临时文件夹
  try {
    const fs = require('fs').promises;
    const path = require('path');
    // 使用应用数据目录中的temp文件夹
    const tempDir = path.join(app.getPath('userData'), 'temp');

    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        // 清理所有临时截图文件
        if ((file.startsWith('screenshot_') || file.startsWith('temp_')) &&
            (file.endsWith('.png') || file.endsWith('.jpg'))) {
          await fs.unlink(path.join(tempDir, file));
        }
      }
      console.log('[CLEANUP] Temp directory cleaned');
    } catch (dirError) {
      // temp目录不存在或为空，忽略错误
    }
  } catch (error) {
    console.warn('[WARNING] Temp cleanup failed:', error);
  }
});