interface AssetEntry {
  id: string;
  type: 'pdf' | 'audio';
  level: string;
  lang?: string;
  name?: string;
  urls: string[];
  signatures?: string[];
}

export function getPdfUrl(assets: AssetEntry[], level: string, lang: string, chapter: number): string | null {
  const pdfAsset = assets.find(a => a.type === 'pdf' && a.level === level && a.lang === lang);
  if (!pdfAsset || chapter < 1 || chapter > pdfAsset.urls.length) return null;
  return pdfAsset.urls[chapter - 1]; // 0-indexed array, 1-indexed chapters
}

export function getAudioZipUrl(assets: AssetEntry[], level: string, chapter: number): string | null {
  const audioAsset = assets.find(a => a.type === 'audio' && a.level === level);
  if (!audioAsset || chapter < 1 || chapter > audioAsset.urls.length) return null;
  return audioAsset.urls[chapter - 1]; // 0-indexed array, 1-indexed chapters
}

export function getPdfSignature(assets: AssetEntry[], level: string, lang: string, chapter: number): string | null {
  const pdfAsset = assets.find(a => a.type === 'pdf' && a.level === level && a.lang === lang);
  if (!pdfAsset || chapter < 1 || chapter > (pdfAsset.signatures?.length ?? 0)) return null;
  return pdfAsset.signatures![chapter - 1];
}

export function getAudioSignature(assets: AssetEntry[], level: string, chapter: number): string | null {
  const audioAsset = assets.find(a => a.type === 'audio' && a.level === level);
  if (!audioAsset || chapter < 1 || chapter > (audioAsset.signatures?.length ?? 0)) return null;
  return audioAsset.signatures![chapter - 1];
}

export function getAudioMapping(chapter: number): Record<string, string> {
  // Generate mapping for audio files like "01-01.mp3", "01-02.mp3", etc.
  // Assuming each chapter has multiple audio files based on anchor IDs
  const mapping: Record<string, string> = {};
  // For now, create a basic mapping. This might need adjustment based on actual zip contents.
  for (let i = 1; i <= 50; i++) { // Assuming max 50 audio files per chapter
    const audioId = `${chapter.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    mapping[audioId] = audioId + '.mp3';
  }
  return mapping;
}