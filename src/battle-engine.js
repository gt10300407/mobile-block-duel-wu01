import {
  Bag,
  COLS,
  ROWS,
  HIDDEN_ROWS,
  COLORS as PIECE_COLORS,
  createBoard,
  makePiece,
  rotateMatrix,
  collides,
  mergePiece,
  clearLines,
  isPerfectClear,
  attackFor,
} from './game-core.js';
import { DEFAULT_MATCH_TARGET, isMatchOver, matchWinner, roundNumber, createMatchStats, recordAttack, recordCombo, matchSummary } from './match-utils.js?v=060';

export const BOT_COLS = COLS;
export const BOT_ROWS = ROWS;

const PIECE_NAMES = {
  I: '긴 막대',
  J: '왼쪽 갈고리',
  L: '오른쪽 갈고리',
  O: '네모',
  S: '초록 지그재그',
  T: 'T형',
  Z: '빨강 지그재그',
};

const BOT_COLORS = {
  ...PIECE_COLORS,
  8: '#555a66',
};

export function createBotBoard() {
  return createBoard();
}

export function visibleRows(board) {
  return board.slice(Math.max(0, board.length - BOT_ROWS));
}

export function boardHeight(board) {
  const visible = visibleRows(board);
  const first = visible.findIndex(row => row.some(Boolean));
  return first < 0 ? 0 : visible.length - first;
}

export function dangerPercent(board) {
  return Math.min(100, Math.round((boardHeight(board) / BOT_ROWS) * 100));
}

export function hasTopOut(board) {
  return board.slice(0, HIDDEN_ROWS).some(row => row.some(Boolean));
}

export function addGarbageRows(board, count, holeSeed = 0) {
  const next = board.map(row => [...row]);
  let overflow = false;
  for (let i = 0; i < count; i += 1) {
    const removed = next.shift();
    if (removed?.some(Boolean)) overflow = true;
    const hole = Math.abs(holeSeed + i * 3) % BOT_COLS;
    next.push(Array.from({ length: BOT_COLS }, (_, x) => x === hole ? null : 8));
  }
  return { board: next, overflow: overflow || hasTopOut(next) };
}

export function removeBottomRows(board, count) {
  const next = board.map(row => [...row]);
  for (let i = 0; i < count; i += 1) {
    next.pop();
    next.unshift(Array(BOT_COLS).fill(null));
  }
  return next;
}

function matrixKey(matrix) {
  return matrix.map(row => row.join('')).join('/');
}

export function uniqueRotations(type) {
  const seen = new Set();
  const rotations = [];
  let matrix = makePiece(type).matrix;
  for (let rotation = 0; rotation < 4; rotation += 1) {
    const key = matrixKey(matrix);
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push({ matrix: matrix.map(row => [...row]), rotation });
    }
    matrix = rotateMatrix(matrix);
  }
  return rotations;
}

function occupiedBounds(matrix) {
  let minX = Infinity;
  let maxX = -Infinity;
  matrix.forEach(row => row.forEach((value, x) => {
    if (!value) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }));
  return { minX, maxX };
}

export function boardMetrics(board) {
  const visible = visibleRows(board);
  const heights = [];
  let holes = 0;
  let coveredHoles = 0;

  for (let x = 0; x < BOT_COLS; x += 1) {
    let first = -1;
    let blocksAbove = 0;
    for (let y = 0; y < BOT_ROWS; y += 1) {
      if (visible[y][x]) {
        if (first < 0) first = y;
        blocksAbove += 1;
      } else if (first >= 0) {
        holes += 1;
        coveredHoles += blocksAbove;
      }
    }
    heights.push(first < 0 ? 0 : BOT_ROWS - first);
  }

  const aggregateHeight = heights.reduce((sum, value) => sum + value, 0);
  const maxHeight = Math.max(...heights);
  const bumpiness = heights.slice(1).reduce((sum, value, index) => sum + Math.abs(value - heights[index]), 0);
  let wells = 0;
  for (let x = 0; x < BOT_COLS; x += 1) {
    const left = x === 0 ? BOT_ROWS : heights[x - 1];
    const right = x === BOT_COLS - 1 ? BOT_ROWS : heights[x + 1];
    const depth = Math.max(0, Math.min(left, right) - heights[x]);
    wells += depth * (depth + 1) / 2;
  }

  return { heights, aggregateHeight, maxHeight, holes, coveredHoles, bumpiness, wells };
}

