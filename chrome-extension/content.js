// 翻译图标元素
let translateIcon = null;
let translatePopup = null;
let selectedText = '';
let currentAbortController = null; // 用于中断API请求
let isMouseOverPopup = false; // 全局变量追踪鼠标是否在弹窗内
let conversationHistory = []; // 对话历史 [{user: "", assistant: "", tokens: 0, timestamp: 0}]
const DEFAULT_MAX_TOKENS = 16000; // 固定最大历史token数
let maxHistoryTokens = DEFAULT_MAX_TOKENS; // 固定的最大历史token数
let enableHistory = false; // 历史记录开关
let enableSearch = false; // 搜索增强开关
let darkModeEnabled = false; // 黑夜模式开关

// 翻译Prompt常量
const PROMPT_CHINESE = '你是一位精通古代中文的专家学者，具有深厚的古典文学、历史文献和语言学功底。请将以下文本准确翻译为现代中文，并给出注释，不要重复原文。\n\n请按以下格式输出：\n**翻译**：[现代中文翻译]\n**注释**：[注释内容]\n**考据延伸**：[考据延伸内容]';

const PROMPT_ENGLISH = 'You are an expert scholar specializing in ancient Chinese literature, with profound knowledge of classical literature, historical documents, and linguistics. Please translate the following ancient Chinese text into modern English accurately, providing annotations. Do not repeat the original text.\n\nPlease output in the following format:\n**Translation**: [Modern English translation]\n**Notes**: [Explanations of important vocabulary, grammar, and context]\n**Historical Context**: [Relevant historical background, allusions, and supplementary information]';

// 拖拽和缩放相关变量
let activeOperation = null;
let startData = null;
let dragEventListenersAdded = false;

// 初始化时加载对话历史
loadConversationHistory();

// 初始化CSS样式
initializeStyles();

