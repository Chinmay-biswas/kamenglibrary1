export type LayoutPan = { x: number; y: number };

export function clampLayoutValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function panForCursorZoom(pan: LayoutPan, currentZoom: number, nextZoom: number, cursor: { x: number; y: number }): LayoutPan {
  return {
    x: pan.x + (cursor.x - 50) * (1 / currentZoom - 1 / nextZoom),
    y: pan.y + (cursor.y - 50) * (1 / currentZoom - 1 / nextZoom)
  };
}
