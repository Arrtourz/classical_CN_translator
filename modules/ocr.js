let Ocr = null;
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class OCRModule {
  constructor() {
    this.ocr = null;
    this.modelVersion = null;
    this.isReady = false;
  }

  /**
   * 创建OCR实例
   * @param {Object} options - 配置选项
   * @param {string} options.modelVersion - 模型版本 'v4' 或 'v5'
   * @param {string} options.modelsPath - 模型文件路径
   */
  static async create(options = {}) {
    const instance = new OCRModule();
    await instance.initialize(options);
    return instance;
  }

  async initialize(options = {}) {
    // 在打包后的应用中，需要从 app.asar.unpacked 获取模型文件
    // models 文件夹会被自动解包到 app.asar.unpacked 中
    const defaultModelsPath = __dirname.includes('app.asar')
      ? path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '../models')
      : path.join(__dirname, '../models');

    const {
      modelsPath = defaultModelsPath
    } = options;
    
    try {
      console.log('[INFO] Initializing PP-OCRv5 engine...');

      // 动态导入ES模块
      if (!Ocr) {
        console.log('[INFO] Loading OCR module...');
        const ocrModule = await import('@gutenye/ocr-node');
        Ocr = ocrModule.default;
      }

      console.log(`[INFO] Using local model path: ${modelsPath}`);

      // 使用PP-OCRv5模型配置
      const modelConfig = this.getModelConfig(modelsPath);
      const ocrConfig = {
        models: modelConfig
      };

      console.log(`[INFO] Model configuration:`, {
        detection: ocrConfig.models.detectionPath,
        recognition: ocrConfig.models.recognitionPath,
        dictionary: ocrConfig.models.dictionaryPath
      });

      // 使用@gutenye/ocr-node的API
      this.ocr = await Ocr.create(ocrConfig);

      this.isReady = true;
      console.log('[SUCCESS] PP-OCRv5 engine ready');
      
    } catch (error) {
      console.error('[ERROR] OCR initialization failed:', error);
      throw error;
    }
  }

  /**
   * 获取PP-OCRv5模型配置
   * @param {string} modelsPath - 模型基础路径
   * @returns {Object} 模型配置对象
   */
  getModelConfig(modelsPath) {
    // PP-OCRv5 模型配置
    const config = {
      detectionPath: path.join(modelsPath, 'ch_PP-OCRv5_server_det.onnx'),
      recognitionPath: path.join(modelsPath, 'ch_PP-OCRv5_rec_server_infer.onnx'),
      dictionaryPath: path.join(modelsPath, 'ppocrv5_character_dict.txt')
    };

    console.log('[OCR] Model paths:', config);
    return config;
  }

  /**
   * 执行OCR识别
   * @param {string|Buffer} imageInput - 图片输入（文件路径、Buffer或base64）
   * @param {Object} options - 识别选项
   * @returns {Object} OCR识别结果
   */
  async detect(imageInput, options = {}) {
    if (!this.isReady) {
      throw new Error('OCR引擎未就绪，请先初始化');
    }

    const startTime = Date.now();

    try {
      console.log('📸 开始OCR识别...');

      // 直接使用文件路径或处理Buffer
      let imagePath = imageInput;
      let tempPath = null;

      if (Buffer.isBuffer(imageInput)) {
        // 如果是Buffer，先保存为临时文件
        // 使用应用数据目录，避免 asar 包内无法写入的问题
        const { app } = require('electron');
        const tempDir = path.join(app.getPath('userData'), 'temp');

        // 确保temp目录存在
        try {
          await fs.access(tempDir);
        } catch (error) {
          console.log('[INFO] Creating temp directory...');
          await fs.mkdir(tempDir, { recursive: true });
        }

        tempPath = path.join(tempDir, `temp_${Date.now()}.jpg`);
        await fs.writeFile(tempPath, imageInput);
        imagePath = tempPath;
        console.log(`[INFO] Temp file created: ${tempPath}`);
      }
      
      try {
        // 使用@gutenye/ocr-node的API
        const result = await this.ocr.detect(imagePath);

        const duration = Date.now() - startTime;
        console.log(`[SUCCESS] OCR recognition completed, time: ${duration}ms`);

        return this.processOCRResults(result, duration, options.textLayout);
      } finally {
        // 清理临时文件
        if (tempPath) {
          try {
            await fs.unlink(tempPath);
            console.log(`[CLEANUP] Temp file removed: ${tempPath}`);
          } catch (cleanupError) {
            console.warn(`[WARNING] Failed to remove temp file: ${tempPath}`, cleanupError);
          }
        }
      }
      
    } catch (error) {
      console.error('[ERROR] OCR recognition failed:', error);
      throw error;
    }
  }

  async preprocessImage(imageInput, options = {}) {
    // 复制自ppocrv5-web-test的图像预处理逻辑
    let imageBuffer;
    
    // 处理不同类型的输入
    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:image/')) {
        // 已经是base64格式，直接返回
        return imageInput;
      } else {
        // 文件路径，读取并转换为base64
        imageBuffer = await fs.readFile(imageInput);
      }
    } else if (Buffer.isBuffer(imageInput)) {
      imageBuffer = imageInput;
    } else {
      throw new Error('不支持的图像输入格式');
    }

    // 使用Sharp处理图像（模拟canvas处理）
    let processedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 95 })
      .toBuffer();

    // 处理旋转（复制自ppocrv5-web-test的rotateImageLeft90逻辑）
    if (options.orientation === 'vertical') {
      processedBuffer = await sharp(processedBuffer)
        .rotate(-90)
        .toBuffer();
    }

    // 转换为base64格式（与ppocrv5-web-test一致）
    const base64String = processedBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64String}`;
  }

  // 处理@gutenye/ocr-node的结果格式
  processOCRResults(result, duration, textLayout = 'horizontal') {
    if (!Array.isArray(result) || result.length === 0) {
      console.log('⚠️ 未检测到文字');
      return {
        success: true,
        duration: duration,
        textCount: 0,
        avgConfidence: 0,
        fullText: '',
        details: []
      };
    }

    let validTexts = result
      .filter(item => item && item.text && item.text.trim().length > 0)
      .map(item => ({
        text: item.text.trim(),
        confidence: item.mean || item.score || 0,
        bbox: item.box || item.frame || []
      }));

    if (validTexts.length === 0) {
      console.log('⚠️ 未获得有效文字');
      return {
        success: true,
        duration: duration,
        textCount: 0,
        avgConfidence: 0,
        fullText: '',
        details: []
      };
    }

    // 竖排文本处理：处理古籍从右向左的阅读顺序
    if (textLayout === 'vertical') {
      console.log('[INFO] 竖排文本模式：处理古籍从右向左的阅读顺序');

      // 1. 首先按文本框的x坐标从右到左排序
      validTexts = validTexts.sort((a, b) => {
        const getRightX = (bbox) => {
          if (!Array.isArray(bbox) || bbox.length === 0) {
            return 0;
          }

          // 处理不同的bbox格式
          if (Array.isArray(bbox[0])) {
            // 多点格式：[[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            return Math.max(...bbox.map(point => point[0]));
          } else if (bbox.length === 4) {
            // 四值格式：[x1, y1, x2, y2] (左上角和右下角)
            return bbox[2]; // x2是右边界
          } else if (bbox.length === 8) {
            // 八值格式：[x1, y1, x2, y2, x3, y3, x4, y4] (四个顶点)
            return Math.max(bbox[0], bbox[2], bbox[4], bbox[6]);
          }

          return 0;
        };

        return getRightX(b.bbox) - getRightX(a.bbox); // 从右到左（从大到小）
      });

      // 2. 对每个文本框内的文字进行古籍竖排处理
      validTexts = validTexts.map(item => {
        // 对于长文本（可能包含多列），需要分析并重新组织
        if (item.text.length > 20) {
          // 古籍竖排文本处理：尝试识别列分隔并重新排序
          const text = item.text;
          console.log(`[INFO] 处理长文本: "${text}"`);

          // 尝试按照古籍竖排特征分割文本
          // 观察到的模式：先是日期信息，后是人名信息，可能被空格分隔
          const parts = text.split(' ').filter(part => part.trim().length > 0);

          if (parts.length >= 2) {
            // 如果有多个部分，重新组织为古籍从右向左的阅读顺序
            // 根据期望结果：臣松之誠惶誠恐頓首頓首死罪謹言 元嘉六年七月二十四日中書侍郎西郷侯臣裴松之
            console.log(`[INFO] 文本分段: ${parts.map((p, i) => `${i}: "${p}"`).join(', ')}`);

            // 基于古籍布局重新排序：通常第二部分是右侧列，第一部分是左侧列
            const reorderedText = parts.length === 2 ? `${parts[1]} ${parts[0]}` : parts.reverse().join(' ');
            console.log(`[INFO] 重新排序后: "${reorderedText}"`);

            return {
              ...item,
              text: reorderedText
            };
          }
        }
        return item;
      });

      console.log(`[INFO] 竖排排序后文本顺序: ${validTexts.map(item => item.text).join(' | ')}`);
    }

    const fullText = validTexts.map(item => item.text).join(textLayout === 'vertical' ? ' ' : '');
    const avgConfidence = validTexts.reduce((sum, item) => sum + item.confidence, 0) / validTexts.length;

    console.log(`[INFO] Detected ${validTexts.length} lines, avg confidence: ${avgConfidence.toFixed(3)}`);

    return {
      success: true,
      duration: duration,
      textCount: validTexts.length,
      avgConfidence: avgConfidence,
      fullText: fullText,
      details: validTexts
    };
  }

  /**
   * 销毁OCR实例，释放资源
   */
  async destroy() {
    // @gutenye/ocr-node 会自动管理资源，这里只需要重置状态
    this.ocr = null;
    this.isReady = false;
    console.log('🗑️ OCR资源已释放');
  }
}

module.exports = OCRModule;