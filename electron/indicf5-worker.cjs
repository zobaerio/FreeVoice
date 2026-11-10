'use strict';

const { spawn } = require('node:child_process');
const crypto = require('node:crypto');

class IndicF5Worker {
  constructor({ spawnProcess = spawn, timeoutMs = 600000 } = {}) {
    this.spawnProcess = spawnProcess;
    this.timeoutMs = timeoutMs;
    this.child = null;
    this.buffer = '';
    this.pending = new Map();
    this.stderr = '';
    this.stopped = false;
  }

  start(pythonPath, workerPath) {
    if (this.child && !this.child.killed) return;
    this.stopped = false;
    const child = this.spawnProcess(pythonPath, ['-u', workerPath], {
      windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe']
    });
    this.child = child;
    this.buffer = '';
    this.stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => this.onData(chunk));
    child.stderr.on('data', chunk => {
      this.stderr = (this.stderr + chunk).slice(-16000);
    });
    child.on('error', error => this.failAll(new Error('Could not start IndicF5 worker: ' + error.message)));
    child.on('close', code => {
      this.child = null;
      if (!this.stopped) this.failAll(new Error(('IndicF5 worker stopped (code ' + code + '): ' + this.stderr).slice(0, 1400)));
    });
  }

  onData(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > 2 * 1024 * 1024) {
      this.failAll(new Error('IndicF5 worker returned an oversized response.'));
      this.stop();
      return;
    }
    let index;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      let response;
      try { response = JSON.parse(line); } catch {
        this.failAll(new Error('IndicF5 worker returned invalid data.'));
        this.stop();
        return;
      }
      const pending = this.pending.get(response.id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      this.pending.delete(response.id);
      if (response.ok) pending.resolve(response);
      else pending.reject(new Error(response.error || 'IndicF5 generation failed.'));
    }
  }

  request(pythonPath, workerPath, payload) {
    if (this.stopped) this.stopped = false;
    this.start(pythonPath, workerPath);
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('IndicF5 timed out. The worker will restart on the next request.'));
        this.stop();
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const message = JSON.stringify({ ...payload, id }) + '\n';
      this.child.stdin.write(message, error => {
        if (!error) return;
        const item = this.pending.get(id);
        if (!item) return;
        clearTimeout(item.timer);
        this.pending.delete(id);
        item.reject(new Error('Could not send request to IndicF5 worker: ' + error.message));
      });
    });
  }

  failAll(error) {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
  }

  stop() {
    this.stopped = true;
    const child = this.child;
    this.child = null;
    if (child && !child.killed) child.kill();
    this.failAll(new Error('IndicF5 worker was stopped.'));
  }
}

module.exports = { IndicF5Worker };