export function enumeratePlacements(board, type) {
  const placements = [];
  for (const { matrix, rotation } of uniqueRotations(type)) {
    const { minX, maxX } = occupiedBounds(matrix);
    const minPieceX = -minX;
    const maxPieceX = BOT_COLS - 1 - maxX;
    for (let x = minPieceX; x <= maxPieceX; x += 1) {
      const piece = { type, matrix: matrix.map(row => [...row]), x, y: 0, rotation };
      if (collides(board, piece)) continue;
      while (!collides(board, piece, 0, 1)) piece.y += 1;
      const nextBoard = board.map(row => [...row]);
      mergePiece(nextBoard, piece);
      const lines = clearLines(nextBoard);
      placements.push({
        type,
        piece: { ...piece, matrix: piece.matrix.map(row => [...row]) },
        board: nextBoard,
        lines,
        perfectClear: lines > 0 && isPerfectClear(nextBoard),
        topOut: hasTopOut(nextBoard),
        metrics: boardMetrics(nextBoard),
      });
    }
  }
  return placements;
}

export function botProfile(level = 'normal') {
  return {
    easy: {
      fallMs: 1050,
      attackDelay: 900,
      packetMax: 2,
      candidatePool: 8,
      randomness: 0.75,
      weights: { lines: 7.0, height: 0.42, holes: 8.2, covered: 1.0, bump: 0.28, max: 0.82, wells: 0.06 },
    },
    normal: {
      fallMs: 720,
      attackDelay: 650,
      packetMax: 4,
      candidatePool: 3,
      randomness: 0.28,
      weights: { lines: 8.8, height: 0.48, holes: 10.2, covered: 1.25, bump: 0.34, max: 1.0, wells: 0.08 },
    },
    hard: {
      fallMs: 470,
      attackDelay: 420,
      packetMax: 6,
      candidatePool: 1,
      randomness: 0.04,
      weights: { lines: 10.5, height: 0.54, holes: 12.5, covered: 1.55, bump: 0.40, max: 1.3, wells: 0.10 },
    },
  }[level] || botProfile('normal');
}

export function placementScore(placement, profile = botProfile('normal')) {
  if (placement.topOut) return -1_000_000;
  const m = placement.metrics;
  const w = profile.weights;
  return (
    placement.lines * w.lines
    + (placement.perfectClear ? 30 : 0)
    - m.aggregateHeight * w.height
    - m.holes * w.holes
    - m.coveredHoles * w.covered
    - m.bumpiness * w.bump
    - m.maxHeight * w.max
    - m.wells * w.wells
  );
}

export function chooseBotPlacement(board, type, level = 'normal', random = Math.random) {
  const profile = botProfile(level);
  const placements = enumeratePlacements(board, type)
    .map(placement => ({ ...placement, score: placementScore(placement, profile) }))
    .sort((a, b) => b.score - a.score);
  if (!placements.length) return null;
  const poolSize = Math.min(profile.candidatePool, placements.length);
  if (poolSize === 1 || random() > profile.randomness) return placements[0];
  return placements[Math.floor(random() * poolSize)];
}

export function fillBotQueue(state) {
  while (state.queue.length < 5) state.queue.push(state.bag.next());
}

export function createBotState(random = Math.random) {
  const state = {
    board: createBotBoard(),
    bag: new Bag(random),
    queue: [],
    current: null,
    combo: -1,
    b2b: 0,
    pendingPackets: [],
    placed: 0,
  };
  fillBotQueue(state);
  state.current = state.queue.shift();
  fillBotQueue(state);
  return state;
}

export function attackReasonKorean({ lines, b2b = false, combo = -1, perfectClear = false, amount = 0 }) {
  const reasons = [];
  if (perfectClear) reasons.push('보드를 완전히 비움');
  else if (lines === 4) reasons.push('4줄 동시 제거');
  else reasons.push(`${lines}줄 제거`);
  if (b2b) reasons.push('강한 제거 연속');
  if (combo > 0) reasons.push(`${combo + 1}회 연속 제거`);
  return `${reasons.join(' · ')} → ${amount}줄`;
}

