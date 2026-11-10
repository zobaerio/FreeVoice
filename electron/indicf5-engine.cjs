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
  const hasWeights = [...names].some(name => /^(model|pytorch_model)(?:-\\d+-of-\\d+)?\\.(?:safetensors|bin)$/.test(name));
  return hasConfig && hasWeights;
}

function validateIndicF5Snapshot(entries, configText, weightIndexText = null) {
  if (!isIndicF5ModelSnapshot(entries)) return { ok: false, error: 'Missing config.json or model weight files.' };
  let config;
  try { config = JSON.parse(configText); } catch { return { ok: false, error: 'config.json is not valid JSON.' }; }
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { ok: false, error: 'config.json must contain a JSON object.' };
  const names = new Set(entries);
  if (weightIndexText !== null) {
    let index;
    try { index = JSON.parse(weightIndexText); } catch { return { ok: false, error: 'The model weight index is not valid JSON.' }; }
    const weightMap = index && index.weight_map;
    if (!weightMap || typeof weightMap !== 'object' || Array.isArray(weightMap)) return { ok: false, error: 'The model weight index does not contain a valid weight_map.' };
    const shards = [...new Set(Object.values(weightMap))];
    if (!shards.length || shards.some(file => typeof file !== 'string' || path.basename(file) !== file || !/^(model|pytorch_model)-\\d+-of-\\d+\\.(safetensors|bin)$/.test(file))) {
      return { ok: false, error: 'The model weight index contains an unsafe or invalid shard filename.' };
    }
    const missing = shards.filter(file => !names.has(file));
    if (missing.length) return { ok: false, error: 'Model snapshot is incomplete. Missing weight shard(s): ' + missing.join(', ') };
  }
  return { ok: true, modelType: typeof config.model_type === 'string' ? config.model_type : 'unspecified' };
}
function isWavFile(filePath) {
  return typeof filePath === 'string' && path.extname(filePath).toLowerCase() === '.wav';
}

module.exports = { buildIndicF5Args, isPythonExecutable, isModelDirectory, isIndicF5ModelSnapshot, validateIndicF5Snapshot, isWavFile };
