// 翻译图标元素
let translateIcon = null;
let translatePopup = null;
let selectedText = '';
let currentAbortController = null; // 用于中断API请求
let isMouseOverPopup = false; // 全局变量追踪鼠标是否在弹窗内
let conversationHistory = []; // 对话历史 [{user: "", assistant: "", tokens: 0, timestamp: 0}]
let conversationSummary = ''; // 对话摘要
let summaryTokens = 0; // 摘要的token数
const MAX_TOTAL_TOKENS = 2000; // 最大历史token数（面向中文内容）
let enableHistory = true; // 历史记录开关
let currentSession = null; // 当前翻译会话（与历史分离）

// 初始化时加载对话历史
loadConversationHistory();

// 创建翻译图标
function createTranslateIcon() {
  if (translateIcon) {
    document.body.removeChild(translateIcon);
  }
  
  translateIcon = document.createElement('div');
  translateIcon.id = 'translate-icon';
  translateIcon.innerHTML = '🌐';
  translateIcon.style.cssText = `
    position: fixed;
    width: 30px;
    height: 30px;
    background: #4285f4;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s ease;
  `;
  
  document.body.appendChild(translateIcon);
  
  // 点击事件
  translateIcon.addEventListener('click', showTranslatePopup);
  
  return translateIcon;
}

// 创建翻译弹窗
function createTranslatePopup() {
  if (translatePopup) {
    document.body.removeChild(translatePopup);
  }
  
  translatePopup = document.createElement('div');
  translatePopup.id = 'translate-popup';
  translatePopup.style.cssText = `
    position: fixed;
    min-width: 280px;
    max-width: 500px;
    width: 320px;
    background: white;
    border: 1px solid #dadce0;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
    overflow: hidden;
  `;
  
  translatePopup.innerHTML = `
    <div id="popup-header" style="height: 32px; background: #f1f3f4; border-bottom: 1px solid #dadce0; display: flex; align-items: center; justify-content: space-between; user-select: none; cursor: move;">
      <span style="font-size: 13px; color: #5f6368; font-weight: 500;">翻译结果</span>
      <button id="close-popup" style="width: 24px; height: 24px; border: none; background: none; cursor: pointer; font-size: 16px; color: #5f6368; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
    <div id="translated-text" style="background: white; font-size: 14px; line-height: 1.4; word-break: break-word; min-height: 60px;">翻译中...</div>
    <div id="resize-handle-left" style="position: absolute; left: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize;"></div>
    <div id="resize-handle-right" style="position: absolute; right: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize;"></div>
    <div id="resize-handle-bottom" style="position: absolute; left: 0; right: 0; bottom: -4px; height: 8px; cursor: ns-resize;"></div>
  `;
  
  document.body.appendChild(translatePopup);
  
  // 关闭按钮事件
  document.getElementById('close-popup').addEventListener('click', hideTranslatePopup);
  
  
  // 弹窗点击事件（用于调试）
  translatePopup.addEventListener('click', function(e) {
    console.log('弹窗内部点击事件，目标:', e.target);
  });
  
  // 添加拖拽和缩放功能
  setupDragAndResize(translatePopup);
  
  return translatePopup;
}

// 显示翻译图标 - 使用鼠标位置
function showTranslateIcon(mouseX, mouseY) {
  if (!translateIcon) {
    createTranslateIcon();
  }
  
  // 图标尺寸和偏移
  const iconSize = 30;
  const offset = 10;
  
  // 计算图标位置
  let iconX = mouseX + offset;
  let iconY = mouseY - iconSize - offset;
  
  // 边界检查
  if (iconX + iconSize > window.innerWidth) {
    iconX = mouseX - iconSize - offset;
  }
  if (iconY < 0) {
    iconY = mouseY + offset;
  }
  if (iconY + iconSize > window.innerHeight) {
    iconY = window.innerHeight - iconSize - offset;
  }
  if (iconX < 0) {
    iconX = offset;
  }
  
  translateIcon.style.left = iconX + 'px';
  translateIcon.style.top = iconY + 'px';
  translateIcon.style.opacity = '1';
  translateIcon.style.transform = 'scale(1)';
}