export function commitBotPlacement(state, placement) {
  if (!placement) return { topOut: true, lines: 0, attack: 0, reason: '놓을 곳이 없음' };
  state.board = placement.board.map(row => [...row]);
  state.placed += 1;
  const lines = placement.lines;
  const difficult = lines === 4;
  const b2bBonus = difficult && state.b2b > 0;
  if (lines > 0) state.combo += 1;
  else state.combo = -1;
  const attack = lines > 0
    ? attackFor(lines, state.combo, { b2b: b2bBonus, perfectClear: placement.perfectClear })
    : 0;
  if (lines > 0) {
    if (difficult) state.b2b += 1;
    else state.b2b = 0;
  }
  const reason = lines > 0
    ? attackReasonKorean({ lines, b2b: b2bBonus, combo: state.combo, perfectClear: placement.perfectClear, amount: attack })
    : `${PIECE_NAMES[state.current]} 배치`;
  state.current = state.queue.shift();
  fillBotQueue(state);
  return { topOut: placement.topOut || hasTopOut(state.board), lines, attack, reason, perfectClear: placement.perfectClear };
}

export function pendingAttackTotal(packets) {
  return packets.reduce((sum, packet) => sum + Math.max(0, packet.amount || 0), 0);
}

export function cancelPendingAttacks(packets, amount) {
  let remaining = Math.max(0, amount);
  const next = [];
  for (const packet of packets) {
    if (remaining <= 0) {
      next.push({ ...packet });
      continue;
    }
    const cancelled = Math.min(packet.amount, remaining);
    remaining -= cancelled;
    const left = packet.amount - cancelled;
    if (left > 0) next.push({ ...packet, amount: left });
  }
  return { packets: next, remaining };
}

export function shouldSendBotAttack({ packets, roundActive, now }) {
  return Boolean(roundActive && packets.length > 0 && packets[0].readyAt <= now && packets[0].amount > 0);
}

function drawMiniPiece(context, piece, y, cell, alpha = 1) {
  if (!piece) return;
  const type = piece.type;
  const x = piece.x;
  context.globalAlpha = alpha;
  piece.matrix.forEach((row, py) => row.forEach((value, px) => {
    if (!value) return;
    const drawY = y + py;
    if (drawY < HIDDEN_ROWS || drawY >= HIDDEN_ROWS + BOT_ROWS) return;
    context.fillStyle = BOT_COLORS[type];
    context.fillRect((x + px) * cell + 1, (drawY - HIDDEN_ROWS) * cell + 1, cell - 2, cell - 2);
  }));
  context.globalAlpha = 1;
}

class RealBotDuel {
  constructor() {
    this.canvas = document.querySelector('#rival-board');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.random = Math.random;
    this.difficulty = localStorage.getItem('block-duel-bot-difficulty') || 'normal';
    this.playerScore = 0;
    this.botScore = 0;
    this.matchTarget = DEFAULT_MATCH_TARGET;
    this.stats = createMatchStats();
    this.feed = [];
    this.roundActive = true;
    this.state = createBotState(this.random);
    this.plan = null;
    this.planStartedAt = 0;
    this.lastAction = '실제 블록을 계산 중';
    this.actionUntil = 0;
    this.bind();
    this.updateMatchHud();
    this.startPlan(performance.now());
    this.render(performance.now());
    requestAnimationFrame(now => this.loop(now));
  }

