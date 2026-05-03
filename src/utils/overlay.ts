export function drawHitBox(
  overlay: HTMLElement,
  rect: any,
  onClick: () => void
) {
  const paddingY = 6;
  const paddingX = 20;

  const box = document.createElement("div");

  box.onclick = onClick;

  box.style.position = "absolute";
  box.style.left = rect.x - paddingX - 8 + "px";
  box.style.top = rect.y - rect.height - paddingY + "px";
  box.style.width = rect.width + paddingX * 2 + "px";
  box.style.height = rect.height + paddingY * 2 + "px";

  box.style.cursor = "pointer";
  box.style.pointerEvents = "auto";

  // transparent
  box.style.background = "rgba(0,0,255,0.15)";

  // hover
  box.onmouseenter = () => {
    box.style.background = "rgba(0,0,255,0.25)";
  };

  box.onmouseleave = () => {
    box.style.background = "rgba(0,0,255,0.15)";
  };

  overlay.appendChild(box);
}