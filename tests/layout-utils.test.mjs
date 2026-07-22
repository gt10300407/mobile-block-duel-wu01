import test from 'node:test';
import assert from 'node:assert/strict';
import { verticalPreviewRects, fitBoardWidth } from '../src/layout-utils.js';

test('next previews are stacked vertically without overlap', () => {
  const rects = verticalPreviewRects(64, 204, 3);
  assert.equal(rects.length, 3);
  assert.deepEqual(rects.map(r => [r.x, r.w]), [[0,64],[0,64],[0,64]]);
  assert.equal(rects[0].y, 0);
  assert.equal(rects[1].y, 68);
  assert.equal(rects[2].y, 136);
  assert.equal(rects[2].y + rects[2].h, 204);
});

test('board fit subtracts the left preview rail', () => {
  assert.equal(fitBoardWidth({gridWidth:414,gridHeight:714,railWidth:58,gap:6,limit:390}), 348);
});

test('board fit keeps square cells by limiting width to half height', () => {
  assert.equal(fitBoardWidth({gridWidth:700,gridHeight:600,railWidth:84,gap:12,limit:440}), 299);
});
