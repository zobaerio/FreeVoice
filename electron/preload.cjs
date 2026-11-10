const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('freevoiceDesktop', Object.freeze({
  listVoices: () => ipcRenderer.invoke('local-tts:list-voices'),
  synthesize: (request) => ipcRenderer.invoke('local-tts:synthesize', request),
  getPiperSettings: () => ipcRenderer.invoke('piper:get-settings'),
  choosePiperRuntime: () => ipcRenderer.invoke('piper:choose-runtime'),
  choosePiperModel: () => ipcRenderer.invoke('piper:choose-model'),
  synthesizePiper: (request) => ipcRenderer.invoke('piper:synthesize', request),
  getIndicF5Settings: () => ipcRenderer.invoke('indicf5:get-settings'),
  diagnoseIndicF5: () => ipcRenderer.invoke('indicf5:diagnostics'),
  chooseIndicF5Python: () => ipcRenderer.invoke('indicf5:choose-python'),
  chooseIndicF5Model: () => ipcRenderer.invoke('indicf5:choose-model'),
  chooseIndicF5Reference: () => ipcRenderer.invoke('indicf5:choose-reference'),
  synthesizeIndicF5: (request) => ipcRenderer.invoke('indicf5:synthesize', request)
}));