// 隐藏翻译图标
function hideTranslateIcon() {
  if (translateIcon) {
    translateIcon.style.opacity = '0';
    translateIcon.style.transform = 'scale(0.8)';
  }
}

// 显示翻译弹窗
function showTranslatePopup() {
  if (!translatePopup) {
    createTranslatePopup();
  }
  
  // 获取图标位置
  const iconRect = translateIcon.getBoundingClientRect();
  const popupWidth = 320;
  
  let left = iconRect.left + iconRect.width / 2 - popupWidth / 2;
  let top = iconRect.top - 200;
  
  // 边界检查
  if (left < 10) left = 10;
  if (left + popupWidth > window.innerWidth - 10) {
    left = window.innerWidth - popupWidth - 10;
  }
  if (top < 10) top = iconRect.bottom + 10;
  
  translatePopup.style.left = left + 'px';
  translatePopup.style.top = top + 'px';
  translatePopup.style.display = 'block';
  
  // 开始翻译
  translateText(selectedText);
  
  hideTranslateIcon();
}

// 隐藏翻译弹窗
function hideTranslatePopup() {
  if (translatePopup) {
    translatePopup.style.display = 'none';
  }
}

// 检查扩展状态
function checkExtensionStatus() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// 翻译文本 - 使用DeepSeek API流式传输
async function translateText(text) {
  // 检查扩展状态
  if (!checkExtensionStatus()) {
    const translatedElement = document.getElementById('translated-text');
    if (translatedElement) {
      translatedElement.textContent = '扩展需要重新加载，请刷新页面或重新加载扩展';
      translatedElement.className = '';
    }
    return;
  }
  
  // 中断之前的请求
  if (currentAbortController) {
    currentAbortController.abort();
  }
  
  // 创建新的AbortController
  currentAbortController = new AbortController();
  
  // 初始化当前会话（与历史分离）
  currentSession = {
    userInput: text,
    aiResponse: '',
    startTime: Date.now(),
    isComplete: false
  };
  
  // 清空并显示加载状态
  const translatedElement = document.getElementById('translated-text');
  
  // 显示历史状态提示
  if (enableHistory && hasHistoryContent()) {
    translatedElement.innerHTML = '<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">📚 fetch history</div><div>正在翻译...</div>';
  } else {
    translatedElement.textContent = '正在翻译...';
  }
  translatedElement.className = 'loading';
  
  try {
    // 从存储中获取设置
    const settings = await getTranslationSettings();
    
    if (!settings.apiKey) {
      throw new Error('请先在扩展设置中配置DeepSeek API Key\n\n如果已经配置但仍显示此错误，请尝试重新加载扩展或刷新页面');
    }
    
    const model = settings.model === 'reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
    
    // 构建包含历史对话的消息数组
    const messages = await buildMessagesWithHistory(settings.prompt, text);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true  // 启用流式传输
      }),
      signal: currentAbortController.signal
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }
    
    // 处理流式响应
    const responseContent = await handleStreamResponse(response, translatedElement);
    
    // 标记会话完成
    if (currentSession) {
      currentSession.aiResponse = responseContent;
      currentSession.isComplete = true;
      
      // 只有完整生成的内容才添加到历史
      if (enableHistory && responseContent && responseContent.trim()) {
        await addCompletedSessionToHistory();
      }
    }
    
  } catch (error) {
    // 如果是请求被中断，不保存到历史记录
    if (error.name === 'AbortError') {
      console.log('翻译请求已中断，不保存到历史');
      console.log('当前历史记录数量:', conversationHistory.length);
      currentSession = null;
      return;
    }
    
    // 处理网络错误
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('网络连接失败:', error);
      translatedElement.textContent = '网络连接失败，请检查网络设置';
      translatedElement.className = '';
      return;
    }
    
    console.error('DeepSeek翻译失败:', error);
    translatedElement.textContent = `翻译失败: ${error.message}`;
    translatedElement.className = '';
  } finally {
    currentAbortController = null;
  }
}

