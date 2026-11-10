const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('freevoiceDesktop', Object.freeze({
  listVoices: () => ipcRenderer.invoke('local-tts:list-voices'),
  synthesize: (request) => ipcRenderer.invoke('local-tts:synthesize', request)
}));
