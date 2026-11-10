const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { IndicF5Worker } = require('./indicf5-worker.cjs');

function fakeChild({ respond = true, closeOnKill = true } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(String(chunk).trim());
      if (respond) {
        process.nextTick(() => child.stdout.write(JSON.stringify({ id: request.id, ok: true, device: 'cpu' }) + '\n'));
      }
      callback();
    }
  });
  child.kill = () => {
    child.killed = true;
    if (closeOnKill) process.nextTick(() => child.emit('close', 0));
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

test('serial protocol safely resolves concurrent callers by request id', async () => {
  let spawnCount = 0;
  const worker = new IndicF5Worker({
    spawnProcess: () => { spawnCount += 1; return fakeChild(); },
    timeoutMs: 1000
  });
  const results = await Promise.all([
    worker.request('python.exe', 'worker.py', { text: 'first' }),
    worker.request('python.exe', 'worker.py', { text: 'second' }),
    worker.request('python.exe', 'worker.py', { text: 'third' })
  ]);
  assert.equal(results.length, 3);
  assert.ok(results.every(result => result.ok));
  assert.equal(spawnCount, 1);
  worker.stop();
});

test('rejects requests when the worker returns an error', async () => {
  const child = fakeChild();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(String(chunk).trim());
      process.nextTick(() => child.stdout.write(JSON.stringify({ id: request.id, ok: false, error: 'model missing' }) + '\n'));
      callback();
    }
  });
  const worker = new IndicF5Worker({ spawnProcess: () => child, timeoutMs: 1000 });
  await assert.rejects(worker.request('python.exe', 'worker.py', { text: 'hello' }), /model missing/);
  worker.stop();
});

test('restarts after a worker crash and ignores the stale process close event', async () => {
  const children = [];
  const worker = new IndicF5Worker({
    spawnProcess: () => {
      const child = fakeChild();
      children.push(child);
      return child;
    },
    timeoutMs: 1000
  });
  const first = worker.request('python.exe', 'worker.py', { text: 'first' });
  await first;
  const crashed = children[0];
  crashed.emit('close', 1);
  const second = await worker.request('python.exe', 'worker.py', { text: 'second' });
  assert.equal(second.ok, true);
  assert.equal(children.length, 2);
  crashed.emit('close', 1);
  const third = await worker.request('python.exe', 'worker.py', { text: 'third' });
  assert.equal(third.ok, true);
  assert.equal(children.length, 2);
  worker.stop();
});

test('a timed-out old worker cannot detach a newly started worker', async () => {
  const children = [];
  const worker = new IndicF5Worker({
    spawnProcess: () => {
      const child = fakeChild({ respond: false, closeOnKill: false });
      children.push(child);
      return child;
    },
    timeoutMs: 25
  });
  await assert.rejects(worker.request('python.exe', 'worker.py', { text: 'slow' }), /timed out/i);
  assert.equal(children[0].killed, true);
  const replacement = fakeChild();
  children.push(replacement);
  worker.spawnProcess = () => replacement;
  // Simulate the old process finally closing after the replacement exists.
  const old = children[0];
  worker.start('python.exe', 'worker.py');
  old.emit('close', 1);
  assert.equal(worker.child, replacement);
  worker.stop();
});