// 处理流式响应
async function handleStreamResponse(response, translatedElement) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reasoningContent = '';
  let finalContent = '';
  let isInReasoning = true;
  
  // 重置样式并开始流式显示
  translatedElement.className = 'streaming';
  translatedElement.innerHTML = '';
  
  // 更新显示内容的函数
  function updateDisplay() {
    let displayHtml = '';
    
    // 添加思考过程（如果有）
    if (reasoningContent) {
      displayHtml += `<div class="reasoning-content">${parseMarkdown(reasoningContent)}</div>`;
    }
    
    // 添加分隔线（如果有思考内容和最终答案）
    if (reasoningContent && finalContent) {
      displayHtml += `<div class="content-separator"></div>`;
    }
    
    // 添加最终答案
    if (finalContent) {
      displayHtml += `<div class="final-content">${parseMarkdown(finalContent)}</div>`;
    }
    
    translatedElement.innerHTML = displayHtml;
  }
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('流式传输完成');
        break;
      }
      
      // 解码数据块
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'data: [DONE]') {
          console.log('接收到完成信号');
          return finalContent || reasoningContent;
        }
        
        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6); // 移除 'data: ' 前缀
            if (jsonStr === '') continue; // 跳过空数据
            
            const data = JSON.parse(jsonStr);
            
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const delta = data.choices[0].delta;
              
              // 处理reasoning内容（思考过程）
              if (delta.reasoning_content) {
                reasoningContent += delta.reasoning_content;
                updateDisplay();
              }
              
              // 处理最终答案内容
              if (delta.content) {
                if (isInReasoning && reasoningContent) {
                  isInReasoning = false; // 开始接收最终答案
                }
                finalContent += delta.content;
                updateDisplay();
              }
            }
          } catch (parseError) {
            console.warn('解析SSE数据失败:', parseError, '原始数据:', trimmedLine);
          }
        }
      }
    }
    
    // 返回完整的响应内容
    return finalContent || reasoningContent;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('流式读取被中断');
      return finalContent || reasoningContent;
    }
    throw error;
  } finally {
    reader.releaseLock();
    // 完成流式传输，移除流式效果
    translatedElement.className = '';
  }
}


// Token估算函数（面向中文内容）
function estimateTokens(text) {
  if (!text) return 0;
  
  // 中文字符：1字符 ≈ 1token
  // 英文字符：4字符 ≈ 1token
  // 标点符号：1字符 ≈ 0.5token
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const punctuation = (text.match(/[，。！？；：""''（）【】《》、]/g) || []).length;
  const otherChars = text.length - chineseChars - englishChars - punctuation;
  
  return Math.ceil(
    chineseChars * 1.0 +           // 中文
    englishChars * 0.25 +          // 英文
    punctuation * 0.5 +            // 中文标点
    otherChars * 0.3               // 其他字符
  );
}

// 检查是否有历史内容
function hasHistoryContent() {
  return (conversationHistory.length > 0) || (conversationSummary.length > 0);
}

// 计算当前历史总Token数
function calculateHistoryTokens() {
  let totalTokens = summaryTokens;
  
  for (const item of conversationHistory) {
    totalTokens += item.tokens;
  }
  
  return totalTokens;
}

// 构建包含历史对话的消息数组
async function buildMessagesWithHistory(prompt, userInput) {
  const messages = [];
  
  // 添加系统提示词
  messages.push({
    "role": "system",
    "content": prompt
  });
  
  // 如果启用历史且有对话摘要，添加为系统消息
  if (enableHistory && conversationSummary) {
    messages.push({
      "role": "system", 
      "content": `以下是之前对话的简要摘要：\n${conversationSummary}`
    });
  }
  
  // 添加历史对话（如果启用）
  if (enableHistory) {
    for (const item of conversationHistory) {
      messages.push({
        "role": "user",
        "content": item.user
      });
      messages.push({
        "role": "assistant",
        "content": item.assistant
      });
    }
  }
  
  // 添加当前用户输入
  messages.push({
    "role": "user",
    "content": userInput
  });
  
  return messages;
}

