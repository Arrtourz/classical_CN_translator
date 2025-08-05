// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeSettings();
  bindEvents();
});

// 初始化设置
function initializeSettings() {
  // 加载保存的设置
  chrome.storage.sync.get(['translateModel', 'translatePrompt', 'apiKey'], function(result) {
    document.getElementById('translateModel').value = result.translateModel || 'chat';
    document.getElementById('translatePrompt').value = result.translatePrompt || '把这段文本翻译为现代中文并标注典故';
    document.getElementById('apiKey').value = result.apiKey || '';
  });
  
  // 加载历史设置
  chrome.storage.local.get(['enableHistory'], function(result) {
    document.getElementById('enableHistory').checked = result.enableHistory !== undefined ? result.enableHistory : true;
  });
}

// 绑定事件
function bindEvents() {
  // 设置变更事件
  document.getElementById('translateModel').addEventListener('change', saveSettings);
  document.getElementById('translatePrompt').addEventListener('input', saveSettings);
  document.getElementById('apiKey').addEventListener('input', saveSettings);
  document.getElementById('enableHistory').addEventListener('change', saveHistorySettings);
  
  // 历史管理按钮事件
  document.getElementById('clearHistoryBtn').addEventListener('click', clearConversationHistory);
  document.getElementById('viewHistoryBtn').addEventListener('click', toggleHistoryStatus);
}

// 保存设置
function saveSettings() {
  const settings = {
    translateModel: document.getElementById('translateModel').value,
    translatePrompt: document.getElementById('translatePrompt').value,
    apiKey: document.getElementById('apiKey').value
  };
  
  chrome.storage.sync.set(settings, function() {
    console.log('设置已保存');
  });
}

// 保存历史设置
async function saveHistorySettings() {
  const enabled = document.getElementById('enableHistory').checked;
  
  try {
    await chrome.storage.local.set({ enableHistory: enabled });
    
    // 通知content script更新设置
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'setHistoryEnabled', enabled: enabled});
    }
    
    console.log(`历史记录功能: ${enabled ? '启用' : '禁用'}`);
  } catch (error) {
    console.error('保存历史设置失败:', error);
  }
}

// 清空对话历史
async function clearConversationHistory() {
  try {
    await chrome.storage.local.clear();
    
    // 通知content script清空历史
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'clearHistory'});
    }
    
    alert('对话历史已清空');
    updateHistoryStatus();
  } catch (error) {
    console.error('清空历史失败:', error);
    alert('清空历史失败');
  }
}

// 切换历史状态显示
async function toggleHistoryStatus() {
  const statusDiv = document.getElementById('historyStatus');
  
  if (statusDiv.style.display === 'none') {
    await updateHistoryStatus();
    statusDiv.style.display = 'block';
  } else {
    statusDiv.style.display = 'none';
  }
}

// 更新历史状态
async function updateHistoryStatus() {
  try {
    const result = await chrome.storage.local.get(['conversationHistory', 'conversationSummary', 'summaryTokens']);
    const rawHistory = result.conversationHistory || [];
    const summary = result.conversationSummary || '';
    const summaryTokens = result.summaryTokens || 0;
    
    // 验证历史记录完整性
    const validHistory = rawHistory.filter(item => {
      return item && 
             typeof item.user === 'string' && item.user.trim() &&
             typeof item.assistant === 'string' && item.assistant.trim() &&
             typeof item.timestamp === 'number' &&
             (item.tokens || 0) > 0;
    });
    
    // 如果发现无效数据，提示用户
    if (rawHistory.length !== validHistory.length) {
      console.warn(`发现 ${rawHistory.length - validHistory.length} 条无效历史记录`);
    }
    
    // 计算总tokens
    let totalTokens = summaryTokens;
    for (const item of validHistory) {
      totalTokens += item.tokens || 0;
    }
    
    const statusDiv = document.getElementById('historyStatus');
    statusDiv.innerHTML = `
      历史对话: ${validHistory.length} 条<br>
      摘要tokens: ${summaryTokens}<br>
      总计tokens: ${totalTokens}<br>
      最后活动: ${validHistory.length > 0 ? new Date(validHistory[validHistory.length - 1].timestamp).toLocaleString() : '无'}
      ${rawHistory.length !== validHistory.length ? `<br><span style="color: #ea4335;">检测到 ${rawHistory.length - validHistory.length} 条无效记录</span>` : ''}
    `;
  } catch (error) {
    console.error('获取历史状态失败:', error);
  }
}


