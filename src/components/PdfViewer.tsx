import { createEffect } from "solid-js";
import pdfjsLib from "../pdf";
import { extractAnchors } from "../utils/extractAnchors";
import { toViewportRect } from "../utils/viewport";
import { drawHitBox } from "../utils/overlay";
import { play } from "../utils/audioPlayer";

export default function PdfViewer(props: {
  pdfUrl: string;
  chapter: string;
  mapping: any;
}) {
  let container!: HTMLDivElement;

  let renderId = 0; // prevent race condition

  createEffect(() => {
    const currentRender = ++renderId;

    async function render() {
      // clear previous content
      container.innerHTML = "";

      const pdf = await pdfjsLib
        .getDocument(props.pdfUrl)
        .promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // cancel if new render started
        if (currentRender !== renderId) return;

        const page = await pdf.getPage(pageNum);

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = container.clientWidth / baseViewport.width;

        const viewport = page.getViewport({ scale });

        const wrapper = document.createElement("div");
        wrapper.className = "relative mb-4";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        await page.render({ canvasContext: ctx, viewport, canvas: canvas }).promise;

        const overlay = document.createElement("div");
        overlay.className = "absolute left-0 top-0 w-full h-full";

        wrapper.appendChild(overlay);

        const anchors = await extractAnchors(page);

        anchors.forEach(anchor => {
          const rect = toViewportRect(viewport, anchor);

          drawHitBox(
            overlay,
            rect,
            () => play(props.mapping.audio[anchor.id], anchor.id)
          );
        });
      }
    }

    render();
  });

  return (
    <div
      ref={container}
      class="w-full max-w-[900px] pt-15"
    />
  );
}