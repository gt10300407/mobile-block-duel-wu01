export function verticalPreviewRects(width, height, count = 3) {
  const safeCount = Math.max(1, Math.floor(count));
  const slotHeight = height / safeCount;
  return Array.from({ length: safeCount }, (_, index) => ({
    x: 0,
    y: index * slotHeight,
    w: width,
    h: slotHeight,
  }));
}

export function fitBoardWidth({ gridWidth, gridHeight, railWidth = 0, gap = 0, limit = 390 }) {
  const availableWidth = Math.max(0, gridWidth - railWidth - gap - 2);
  const availableHeight = Math.max(0, gridHeight - 2);
  return Math.max(120, Math.floor(Math.min(availableWidth, availableHeight / 2, limit)));
}
