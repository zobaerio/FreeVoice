const path = require('node:path');

function buildIndicF5Args(runnerPath, modelPath, referencePath, outputPath, text, refText) {
  return ['-u', runnerPath, '--model-dir', modelPath, '--reference-audio', referencePath, '--output', outputPath, '--text', text, '--reference-text', refText];
}

function isPythonExecutable(filePath) {
  return typeof filePath === 'string' && path.basename(filePath).toLowerCase() === 'python.exe';
}

function isModelDirectory(filePath) {
  return typeof filePath === 'string' && path.basename(filePath).length > 0;
}

function isIndicF5ModelSnapshot(entries) {
  if (!Array.isArray(entries)) return false;
  const names = new Set(entries.filter(name => typeof name === 'string'));
  const hasConfig = names.has('config.json');
  const hasWeights = [...names].some(name => /^(model|pytorch_model)(?:-\d+-of-\d+)?\.(?:safetensors|bin)$/.test(name));
  return hasConfig && hasWeights;
}

function isWavFile(filePath) {
  return typeof filePath === 'string' && path.extname(filePath).toLowerCase() === '.wav';
}

module.exports = { buildIndicF5Args, isPythonExecutable, isModelDirectory, isIndicF5ModelSnapshot, isWavFile };
