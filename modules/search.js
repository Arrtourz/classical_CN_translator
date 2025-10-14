/**
 * 搜索引擎模块 - 已禁用外部搜索，仅保留基础功能
 */
class SearchEngine {
  constructor(apiKey, config = null) {
    // 保留最小构造器以避免破坏现有集成
  }

  /**
   * 搜索方法 - 已禁用，直接返回基础结果
   */
  async searchForTranslation(ancientText, settings = {}) {
    return {
      hasSearchResults: false,
      keywords: [],
      searchResults: [],
      enhancedPrompt: settings.prompt
    };
  }
}

module.exports = SearchEngine;