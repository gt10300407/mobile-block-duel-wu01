export const BOT_COLS = 10;
export const BOT_ROWS = 20;

export function createBotBoard() {
  return Array.from({ length: BOT_ROWS }, () => Array(BOT_COLS).fill(0));
}

export function boardHeight(board) {
  const first = board.findIndex(row => row.some(Boolean));
  return first < 0 ? 0 : board.length - first;
}

export function dangerPercent(board) {
  return Math.min(100, Math.round((boardHeight(board) / BOT_ROWS) * 100));
}

export function addGarbageRows(board, count, holeSeed = 0) {
  const next = board.map(row => [...row]);
  let overflow = false;
  for (let i = 0; i < count; i += 1) {
    const removed = next.shift();
    if (removed?.some(Boolean)) overflow = true;
    const hole = Math.abs(holeSeed + i * 3) % BOT_COLS;
    next.push(Array.from({ length: BOT_COLS }, (_, x) => x === hole ? 0 : 8));
  }
  return { board: next, overflow };
}

export function removeBottomRows(board, count) {
  const next = board.map(row => [...row]);
  for (let i = 0; i < count; i += 1) {
    next.pop();
    next.unshift(Array(BOT_COLS).fill(0));
  }
  return next;
}

export function randomBotStep(board, random = Math.random) {
  const next = board.map(row => [...row]);
  const width = random() > 0.76 ? 4 : random() > 0.42 ? 3 : 2;
  const start = Math.floor(random() * Math.max(1, BOT_COLS - width + 1));
  const top = Math.max(2, BOT_ROWS - 1 - Math.floor(random() * 5));
  for (let x = start; x < Math.min(BOT_COLS, start + width); x += 1) {
    let y = top;
    while (y + 1 < BOT_ROWS && next[y + 1][x] === 0) y += 1;
    next[y][x] = 1 + Math.floor(random() * 7);
  }
  const full = [];
  for (let y = 0; y < BOT_ROWS; y += 1) if (next[y].every(Boolean)) full.push(y);
  for (const y of full) {
    next.splice(y, 1);
    next.unshift(Array(BOT_COLS).fill(0));
  }
  return { board: next, cleared: full.length };
}

export function botProfile(level = 'normal') {
  return {
    easy: { step: 900, attackCooldown: 7600, maxAttack: 1 },
    normal: { step: 680, attackCooldown: 5900, maxAttack: 2 },
    hard: { step: 470, attackCooldown: 4400, maxAttack: 3 },
  }[level] || { step: 680, attackCooldown: 5900, maxAttack: 2 };
}

export function shouldSendBotAttack({ pending, roundActive, elapsed, cooldown }) {
  return Boolean(roundActive && pending > 0 && elapsed >= cooldown);
}

const COLORS = ['#000','#29d8ff','#315cff','#ff9f2f','#ffe348','#48e878','#b45cff','#ff4668','#707889'];

class LocalBotDuel {
  constructor() {
    this.canvas = document.querySelector('#rival-board');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.board = createBotBoard();
    this.pending = 0;
    this.received = 0;
    this.playerScore = 0;
    this.botScore = 0;
    this.roundActive = true;
    this.difficulty = localStorage.getItem('block-duel-bot-difficulty') || 'normal';
    this.lastBotAttack = performance.now();
    this.lastBotStep = performance.now();
    this.bind();
    this.resetBot();
    requestAnimationFrame(t => this.loop(t));
  }