// 初始化CSS样式函数
function initializeStyles() {
  // 检查是否已经添加了样式
  if (document.getElementById('translate-extension-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'translate-extension-styles';
  style.textContent = `
    /* 翻译弹窗滚动条样式 */
    #translated-text::-webkit-scrollbar {
      width: 6px;
    }
    
    #translated-text::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    #translated-text::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    #translated-text::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
    
    /* 黑夜模式样式 */
    #translate-popup.dark-mode {
      background: #1e1e1e !important;
      border-color: #404040 !important;
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode #popup-header {
      background: #2d2d2d !important;
      border-bottom-color: #404040 !important;
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode #close-popup {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode #translated-text {
      background: #1e1e1e !important;
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode #translated-text * {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode .reasoning-content {
      background: #2a2a2a !important;
      color: #d0d0d0 !important;
    }
    
    #translate-popup.dark-mode .reasoning-content * {
      color: #d0d0d0 !important;
    }
    
    #translate-popup.dark-mode .content-separator {
      background: #404040 !important;
    }
    
    #translate-popup.dark-mode .final-content {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode .final-content * {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode code {
      background: #333 !important;
      color: #ff6b6b !important;
    }
    
    #translate-popup.dark-mode pre {
      background: #2a2a2a !important;
      border: 1px solid #404040 !important;
    }
    
    #translate-popup.dark-mode blockquote {
      background: #2a2a2a !important;
      border-left: 4px solid #555 !important;
      color: #d0d0d0 !important;
    }
    
    #translate-popup.dark-mode p {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode div {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode span {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode strong {
      color: #ffffff !important;
    }
    
    #translate-popup.dark-mode em {
      color: #e0e0e0 !important;
    }
    
    #translate-popup.dark-mode h1, 
    #translate-popup.dark-mode h2, 
    #translate-popup.dark-mode h3, 
    #translate-popup.dark-mode h4, 
    #translate-popup.dark-mode h5, 
    #translate-popup.dark-mode h6 {
      color: #ffffff !important;
    }
    
    /* 黑夜模式滚动条 */
    #translate-popup.dark-mode #translated-text::-webkit-scrollbar-track {
      background: #2a2a2a !important;
    }
    
    #translate-popup.dark-mode #translated-text::-webkit-scrollbar-thumb {
      background: #555 !important;
    }
    
    #translate-popup.dark-mode #translated-text::-webkit-scrollbar-thumb:hover {
      background: #666 !important;
    }
    
    /* 黑夜模式打字机光标 */
    #translate-popup.dark-mode #translated-text.streaming {
      border-right: 2px solid #404040 !important;
    }
    
    @keyframes blink-dark {
      0%, 50% { 
        border-right-color: #404040; 
      }
      51%, 100% { 
        border-right-color: transparent; 
      }
    }
    
    #translate-popup.dark-mode #translated-text.streaming {
      animation: blink-dark 1s infinite !important;
    }
    
    /* 搜索状态提示样式 */
    .search-status {
      color: #9aa0a6 !important;
      font-style: italic !important;
      font-size: 13px !important;
      margin-bottom: 8px !important;
    }
    
    #translate-popup.dark-mode .search-status {
      color: #9aa0a6 !important;
    }
  `;
  
  document.head.appendChild(style);
}

// 创建翻译图标
function createTranslateIcon() {
  if (translateIcon) {
    document.body.removeChild(translateIcon);
  }
  
  translateIcon = document.createElement('div');
  translateIcon.id = 'translate-icon';
  translateIcon.innerHTML = `<svg width="22" height="12" viewBox="107 115 186 170" xmlns="http://www.w3.org/2000/svg" style="transform: scale(1.3);">
    <!-- First diamond (rotated 90 degrees) -->
    <g transform="rotate(90 169 200)">
      <path d="M231 200 L169 285 L107 200 L169 115 L231 200 ZM217 200 L169 134 L121 200 L169 266 L217 200 Z" fill="black" stroke="none" />
    </g>
    <!-- Second diamond (rotated 90 degrees, shifted so left point is at center of first diamond) -->
    <g transform="rotate(90 231 200)">
      <path d="M293 200 L231 285 L169 200 L231 115 L293 200 ZM279 200 L231 134 L183 200 L231 266 L279 200 Z" fill="black" stroke="none" />
    </g>
  </svg>`;
  translateIcon.style.cssText = `
    position: fixed;
    width: 25px;
    height: 25px;
    background: white;
    color: black;
    border: 2px solid #dadce0;
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
  
  // 点击事件 - 阻止事件冒泡
  translateIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    showTranslatePopup();
  });
  
  return translateIcon;
}

// 设置弹窗国际化文本
function setPopupI18nText() {
  if (!translatePopup) return;
  
  try {
    // 设置弹窗标题
    const headerElement = document.getElementById('translationResultHeader');
    if (headerElement) {
      headerElement.textContent = chrome.i18n.getMessage('translationResult') || '翻译结果';
    }
    
    // 设置初始翻译状态文本
    const translatedElement = document.getElementById('translated-text');
    if (translatedElement && translatedElement.textContent === '翻译中...') {
      translatedElement.textContent = chrome.i18n.getMessage('translating') || '翻译中...';
    }
  } catch (error) {
    // 静默处理国际化错误，保持原文本
  }
}

// 创建翻译弹窗
function createTranslatePopup() {
  if (translatePopup) {
    document.body.removeChild(translatePopup);
  }
  
  translatePopup = document.createElement('div');
  translatePopup.id = 'translate-popup';
  // 设置默认尺寸为窗口的1/4
  const defaultHeight = Math.floor(window.innerHeight * 0.25);
  const defaultWidth = Math.floor(window.innerWidth * 0.25);
  
  translatePopup.style.cssText = `
    position: fixed;
    min-width: 280px;
    width: ${defaultWidth}px;
    height: ${defaultHeight}px;
    min-height: 150px;
    background: white;
    border: 1px solid #dadce0;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  translatePopup.innerHTML = `
    <div id="popup-header" style="height: 32px; background: #f1f3f4; border-bottom: 1px solid #dadce0; display: flex; align-items: center; justify-content: space-between; user-select: none; cursor: move;">
      <span style="font-size: 13px; color: #5f6368; font-weight: 500;" id="translationResultHeader">翻译结果</span>
      <button id="close-popup" style="width: 24px; height: 24px; border: none; background: none; cursor: pointer; font-size: 16px; color: #5f6368; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
    <div id="translated-text" style="background: white; font-size: 14px; line-height: 1.4; word-break: break-word; min-height: 60px; flex: 1; overflow-y: auto; padding: 12px; box-sizing: border-box;">翻译中...</div>
    <div id="resize-handle-left" style="position: absolute; left: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize; background: transparent;"></div>
    <div id="resize-handle-right" style="position: absolute; right: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize; background: transparent;"></div>
    <div id="resize-handle-bottom" style="position: absolute; left: 0; right: 0; bottom: -4px; height: 8px; cursor: ns-resize; background: transparent;"></div>
  `;
  
  document.body.appendChild(translatePopup);
  
  // 应用当前的黑夜模式设置
  if (darkModeEnabled) {
    translatePopup.classList.add('dark-mode');
  }
  
  // 设置国际化文本
  setPopupI18nText();
  
  // 关闭按钮事件
  document.getElementById('close-popup').addEventListener('click', hideTranslatePopup);
  
  
  // 弹窗点击事件处理 - 简化版本，阻止所有事件冒泡
  translatePopup.addEventListener('click', function(e) {
    e.stopPropagation();
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
  if (!translatePopup || !document.body.contains(translatePopup)) {
    createTranslatePopup();
  }
  
  // 获取图标位置和弹窗尺寸
  const iconRect = translateIcon.getBoundingClientRect();
  const popupWidth = translatePopup.offsetWidth || Math.floor(window.innerWidth * 0.25);
  const popupHeight = translatePopup.offsetHeight || Math.floor(window.innerHeight * 0.25);
  
  let left = iconRect.left + iconRect.width / 2 - popupWidth / 2;
  let top = iconRect.top - popupHeight - 10; // 在图标上方显示
  
  // 边界检查
  if (left < 10) left = 10;
  if (left + popupWidth > window.innerWidth - 10) {
    left = window.innerWidth - popupWidth - 10;
  }
  
  // 如果弹窗在图标上方会超出屏幕顶部，则显示在图标下方
  if (top < 10) {
    top = iconRect.bottom + 10;
  }
  
  // 确保弹窗不会超出屏幕底部
  if (top + popupHeight > window.innerHeight - 10) {
    top = window.innerHeight - popupHeight - 10;
  }
  
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
  
  // 清空并显示加载状态
  const translatedElement = document.getElementById('translated-text');
  
  // 显示历史状态提示
  const translatingMsg = chrome.i18n.getMessage('translating') || '正在翻译...';
  const fetchHistoryMsg = chrome.i18n.getMessage('fetchHistory') || '📚 fetch history';
  
  if (enableHistory && hasHistoryContent()) {
    translatedElement.innerHTML = `<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">${fetchHistoryMsg}</div><div>${translatingMsg}</div>`;
  } else {
    translatedElement.innerHTML = `<div class="search-status">${translatingMsg}</div>`;
  }
  translatedElement.className = 'loading';
  
  let userInput = text;
  let aiResponse = '';
  let isTranslationComplete = false;
  
  // 打印当前历史记录状态
  printCurrentHistory();
  
  try {
    // 从存储中获取设置
    const settings = await getTranslationSettings();
    
    if (!settings.apiKey) {
      throw new Error('请先在扩展设置中配置DeepSeek API Key\n\n如果已经配置但仍显示此错误，请尝试重新加载扩展或刷新页面');
    }
    
    const model = settings.model === 'reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
    
    // 搜索增强处理
    const enhancedTranslation = await searchEnhancedTranslationWithStatus(text, settings, translatedElement);
    
    // 构建包含历史对话的消息数组，使用增强后的提示词
    const finalPrompt = enhancedTranslation.hasSearchResults ? enhancedTranslation.prompt : settings.prompt;
    const messages = await buildMessagesWithHistory(finalPrompt, text); // 始终传递原文
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,  // 启用流式传输
        temperature: 0.1,  // 更确定性的输出，适合翻译任务
        top_p: 0.9  // 略微限制采样范围，提高输出质量
      }),
      signal: currentAbortController.signal
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }
    
    // 处理流式响应
    const streamResult = await handleStreamResponse(response, translatedElement);
    aiResponse = streamResult.content;
    isTranslationComplete = streamResult.isComplete;
    
    // 只有在翻译完整完成时才添加到历史记录
    if (enableHistory && isTranslationComplete && aiResponse && aiResponse.trim()) {
      addToHistory(userInput, aiResponse);
    }
    
  } catch (error) {
    // 如果是请求被中断，不再保存到历史记录
    if (error.name === 'AbortError') {
      return;
    }
    
    // 处理网络错误
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // 静默处理网络错误
      translatedElement.textContent = '网络连接失败，请检查网络设置';
      translatedElement.className = '';
      return;
    }
    
    // 静默处理错误，只显示用户友好信息
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
  let isComplete = false;
  
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
        isComplete = true;
        break;
      }
      
      // 解码数据块
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'data: [DONE]') {
          isComplete = true;
          return {
            content: finalContent, // 只返回最终答案，不包含思考过程
            isComplete: true
          };
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
            // 静默处理解析错误
          }
        }
      }
    }
    
    // 流式传输正常结束，返回完整内容
    return {
      content: finalContent || '',
      isComplete: isComplete
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // 返回部分内容，但标记为不完整
      return {
        content: finalContent || '',
        isComplete: false
      };
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
  return conversationHistory.length > 0;
}

