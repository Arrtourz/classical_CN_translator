const DeepSeekAPI = require('./deepseek-api.js');
const SearchEngine = require('./search.js');
const HistoryManager = require('./history.js');
const ConfigManager = require('./config.js');

class TranslationModule {
  constructor() {
    this.config = new ConfigManager();
    this.deepseekAPI = null;
    this.searchEngine = null;
    this.historyManager = new HistoryManager();
    this.isReady = false;
  }

  /**
   * 初始化翻译模块
   */
  async initialize() {
    try {
      console.log('[TRANSLATION] Initializing translation module...');
      
      // 加载配置
      await this.config.load();
      
      // 初始化DeepSeek API和搜索引擎
      const apiKey = this.config.get('apiKey');
      if (apiKey) {
        this.deepseekAPI = new DeepSeekAPI(apiKey);
        this.searchEngine = new SearchEngine(apiKey, this.config);
      }
      
      // 初始化历史管理器
      await this.historyManager.initialize();
      
      this.isReady = true;
      console.log('[SUCCESS] Translation module ready');
      
    } catch (error) {
      console.error('[ERROR] Translation module initialization failed:', error);
      throw error;
    }
  }

  /**
   * 翻译文本
   * @param {string} text - 待翻译文本
   * @param {Object} options - 翻译选项
   * @returns {Object} 翻译结果
   */
  async translate(text, options = {}) {
    if (!this.isReady) {
      throw new Error('Translation module not initialized');
    }

    if (!this.deepseekAPI) {
      throw new Error('DeepSeek API not configured');
    }

    try {
      console.log('[TRANSLATION] Starting translation...');
      
      // 获取设置
      const settings = this.getTranslationSettings();
      
      // 使用基础prompt
      const enhancedPrompt = settings.prompt;
      
      // 构建消息历史（如果启用）
      const messages = await this.buildMessagesWithHistory(enhancedPrompt, text);
      
      // 调用DeepSeek API
      const result = await this.deepseekAPI.translate(messages, {
        model: settings.model,
        stream: options.stream || false,
        onProgress: options.onProgress
      });
      
      // 保存到历史（如果启用且翻译完整）
      console.log(`\n💾 [HISTORY SAVE DEBUG]`);
      console.log(`   enableHistory: ${settings.enableHistory}`);
      console.log(`   isComplete: ${result.isComplete}`);
      console.log(`   original text length: ${text.length}`);
      console.log(`   translated text length: ${result.content.length}`);

      if (settings.enableHistory && result.isComplete) {
        console.log(`   ✅ Conditions met, saving history...`);
        await this.historyManager.addToHistory(text, result.content);
        console.log(`   ✅ History saved successfully`);
      } else {
        console.log(`   ❌ Save conditions not met:`);
        if (!settings.enableHistory) console.log(`      - History feature disabled`);
        if (!result.isComplete) console.log(`      - Translation incomplete`);
      }
      
      console.log('[SUCCESS] Translation completed');
      
      return {
        success: true,
        originalText: text,
        translatedText: result.content,
        isComplete: result.isComplete,
        duration: result.duration
      };
      
    } catch (error) {
      console.error('[ERROR] Translation failed:', error);
      throw error;
    }
  }

  /**
   * 获取翻译设置
   */
  getTranslationSettings() {
    const outputLanguage = this.config.get('outputLanguage', 'chinese');

    return {
      model: this.config.get('translateModel', 'chat'),
      prompt: this.getPromptByLanguage(outputLanguage),
      outputLanguage: outputLanguage,
      enableHistory: this.config.get('enableHistory', false),
      darkMode: this.config.get('darkMode', false)
    };
  }

  /**
   * 根据语言获取对应的提示词
   */
  getPromptByLanguage(outputLanguage) {
    const prompts = {
      chinese: '你是一位精通古代中文的专家学者，具有深厚的古典文学、历史文献和语言学功底。请将以下文本准确翻译为现代中文，并给出注释，不要重复原文。\n\n请按以下格式输出：\n**翻译**：[现代中文翻译]\n**注释**：\n1. [第一个注释点]\n2. [第二个注释点]\n3. [第三个注释点]\n**考据延伸**：[相关的历史背景、典故出处等补充信息]',
      english: 'You are an expert scholar specializing in ancient Chinese literature, with profound knowledge of classical literature, historical documents, and linguistics. Please translate the following ancient Chinese text into modern English accurately, providing annotations. Do not repeat the original text.\n\nPlease output in the following format:\n**Translation**: [Modern English translation]\n**Notes**:\n1. [First explanatory point]\n2. [Second explanatory point]  \n3. [Third explanatory point]\n**Historical Context**: [Relevant historical background, allusions, and supplementary information]'
    };
    
    return prompts[outputLanguage] || prompts.chinese;
  }

