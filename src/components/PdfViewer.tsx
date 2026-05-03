import { createEffect } from "solid-js";
import pdfjsLib from "../pdf";
import { extractAnchors } from "../utils/extractAnchors";
import { toViewportRect } from "../utils/viewport";
import { drawHitBox } from "../utils/overlay";
import { play } from "../utils/audioPlayer";

export default function PdfViewer(props: {
  lang: string;
  chapter: string;
}) {
  let container!: HTMLDivElement;

  let renderId = 0; // prevent race condition

  createEffect(() => {
    const currentRender = ++renderId;

    async function render() {
      // clear previous content
      container.innerHTML = "";

      const pdf = await pdfjsLib
        .getDocument(
          `${import.meta.env.BASE_URL}pdf/${props.lang}/${props.chapter}.pdf`
        )
        .promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // cancel if new render started
        if (currentRender !== renderId) return;

        const page = await pdf.getPage(pageNum);

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = container.clientWidth / baseViewport.width;

        const viewport = page.getViewport({ scale });

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.marginBottom = "16px";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        await page.render({ canvasContext: ctx, viewport, canvas: canvas }).promise;

        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";

        wrapper.appendChild(overlay);

        const anchors = await extractAnchors(page);

        anchors.forEach(anchor => {
          const rect = toViewportRect(viewport, anchor);

          drawHitBox(
            overlay,
            rect,
            anchor.id,
            () => play(anchor.id)
          );
        });
      }
    }

    render();
  });

  return (
    <div
      ref={container}
      style={{ width: "100%", "max-width": "900px" }}
    />
  );
}