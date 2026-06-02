import { getAsset, storeAsset } from './idb';

export type FetchWithCacheProgress = {
  phase: 'download';
  progress: number;
};

export async function fetchWithCache(
  url: string,
  cacheKey: string,
  onProgress?: (p: FetchWithCacheProgress) => void,
): Promise<Blob> {
  const cached = await getAsset(cacheKey);
  if (cached) return cached;

  const corsProxy = import.meta.env.VITE_CORS_PROXY;
  const fetchUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;

  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : null;

  if (total && response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.({ phase: 'download', progress: Math.round((received / total) * 100) });
    }

    const blob = new Blob(chunks as BlobPart[]);
    await storeAsset(cacheKey, blob);
    return blob;
  }

  onProgress?.({ phase: 'download', progress: -1 });
  const blob = await response.blob();
  await storeAsset(cacheKey, blob);
  return blob;
}
