import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGesture, resolveAxis, stepsFromDistance } from '../src/input-utils.js';

test('tap resolves to rotate', () => {
  assert.equal(classifyGesture({dx:2,dy:3,dt:90,moved:false,softSteps:0}), 'rotate');
});

test('up swipe resolves to hold', () => {
  assert.equal(classifyGesture({dx:4,dy:-80,dt:180,moved:true,softSteps:0}), 'hold');
});

test('fast down flick resolves to hard drop', () => {
  assert.equal(classifyGesture({dx:2,dy:90,dt:80,moved:true,softSteps:0}), 'hard');
});

test('down gesture after soft steps never becomes hard drop', () => {
  assert.equal(classifyGesture({dx:1,dy:110,dt:90,moved:true,softSteps:2}), 'none');
});

test('axis lock chooses dominant direction only', () => {
  assert.equal(resolveAxis(30,4,null,10), 'x');
  assert.equal(resolveAxis(4,30,null,10), 'y');
  assert.equal(resolveAxis(12,11,null,10), null);
});

test('distance converts to deterministic whole steps', () => {
  assert.equal(stepsFromDistance(81,27), 3);
  assert.equal(stepsFromDistance(-55,27), -2);
});
