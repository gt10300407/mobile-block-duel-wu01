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

test('fast down flick remains hard drop after a few soft steps', () => {
  assert.equal(classifyGesture({dx:1,dy:110,dt:90,moved:true,softSteps:2}), 'hard');
});

test('peak segment speed can resolve hard drop on a longer gesture', () => {
  assert.equal(classifyGesture({dx:3,dy:80,dt:260,moved:true,softSteps:2,peakDownSpeed:0.9}), 'hard');
});

test('slow down drag remains soft drop', () => {
  assert.equal(classifyGesture({dx:2,dy:100,dt:420,moved:true,softSteps:3,peakDownSpeed:0.25}), 'soft');
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
