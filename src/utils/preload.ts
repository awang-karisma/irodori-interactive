import { fetchWithCache } from './fetchWithCache';
import { getPdfUrl, getAudioZipUrl } from './assetUtils';

interface AssetEntry {
  id: string;
  type: 'pdf' | 'audio';
  level: string;
  lang?: string;
  name?: string;
  urls: string[];
}

export type PreloadProgress = {
  phase: 'pdf' | 'audio';
  progress: number;
};

export async function preloadChapter(
  assets: AssetEntry[],
  level: string,
  lang: string,
  chapter: number,
  onProgress?: (p: PreloadProgress) => void,
  signal?: AbortSignal,
  pdfSignature?: string,
  zipSignature?: string,
): Promise<void> {
  const pdfUrl = getPdfUrl(assets, level, lang, chapter);
  const zipUrl = getAudioZipUrl(assets, level, chapter);
  const hasPdf = !!pdfUrl;
  const hasAudio = !!zipUrl;

  if (pdfUrl) {
    const pdfCacheKey = `pdf-${btoa(pdfUrl)}`;
    await fetchWithCache(pdfUrl, pdfCacheKey, (p) => {
      let overall = p.progress;
      if (hasPdf && hasAudio && p.progress >= 0) {
        overall = Math.round(p.progress * 0.5);
      }
      onProgress?.({ phase: 'pdf', progress: overall });
    }, signal, pdfSignature);
  }

  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

  if (zipUrl) {
    const zipCacheKey = `zip-${btoa(zipUrl)}`;
    await fetchWithCache(zipUrl, zipCacheKey, (p) => {
      let overall = p.progress;
      if (hasPdf && hasAudio && p.progress >= 0) {
        overall = Math.round(50 + p.progress * 0.5);
      }
      onProgress?.({ phase: 'audio', progress: overall });
    }, signal, zipSignature);
  }
}

export type PreloadItem = {
  key: string;
  level: string;
  lang: string;
  chapter: number;
  pdfSignature?: string;
  zipSignature?: string;
};

export type PreloadItemState = 'loading' | 'done' | 'error';

export async function preloadChapters(
  assets: AssetEntry[],
  items: PreloadItem[],
  options: { concurrency?: number; signal?: AbortSignal } = {},
  onItemUpdate?: (key: string, state: PreloadItemState, progress?: PreloadProgress) => void,
): Promise<void> {
  const concurrency = options.concurrency ?? 3;
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      if (options.signal?.aborted) return;

      const item = queue.shift();
      if (!item) return;

      onItemUpdate?.(item.key, 'loading');

      try {
        await preloadChapter(
          assets,
          item.level,
          item.lang,
          item.chapter,
          (p) => onItemUpdate?.(item.key, 'loading', p),
          options.signal,
          item.pdfSignature,
          item.zipSignature,
        );
        onItemUpdate?.(item.key, 'done');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Do not mark as error; the controller was aborted intentionally.
          return;
        }
        onItemUpdate?.(item.key, 'error');
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}