  /**
   * 构建包含历史对话的消息数组
   */
  async buildMessagesWithHistory(prompt, userInput) {
    const messages = [];

    console.log('\n' + '='.repeat(60));
    console.log('🧠 [CONTEXT DEBUG] Building translation context');
    console.log('='.repeat(60));

    // 添加系统提示词
    messages.push({
      role: "system",
      content: prompt
    });

    console.log('📋 [SYSTEM] System prompt added');
    console.log(`   Length: ${prompt.length} characters`);

    // 添加历史对话（如果启用）
    const historyEnabled = this.config.get('enableHistory', false);
    console.log(`\n🔧 [CONFIG] History feature: ${historyEnabled ? '✅ Enabled' : '❌ Disabled'}`);

    if (historyEnabled) {
      const history = await this.historyManager.getRecentHistory();
      console.log(`📚 [HISTORY] Retrieved ${history.length} history entries`);

      if (history.length > 0) {
        let totalHistoryTokens = 0;
        console.log('\n📜 [HISTORY DETAILS] Historical conversation content:');

        for (let i = 0; i < history.length; i++) {
          const item = history[i];
          totalHistoryTokens += item.tokens || 0;

          console.log(`\n   ${i + 1}. [${item.timestamp}] (${item.tokens || 0} tokens)`);
          console.log(`   👤 USER: ${item.user.substring(0, 100)}${item.user.length > 100 ? '...' : ''}`);
          console.log(`   🤖 ASSISTANT: ${item.assistant.substring(0, 100)}${item.assistant.length > 100 ? '...' : ''}`);

          messages.push({
            role: "user",
            content: item.user
          });
          messages.push({
            role: "assistant",
            content: item.assistant
          });
        }

        console.log(`\n📊 [SUMMARY] History statistics:`);
        console.log(`   Total entries: ${history.length}`);
        console.log(`   Total tokens: ${totalHistoryTokens}`);
        console.log(`   Remaining token budget: ${16000 - totalHistoryTokens}`);
      } else {
        console.log('   📝 No history records found');
      }
    }

    // 添加当前用户输入
    messages.push({
      role: "user",
      content: userInput
    });

    console.log(`\n💬 [CURRENT] Current user input:`);
    console.log(`   Content: ${userInput}`);
    console.log(`   Length: ${userInput.length} characters`);

    console.log(`\n🔢 [FINAL] Final message array:`);
    console.log(`   Total messages: ${messages.length}`);
    console.log(`   Structure: system(1) + history(${historyEnabled ? (messages.length - 2) : 0}) + current(1)`);
    console.log('='.repeat(60) + '\n');

    return messages;
  }

  /**
   * 更新配置
   */
  async updateConfig(key, value) {
    await this.config.set(key, value);
    
    // 重新初始化相关组件
    if (key === 'apiKey') {
      const apiKey = this.config.get('apiKey');
      this.deepseekAPI = apiKey ? new DeepSeekAPI(apiKey) : null;
      this.searchEngine = apiKey ? new SearchEngine(apiKey, this.config) : null;
    }
  }

  /**
   * 获取配置值
   */
  getConfig(key, defaultValue) {
    if (key) {
      return this.config.get(key, defaultValue);
    }
    // 如果没有指定key，返回所有配置
    return this.config.getAll();
  }


  /**
   * 中断当前翻译
   */
  abortTranslation() {
    if (this.deepseekAPI) {
      this.deepseekAPI.abort();
      console.log('[INFO] Translation aborted');
    }
  }

  /**
   * 销毁翻译模块
   */
  async destroy() {
    if (this.historyManager) {
      await this.historyManager.destroy();
    }
    this.isReady = false;
    console.log('[CLEANUP] Translation module destroyed');
  }
}

module.exports = TranslationModule;