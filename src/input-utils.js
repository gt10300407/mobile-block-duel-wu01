export const SWIPE_PRESETS = {
  low: { stepPx: 34, axisLockPx: 12, flickDistance: 58, flickSpeed: 0.9, holdDistance: 58 },
  normal: { stepPx: 27, axisLockPx: 10, flickDistance: 50, flickSpeed: 0.78, holdDistance: 52 },
  high: { stepPx: 22, axisLockPx: 8, flickDistance: 44, flickSpeed: 0.68, holdDistance: 46 }
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

export function classifyGesture({ dx, dy, dt, moved, softSteps = 0 }, presetName = 'normal') {
  const p = getSwipePreset(presetName);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const speed = ay / Math.max(1, dt);

  if (!moved && ax < p.axisLockPx && ay < p.axisLockPx) return 'rotate';
  if (dy < -p.holdDistance && ay > ax * 1.15) return 'hold';
  if (softSteps === 0 && dy > p.flickDistance && ay > ax * 1.2 && speed >= p.flickSpeed) return 'hard';
  return 'none';
}

export function stepsFromDistance(distance, stepPx) {
  if (!Number.isFinite(distance) || !Number.isFinite(stepPx) || stepPx <= 0) return 0;
  return Math.trunc(distance / stepPx);
}