// 将完成的会话添加到历史记录
async function addCompletedSessionToHistory() {
  if (!currentSession || !currentSession.isComplete) return;
  
  // 验证会话数据完整性
  if (!currentSession.userInput || !currentSession.userInput.trim() ||
      !currentSession.aiResponse || !currentSession.aiResponse.trim()) {
    console.warn('会话数据不完整，跳过保存到历史');
    currentSession = null;
    return;
  }
  
  const userTokens = estimateTokens(currentSession.userInput);
  const aiTokens = estimateTokens(currentSession.aiResponse);
  const totalTokens = userTokens + aiTokens;
  
  // 验证token计算结果
  if (totalTokens <= 0) {
    console.warn('Token计算异常，跳过保存到历史');
    currentSession = null;
    return;
  }
  
  // 添加到历史记录
  conversationHistory.push({
    user: currentSession.userInput.trim(),
    assistant: currentSession.aiResponse.trim(),
    tokens: totalTokens,
    timestamp: Date.now()
  });
  
  console.log(`已添加完整对话到历史: ${totalTokens} tokens`);
  console.log('=== 当前完整历史记录 ===');
  conversationHistory.forEach((item, index) => {
    console.log(`${index + 1}. [${new Date(item.timestamp).toLocaleTimeString()}] ${item.tokens} tokens`);
    console.log(`   用户: ${item.user.substring(0, 50)}${item.user.length > 50 ? '...' : ''}`);
    console.log(`   AI: ${item.assistant.substring(0, 50)}${item.assistant.length > 50 ? '...' : ''}`);
  });
  console.log(`历史摘要 (${summaryTokens} tokens): ${conversationSummary.substring(0, 100)}${conversationSummary.length > 100 ? '...' : ''}`);
  console.log(`总计: ${conversationHistory.length} 条对话, ${calculateHistoryTokens()} tokens`);
  console.log('========================');
  
  // 检查是否需要总结
  await checkTokenLimitAndSummarize();
  
  // 保存到存储
  await saveConversationHistory();
  
  // 清理当前会话
  currentSession = null;
}

// 加载对话历史
async function loadConversationHistory() {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['conversationHistory', 'conversationSummary', 'summaryTokens', 'enableHistory'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('加载历史失败，使用默认值:', chrome.runtime.lastError);
            resolve({});
          } else {
            resolve(result);
          }
        });
      });
      
      // 验证和清理历史记录数据
      const rawHistory = result.conversationHistory || [];
      conversationHistory = rawHistory.filter(item => {
        // 只保留有效的完整对话记录
        return item && 
               typeof item.user === 'string' && item.user.trim() &&
               typeof item.assistant === 'string' && item.assistant.trim() &&
               typeof item.timestamp === 'number' &&
               item.tokens > 0;
      });
      
      // 如果过滤后数量不同，说明有无效数据被清理
      if (rawHistory.length !== conversationHistory.length) {
        console.log(`清理了 ${rawHistory.length - conversationHistory.length} 条无效历史记录`);
        // 立即保存清理后的数据
        saveConversationHistory();
      }
      
      conversationSummary = result.conversationSummary || '';
      summaryTokens = result.summaryTokens || 0;
      enableHistory = result.enableHistory !== undefined ? result.enableHistory : true;
      
      const totalTokens = calculateHistoryTokens();
      console.log(`已加载对话历史: ${conversationHistory.length} 条对话, ${totalTokens} tokens`);
      
      // 打印加载的历史记录详情
      if (conversationHistory.length > 0) {
        console.log('=== 加载的历史记录详情 ===');
        conversationHistory.forEach((item, index) => {
          console.log(`${index + 1}. [${new Date(item.timestamp).toLocaleTimeString()}] ${item.tokens} tokens`);
          console.log(`   用户: ${item.user.substring(0, 50)}${item.user.length > 50 ? '...' : ''}`);
          console.log(`   AI: ${item.assistant.substring(0, 50)}${item.assistant.length > 50 ? '...' : ''}`);
        });
        if (conversationSummary) {
          console.log(`历史摘要 (${summaryTokens} tokens): ${conversationSummary.substring(0, 100)}${conversationSummary.length > 100 ? '...' : ''}`);
        }
        console.log('========================');
      }
    } else {
      console.warn('Extension context invalidated，跳过历史加载');
      // 使用默认值
      conversationHistory = [];
      conversationSummary = '';
      summaryTokens = 0;
      enableHistory = true;
    }
  } catch (error) {
    console.warn('加载对话历史异常:', error);
    // 使用默认值
    conversationHistory = [];
    conversationSummary = '';
    summaryTokens = 0;
    enableHistory = true;
  }
}

