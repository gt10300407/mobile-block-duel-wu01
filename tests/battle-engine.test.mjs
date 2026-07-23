import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_COLS,
  BOT_ROWS,
  createBotBoard,
  boardHeight,
  dangerPercent,
  addGarbageRows,
  removeBottomRows,
  botProfile,
  pendingAttackTotal,
  cancelPendingAttacks,
  shouldSendBotAttack,
} from '../src/battle-engine.js';

test('bot board includes hidden rows and keeps a 10-column shape', () => {
  const board = createBotBoard();
  assert.equal(board.length, BOT_ROWS + 2);
  assert.ok(board.every(row => row.length === BOT_COLS));
});

test('garbage rows preserve one hole', () => {
  const { board, overflow } = addGarbageRows(createBotBoard(), 3, 2);
  assert.equal(overflow, false);
  for (const row of board.slice(-3)) assert.equal(row.filter(v => v === null).length, 1);
});

test('danger grows with visible stack height', () => {
  const board = addGarbageRows(createBotBoard(), 10, 1).board;
  assert.equal(boardHeight(board), 10);
  assert.equal(dangerPercent(board), 50);
});

test('removing rows lowers stack', () => {
  let board = addGarbageRows(createBotBoard(), 8, 1).board;
  board = removeBottomRows(board, 3);
  assert.equal(boardHeight(board), 5);
});

test('difficulty profiles are ordered by reaction speed', () => {
  assert.ok(botProfile('easy').fallMs > botProfile('normal').fallMs);
  assert.ok(botProfile('normal').fallMs > botProfile('hard').fallMs);
  assert.ok(botProfile('easy').packetMax < botProfile('hard').packetMax);
});

test('bot attack sends only a ready packet in an active round', () => {
  const packets = [{ amount: 2, readyAt: 100, reason: '2줄 제거' }];
  assert.equal(shouldSendBotAttack({ packets, roundActive: true, now: 100 }), true);
  assert.equal(shouldSendBotAttack({ packets, roundActive: false, now: 200 }), false);
  assert.equal(shouldSendBotAttack({ packets: [], roundActive: true, now: 200 }), false);
});

test('pending attack cancellation preserves remaining amount', () => {
  const result = cancelPendingAttacks([
    { amount: 2, readyAt: 1, reason: 'a' },
    { amount: 3, readyAt: 2, reason: 'b' },
  ], 4);
  assert.equal(result.remaining, 0);
  assert.equal(pendingAttackTotal(result.packets), 1);
});
