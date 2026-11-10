const path = require('node:path');

function buildPiperArgs(modelPath, outputPath, text) {
  return ['-m', modelPath, '-f', outputPath, '--', text];
}

function modelConfigPath(modelPath) {
  return modelPath + '.json';
}

function describePiperModel(config) {
  const language = config && config.language && typeof config.language.code === 'string'
    ? config.language.code
    : 'unknown';
  const sampleRate = config && config.audio && Number.isFinite(config.audio.sample_rate)
    ? config.audio.sample_rate
    : null;
  const speakers = config && Number.isFinite(config.num_speakers) ? config.num_speakers : 1;
  return { language, sampleRate, speakers };
}

function isOnnxModelPath(filePath) {
  return typeof filePath === 'string' && path.extname(filePath).toLowerCase() === '.onnx';
}

module.exports = { buildPiperArgs, modelConfigPath, describePiperModel, isOnnxModelPath };
