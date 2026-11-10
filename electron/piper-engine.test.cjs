const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPiperArgs, modelConfigPath, describePiperModel, isOnnxModelPath } = require('./piper-engine.cjs');

test('builds Piper CLI arguments without shell interpolation', () => {
  const args = buildPiperArgs('C:\\Voice Models\\en.onnx', 'C:\\Temp\\voice.wav', 'Hello & welcome');
  assert.deepEqual(args, ['-m', 'C:\\Voice Models\\en.onnx', '-f', 'C:\\Temp\\voice.wav', '--', 'Hello & welcome']);
});

test('uses the paired ONNX JSON config path', () => {
  assert.equal(modelConfigPath('C:\\Models\\voice.onnx'), 'C:\\Models\\voice.onnx.json');
});

test('reads language and audio metadata without assuming a language', () => {
  assert.deepEqual(describePiperModel({ language: { code: 'en_US' }, audio: { sample_rate: 22050 }, num_speakers: 2 }), {
    language: 'en_US', sampleRate: 22050, speakers: 2
  });
  assert.deepEqual(describePiperModel({}), { language: 'unknown', sampleRate: null, speakers: 1 });
});

test('accepts only ONNX model files', () => {
  assert.equal(isOnnxModelPath('voice.onnx'), true);
  assert.equal(isOnnxModelPath('voice.json'), false);
});
