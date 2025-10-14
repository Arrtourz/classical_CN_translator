const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveScreenshot: (data) => ipcRenderer.invoke('save-screenshot', data),
  cancelScreenshot: () => ipcRenderer.invoke('cancel-screenshot'),
  onInitScreenshot: (callback) => {
    ipcRenderer.on('init-screenshot', (event, imageDataUrl) => {
      callback(imageDataUrl);
    });
  },
  onOCRResult: (callback) => {
    ipcRenderer.on('ocr-result', (event, data) => {
      callback(data);
    });
  }
});