// 计算当前历史总Token数
function calculateHistoryTokens() {
  let totalTokens = 0;
  for (const item of conversationHistory) {
    totalTokens += item.tokens;
  }
  return totalTokens;
}

// 打印当前历史记录状态
function printCurrentHistory() {
  // 静默处理，不输出日志
}

// 构建包含历史对话的消息数组
async function buildMessagesWithHistory(prompt, userInput) {
  const messages = [];
  
  // 添加系统提示词
  messages.push({
    "role": "system",
    "content": prompt
  });
  
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

// 简化的历史记录维护 - 截断超出tokens的旧对话
async function addToHistory(userInput, aiResponse) {
  // 基本验证
  if (!userInput || !userInput.trim() || !aiResponse || !aiResponse.trim()) {
    return;
  }
  
  const userTokens = estimateTokens(userInput);
  const aiTokens = estimateTokens(aiResponse);
  const totalTokens = userTokens + aiTokens;
  
  // 添加到历史记录
  conversationHistory.push({
    user: userInput.trim(),
    assistant: aiResponse.trim(),
    tokens: totalTokens,
    timestamp: Date.now()
  });
  
  // 检查并截断历史记录
  await checkAndTruncateHistory();
  
  // 保存到存储
  await saveConversationHistory();
}

// 检查并截断历史记录以保持在token限制内
async function checkAndTruncateHistory() {
  const totalTokens = calculateHistoryTokens();
  
  if (totalTokens <= maxHistoryTokens) {
    return; // 在限制内，无需处理
  }
  
  // 从最旧的对话开始移除，直到token数在限制内
  while (calculateHistoryTokens() > maxHistoryTokens && conversationHistory.length > 0) {
    conversationHistory.shift(); // 移除最旧的对话
  }
}

// 加载对话历史
async function loadConversationHistory() {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['conversationHistory', 'enableHistory', 'enableSearch', 'darkMode'], (result) => {
          if (chrome.runtime.lastError) {
            // 静默处理加载失败
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
        // 立即保存清理后的数据
        saveConversationHistory();
      }
      
      enableHistory = result.enableHistory !== undefined ? result.enableHistory : false;
      enableSearch = result.enableSearch !== undefined ? result.enableSearch : false;
      maxHistoryTokens = DEFAULT_MAX_TOKENS; // 使用固定的16000 tokens
      
      // 加载并应用黑夜模式设置
      darkModeEnabled = result.darkMode || false;
      if (darkModeEnabled && translatePopup) {
        translatePopup.classList.add('dark-mode');
      }
      
      const totalTokens = calculateHistoryTokens();
      
      // 检查是否需要截断历史记录
      if (totalTokens > maxHistoryTokens) {
        await checkAndTruncateHistory();
      }
      
      // 历史记录加载完成
    } else {
      // 使用默认值
      conversationHistory = [];
      enableHistory = false;
      enableSearch = false;
      maxHistoryTokens = DEFAULT_MAX_TOKENS;
      darkModeEnabled = false; // 默认关闭黑夜模式
    }
  } catch (error) {
    // 使用默认值
    conversationHistory = [];
    enableHistory = false;
    enableSearch = false;
    maxHistoryTokens = DEFAULT_MAX_TOKENS;
    darkModeEnabled = false; // 默认关闭黑夜模式
  }
}

