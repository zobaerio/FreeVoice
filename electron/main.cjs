const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 760,
    minHeight: 620,
    title: 'FreeVoice',
    backgroundColor: '#07111e',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.session.on('will-download', async (event, item) => {
    item.pause();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save FreeVoice audio',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
      buttonLabel: 'Save audio'
    });
    if (canceled || !filePath) {
      item.cancel();
      return;
    }
    item.setSavePath(filePath);
    item.resume();
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
