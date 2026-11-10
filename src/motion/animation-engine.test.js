import test from 'node:test';
import assert from 'node:assert/strict';
import { readAnimatedValue, upsertKeyframe } from './animation-engine.js';

test('keeps the base value before the first keyframe', () => {
  const element = { x: 10, keyframes: [{ time: 2, x: 80 }] };
  assert.equal(readAnimatedValue(element, 'x', 1, 10), 10);
  assert.equal(readAnimatedValue(element, 'x', 2, 10), 80);
});

test('linearly interpolates between keyframes', () => {
  const element = { keyframes: [{ time: 0, x: 0 }, { time: 4, x: 100 }] };
  assert.equal(readAnimatedValue(element, 'x', 2, 0), 50);
});

test('supports ease-in-out interpolation', () => {
  const element = { keyframes: [{ time: 0, x: 0 }, { time: 2, x: 100, easing: 'ease-in-out' }] };
  assert.equal(readAnimatedValue(element, 'x', 1, 0), 50);
});

test('holds the final keyframe value after the last keyframe', () => {
  const element = { keyframes: [{ time: 1, x: 20 }, { time: 2, x: 90 }] };
  assert.equal(readAnimatedValue(element, 'x', 5, 0), 90);
});

test('upserts a keyframe at a rounded timestamp and keeps frames sorted', () => {
  const element = { x: 30, y: 40, scale: 1.5, opacity: 0.8, rotation: 12, keyframes: [{ time: 3, x: 1 }, { time: 1, x: 2 }] };
  const frames = upsertKeyframe(element, 2.004);
  assert.deepEqual(frames.map(frame => frame.time), [1, 2, 3]);
  assert.equal(frames[1].x, 30);
  assert.equal(frames[1].rotation, 12);
});