// 保存对话历史
async function saveConversationHistory() {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      await new Promise((resolve) => {
        chrome.storage.local.set({
          conversationHistory: conversationHistory,
          enableHistory: enableHistory
          // maxHistoryTokens 不再保存，使用固定的16000
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理保存失败
          }
          resolve();
        });
      });
    }
  } catch (error) {
    // 静默处理保存异常
  }
}

// 清空对话历史
async function clearConversationHistory() {
  conversationHistory = [];
  await saveConversationHistory();
}

// 最大历史token数现在固定为16000，不再需要动态设置

// 设置历史记录开关
async function setHistoryEnabled(enabled) {
  const previousState = enableHistory;
  enableHistory = enabled;
  
  // 只有当从启用变为禁用时才清空历史记录
  if (previousState && !enabled) {
    await clearConversationHistory();
  } else {
    await saveConversationHistory();
  }
}

// 设置黑夜模式
function setDarkMode(enabled) {
  darkModeEnabled = enabled;
  
  if (translatePopup) {
    if (enabled) {
      translatePopup.classList.add('dark-mode');
    } else {
      translatePopup.classList.remove('dark-mode');
    }
  }
}

// 网络搜索功能
// 带状态提示的搜索增强功能
async function searchEnhancedTranslationWithStatus(text, settings, statusElement) {
  if (!enableSearch || !settings.apiKey) {
    return { prompt: settings.prompt, hasSearchResults: false, sources: [] };
  }

  try {
    // 显示搜索状态
    if (statusElement) {
      const searchingMsg = chrome.i18n.getMessage('searching') || '正在搜索...';
      const fetchHistoryMsg = chrome.i18n.getMessage('fetchHistory') || '📚 fetch history';
      
      if (enableHistory && hasHistoryContent()) {
        statusElement.innerHTML = `<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">${fetchHistoryMsg}</div><div class="search-status">${searchingMsg}</div>`;
      } else {
        statusElement.innerHTML = `<div class="search-status">${searchingMsg}</div>`;
      }
    }

    const searchEngine = new AncientTextSearchEngine(settings.apiKey);
    const searchResult = await searchEngine.searchForTranslation(text, settings);

    // 显示搜索结果状态
    if (statusElement) {
      const resultCount = searchResult.searchResults ? searchResult.searchResults.length : 0;
      if (enableHistory && hasHistoryContent()) {
        statusElement.innerHTML = `<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">📚 fetch history</div><div class="search-status">搜索到了${resultCount}个结果...</div>`;
      } else {
        statusElement.innerHTML = `<div class="search-status">搜索到了${resultCount}个结果...</div>`;
      }
      
      // 短暂延迟以显示结果计数
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 显示翻译状态
      const translatingMsg = chrome.i18n.getMessage('translating') || '正在翻译...';
      const fetchHistoryMsg = chrome.i18n.getMessage('fetchHistory') || '📚 fetch history';
      
      if (enableHistory && hasHistoryContent()) {
        statusElement.innerHTML = `<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">${fetchHistoryMsg}</div><div class="search-status">${translatingMsg}</div>`;
      } else {
        statusElement.innerHTML = `<div class="search-status">${translatingMsg}</div>`;
      }
    }

    return {
      prompt: searchResult.enhancedPrompt,
      hasSearchResults: searchResult.hasSearchResults,
      sources: searchResult.searchResults.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.content,
        keyword: item.keyword
      }))
    };

  } catch (error) {
    // 静默处理搜索失败
    if (statusElement) {
      const searchFailedMsg = chrome.i18n.getMessage('searchFailed') || '搜索失败，正在翻译...';
      const fetchHistoryMsg = chrome.i18n.getMessage('fetchHistory') || '📚 fetch history';
      
      if (enableHistory && hasHistoryContent()) {
        statusElement.innerHTML = `<div style="color: #9aa0a6; font-size: 12px; margin-bottom: 8px;">${fetchHistoryMsg}</div><div class="search-status">${searchFailedMsg}</div>`;
      } else {
        statusElement.innerHTML = `<div class="search-status">${searchFailedMsg}</div>`;
      }
    }
    return { prompt: settings.prompt, hasSearchResults: false, sources: [] };
  }
}

