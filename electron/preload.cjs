const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('freevoiceDesktop', Object.freeze({
  listVoices: () => ipcRenderer.invoke('local-tts:list-voices'),
  synthesize: (request) => ipcRenderer.invoke('local-tts:synthesize', request),
  getPiperSettings: () => ipcRenderer.invoke('piper:get-settings'),
  choosePiperRuntime: () => ipcRenderer.invoke('piper:choose-runtime'),
  choosePiperModel: () => ipcRenderer.invoke('piper:choose-model'),
  synthesizePiper: (request) => ipcRenderer.invoke('piper:synthesize', request)
}));
