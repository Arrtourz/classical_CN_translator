
// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslateRequest(request.text, request.from, request.to)
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['enabled', 'autoTranslate', 'targetLanguage', 'sourceLanguage'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// 处理翻译请求
async function handleTranslateRequest(text, fromLang = 'auto', toLang = 'zh-CN') {
  try {
    // 检测文本语言，如果是中文则翻译为英文
    if (isChineseText(text)) {
      toLang = 'en';
      fromLang = 'zh';
    }
    
    // 使用MyMemory翻译API（免费）
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('翻译请求失败');
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error('翻译服务返回错误');
    }
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

// 检测是否为中文文本
function isChineseText(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开设置页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html')
  });
});

// 创建右键菜单 - 需要在扩展安装后创建
chrome.runtime.onInstalled.addListener(() => {
  console.log('划词翻译插件已安装');
  
  // 设置默认配置
  chrome.storage.sync.set({
    enabled: true,
    autoTranslate: true,
    targetLanguage: 'auto',
    sourceLanguage: 'auto'
  });
  
  // 创建右键菜单
  try {
    chrome.contextMenus.create({
      id: 'translateSelection',
      title: '翻译选中文本',
      contexts: ['selection']
    });
  } catch (error) {
    console.error('创建右键菜单失败:', error);
  }
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    // 向content script发送翻译消息
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  }
});