  bind() {
    window.addEventListener('playerattack', event => {
      if (!this.roundActive) return;
      const amount = Math.max(0, Number(event.detail?.amount || 0));
      if (!amount) return;
      this.stats = recordAttack(this.stats, 'player-send', amount);
      this.stats = recordAttack(this.stats, 'bot-receive', amount);
      this.stats = recordCombo(this.stats, event.detail?.combo || 0);
      this.pushFeed(`내 공격 ${amount}줄 · ${event.detail?.reason || '줄 제거'}`);
      this.updateMatchHud();
      const cancelled = cancelPendingAttacks(this.state.pendingPackets, amount);
      this.state.pendingPackets = cancelled.packets;
      const blocked = amount - cancelled.remaining;
      if (cancelled.remaining > 0) {
        const result = addGarbageRows(this.state.board, cancelled.remaining, this.state.placed + amount);
        this.state.board = result.board;
        this.plan = null;
        this.setAction(blocked > 0
          ? `${blocked}줄 상쇄 · 방해 ${cancelled.remaining}줄 받음`
          : `방해 ${cancelled.remaining}줄 받음`, 1500);
        if (result.overflow || hasTopOut(this.state.board)) this.botKnockout();
        else this.startPlan(performance.now());
      } else {
        this.setAction(`${amount}줄 공격을 전부 막음`, 1300);
      }
      this.flash('hit');
      this.render(performance.now());
    });

    window.addEventListener('playergameover', () => {
      if (!this.roundActive) return;
      this.roundActive = false;
      this.botScore += 1;
      this.stats.roundsPlayed += 1;
      this.plan = null;
      this.updateScore();
      this.pushFeed('봇이 라운드 승리');
      this.setAction('봇이 라운드 승리', 3000);
      this.flash('win');
      this.dispatchRoundResult('bot');
    });

    window.addEventListener('playercomboupdate', event => {
      this.stats = recordCombo(this.stats, event.detail?.combo || 0);
      this.updateMatchHud();
    });

    window.addEventListener('playerroundstart', () => this.resetRound(false));
    window.addEventListener('duelmatchreset', () => this.resetRound(true));

    document.querySelector('#bot-difficulty')?.addEventListener('change', event => {
      this.difficulty = event.target.value;
      localStorage.setItem('block-duel-bot-difficulty', this.difficulty);
      this.plan = null;
      this.startPlan(performance.now());
    });

    const select = document.querySelector('#bot-difficulty');
    if (select) select.value = this.difficulty;
  }

  resetRound(fullMatch) {
    if (fullMatch) {
      this.playerScore = 0;
      this.botScore = 0;
      this.stats = createMatchStats();
      this.feed = [];
      this.updateScore();
      this.updateMatchHud();
    }
    this.roundActive = true;
    this.state = createBotState(this.random);
    this.plan = null;
    this.setAction('새 라운드 시작', 900);
    this.startPlan(performance.now());
    this.render(performance.now());
  }

  startPlan(now) {
    if (!this.roundActive || this.plan) return;
    const placement = chooseBotPlacement(this.state.board, this.state.current, this.difficulty, this.random);
    if (!placement) {
      this.botKnockout();
      return;
    }
    this.plan = placement;
    this.planStartedAt = now;
  }

  commitPlan(now) {
    if (!this.plan || !this.roundActive) return;
    const result = commitBotPlacement(this.state, this.plan);
    this.plan = null;
    if (result.topOut) {
      this.botKnockout();
      return;
    }
    if (result.attack > 0) {
      this.state.pendingPackets.push({
        amount: result.attack,
        reason: result.reason,
        readyAt: now + botProfile(this.difficulty).attackDelay,
      });
      this.setAction(result.reason, 1500);
    } else if (result.lines > 0) {
      this.setAction(`${result.lines}줄 제거 · 공격 없음`, 1100);
    } else {
      this.setAction(result.reason, 650);
    }
    this.startPlan(now);
  }

  sendReadyAttack(now) {
    if (!shouldSendBotAttack({ packets: this.state.pendingPackets, roundActive: this.roundActive, now })) return;
    const profile = botProfile(this.difficulty);
    const packet = this.state.pendingPackets[0];
    const amount = Math.min(profile.packetMax, packet.amount);
    packet.amount -= amount;
    if (packet.amount <= 0) this.state.pendingPackets.shift();
    else packet.readyAt = now + 320;
    const reason = packet.reason.replace(/→\s*\d+줄$/, `→ ${amount}줄 공격`);
    this.stats = recordAttack(this.stats, 'bot-send', amount);
    this.stats = recordAttack(this.stats, 'player-receive', amount);
    this.pushFeed(`봇 공격 ${amount}줄 · ${reason}`);
    this.updateMatchHud();
    window.dispatchEvent(new CustomEvent('botattack', { detail: { amount, reason } }));
    this.setAction(`상대 공격: ${reason}`, 1500);
    this.flash('attack');
  }

  loop(now) {
    if (this.roundActive) {
      this.startPlan(now);
      if (this.plan && now - this.planStartedAt >= botProfile(this.difficulty).fallMs) this.commitPlan(now);
      this.sendReadyAttack(now);
    }
    this.render(now);
    requestAnimationFrame(next => this.loop(next));
  }

