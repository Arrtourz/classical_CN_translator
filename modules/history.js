const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * 历史记忆管理模块 - 基于token数量限制的会话历史
 */
class HistoryManager {
  constructor() {
    this.maxTokens = 16000; // 最大token数量
    // 使用Electron的userData目录，在打包后也可以写入
    const userDataPath = app.getPath('userData');
    this.dataDir = path.join(userDataPath, 'data');
    this.historyFile = path.join(this.dataDir, 'history.json');
    this.history = [];
    this.isInitialized = false;
  }

  /**
   * 初始化历史管理器
   */
  async initialize() {
    try {
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 加载历史记录
      await this.loadHistory();
      
      this.isInitialized = true;
      console.log('[HISTORY] History manager initialized');
      
    } catch (error) {
      console.error('[ERROR] History manager initialization failed:', error);
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
      console.log('[HISTORY] Created data directory');
    }
  }

  /**
   * 加载历史记录
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      this.history = JSON.parse(data);
      console.log(`[HISTORY] Loaded ${this.history.length} history entries`);
    } catch (error) {
      // 文件不存在时创建空历史
      this.history = [];
      await this.saveHistory();
      console.log('[HISTORY] Created new history file');
    }
  }

  /**
   * 保存历史记录
   */
  async saveHistory() {
    try {
      const data = JSON.stringify(this.history, null, 2);
      await fs.writeFile(this.historyFile, data, 'utf8');
    } catch (error) {
      console.error('[ERROR] Failed to save history:', error);
    }
  }

  /**
   * 添加新的对话到历史记录
   */
  async addToHistory(userInput, assistantResponse) {
    if (!this.isInitialized) {
      console.warn('[WARN] History manager not initialized');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const newEntry = {
        timestamp: timestamp,
        user: userInput,
        assistant: assistantResponse,
        tokens: this.estimateTokens(userInput, assistantResponse)
      };

      // 添加到历史记录
      this.history.push(newEntry);
      
      // 检查并清理超出token限制的历史
      await this.trimHistoryByTokens();
      
      // 保存历史记录
      await this.saveHistory();
      
      console.log(`[HISTORY] Added entry (${newEntry.tokens} tokens), total entries: ${this.history.length}`);
      
    } catch (error) {
      console.error('[ERROR] Failed to add to history:', error);
    }
  }

  /**
   * 根据token数量修剪历史记录
   */
  async trimHistoryByTokens() {
    if (this.history.length === 0) return;

    console.log(`[HISTORY TRIM DEBUG] Before trim: ${this.history.length} entries`);

    let totalTokens = 0;
    let keepIndex = this.history.length;

    // 从最新开始计算token数量
    for (let i = this.history.length - 1; i >= 0; i--) {
      totalTokens += this.history[i].tokens;

      if (totalTokens > this.maxTokens) {
        keepIndex = i + 1;
        break;
      }
    }

    console.log(`[HISTORY TRIM DEBUG] Total tokens: ${totalTokens}, Max: ${this.maxTokens}, Keep index: ${keepIndex}`);

    // 如果需要删除历史记录（keepIndex < 总长度表示需要删除前面的记录）
    if (keepIndex < this.history.length) {
      const removedCount = keepIndex;
      this.history = this.history.slice(keepIndex);
      console.log(`[HISTORY] Trimmed ${removedCount} entries to stay within ${this.maxTokens} token limit`);
    } else {
      console.log(`[HISTORY TRIM DEBUG] No trimming needed, all entries within limit`);
    }

    console.log(`[HISTORY TRIM DEBUG] After trim: ${this.history.length} entries`);
  }

  /**
   * 估算文本的token数量
   * 简化估算：中文约1.5字符=1token，英文约4字符=1token
   */
  estimateTokens(userInput, assistantResponse) {
    const text = userInput + assistantResponse;
    let tokens = 0;
    
    // 统计中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    tokens += Math.ceil(chineseChars * 0.67); // 1.5字符约等于1token
    
    // 统计非中文字符
    const otherChars = text.length - chineseChars;
    tokens += Math.ceil(otherChars * 0.25); // 4字符约等于1token
    
    return Math.max(tokens, 1); // 至少1个token
  }

  /**
   * 获取最近的历史记录用于上下文
   */
  async getRecentHistory(maxEntries = 10) {
    if (!this.isInitialized) {
      return [];
    }

    // 返回最近的历史记录，但不超过maxEntries
    const recentHistory = this.history.slice(-maxEntries);
    
    // 验证token数量不超过限制
    let totalTokens = 0;
    const filteredHistory = [];
    
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const entry = recentHistory[i];
      if (totalTokens + entry.tokens <= this.maxTokens) {
        filteredHistory.unshift(entry);
        totalTokens += entry.tokens;
      } else {
        break;
      }
    }

    console.log(`[HISTORY] Retrieved ${filteredHistory.length} entries (${totalTokens} tokens) for context`);
    return filteredHistory;
  }

  /**
   * 获取历史统计信息
   */
  async getStats() {
    if (!this.isInitialized) {
      return {
        totalEntries: 0,
        totalTokens: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const totalTokens = this.history.reduce((sum, entry) => sum + entry.tokens, 0);
    
    return {
      totalEntries: this.history.length,
      totalTokens: totalTokens,
      maxTokens: this.maxTokens,
      oldestEntry: this.history.length > 0 ? this.history[0].timestamp : null,
      newestEntry: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : null,
      averageTokensPerEntry: this.history.length > 0 ? Math.round(totalTokens / this.history.length) : 0
    };
  }

  /**
   * 清空历史记录
   */
  async clearHistory() {
    try {
      this.history = [];
      await this.saveHistory();
      console.log('[HISTORY] History cleared');
    } catch (error) {
      console.error('[ERROR] Failed to clear history:', error);
    }
  }

  /**
   * 导出历史记录
   */
  async exportHistory() {
    if (!this.isInitialized) {
      return null;
    }

    return {
      exported: new Date().toISOString(),
      maxTokens: this.maxTokens,
      entries: this.history
    };
  }

  /**
   * 导入历史记录
   */
  async importHistory(historyData) {
    try {
      if (!historyData || !Array.isArray(historyData.entries)) {
        throw new Error('Invalid history data format');
      }

      this.history = historyData.entries;
      
      // 应用token限制
      await this.trimHistoryByTokens();
      
      // 保存
      await this.saveHistory();
      
      console.log(`[HISTORY] Imported ${this.history.length} history entries`);
      
    } catch (error) {
      console.error('[ERROR] Failed to import history:', error);
      throw error;
    }
  }

  /**
   * 销毁历史管理器
   */
  async destroy() {
    if (this.isInitialized) {
      await this.saveHistory();
      this.isInitialized = false;
      console.log('[CLEANUP] History manager destroyed');
    }
  }
}

module.exports = HistoryManager;