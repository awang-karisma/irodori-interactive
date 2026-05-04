import { createEffect, createSignal } from "solid-js";
import pdfjsLib from "../pdf";
import { extractAnchors } from "../utils/extractAnchors";
import { toViewportRect } from "../utils/viewport";
import { drawHitBox } from "../utils/overlay";
import { play } from "../utils/audioPlayer";
import { getAsset, storeAsset } from "../utils/idb";
import { m } from "../i18n/messages";

export default function PdfViewer(props: {
  pdfUrl: string;
  chapter: string;
  level: string;
  zipUrl: string;
  mapping: any;
}) {
  let container!: HTMLDivElement;
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let renderId = 0; // prevent race condition

  const getPdfBlob = async (url: string): Promise<Blob> => {
    const cacheKey = `pdf-${btoa(url)}`; // Simple cache key from URL
    const cached = await getAsset(cacheKey);
    if (cached) return cached;

    // Use CORS proxy if configured
    const corsProxy = import.meta.env.VITE_CORS_PROXY;
    const fetchUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.status}`);
    const blob = await response.blob();
    await storeAsset(cacheKey, blob);
    return blob;
  };

  createEffect(() => {
    const currentRender = ++renderId;

    async function render() {
      setError(null);

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

        const pdfBlob = await getPdfBlob(props.pdfUrl);
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

            const scale = containerWidth / baseViewport.width;

            // Ensure scale is valid
            if (!isFinite(scale) || scale <= 0) {
              throw new Error(`Invalid scale: ${scale}, baseViewport.width=${baseViewport.width}`);
            }

            const viewport = page.getViewport({ scale });

            // Validate viewport dimensions
            if (!viewport.width || !viewport.height || !isFinite(viewport.width) || !isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) {
              throw new Error(`Invalid canvas size: width=${viewport.width}, height=${viewport.height}`);
            }

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
            const filteredAnchors = anchors.filter(value => {
              const [aChapter, aNumber] = value.id?.split("-") || [0, 0]
              return parseInt(aChapter) === parseInt(props.chapter) && parseInt(aNumber) > 0
            })

            filteredAnchors.forEach(anchor => {
              const rect = toViewportRect(viewport, anchor);

            drawHitBox(
              overlay,
              rect,
              () => play(props.mapping.audio[anchor.id], anchor.id, props.zipUrl)
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
          <p class="mt-2">{m.loading_pdf()}</p>
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