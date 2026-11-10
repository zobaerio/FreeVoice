const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function runPowerShell(script, extraEnv = {}) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return execFileAsync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...extraEnv }
  });
}

ipcMain.handle('local-tts:list-voices', async () => {
  if (process.platform !== 'win32') return [];
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object {
      [pscustomobject]@{
        name = $_.VoiceInfo.Name
        culture = $_.VoiceInfo.Culture.Name
        gender = $_.VoiceInfo.Gender.ToString()
      }
    })
    $synth.Dispose()
    ConvertTo-Json -InputObject $voices -Compress
  `;
  const { stdout } = await runPowerShell(script);
  const parsed = JSON.parse(stdout.trim() || '[]');
  return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
});

ipcMain.handle('local-tts:synthesize', async (_event, request = {}) => {
  if (process.platform !== 'win32') throw new Error('The Windows offline voice engine is only available in the Windows desktop app.');
  const text = typeof request.text === 'string' ? request.text.trim() : '';
  if (!text) throw new Error('Enter a script before generating audio.');
  if (text.length > 5000) throw new Error('Maximum 5,000 characters per generation.');
  const voiceName = typeof request.voiceName === 'string' ? request.voiceName.slice(0, 256) : '';
  const rate = Math.max(-10, Math.min(10, Number.isFinite(Number(request.rate)) ? Math.round(Number(request.rate)) : 0));
  const outputDir = path.join(app.getPath('temp'), 'FreeVoice', 'generated');
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = 'FreeVoice-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8) + '.wav';
  const outputPath = path.join(outputDir, fileName);
  const payload = JSON.stringify({ text, voiceName, rate, outputPath });
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Speech
    $payload = [Environment]::GetEnvironmentVariable('FREEVOICE_TTS_PAYLOAD') | ConvertFrom-Json
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    if ($payload.voiceName) { $synth.SelectVoice([string]$payload.voiceName) }
    $synth.Rate = [int]$payload.rate
    $synth.Volume = 100
    $synth.SetOutputToWaveFile([string]$payload.outputPath)
    $synth.Speak([string]$payload.text)
    $synth.Dispose()
    Write-Output 'FREEVOICE_TTS_OK'
  `;
  try {
    await runPowerShell(script, { FREEVOICE_TTS_PAYLOAD: payload });
    const stat = await fs.stat(outputPath);
    if (!stat.isFile() || stat.size < 44) throw new Error('Windows speech engine returned an empty audio file.');
    const data = new Uint8Array(await fs.readFile(outputPath));
    return { fileName, mimeType: 'audio/wav', data };
  } catch (error) {
    const message = String(error.stderr || error.message || error);
    if (/System\.Speech|assembly/i.test(message)) {
      throw new Error('Windows Speech runtime is unavailable. Install a Windows speech voice in Settings → Time & language → Speech, then restart FreeVoice.');
    }
    throw new Error(message.slice(0, 500));
  } finally {
    await fs.unlink(outputPath).catch(() => {});
  }
});

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
      preload: path.join(__dirname, 'preload.cjs'),
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
