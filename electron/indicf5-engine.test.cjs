const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIndicF5Args, isPythonExecutable, isModelDirectory, isIndicF5ModelSnapshot, validateIndicF5Snapshot, isWavFile } = require('./indicf5-engine.cjs');

test('passes paths and text as separate Python arguments without shell interpolation', () => {
  assert.deepEqual(buildIndicF5Args('C:\\FreeVoice\\runner.py', 'D:\\Models\\IndicF5', 'D:\\Voice\\sample.wav', 'C:\\Temp\\out.wav', 'বাংলা & English', 'আমি ভালো আছি।'), [
    '-u', 'C:\\FreeVoice\\runner.py', '--model-dir', 'D:\\Models\\IndicF5', '--reference-audio', 'D:\\Voice\\sample.wav', '--output', 'C:\\Temp\\out.wav', '--text', 'বাংলা & English', '--reference-text', 'আমি ভালো আছি।'
  ]);
});

test('accepts python.exe only', () => {
  assert.equal(isPythonExecutable('C:\\Python310\\python.exe'), true);
  assert.equal(isPythonExecutable('C:\\Python310\\pythonw.exe'), false);
});

test('validates model directory and WAV extension', () => {
  assert.equal(isModelDirectory('D:\\Models\\IndicF5'), true);
  assert.equal(isModelDirectory(''), false);
  assert.equal(isWavFile('voice.wav'), true);
  assert.equal(isWavFile('voice.mp3'), false);
});

test('requires IndicF5 config and actual model weights in the selected snapshot', () => {
  assert.equal(isIndicF5ModelSnapshot(['config.json', 'model.safetensors', 'tokenizer.json']), true);
  assert.equal(isIndicF5ModelSnapshot(['config.json', 'model-00001-of-00002.safetensors']), true);
  assert.equal(isIndicF5ModelSnapshot(['config.json', 'pytorch_model.bin']), true);
  assert.equal(isIndicF5ModelSnapshot(['config.json', 'tokenizer.json']), false);
  assert.equal(isIndicF5ModelSnapshot(['model.safetensors']), false);
  assert.equal(isIndicF5ModelSnapshot(null), false);
});


test('validates model config JSON and reports the model type', () => {
  const result = validateIndicF5Snapshot(['config.json', 'model.safetensors'], '{"model_type":"f5"}');
  assert.deepEqual(result, { ok: true, modelType: 'f5' });
  assert.equal(validateIndicF5Snapshot(['config.json', 'model.safetensors'], '{bad').ok, false);
  assert.equal(validateIndicF5Snapshot(['config.json', 'model.safetensors'], '[]').ok, false);
});

test('rejects incomplete or unsafe indexed model weight shards', () => {
  const entries = ['config.json', 'model-00001-of-00002.safetensors'];
  const config = '{"model_type":"f5"}';
  const missing = validateIndicF5Snapshot(entries, config, JSON.stringify({ weight_map: { a: 'model-00001-of-00002.safetensors', b: 'model-00002-of-00002.safetensors' } }));
  assert.equal(missing.ok, false);
  assert.match(missing.error, /Missing weight shard/);
  const unsafe = validateIndicF5Snapshot(entries, config, JSON.stringify({ weight_map: { a: '../outside.safetensors' } }));
  assert.equal(unsafe.ok, false);
  assert.match(unsafe.error, /unsafe or invalid/);
  const valid = validateIndicF5Snapshot([...entries, 'model-00002-of-00002.safetensors'], config, JSON.stringify({ weight_map: { a: 'model-00001-of-00002.safetensors', b: 'model-00002-of-00002.safetensors' } }));
  assert.equal(valid.ok, true);
});
