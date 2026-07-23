import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMatchOver, matchWinner, roundNumber, createMatchStats,
  recordAttack, recordCombo, matchSummary
} from '../src/match-utils.js';

test('match ends at target score', () => {
  assert.equal(isMatchOver(3, 1, 3), true);
  assert.equal(isMatchOver(2, 2, 3), false);
  assert.equal(matchWinner(1, 3, 3), 'bot');
});

test('round number follows completed rounds', () => {
  assert.equal(roundNumber(0, 0), 1);
  assert.equal(roundNumber(2, 1), 4);
});

test('match stats accumulate attack and combo', () => {
  let stats = createMatchStats();
  stats = recordAttack(stats, 'player-send', 4);
  stats = recordAttack(stats, 'player-receive', 2);
  stats = recordCombo(stats, 5);
  assert.equal(stats.playerSent, 4);
  assert.equal(stats.playerReceived, 2);
  assert.equal(stats.playerMaxCombo, 5);
});

test('summary uses Korean result labels', () => {
  const summary = matchSummary({ playerScore: 3, botScore: 2, stats: { ...createMatchStats(), playerSent: 12 } });
  assert.equal(summary.title, '매치 승리');
  assert.equal(summary.scoreText, '3 : 2');
  assert.equal(summary.sentText, '12줄');
});
