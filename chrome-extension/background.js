// 简化的background script - 只处理扩展安装和右键菜单

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  
  // 设置默认配置
  chrome.storage.sync.set({
    enabled: true,
    autoTranslate: true,
    enableSearch: false,
    enableHistory: false,
    darkMode: false
  });
  
  // 创建右键菜单
  try {
    chrome.contextMenus.create({
      id: 'translateSelection',
      title: '翻译选中古文',
      contexts: ['selection']
    });
  } catch (error) {
    // 静默处理菜单创建失败
  }
});

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  }
});

// 扩展图标点击 - 打开设置页面
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html')
  });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 保留消息监听器结构，但移除所有截图相关功能
  sendResponse({status: "Message received"});
});