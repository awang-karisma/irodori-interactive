export function toViewportRect(viewport: any, anchor: any) {
  const [x, y] = viewport.convertToViewportPoint(anchor.x, anchor.y);

  return {
    x,
    y,
    width: anchor.width * viewport.scale,
    height: anchor.height * viewport.scale
  };
}