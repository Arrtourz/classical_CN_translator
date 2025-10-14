const https = require('https');

class DeepSeekAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com';
    this.timeout = 30000; // 默认30秒超时
    this.reasonerTimeout = 60000; // reasoner模式60秒超时
    this.currentController = null; // 用于中断请求的AbortController
  }

  /**
   * 中断当前请求
   */
  abort() {
    if (this.currentController) {
      console.log('[INFO] Aborting current API request');
      this.currentController.abort();
      this.currentController = null;
    }
  }

  /**
   * 翻译文本
   * @param {Array} messages - 消息数组
   * @param {Object} options - 选项
   * @returns {Object} 翻译结果
   */
  async translate(messages, options = {}) {
    const startTime = Date.now();

    try {
      // 创建新的AbortController
      this.currentController = new AbortController();

      const model = options.model === 'reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
      const isReasoner = options.model === 'reasoner';

      const requestData = {
        model: model,
        messages: messages,
        stream: options.stream || false,
        temperature: 0.1,
        top_p: 0.9
      };

      if (options.stream) {
        return await this.streamTranslate(requestData, options.onProgress, isReasoner);
      } else {
        return await this.normalTranslate(requestData, startTime, isReasoner);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[INFO] API request aborted');
        throw new Error('Translation aborted');
      }
      console.error('[ERROR] DeepSeek API call failed:', error);
      throw error;
    } finally {
      this.currentController = null;
    }
  }

  /**
   * 普通翻译（非流式）
   */
  async normalTranslate(requestData, startTime, isReasoner = false) {
    const response = await this.makeRequest('/v1/chat/completions', requestData, isReasoner);
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Invalid API response: no choices');
    }

    const content = response.choices[0].message?.content || '';
    const duration = Date.now() - startTime;

    return {
      content: content,
      isComplete: true,
      duration: duration
    };
  }

  /**
   * 流式翻译 - 基于OpenAI SDK样式的实现
   */
  async streamTranslate(requestData, onProgress, isReasoner = false) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let reasoningContent = '';
      let finalContent = '';
      let isComplete = false;

      const postData = JSON.stringify(requestData);

      const options = {
        hostname: 'api.deepseek.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: isReasoner ? this.reasonerTimeout : this.timeout
      };

      const req = https.request(options, (res) => {
        let buffer = '';

        // 监听abort信号
        if (this.currentController) {
          this.currentController.signal.addEventListener('abort', () => {
            req.destroy();
            reject(new Error('Request aborted'));
          });
        }

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 保留最后一个可能不完整的行

          for (const line of lines) {
            const processResult = this.processStreamLine(line, {
              reasoningContent,
              finalContent,
              onProgress,
              updateContent: (reasoning, final) => {
                reasoningContent = reasoning;
                finalContent = final;
              }
            });
            
            // 实时回调进度更新
            if (processResult && onProgress) {
              onProgress({
                type: processResult.type,
                reasoningContent: reasoningContent,
                finalContent: finalContent,
                isComplete: false
              });
            }
          }
        });

        res.on('end', () => {
          isComplete = true;
          const duration = Date.now() - startTime;
          
          // 最终完成回调
          if (onProgress) {
            onProgress({
              type: 'complete',
              reasoningContent: reasoningContent,
              finalContent: finalContent,
              isComplete: true,
              duration: duration
            });
          }
          
          resolve({
            content: finalContent,
            reasoningContent: reasoningContent,
            isComplete: true,
            duration: duration
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 处理流式响应的单行数据 - 改进版本返回处理结果
   */
  processStreamLine(line, context) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === 'data: [DONE]') {
      return { type: 'done' };
    }
    
    if (trimmedLine.startsWith('data: ')) {
      try {
        const jsonStr = trimmedLine.slice(6);
        if (jsonStr === '') return null;
        
        const data = JSON.parse(jsonStr);
        
        if (data.choices && data.choices[0] && data.choices[0].delta) {
          const delta = data.choices[0].delta;
          
          // 处理reasoning内容（思考过程）
          if (delta.reasoning_content) {
            context.reasoningContent += delta.reasoning_content;
            context.updateContent(context.reasoningContent, context.finalContent);
            return { type: 'reasoning', delta: delta.reasoning_content };
          }
          
          // 处理最终答案内容
          if (delta.content) {
            context.finalContent += delta.content;
            context.updateContent(context.reasoningContent, context.finalContent);
            return { type: 'content', delta: delta.content };
          }
        }
      } catch (parseError) {
        // 静默处理解析错误
        console.debug('[DEBUG] Parse error in stream line:', parseError.message);
      }
    }
    
    return null;
  }

  /**
   * 发起HTTP请求
   */
  async makeRequest(path, data, isReasoner = false) {
    const timeoutMs = isReasoner ? this.reasonerTimeout : this.timeout;
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: 'api.deepseek.com',
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: timeoutMs
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              const errorData = JSON.parse(responseData);
              reject(new Error(errorData.error?.message || `HTTP ${res.statusCode}`));
              return;
            }
            
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello"
        }
      ];

      await this.translate(messages);
      return { success: true, message: 'API connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = DeepSeekAPI;