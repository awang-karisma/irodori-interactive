import { createEffect, createSignal } from "solid-js";
import pdfjsLib from "../pdf";
import { extractAnchors } from "../utils/extractAnchors";
import { toViewportRect } from "../utils/viewport";
import { drawHitBox } from "../utils/overlay";
import { play } from "../utils/audioPlayer";
import { fetchWithCache } from "../utils/fetchWithCache";
import { m } from "../i18n/messages";

export default function PdfViewer(props: {
  pdfUrl: string;
  pdfSignature?: string;
  chapter: string;
  level: string;
  zipUrl: string;
  zipSignature?: string;
  mapping: any;
}) {
  let container!: HTMLDivElement;
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [pdfDownloadProgress, setPdfDownloadProgress] = createSignal(-1); // -1 indeterminate, 0-100

  let renderId = 0; // prevent race condition

  createEffect(() => {
    const currentRender = ++renderId;

    async function render() {
      setError(null);
      setPdfDownloadProgress(-1);

      // Wait for container to be visible and have dimensions
      let containerWidth = container.clientWidth;
      if (containerWidth <= 0) {
        // Use requestAnimationFrame to wait for next paint
        await new Promise(resolve => requestAnimationFrame(resolve));
        containerWidth = container.clientWidth;
        if (containerWidth <= 0) {
          throw new Error(`Container not ready for rendering: width=${containerWidth}`);
        }
      }

      setIsLoading(true);

      try {
        // clear previous content
        container.innerHTML = "";

        const cacheKey = `pdf-${btoa(props.pdfUrl)}`;
        const pdfBlob = await fetchWithCache(props.pdfUrl, cacheKey, (p) => {
          setPdfDownloadProgress(p.progress);
        }, undefined, props.pdfSignature);
        const pdfUrl = URL.createObjectURL(pdfBlob);

        try {
          const pdf = await pdfjsLib
            .getDocument(pdfUrl)
            .promise;

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            // cancel if new render started
            if (currentRender !== renderId) return;

            const page = await pdf.getPage(pageNum);

            const baseViewport = page.getViewport({ scale: 1 });

            const baseScale = containerWidth / baseViewport.width;
            const DPR = 2;

            // Ensure scale is valid
            if (!isFinite(baseScale) || baseScale <= 0) {
              throw new Error(`Invalid scale: ${baseScale}, baseViewport.width=${baseViewport.width}`);
            }

            const cssViewport = page.getViewport({ scale: baseScale });
            const renderViewport = page.getViewport({ scale: baseScale * DPR });

            // Validate viewport dimensions
            if (!renderViewport.width || !renderViewport.height || !isFinite(renderViewport.width) || !isFinite(renderViewport.height) || renderViewport.width <= 0 || renderViewport.height <= 0) {
              throw new Error(`Invalid canvas size: width=${renderViewport.width}, height=${renderViewport.height}`);
            }

            const wrapper = document.createElement("div");
            wrapper.className = "relative mb-4";
            wrapper.style.width = `${cssViewport.width}px`;
            wrapper.style.height = `${cssViewport.height}px`;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            canvas.width = renderViewport.width;
            canvas.height = renderViewport.height;
            canvas.style.width = `${cssViewport.width}px`;
            canvas.style.height = `${cssViewport.height}px`;

            wrapper.appendChild(canvas);
            container.appendChild(wrapper);

            await page.render({ canvasContext: ctx, viewport: renderViewport, canvas: canvas }).promise;

            const overlay = document.createElement("div");
            overlay.className = "absolute left-0 top-0 w-full h-full";

            wrapper.appendChild(overlay);

            const anchors = await extractAnchors(page);
            const filteredAnchors = anchors.filter(value => {
              const [aChapter, aNumber] = value.id?.split("-") || [0, 0]
              return parseInt(aChapter) === parseInt(props.chapter) && parseInt(aNumber) > 0
            })

            filteredAnchors.forEach(anchor => {
              const rect = toViewportRect(cssViewport, anchor);

              drawHitBox(
                overlay,
                rect,
                () => play(props.mapping.audio[anchor.id], anchor.id, props.zipUrl, props.zipSignature)
              );
            });
          }
        } finally {
          URL.revokeObjectURL(pdfUrl);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    }

    render();
  });

  return (
    <div class="w-full pt-15">
      {isLoading() && (
        <div class="text-center p-5">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p class="mt-2">{pdfDownloadProgress() >= 0 ? m.downloading_pdf() : m.loading_pdf()}</p>
          {pdfDownloadProgress() >= 0 && (
            <div class="mt-2 w-64 mx-auto">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style={{ width: `${pdfDownloadProgress()}%` }}></div>
              </div>
              <p class="mt-1 text-sm">{pdfDownloadProgress()}%</p>
            </div>
          )}
        </div>
      )}
      {error() && (
        <div class="text-center p-5 text-red-500">
          <p>{m.error()}: {error()}</p>
          <button
            class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            {m.retry()}
          </button>
        </div>
      )}
      <div
        ref={container}
        class="w-full"
        style={{ display: isLoading() || error() ? 'none' : 'block' }}
      />
    </div>
  );
}