// 简化的搜索增强功能（保留向后兼容性）
async function searchEnhancedTranslation(text, settings) {
  return await searchEnhancedTranslationWithStatus(text, settings, null);
}

// 根据输出语言获取对应的prompt
function getPromptByLanguage(outputLanguage) {
  return outputLanguage === 'english' ? PROMPT_ENGLISH : PROMPT_CHINESE;
}

// 获取翻译设置
async function getTranslationSettings() {
  return new Promise((resolve) => {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.storage.sync.get(['translateModel', 'apiKey', 'outputLanguage'], (result) => {
          if (chrome.runtime.lastError) {
            // 静默处理设置获取失败
            const outputLanguage = result.outputLanguage || 'chinese';
            resolve({
              prompt: getPromptByLanguage(outputLanguage),
              model: 'chat',
              apiKey: '',
              outputLanguage: outputLanguage
            });
          } else {
            const outputLanguage = result.outputLanguage || 'chinese';
            resolve({
              prompt: getPromptByLanguage(outputLanguage),
              model: result.translateModel || 'chat',
              apiKey: result.apiKey || '',
              outputLanguage: outputLanguage
            });
          }
        });
      } else {
        // Extension context invalid，使用默认设置
        resolve({
          prompt: getPromptByLanguage('chinese'),
          model: 'chat',
          apiKey: '',
          outputLanguage: 'chinese'
        });
      }
    } catch (error) {
      // 静默处理设置获取异常
      resolve({
        prompt: getPromptByLanguage('chinese'),
        model: 'chat',
        apiKey: '',
        outputLanguage: 'chinese'
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

// 极简拖拽缩放系统

function setupDragAndResize(popup) {
  if (dragEventListenersAdded) return;
  
  // 统一的mousedown处理
  popup.addEventListener('mousedown', function(e) {
    const target = e.target;
    let operation = null;
    
    // 确定操作类型
    if (target.id === 'popup-header' || target.closest('#popup-header')) {
      if (target.id === 'close-popup') return; // 排除关闭按钮
      operation = 'drag';
    } else if (target.id === 'resize-handle-left') {
      operation = 'resize-left';
    } else if (target.id === 'resize-handle-right') {
      operation = 'resize-right';
    } else if (target.id === 'resize-handle-bottom') {
      operation = 'resize-bottom';
    }
    
    if (!operation) return;
    
    // 开始操作
    activeOperation = operation;
    startData = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      popupLeft: parseInt(popup.style.left, 10),
      popupTop: parseInt(popup.style.top, 10),
      popupWidth: popup.offsetWidth,
      popupHeight: popup.offsetHeight
    };
    
    // 设置光标
    const cursors = { drag: 'move', 'resize-left': 'ew-resize', 'resize-right': 'ew-resize', 'resize-bottom': 'ns-resize' };
    document.body.style.cursor = cursors[operation];
    
    e.preventDefault();
  });
  
  // 统一的mousemove处理
  document.addEventListener('mousemove', function(e) {
    if (!activeOperation || !startData) return;
    
    const deltaX = e.clientX - startData.mouseX;
    const deltaY = e.clientY - startData.mouseY;
    
    switch (activeOperation) {
      case 'drag':
        popup.style.left = Math.max(10, Math.min(startData.popupLeft + deltaX, window.innerWidth - popup.offsetWidth - 10)) + 'px';
        popup.style.top = Math.max(10, Math.min(startData.popupTop + deltaY, window.innerHeight - popup.offsetHeight - 10)) + 'px';
        break;
      case 'resize-left':
        const newWidth = startData.popupWidth - deltaX;
        const newLeft = startData.popupLeft + deltaX;
        const maxAllowedWidth = window.innerWidth - 20; // 距离窗口边界20px
        if (newWidth >= 280 && newWidth <= maxAllowedWidth && newLeft >= 10) {
          popup.style.width = newWidth + 'px';
          popup.style.left = newLeft + 'px';
        }
        break;
      case 'resize-right':
        const rightWidth = startData.popupWidth + deltaX;
        const maxWidth = window.innerWidth - 20;
        if (rightWidth >= 280 && rightWidth <= maxWidth) {
          popup.style.width = rightWidth + 'px';
        }
        break;
      case 'resize-bottom':
        const newHeight = startData.popupHeight + deltaY;
        const maxAllowedHeight = window.innerHeight - 20; // 距离窗口边界20px
        if (newHeight >= 150 && newHeight <= maxAllowedHeight) {
          popup.style.height = newHeight + 'px';
        }
        break;
    }
  });
  
  // 统一的mouseup处理 - 任何地方释放都结束操作
  document.addEventListener('mouseup', function(e) {
    if (activeOperation) {
      activeOperation = null;
      startData = null;
      document.body.style.cursor = '';
    }
  });
  
  // 鼠标进出事件
  popup.addEventListener('mouseenter', () => isMouseOverPopup = true);
  popup.addEventListener('mouseleave', () => isMouseOverPopup = false);
  
  dragEventListenersAdded = true;
}

// 简化的文本选择处理 - 只在mouseup时处理文本选择
document.addEventListener('mouseup', function(e) {
  // 如果正在拖拽/缩放，跳过文本选择处理
  if (activeOperation) {
    return;
  }
  
  // 如果点击了翻译相关元素，跳过文本选择处理
  if (translatePopup && translatePopup.contains(e.target)) {
    return;
  }
  if (translateIcon && translateIcon.contains(e.target)) {
    return;
  }
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text && text.length > 0 && text.length < 1000) {
    selectedText = text;
    showTranslateIcon(e.clientX, e.clientY);
  } else {
    // 中断当前的翻译请求
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    hideTranslateIcon();
    hideTranslatePopup();
    selectedText = '';
  }
});

// 监听键盘事件，ESC键关闭弹窗
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // 如果正在进行拖拽或缩放，强制退出
    if (activeOperation) {
      activeOperation = null;
      startData = null;
      document.body.style.cursor = '';
      return;
    }
    
    // 中断当前的翻译请求
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    
    hideTranslateIcon();
    hideTranslatePopup();
  }
});