  botKnockout() {
    if (!this.roundActive) return;
    this.roundActive = false;
    this.plan = null;
    this.playerScore += 1;
    this.stats.roundsPlayed += 1;
    this.updateScore();
    this.pushFeed('내가 라운드 승리');
    this.setAction('봇 KO · 내가 라운드 승리', 3000);
    this.flash('ko');
    window.dispatchEvent(new CustomEvent('botko'));
    this.dispatchRoundResult('player');
  }

  updateScore() {
    const score = document.querySelector('#duel-score');
    if (score) score.textContent = `${this.playerScore} : ${this.botScore}`;
    const label = document.querySelector('#round-label');
    if (label) label.textContent = `${roundNumber(this.playerScore, this.botScore)}라운드 · ${this.matchTarget}점 선승`;
  }

  pushFeed(text) {
    this.feed.unshift(text);
    this.feed = this.feed.slice(0, 3);
    const feed = document.querySelector('#battle-feed');
    if (feed) feed.textContent = this.feed[0] || '대전 시작';
  }

  updateMatchHud() {
    const sent = document.querySelector('#stat-sent');
    const received = document.querySelector('#stat-received');
    const combo = document.querySelector('#stat-combo');
    if (sent) sent.textContent = String(this.stats.playerSent);
    if (received) received.textContent = String(this.stats.playerReceived);
    if (combo) combo.textContent = String(this.stats.playerMaxCombo);
    this.updateScore();
  }

  dispatchRoundResult(winner) {
    const matchOver = isMatchOver(this.playerScore, this.botScore, this.matchTarget);
    const summary = matchSummary({ playerScore: this.playerScore, botScore: this.botScore, stats: this.stats, target: this.matchTarget });
    window.dispatchEvent(new CustomEvent('duelroundresult', { detail: {
      winner,
      matchOver,
      matchWinner: matchWinner(this.playerScore, this.botScore, this.matchTarget),
      playerScore: this.playerScore,
      botScore: this.botScore,
      target: this.matchTarget,
      summary,
    } }));
  }

  setAction(text, duration = 1000) {
    this.lastAction = text;
    this.actionUntil = performance.now() + duration;
    const action = document.querySelector('#bot-action');
    if (action) action.textContent = text;
  }

  flash(type) {
    const panel = document.querySelector('.rival-summary');
    if (!panel) return;
    panel.dataset.flash = type;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => delete panel.dataset.flash, 260);
  }

  currentPieceY(now) {
    if (!this.plan) return null;
    const profile = botProfile(this.difficulty);
    const progress = Math.min(1, Math.max(0, (now - this.planStartedAt) / profile.fallMs));
    const eased = 1 - Math.pow(1 - progress, 2);
    return Math.round(this.plan.piece.y * eased);
  }

  render(now) {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cell = Math.min(w / BOT_COLS, h / BOT_ROWS);
    const visible = visibleRows(this.state.board);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#03050a';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.strokeStyle = '#151b2a';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= BOT_COLS; x += 1) {
      this.ctx.beginPath(); this.ctx.moveTo(x * cell, 0); this.ctx.lineTo(x * cell, BOT_ROWS * cell); this.ctx.stroke();
    }
    for (let y = 0; y <= BOT_ROWS; y += 1) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y * cell); this.ctx.lineTo(BOT_COLS * cell, y * cell); this.ctx.stroke();
    }
    visible.forEach((row, y) => row.forEach((value, x) => {
      if (!value) return;
      this.ctx.fillStyle = BOT_COLORS[value] || BOT_COLORS[8];
      this.ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }));
    if (this.plan) drawMiniPiece(this.ctx, this.plan.piece, this.currentPieceY(now), cell, 0.95);

    const danger = dangerPercent(this.state.board);
    document.querySelector('#rival-danger')?.style.setProperty('--danger', `${danger}%`);
    const dangerText = document.querySelector('#rival-danger-value');
    if (dangerText) dangerText.textContent = `${danger}%`;
    const pending = document.querySelector('#rival-pending');
    if (pending) pending.textContent = String(pendingAttackTotal(this.state.pendingPackets));
    const action = document.querySelector('#bot-action');
    if (action && now >= this.actionUntil) {
      const next = this.state.queue[0] || '-';
      action.textContent = `현재 ${PIECE_NAMES[this.state.current]} · 다음 ${PIECE_NAMES[next] || '-'}`;
    }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => new RealBotDuel(), { once: true });
}
