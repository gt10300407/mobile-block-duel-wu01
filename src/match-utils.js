export const DEFAULT_MATCH_TARGET = 3;

export function isMatchOver(playerScore, botScore, target = DEFAULT_MATCH_TARGET) {
  return playerScore >= target || botScore >= target;
}

export function matchWinner(playerScore, botScore, target = DEFAULT_MATCH_TARGET) {
  if (!isMatchOver(playerScore, botScore, target)) return null;
  return playerScore > botScore ? 'player' : 'bot';
}

export function roundNumber(playerScore, botScore) {
  return Math.max(1, playerScore + botScore + 1);
}

export function createMatchStats() {
  return {
    playerSent: 0,
    playerReceived: 0,
    botSent: 0,
    botReceived: 0,
    playerMaxCombo: 0,
    roundsPlayed: 0,
  };
}

export function recordAttack(stats, side, amount) {
  const next = { ...stats };
  const safe = Math.max(0, Number(amount) || 0);
  if (side === 'player-send') next.playerSent += safe;
  if (side === 'player-receive') next.playerReceived += safe;
  if (side === 'bot-send') next.botSent += safe;
  if (side === 'bot-receive') next.botReceived += safe;
  return next;
}

export function recordCombo(stats, combo) {
  return { ...stats, playerMaxCombo: Math.max(stats.playerMaxCombo, Math.max(0, Number(combo) || 0)) };
}

export function matchSummary({ playerScore, botScore, stats, target = DEFAULT_MATCH_TARGET }) {
  const winner = matchWinner(playerScore, botScore, target);
  return {
    winner,
    title: winner === 'player' ? '매치 승리' : winner === 'bot' ? '매치 패배' : '대전 중',
    scoreText: `${playerScore} : ${botScore}`,
    sentText: `${stats.playerSent}줄`,
    receivedText: `${stats.playerReceived}줄`,
    comboText: `${stats.playerMaxCombo}회`,
  };
}