// 简化的全局点击监听
document.addEventListener('click', function(e) {
  // 简化处理，不输出调试信息
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
        clearConversationHistory().then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }
      
      if (request.action === 'setHistoryEnabled') {
        setHistoryEnabled(request.enabled).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }
      
      if (request.action === 'setDarkMode') {
        setDarkMode(request.enabled);
        sendResponse({ success: true });
        return true;
      }
      
      if (request.action === 'setSearchEnabled') {
        enableSearch = request.enabled;
        // 静默处理搜索设置更新
        sendResponse({ success: true });
        return true;
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  });
}

// 全局滚轮事件监听 - 当鼠标在翻译框内时阻止主页面滚动
document.addEventListener('wheel', function(e) {
  if (isMouseOverPopup) {
    // 检查事件是否来自翻译框内部
    if (translatePopup && translatePopup.contains(e.target)) {
      // 来自翻译框内部，检查是否需要内部滚动
      const translatedTextElement = translatePopup.querySelector('#translated-text');
      if (translatedTextElement && e.target === translatedTextElement || translatedTextElement.contains(e.target)) {
        // 如果内容有滚动条，允许内部滚动
        if (translatedTextElement.scrollHeight > translatedTextElement.clientHeight) {
          return; // 不阻止，允许内部滚动
        }
      }
    }
    
    // 其他情况都阻止页面滚动
    e.preventDefault();
    e.stopPropagation();
  }
}, { passive: false });