  bind() {
    window.addEventListener('playerattack', event => {
      if (!this.roundActive) return;
      const amount = Math.max(0, Number(event.detail?.amount || 0));
      if (!amount) return;
      this.received += amount;
      const cancel = Math.min(this.pending, amount);
      this.pending -= cancel;
      const remain = amount - cancel;
      if (remain) {
        const result = addGarbageRows(this.board, remain, this.received);
        this.board = result.board;
        if (result.overflow || dangerPercent(this.board) >= 100) this.botKnockout();
      }
      this.flash('hit');
      this.render();
    });

    window.addEventListener('playergameover', () => {
      if (!this.roundActive) return;
      this.roundActive = false;
      this.botScore += 1;
      this.updateScore();
      this.flash('win');
      this.setRoundStatus('봇이 라운드 승리');
    });

    window.addEventListener('playerroundstart', () => {
      this.roundActive = true;
      this.lastBotAttack = performance.now();
      this.lastBotStep = performance.now();
      this.resetBot();
      this.setRoundStatus('대전 중');
    });

    window.addEventListener('duelmatchreset', () => {
      this.playerScore = 0;
      this.botScore = 0;
      this.updateScore();
      this.roundActive = true;
      this.lastBotAttack = performance.now();
      this.lastBotStep = performance.now();
      this.resetBot();
      this.setRoundStatus('대전 중');
    });

    document.querySelector('#bot-difficulty')?.addEventListener('change', event => {
      this.difficulty = event.target.value;
      localStorage.setItem('block-duel-bot-difficulty', this.difficulty);
      this.lastBotAttack = performance.now();
      this.lastBotStep = performance.now();
    });

    const select = document.querySelector('#bot-difficulty');
    if (select) select.value = this.difficulty;
  }

  loop(now) {
    const p = botProfile(this.difficulty);
    if (this.roundActive) {
      if (now - this.lastBotStep >= p.step) {
        this.lastBotStep = now;
        const result = randomBotStep(this.board);
        this.board = result.board;
        if (result.cleared) this.pending += Math.min(p.maxAttack, Math.max(1, result.cleared));
        if (dangerPercent(this.board) >= 100) this.botKnockout();
        this.render();
      }

      if (shouldSendBotAttack({
        pending: this.pending,
        roundActive: this.roundActive,
        elapsed: now - this.lastBotAttack,
        cooldown: p.attackCooldown,
      })) {
        const amount = Math.min(p.maxAttack, this.pending);
        this.pending -= amount;
        this.lastBotAttack = now;
        window.dispatchEvent(new CustomEvent('botattack', { detail: { amount, reason: `봇이 줄을 제거해 ${amount}줄 공격` } }));
        this.flash('attack');
        this.render();
      }
    }
    requestAnimationFrame(t => this.loop(t));
  }

  botKnockout() {
    if (!this.roundActive) return;
    this.roundActive = false;
    this.playerScore += 1;
    this.updateScore();
    this.flash('ko');
    this.setRoundStatus('내가 라운드 승리');
    window.dispatchEvent(new CustomEvent('botko'));
  }

  resetBot() {
    this.board = createBotBoard();
    this.pending = 0;
    for (let i = 0; i < 2; i += 1) this.board = randomBotStep(this.board).board;
    this.render();
  }

  updateScore() {
    const score = document.querySelector('#duel-score');
    if (score) score.textContent = `${this.playerScore} : ${this.botScore}`;
  }

  setRoundStatus(text) {
    const status = document.querySelector('#duel-status');
    if (status) status.textContent = text;
  }

  flash(type) {
    const panel = document.querySelector('.rival-summary');
    if (!panel) return;
    panel.dataset.flash = type;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => delete panel.dataset.flash, 260);
  }

  render() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cell = Math.min(w / BOT_COLS, h / BOT_ROWS);
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
    this.board.forEach((row, y) => row.forEach((value, x) => {
      if (!value) return;
      this.ctx.fillStyle = COLORS[value] || COLORS[8];
      this.ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }));
    const danger = dangerPercent(this.board);
    document.querySelector('#rival-danger')?.style.setProperty('--danger', `${danger}%`);
    const dangerText = document.querySelector('#rival-danger-value');
    if (dangerText) dangerText.textContent = `${danger}%`;
    const pending = document.querySelector('#rival-pending');
    if (pending) pending.textContent = String(this.pending);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => new LocalBotDuel(), { once: true });
}
