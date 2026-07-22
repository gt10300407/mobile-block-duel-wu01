
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_COLS, BOT_ROWS, createBotBoard, boardHeight,
  dangerPercent, addGarbageRows, removeBottomRows, randomBotStep
} from '../src/battle-engine.js';

test('bot board has fixed 10x20 shape', () => {
  const board = createBotBoard();
  assert.equal(board.length, BOT_ROWS);
  assert.ok(board.every(row => row.length === BOT_COLS));
});

test('garbage rows preserve one hole', () => {
  const { board, overflow } = addGarbageRows(createBotBoard(), 3, 2);
  assert.equal(overflow, false);
  for (const row of board.slice(-3)) {
    assert.equal(row.filter(v => v === 0).length, 1);
  }
});

test('danger grows with stack height', () => {
  let board = createBotBoard();
  board = addGarbageRows(board, 10, 1).board;
  assert.equal(boardHeight(board), 10);
  assert.equal(dangerPercent(board), 50);
});

test('removing rows lowers stack', () => {
  let board = addGarbageRows(createBotBoard(), 8, 1).board;
  board = removeBottomRows(board, 3);
  assert.equal(boardHeight(board), 5);
});

test('random bot step returns valid board', () => {
  const result = randomBotStep(createBotBoard(), () => 0.5);
  assert.equal(result.board.length, BOT_ROWS);
  assert.ok(result.board.flat().some(Boolean));
});