// 保存对话历史
async function saveConversationHistory() {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      await new Promise((resolve) => {
        chrome.storage.local.set({
          conversationHistory: conversationHistory,
          conversationSummary: conversationSummary,
          summaryTokens: summaryTokens,
          enableHistory: enableHistory
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('保存历史失败:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    } else {
      console.warn('Extension context invalidated，跳过历史保存');
    }
  } catch (error) {
    console.warn('保存对话历史异常:', error);
  }
}

// 检查Token限制并进行总结
async function checkTokenLimitAndSummarize() {
  const totalTokens = calculateHistoryTokens();
  
  if (totalTokens > MAX_TOTAL_TOKENS) {
    console.log(`历史tokens超限 (${totalTokens}/${MAX_TOTAL_TOKENS})，开始总结...`);
    await performConciseSummary();
  }
}

// 执行简洁总结
async function performConciseSummary() {
  try {
    const settings = await getTranslationSettings();
    
    if (!settings.apiKey) {
      console.warn('无API Key，跳过历史总结');
      return;
    }
    
    // 确定需要总结的内容
    const tokensToSummarize = calculateHistoryTokens() - MAX_TOTAL_TOKENS * 0.6; // 总结到60%
    let itemsToSummarize = 0;
    let accumulatedTokens = summaryTokens;
    
    // 从最老的对话开始累计，直到达到需要总结的token数
    for (let i = 0; i < conversationHistory.length; i++) {
      accumulatedTokens += conversationHistory[i].tokens;
      itemsToSummarize++;
      
      if (accumulatedTokens >= tokensToSummarize) {
        break;
      }
    }
    
    if (itemsToSummarize === 0) return;
    
    // 构建总结内容
    const toSummarize = conversationHistory.slice(0, itemsToSummarize);
    const toKeep = conversationHistory.slice(itemsToSummarize);
    
    // 构建历史文本
    const historyText = toSummarize.map(item => 
      `用户: ${item.user}\nAI: ${item.assistant}`
    ).join('\n\n---\n\n');
    
    // 总结提示词
    let summaryPrompt;
    if (conversationSummary) {
      summaryPrompt = `请将以下历史摘要和新对话合并为一个简洁的摘要，重点保留翻译相关的上下文和重要信息：\n\n已有摘要：\n${conversationSummary}\n\n新对话：\n${historyText}`;
    } else {
      summaryPrompt = `请将以下对话简洁总结，重点保留翻译相关的上下文和重要信息：\n\n${historyText}`;
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            "role": "user",
            "content": summaryPrompt
          }
        ],
        stream: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const newSummary = data.choices[0].message.content;
      
      // 更新摘要和token计数
      conversationSummary = newSummary;
      summaryTokens = estimateTokens(newSummary);
      
      // 更新历史记录，只保留较新的对话
      conversationHistory = toKeep;
      
      // 保存更新后的数据
      await saveConversationHistory();
      
      const newTotal = calculateHistoryTokens();
      console.log(`对话历史已总结: ${itemsToSummarize} 条对话被总结，剩余 ${newTotal} tokens`);
    }
  } catch (error) {
    console.warn('总结对话历史失败:', error);
  }
}

// 清空对话历史
async function clearConversationHistory() {
  conversationHistory = [];
  conversationSummary = '';
  summaryTokens = 0;
  currentSession = null;
  await saveConversationHistory();
  console.log('对话历史已清空');
}

// 设置历史记录开关
function setHistoryEnabled(enabled) {
  enableHistory = enabled;
  saveConversationHistory();
  console.log(`历史记录功能: ${enabled ? '启用' : '禁用'}`);
}

// 获取翻译设置
async function getTranslationSettings() {
  return new Promise((resolve) => {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.storage.sync.get(['translatePrompt', 'translateModel', 'apiKey'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('获取设置失败，使用默认值:', chrome.runtime.lastError);
            resolve({
              prompt: '把这段文本翻译为现代中文并标注典故',
              model: 'chat',
              apiKey: ''
            });
          } else {
            resolve({
              prompt: result.translatePrompt || '把这段文本翻译为现代中文并标注典故',
              model: result.translateModel || 'chat',
              apiKey: result.apiKey || ''
            });
          }
        });
      } else {
        // Extension context invalid，使用默认设置
        console.warn('Extension context invalidated，使用默认设置');
        resolve({
          prompt: '把这段文本翻译为现代中文并标注典故',
          model: 'chat',
          apiKey: ''
        });
      }
    } catch (error) {
      console.warn('获取设置异常，使用默认值:', error);
      resolve({
        prompt: '把这段文本翻译为现代中文并标注典故',
        model: 'chat',
        apiKey: ''
      });
    }
  });
}

