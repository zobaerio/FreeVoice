const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { IndicF5Worker } = require('./indicf5-worker.cjs');

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(String(chunk).trim());
      process.nextTick(() => child.stdout.write(JSON.stringify({ id: request.id, ok: true, device: 'cpu' }) + '\\n'));
      callback();
    }
  });
  child.kill = () => {
    child.killed = true;
    process.nextTick(() => child.emit('close', 0));
  };
  return child;
}

test('keeps one worker process alive for repeated sequential generations', async () => {
  let spawnCount = 0;
  const worker = new IndicF5Worker({
    spawnProcess: () => { spawnCount += 1; return fakeChild(); },
    timeoutMs: 1000
  });
  const first = await worker.request('python.exe', 'worker.py', { text: 'hello' });
  const second = await worker.request('python.exe', 'worker.py', { text: 'world' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(spawnCount, 1);
  worker.stop();
});

test('rejects requests when the worker returns an error', async () => {
  const child = fakeChild();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(String(chunk).trim());
      process.nextTick(() => child.stdout.write(JSON.stringify({ id: request.id, ok: false, error: 'model missing' }) + '\\n'));
      callback();
    }
  });
  const worker = new IndicF5Worker({ spawnProcess: () => child, timeoutMs: 1000 });
  await assert.rejects(worker.request('python.exe', 'worker.py', { text: 'hello' }), /model missing/);
  worker.stop();
});
