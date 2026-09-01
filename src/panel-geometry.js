export function computeLeftIndicatorWidth(
  panelWidth,
  centerWidth,
  occupiedLeftWidth,
  centerOffset = 0
) {
  const sideWidth = Math.max(
    0,
    Math.floor((panelWidth - centerWidth + centerOffset) / 2)
  );

  return Math.max(0, sideWidth - occupiedLeftWidth);
}
