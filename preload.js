const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  ipcRenderer: {
    invoke: (...args) => ipcRenderer.invoke(...args),
    send: (...args) => ipcRenderer.send(...args),
    on: (...args) => ipcRenderer.on(...args),
    // 필요시 removeListener 등 추가 가능
  }
});
