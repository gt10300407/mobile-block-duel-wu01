export const SWIPE_PRESETS = {
  low: { stepPx: 34, axisLockPx: 12, flickDistance: 54, flickSpeed: 0.78, holdDistance: 58 },
  normal: { stepPx: 27, axisLockPx: 10, flickDistance: 46, flickSpeed: 0.64, holdDistance: 52 },
  high: { stepPx: 22, axisLockPx: 8, flickDistance: 40, flickSpeed: 0.54, holdDistance: 46 }
};

export function getSwipePreset(name = 'normal') {
  return SWIPE_PRESETS[name] || SWIPE_PRESETS.normal;
}

export function resolveAxis(dx, dy, currentAxis = null, lockPx = 10) {
  if (currentAxis) return currentAxis;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < lockPx) return null;
  if (ax > ay * 1.18) return 'x';
  if (ay > ax * 1.18) return 'y';
  return null;
}

export function classifyGesture({ dx, dy, dt, moved, softSteps = 0, peakDownSpeed = 0 }, presetName = 'normal') {
  const p = getSwipePreset(presetName);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const averageSpeed = ay / Math.max(1, dt);
  const downSpeed = Math.max(averageSpeed, peakDownSpeed || 0);

  if (!moved && ax < p.axisLockPx && ay < p.axisLockPx) return 'rotate';
  if (dy < -p.holdDistance && ay > ax * 1.15) return 'hold';

  // 빠른 아래 플릭은 이동 중 소프트드롭 칸이 발생했더라도 하드드롭으로 판정한다.
  if (dy > p.flickDistance && ay > ax * 1.15 && downSpeed >= p.flickSpeed) return 'hard';

  if (softSteps > 0) return 'soft';
  return 'none';
}

export function stepsFromDistance(distance, stepPx) {
  if (!Number.isFinite(distance) || !Number.isFinite(stepPx) || stepPx <= 0) return 0;
  return Math.trunc(distance / stepPx);
}