// 检测是否为中文文本
function isChineseText(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

// 简单的Markdown解析器
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // 代码块 ```code``` 
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // 内联代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 粗体 **text** 或 __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // 斜体 *text* 或 _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // 标题 # ## ###
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 无序列表 - item 或 * item
  html = html.replace(/^[\-\*] (.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // 有序列表 1. item
  html = html.replace(/^\d+\. (.*)$/gim, '<li>$1</li>');
  
  // 换行处理
  html = html.replace(/\n/g, '<br>');
  
  // 引用 > text
  html = html.replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>');
  
  return html;
}

// 设置拖拽和缩放功能
function setupDragAndResize(popup) {
  let isDragging = false;
  let isResizing = false;
  let resizeDirection = null;
  let startX, startY, startLeft, startTop, startWidth, startHeight;
  
  const header = popup.querySelector('#popup-header');
  const leftHandle = popup.querySelector('#resize-handle-left');
  const rightHandle = popup.querySelector('#resize-handle-right');
  const bottomHandle = popup.querySelector('#resize-handle-bottom');
  
  // 拖拽功能
  header.addEventListener('mousedown', function(e) {
    if (e.target.id === 'close-popup' || e.target.closest('#close-popup')) {
      return;
    }
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(popup.style.left, 10);
    startTop = parseInt(popup.style.top, 10);
    
    popup.classList.add('dragging');
    e.preventDefault();
  });
  
  // 左边缩放手柄
  leftHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    resizeDirection = 'left';
    startX = e.clientX;
    startLeft = parseInt(popup.style.left, 10);
    startWidth = popup.offsetWidth;
    
    popup.classList.add('resizing');
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 右边缩放手柄
  rightHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    resizeDirection = 'right';
    startX = e.clientX;
    startWidth = popup.offsetWidth;
    
    popup.classList.add('resizing');
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 底部缩放手柄
  bottomHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    resizeDirection = 'bottom';
    startY = e.clientY;
    startHeight = popup.offsetHeight;
    
    popup.classList.add('resizing');
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 鼠标移动事件
  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // 边界检查
      newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - popup.offsetWidth - 10));
      newTop = Math.max(10, Math.min(newTop, window.innerHeight - popup.offsetHeight - 10));
      
      popup.style.left = newLeft + 'px';
      popup.style.top = newTop + 'px';
    }
    
    if (isResizing) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (resizeDirection === 'left') {
        const newWidth = startWidth - deltaX;
        const newLeft = startLeft + deltaX;
        
        if (newWidth >= 200 && newLeft >= 10) { // 最小宽度和边界检查
          popup.style.width = newWidth + 'px';
          popup.style.left = newLeft + 'px';
        }
      } else if (resizeDirection === 'right') {
        const newWidth = startWidth + deltaX;
        
        if (newWidth >= 200 && (parseInt(popup.style.left, 10) + newWidth) <= window.innerWidth - 10) {
          popup.style.width = newWidth + 'px';
        }
      } else if (resizeDirection === 'bottom') {
        const newHeight = startHeight + deltaY;
        
        if (newHeight >= 100 && (parseInt(popup.style.top, 10) + newHeight) <= window.innerHeight - 10) {
          popup.style.height = newHeight + 'px';
        }
      }
    }
  });
  
  // 鼠标释放事件
  document.addEventListener('mouseup', function(e) {
    if (isDragging) {
      isDragging = false;
      popup.classList.remove('dragging');
    }
    
    if (isResizing) {
      isResizing = false;
      resizeDirection = null;
      popup.classList.remove('resizing');
    }
  });
  
  // 设置鼠标进入/离开事件
  popup.addEventListener('mouseenter', function() {
    isMouseOverPopup = true;
    console.log('鼠标进入翻译框');
  });
  
  popup.addEventListener('mouseleave', function() {
    isMouseOverPopup = false;
    console.log('鼠标离开翻译框');
  });
}

