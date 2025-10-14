// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeI18n();
  initializeSettings();
  bindEvents();
});

// 初始化国际化
function initializeI18n() {
  // 设置页面标题
  document.title = chrome.i18n.getMessage('popupTitle');
  
  // 设置主标题
  const mainTitle = document.getElementById('mainTitle');
  if (mainTitle) {
    mainTitle.textContent = chrome.i18n.getMessage('extensionName');
  }
  
  // 设置各个标签文本
  const labelElements = {
    'apiKeyLabel': 'apiKeyLabel',
    'translationModelLabel': 'translationModel',
    'outputLanguageLabel': 'outputLanguage',
    'darkModeLabel': 'darkMode',
    'enableSearchLabel': 'enableSearch', 
    'enableHistoryLabel': 'enableHistory'
  };
  
  for (const [elementId, messageKey] of Object.entries(labelElements)) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = chrome.i18n.getMessage(messageKey);
    }
  }
  
  // 设置描述文本
  const descElements = {
    'darkModeDesc': 'darkModeDesc',
    'searchDesc': 'searchDesc',
    'historyDesc': 'historyDesc'
  };
  
  for (const [elementId, messageKey] of Object.entries(descElements)) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = chrome.i18n.getMessage(messageKey);
    }
  }
  
  // 设置输入框placeholder
  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput) {
    apiKeyInput.placeholder = chrome.i18n.getMessage('apiKeyPlaceholder');
  }
  
  // 设置选项文本
  const chatOption = document.getElementById('modelChatOption');
  const reasonerOption = document.getElementById('modelReasonerOption');
  if (chatOption) chatOption.textContent = chrome.i18n.getMessage('modelChat');
  if (reasonerOption) reasonerOption.textContent = chrome.i18n.getMessage('modelReasoner');
  
  // 设置输出语言选项文本
  const chineseOption = document.getElementById('outputChineseOption');
  const englishOption = document.getElementById('outputEnglishOption');
  if (chineseOption) chineseOption.textContent = chrome.i18n.getMessage('outputChinese');
  if (englishOption) englishOption.textContent = chrome.i18n.getMessage('outputEnglish');
  
  // 设置API Key帮助文本
  const apiKeyHelp = document.getElementById('apiKeyHelp');
  if (apiKeyHelp) {
    apiKeyHelp.textContent = chrome.i18n.getMessage('apiKeyHelp');
  }
  
  // 设置支持开发链接的title属性
  const supportDevLink = document.getElementById('supportDevLink');
  if (supportDevLink) {
    supportDevLink.title = chrome.i18n.getMessage('supportDev');
  }
}

// 初始化设置
function initializeSettings() {
  // 加载保存的设置
  chrome.storage.sync.get(['translateModel', 'apiKey', 'outputLanguage'], function(result) {
    document.getElementById('translateModel').value = result.translateModel || 'chat';
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('outputLanguage').value = result.outputLanguage || 'chinese';
  });
  
  // 加载历史设置、搜索设置和黑夜模式设置
  chrome.storage.local.get(['enableHistory', 'enableSearch', 'darkMode'], function(result) {
    document.getElementById('enableHistory').checked = result.enableHistory !== undefined ? result.enableHistory : false;
    document.getElementById('enableSearch').checked = result.enableSearch !== undefined ? result.enableSearch : false;
    document.getElementById('darkMode').checked = result.darkMode || false;
    
    // 应用黑夜模式到popup界面
    if (result.darkMode) {
      document.body.classList.add('dark-mode');
    }
  });
}

// 绑定事件
function bindEvents() {
  // 设置变更事件
  document.getElementById('translateModel').addEventListener('change', saveSettings);
  document.getElementById('apiKey').addEventListener('input', saveSettings);
  document.getElementById('outputLanguage').addEventListener('change', saveSettings);
  document.getElementById('darkMode').addEventListener('change', saveDarkModeSettings);
  document.getElementById('enableSearch').addEventListener('change', saveSearchSettings);
  document.getElementById('enableHistory').addEventListener('change', saveHistorySettings);
}


// 保存设置
function saveSettings() {
  const settings = {
    translateModel: document.getElementById('translateModel').value,
    apiKey: document.getElementById('apiKey').value,
    outputLanguage: document.getElementById('outputLanguage').value
  };
  
  chrome.storage.sync.set(settings, function() {
    // 静默保存设置
  });
}

// 保存历史设置
async function saveHistorySettings() {
  const enabled = document.getElementById('enableHistory').checked;
  
  try {
    // 保存设置到本地存储
    await chrome.storage.local.set({ 
      enableHistory: enabled,
      maxHistoryTokens: 16000
    });
    
    // 通知content script更新设置（如果禁用会自动清空历史）
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0] && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setHistoryEnabled', 
        enabled: enabled
      }).catch(() => {
        // 忽略发送失败，某些页面无法接收消息是正常的
      });
    }
    
    // 静默处理历史设置
  } catch (error) {
    // 静默处理设置保存失败
  }
}

// 保存搜索设置
async function saveSearchSettings() {
  const enabled = document.getElementById('enableSearch').checked;
  
  try {
    // 保存设置到本地存储
    await chrome.storage.local.set({ 
      enableSearch: enabled
    });
    
    // 通知content script更新搜索设置
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0] && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setSearchEnabled', 
        enabled: enabled
      }).catch(() => {
        // 忽略发送失败，某些页面无法接收消息是正常的
      });
    }
    
    // 静默处理搜索设置
  } catch (error) {
    // 静默处理设置保存失败
  }
}

// 保存黑夜模式设置
async function saveDarkModeSettings() {
  const darkMode = document.getElementById('darkMode').checked;
  
  try {
    // 保存设置到本地存储
    await chrome.storage.local.set({ 
      darkMode: darkMode
    });
    
    // 立即应用到popup界面
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // 通知content script更新黑夜模式
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0] && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setDarkMode', 
        enabled: darkMode
      }).catch(() => {
        // 忽略发送失败，某些页面无法接收消息是正常的
      });
    }
    
    // 静默处理黑夜模式设置
  } catch (error) {
    // 静默处理设置保存失败
  }
}

// 历史记录管理功能已删除


