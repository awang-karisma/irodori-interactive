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
): Promise<void> {
  const pdfUrl = getPdfUrl(assets, level, lang, chapter);
  if (pdfUrl) {
    const pdfCacheKey = `pdf-${btoa(pdfUrl)}`;
    await fetchWithCache(pdfUrl, pdfCacheKey, (p) => {
      onProgress?.({ phase: 'pdf', progress: p.progress });
    });
  }

  const zipUrl = getAudioZipUrl(assets, level, chapter);
  if (zipUrl) {
    const zipCacheKey = `zip-${btoa(zipUrl)}`;
    await fetchWithCache(zipUrl, zipCacheKey, (p) => {
      onProgress?.({ phase: 'audio', progress: p.progress });
    });
  }
}