// 最初的简单事件监听 - 只修改位置计算部分
document.addEventListener('mouseup', function(e) {
  setTimeout(() => {
    // 检查是否点击了翻译相关元素，如果是，则不处理文本选择
    if (translatePopup && (e.target === translatePopup || translatePopup.contains(e.target))) {
      console.log('mouseup: 点击了翻译弹窗，不处理文本选择');
      return;
    }
    if (translateIcon && (e.target === translateIcon || translateIcon.contains(e.target))) {
      console.log('mouseup: 点击了翻译图标，不处理文本选择');
      return;
    }
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0 && text.length < 1000) {
      selectedText = text;
      
      // 使用鼠标位置而不是选中文本的位置
      showTranslateIcon(e.clientX, e.clientY);
    } else {
      // 只有在没有点击翻译元素时才中断请求
      console.log('mouseup: 没有有效文本选择，隐藏翻译界面');
      
      // 中断当前的翻译请求
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
      
      hideTranslateIcon();
      hideTranslatePopup();
      selectedText = '';
    }
  }, 100);
});

// 监听点击事件，点击其他地方时隐藏弹窗和图标
document.addEventListener('click', function(e) {
  console.log('全局点击事件触发，目标:', e.target);
  
  // 检查是否点击了翻译弹窗或其内部元素
  if (translatePopup && (e.target === translatePopup || translatePopup.contains(e.target))) {
    console.log('点击了翻译弹窗，不关闭');
    return;
  }
  
  // 检查是否点击了翻译图标或其内部元素
  if (translateIcon && (e.target === translateIcon || translateIcon.contains(e.target))) {
    console.log('点击了翻译图标，不关闭');
    return;
  }
  
  // 只有点击其他地方才隐藏
  console.log('点击了其他地方，关闭翻译框');
  // 中断当前的翻译请求
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  hideTranslateIcon();
  hideTranslatePopup();
});

// 监听键盘事件，ESC键关闭弹窗
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // 中断当前的翻译请求
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    
    hideTranslateIcon();
    hideTranslatePopup();
  }
});

// 监听来自扩展的消息
if (checkExtensionStatus()) {
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    try {
      if (request.action === 'getSelection') {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        sendResponse({ text: text });
        return true;
      }
      
      if (request.action === 'translateSelection') {
        if (request.text) {
          selectedText = request.text;
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          showTranslateIcon(centerX, centerY);
        }
        return true;
      }
      
      if (request.action === 'clearHistory') {
        clearConversationHistory();
        sendResponse({ success: true });
        return true;
      }
      
      if (request.action === 'setHistoryEnabled') {
        setHistoryEnabled(request.enabled);
        sendResponse({ success: true });
        return true;
      }
    } catch (error) {
      console.warn('消息处理异常:', error);
      sendResponse({ error: error.message });
    }
  });
}

// 全局滚轮事件监听 - 当鼠标在翻译框内时阻止主页面滚动
document.addEventListener('wheel', function(e) {
  if (isMouseOverPopup) {
    console.log('鼠标在翻译框内，阻止页面滚动');
    
    // 检查事件是否来自翻译框内部
    if (translatePopup && translatePopup.contains(e.target)) {
      // 来自翻译框内部，检查是否需要内部滚动
      const translatedTextElement = translatePopup.querySelector('#translated-text');
      if (translatedTextElement && e.target === translatedTextElement || translatedTextElement.contains(e.target)) {
        // 如果内容有滚动条，允许内部滚动
        if (translatedTextElement.scrollHeight > translatedTextElement.clientHeight) {
          console.log('允许内部滚动');
          return; // 不阻止，允许内部滚动
        }
      }
    }
    
    // 其他情况都阻止页面滚动
    e.preventDefault();
    e.stopPropagation();
  }
}, { passive: false });