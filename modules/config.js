const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * 配置管理模块 - 管理应用设置和用户偏好
 */
class ConfigManager {
  constructor() {
    // 使用Electron的userData目录，在打包后也可以写入
    const userDataPath = app.getPath('userData');
    this.dataDir = path.join(userDataPath, 'data');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.config = {};
    this.defaultConfig = {
      // API配置
      apiKey: '',

      // 翻译设置
      translateModel: 'chat', // 'chat' 或 'reasoner'
      outputLanguage: 'english', // 'chinese' 或 'english'

      // OCR设置
      textLayout: 'horizontal', // 'horizontal' (横排) 或 'vertical' (竖排)

      // 功能开关
      enableHistory: false,
      darkMode: false,
      autoTranslate: true,

      // UI设置
      windowWidth: 800,
      windowHeight: 600,
      windowX: null,
      windowY: null,

      // 快捷键
      screenshotShortcut: 'Alt+Q',

      // 历史设置
      maxHistoryTokens: 16000,

      // 其他设置
      language: 'en-US',
      version: '1.0.0'
    };
    this.isLoaded = false;
  }

  /**
   * 加载配置
   */
  async load() {
    try {
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 尝试加载配置文件
      try {
        const data = await fs.readFile(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(data);
        
        // 合并默认配置和加载的配置
        this.config = { ...this.defaultConfig, ...loadedConfig };
        
        console.log('[CONFIG] Configuration loaded successfully');
      } catch (error) {
        // 配置文件不存在或损坏，使用默认配置
        this.config = { ...this.defaultConfig };
        await this.save();
        console.log('[CONFIG] Created new configuration file with defaults');
      }
      
      this.isLoaded = true;
      
    } catch (error) {
      console.error('[ERROR] Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * 保存配置
   */
  async save() {
    try {
      const data = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configFile, data, 'utf8');
      console.log('[CONFIG] Configuration saved');
    } catch (error) {
      console.error('[ERROR] Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('[CONFIG] Created data directory');
    }
  }

  /**
   * 获取配置值
   */
  get(key, defaultValue = undefined) {
    if (!this.isLoaded) {
      console.warn('[WARN] Configuration not loaded yet');
      return defaultValue;
    }

    return this.config.hasOwnProperty(key) ? this.config[key] : (defaultValue !== undefined ? defaultValue : this.defaultConfig[key]);
  }

  /**
   * 设置配置值
   */
  async set(key, value) {
    if (!this.isLoaded) {
      console.warn('[WARN] Configuration not loaded yet');
      return;
    }

    const oldValue = this.config[key];
    this.config[key] = value;
    
    try {
      await this.save();
      console.log(`[CONFIG] Updated ${key}: ${oldValue} -> ${value}`);
    } catch (error) {
      // 回滚更改
      this.config[key] = oldValue;
      throw error;
    }
  }

  /**
   * 批量设置配置值
   */
  async setMultiple(updates) {
    if (!this.isLoaded) {
      console.warn('[WARN] Configuration not loaded yet');
      return;
    }

    const oldValues = {};
    
    // 记录旧值并应用新值
    for (const [key, value] of Object.entries(updates)) {
      oldValues[key] = this.config[key];
      this.config[key] = value;
    }
    
    try {
      await this.save();
      console.log('[CONFIG] Updated multiple settings:', Object.keys(updates));
    } catch (error) {
      // 回滚所有更改
      for (const [key, oldValue] of Object.entries(oldValues)) {
        this.config[key] = oldValue;
      }
      throw error;
    }
  }

  /**
   * 重置配置为默认值
   */
  async reset() {
    this.config = { ...this.defaultConfig };
    try {
      await this.save();
      console.log('[CONFIG] Configuration reset to defaults');
    } catch (error) {
      console.error('[ERROR] Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * 重置特定键为默认值
   */
  async resetKey(key) {
    if (this.defaultConfig.hasOwnProperty(key)) {
      await this.set(key, this.defaultConfig[key]);
      console.log(`[CONFIG] Reset ${key} to default value`);
    } else {
      console.warn(`[WARN] Unknown configuration key: ${key}`);
    }
  }

  /**
   * 获取所有配置
   */
  getAll() {
    if (!this.isLoaded) {
      console.warn('[WARN] Configuration not loaded yet');
      return {};
    }
    
    return { ...this.config };
  }

  /**
   * 获取配置摘要（排除敏感信息）
   */
  getSummary() {
    const summary = { ...this.config };
    
    // 隐藏API密钥
    if (summary.apiKey) {
      summary.apiKey = summary.apiKey.substring(0, 8) + '***';
    }
    
    return summary;
  }

  /**
   * 验证配置完整性
   */
  validate() {
    const issues = [];
    
    // 检查必需的配置
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      issues.push('API密钥未配置');
    }
    
    // 检查API密钥格式
    if (this.config.apiKey && !this.config.apiKey.startsWith('sk-')) {
      issues.push('API密钥格式不正确');
    }
    
    // 检查模型设置
    if (!['chat', 'reasoner'].includes(this.config.translateModel)) {
      issues.push('翻译模型设置无效');
    }
    
    // 检查输出语言
    if (!['chinese', 'english'].includes(this.config.outputLanguage)) {
      issues.push('输出语言设置无效');
    }
    
    // 检查窗口尺寸
    if (this.config.windowWidth < 400 || this.config.windowHeight < 300) {
      issues.push('窗口尺寸设置过小');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * 导出配置
   */
  exportConfig() {
    if (!this.isLoaded) {
      return null;
    }
    
    return {
      exported: new Date().toISOString(),
      version: this.config.version,
      config: this.config
    };
  }

  /**
   * 导入配置
   */
  async importConfig(configData) {
    try {
      if (!configData || !configData.config) {
        throw new Error('Invalid configuration data format');
      }

      // 合并导入的配置和默认配置
      this.config = { ...this.defaultConfig, ...configData.config };
      
      // 验证配置
      const validation = this.validate();
      if (!validation.isValid) {
        console.warn('[WARN] Imported configuration has issues:', validation.issues);
      }
      
      // 保存配置
      await this.save();
      
      console.log('[CONFIG] Configuration imported successfully');
      
    } catch (error) {
      console.error('[ERROR] Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * 获取默认配置
   */
  getDefaults() {
    return { ...this.defaultConfig };
  }

  /**
   * 检查配置是否已加载
   */
  isConfigLoaded() {
    return this.isLoaded;
  }
}

module.exports = ConfigManager;