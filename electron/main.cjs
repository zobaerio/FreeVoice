const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const { buildPiperArgs, modelConfigPath, describePiperModel, isOnnxModelPath } = require('./piper-engine.cjs');
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
  const language = typeof request.language === 'string' && /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/i.test(request.language) ? request.language : '';
  const outputDir = path.join(app.getPath('temp'), 'FreeVoice', 'generated');
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = 'FreeVoice-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8) + '.wav';
  const outputPath = path.join(outputDir, fileName);
  const payload = JSON.stringify({ text, voiceName, rate, language, outputPath });
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Speech
    $payload = [Environment]::GetEnvironmentVariable('FREEVOICE_TTS_PAYLOAD') | ConvertFrom-Json
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    if ($payload.voiceName) { $synth.SelectVoice([string]$payload.voiceName) }
    elseif ($payload.language) {
      $candidate = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and ($_.VoiceInfo.Culture.Name -like ($payload.language + '*') -or $_.VoiceInfo.Culture.TwoLetterISOLanguageName -eq $payload.language) } | Select-Object -First 1
      if (!$candidate) { throw ('No installed Windows speech voice was found for language ' + $payload.language + '. Install that language voice in Windows Settings or select a different language.') }
      $synth.SelectVoice($candidate.VoiceInfo.Name)
    }
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


const piperSettingsFile = () => path.join(app.getPath('userData'), 'piper-settings.json');

async function readPiperSettings() {
  try {
    const saved = JSON.parse(await fs.readFile(piperSettingsFile(), 'utf8'));
    const runtimeExists = saved.runtimePath && await fs.access(saved.runtimePath).then(() => true, () => false);
    const modelExists = saved.modelPath && await fs.access(saved.modelPath).then(() => true, () => false);
    const configPath = saved.modelPath ? modelConfigPath(saved.modelPath) : '';
    const configExists = configPath && await fs.access(configPath).then(() => true, () => false);
    return {
      ready: Boolean(runtimeExists && modelExists && configExists),
      runtimeName: saved.runtimePath ? path.basename(saved.runtimePath) : '',
      modelName: saved.modelPath ? path.basename(saved.modelPath) : '',
      language: saved.language || 'unknown',
      sampleRate: saved.sampleRate || null,
      speakers: saved.speakers || 1
    };
  } catch {
    return { ready: false, runtimeName: '', modelName: '', language: 'unknown', sampleRate: null, speakers: 1 };
  }
}

async function savePiperSettings(patch) {
  let current = {};
  try { current = JSON.parse(await fs.readFile(piperSettingsFile(), 'utf8')); } catch {}
  const next = { ...current, ...patch };
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  const tempPath = piperSettingsFile() + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), 'utf8');
  await fs.rename(tempPath, piperSettingsFile());
  return readPiperSettings();
}

ipcMain.handle('piper:get-settings', async () => readPiperSettings());

ipcMain.handle('piper:choose-runtime', async () => {
  if (process.platform !== 'win32') throw new Error('Piper desktop setup is currently Windows-only.');
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    title: 'Select the local Piper executable',
    properties: ['openFile'],
    filters: [{ name: 'Windows executable', extensions: ['exe'] }]
  });
  if (result.canceled || !result.filePaths[0]) return readPiperSettings();
  const runtimePath = result.filePaths[0];
  await fs.access(runtimePath);
  const settings = await savePiperSettings({ runtimePath });
  return settings;
});

ipcMain.handle('piper:choose-model', async () => {
  if (process.platform !== 'win32') throw new Error('Piper desktop setup is currently Windows-only.');
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    title: 'Select a Piper ONNX voice model',
    properties: ['openFile'],
    filters: [{ name: 'Piper ONNX model', extensions: ['onnx'] }]
  });
  if (result.canceled || !result.filePaths[0]) return readPiperSettings();
  const modelPath = result.filePaths[0];
  if (!isOnnxModelPath(modelPath)) throw new Error('Choose a .onnx Piper voice model.');
  const configPath = modelConfigPath(modelPath);
  const configText = await fs.readFile(configPath, 'utf8').catch(() => {
    throw new Error('The matching model config is missing. Keep the model and its .onnx.json file in the same folder.');
  });
  let config;
  try { config = JSON.parse(configText); } catch {
    throw new Error('The Piper .onnx.json model config is not valid JSON.');
  }
  const metadata = describePiperModel(config);
  return savePiperSettings({ modelPath, ...metadata });
});

ipcMain.handle('piper:synthesize', async (_event, request = {}) => {
  if (process.platform !== 'win32') throw new Error('Piper local neural TTS is currently available in the Windows desktop app only.');
  const text = typeof request.text === 'string' ? request.text.trim() : '';
  if (!text) throw new Error('Enter a script before generating audio.');
  if (text.length > 5000) throw new Error('Maximum 5,000 characters per generation.');
  const saved = JSON.parse(await fs.readFile(piperSettingsFile(), 'utf8').catch(() => '{}'));
  if (!saved.runtimePath || !saved.modelPath) throw new Error('Select the Piper executable and a local .onnx voice model first.');
  await fs.access(saved.runtimePath).catch(() => { throw new Error('The selected Piper executable could not be found. Select it again.'); });
  await fs.access(saved.modelPath).catch(() => { throw new Error('The selected Piper model could not be found. Select it again.'); });
  await fs.access(modelConfigPath(saved.modelPath)).catch(() => { throw new Error('The selected Piper model config is missing. Re-select a valid model.'); });

  const outputDir = path.join(app.getPath('temp'), 'FreeVoice', 'generated');
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = 'FreeVoice-Neural-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8) + '.wav';
  const outputPath = path.join(outputDir, fileName);
  const args = buildPiperArgs(saved.modelPath, outputPath, text);

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(saved.runtimePath, args, { windowsHide: true, shell: false, stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        child.kill();
        settled = true;
        reject(new Error('Piper took too long. Try a shorter script or a smaller voice model.'));
      }, 300000);
      child.stderr.on('data', chunk => { if (stderr.length < 12000) stderr += chunk.toString(); });
      child.on('error', error => {
        if (settled) return;
        clearTimeout(timer);
        settled = true;
        reject(new Error('Could not start Piper. Check that the selected executable is a working Piper Windows build. ' + error.message));
      });
      child.on('close', code => {
        if (settled) return;
        clearTimeout(timer);
        settled = true;
        if (code === 0) resolve();
        else reject(new Error(('Piper exited with code ' + code + ': ' + stderr).slice(0, 700)));
      });
    });
    const stat = await fs.stat(outputPath);
    if (!stat.isFile() || stat.size < 44) throw new Error('Piper did not create a valid WAV file.');
    const data = new Uint8Array(await fs.readFile(outputPath));
    return { fileName, mimeType: 'audio/wav', data };
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
