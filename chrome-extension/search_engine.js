/**
 * 简化的古文搜索引擎 - 维基百科词条匹配
 * 三阶段：关键词提取 → 完全匹配搜索 → 增强prompt构建
 */

class AncientTextSearchEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.deepseek.com/chat/completions';
    this.maxResults = 8;
  }

  /**
   * 主搜索方法
   */
  async searchForTranslation(ancientText, settings = {}) {
    if (!this.apiKey) {
      return this.fallbackResult(settings.prompt);
    }

    try {
      // 第一阶段：提取关键词
      const keywords = await this.extractKeywords(ancientText);
      if (keywords.length === 0) {
        return this.fallbackResult(settings.prompt);
      }

      // 第二阶段：搜索维基百科
      const results = await this.searchWikipedia(keywords);
      
      // 第三阶段：构建增强prompt
      const enhancedPrompt = results.length > 0 
        ? this.buildEnhancedPrompt(ancientText, results, settings.prompt)
        : settings.prompt;

      return {
        hasSearchResults: results.length > 0,
        keywords: keywords,
        searchResults: results,
        enhancedPrompt: enhancedPrompt
      };

    } catch (error) {
      return this.fallbackResult(settings.prompt);
    }
  }

  /**
   * 第一阶段：提取关键词
   */
  async extractKeywords(ancientText) {
    const prompt = `从以下古文中提取需要搜索背景信息的专有名词（人名、地名、历史事件、典故等）。只返回关键词列表，每行一个，不要编号或解释。

古文：${ancientText}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 300
        })
      });

      if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

      const data = await response.json();
      const keywordText = data.choices[0].message.content.trim();
      
      return keywordText
        .split('\n')
        .map(line => line.replace(/^[\d\-\•\*\s]+/, '').trim())
        .filter(keyword => keyword.length > 0 && keyword.length <= 20);

    } catch (error) {
      return [];
    }
  }

  /**
   * 第二阶段：搜索维基百科
   */
  async searchWikipedia(keywords) {
    const results = [];

    for (const keyword of keywords) {
      try {
        const wikiResult = await this.searchSingleKeyword(keyword);
        if (wikiResult) {
          results.push(wikiResult);
          if (results.length >= this.maxResults) break;
        }
        // 简单延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        // 静默处理搜索失败
      }
    }

    return results;
  }

  /**
   * 搜索单个关键词
   */
  async searchSingleKeyword(keyword) {
    // 搜索维基百科条目
    const searchUrl = 'https://zh.wikipedia.org/w/api.php';
    const searchParams = new URLSearchParams({
      action: 'opensearch',
      search: keyword,
      limit: '5',
      format: 'json',
      redirects: 'resolve'
    });

    const searchResponse = await fetch(`${searchUrl}?${searchParams}&origin=*`);
    const [, titles, descriptions, urls] = await searchResponse.json();
    
    // 寻找完全匹配的标题
    for (let i = 0; i < titles.length; i++) {
      if (this.isExactMatch(keyword, titles[i])) {
        const content = await this.getWikiContent(titles[i]);
        return {
          keyword: keyword,
          title: titles[i],
          url: urls[i],
          content: content || descriptions[i] || `关于${titles[i]}的信息`
        };
      }
    }
    
    return null;
  }

  /**
   * 检查是否完全匹配
   */
  isExactMatch(keyword, title) {
    const clean = str => str.trim().toLowerCase();
    const cleanKeyword = clean(keyword);
    const cleanTitle = clean(title);
    
    // 完全相等
    if (cleanKeyword === cleanTitle) return true;
    
    // 移除括号后缀匹配
    const titleWithoutSuffix = cleanTitle.replace(/\s*[（(][^）)]*[）)]\s*$/, '');
    return cleanKeyword === titleWithoutSuffix;
  }

  /**
   * 获取维基百科内容
   */
  async getWikiContent(title) {
    try {
      const contentUrl = 'https://zh.wikipedia.org/w/api.php';
      const contentParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'extracts',
        exintro: true,
        explaintext: true,
        exchars: '300'
      });

      const response = await fetch(`${contentUrl}?${contentParams}&origin=*`);
      const data = await response.json();
      
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      return pages[pageId].extract || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 第三阶段：构建增强prompt
   */
  buildEnhancedPrompt(ancientText, searchResults, originalPrompt) {
    const backgroundInfo = searchResults
      .map((result, index) => 
        `${index + 1}. ${result.keyword}: ${result.content.substring(0, 150)}${result.content.length > 150 ? '...' : ''}`
      )
      .join('\n');

    // 检测是否为英文输出模式
    const isEnglishOutput = originalPrompt.includes('Modern English translation') || 
                           originalPrompt.includes('Translation**:') ||
                           originalPrompt.includes('expert scholar specializing');

    if (isEnglishOutput) {
      return `You are an expert scholar specializing in ancient Chinese literature, with profound knowledge of classical literature, historical documents, and linguistics. Please translate the following ancient Chinese text into modern English accurately based on the background knowledge below, providing annotations. Do not repeat the original text.

【Background Knowledge】
${backgroundInfo}

Please output in the following format:
**Translation**: [Modern English translation]
**Notes**: [Explanations of important vocabulary, grammar, and context]
**Historical Context**: [Relevant historical background, allusions, and supplementary information]

Please translate: `;
    } else {
      return `你是一位精通古代中文的专家学者，具有深厚的古典文学、历史文献和语言学功底。请根据以下背景知识将古文翻译为现代中文，并给出注释，不要重复原文。

【背景知识】
${backgroundInfo}

请按以下格式输出：
**翻译**：[现代中文翻译]
**注释**：
1. [第一个注释点]
2. [第二个注释点]
3. [第三个注释点]
**考据延伸**：[相关的历史背景、典故出处等补充信息]

请翻译：`;
    }
  }

  /**
   * 降级结果
   */
  fallbackResult(prompt) {
    return {
      hasSearchResults: false,
      keywords: [],
      searchResults: [],
      enhancedPrompt: prompt || '你是一位精通古代中文的专家学者，具有深厚的古典文学、历史文献和语言学功底。请将以下文本准确翻译为现代中文，并给出注释，不要重复原文。\n\n请按以下格式输出：\n**翻译**：[现代中文翻译]\n**注释**：\n1. [第一个注释点]\n2. [第二个注释点]\n3. [第三个注释点]\n**考据延伸**：[相关的历史背景、典故出处等补充信息]'
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AncientTextSearchEngine };
} else if (typeof window !== 'undefined') {
  window.AncientTextSearchEngine = AncientTextSearchEngine;
}

// 便捷函数
async function searchEnhancedTranslation(ancientText, apiKey, settings = {}) {
  const engine = new AncientTextSearchEngine(apiKey);
  return await engine.searchForTranslation(ancientText, settings);
}

if (typeof window !== 'undefined') {
  window.searchEnhancedTranslation = searchEnhancedTranslation;
}