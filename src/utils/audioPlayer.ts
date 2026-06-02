import JSZip from 'jszip';
import { getAsset, storeAsset } from './idb';
import { fetchWithCache } from './fetchWithCache';

let audio: HTMLAudioElement | null = null;

let listeners: ((state: AudioState) => void)[] = [];

export type AudioState = {
  id: string | null;
  title: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
  downloadProgress: number; // 0-100, -1 for indeterminate
};

let state: AudioState = {
  id: null,
  title: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  loading: false,
  error: null,
  downloadProgress: -1
};

function notify() {
  listeners.forEach(fn => fn({ ...state }));
}

export function subscribe(fn: (s: AudioState) => void) {
  listeners.push(fn);
}

const getAudioBlobUrl = async (zipUrl: string, filename: string): Promise<string> => {
  const cacheKey = `audio-${btoa(zipUrl)}-${filename}`;
  const cached = await getAsset(cacheKey);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  const zipCacheKey = `zip-${btoa(zipUrl)}`;
  let zipBlob = await getAsset(zipCacheKey);
  if (!zipBlob) {
    state.downloadProgress = 0;
    notify();

    zipBlob = await fetchWithCache(zipUrl, zipCacheKey, (p) => {
      state.downloadProgress = p.progress;
      notify();
    });

    state.downloadProgress = -1;
    notify();
  }

  const zip = await JSZip.loadAsync(zipBlob);
  // Find file that contains the anchor ID (e.g., "01-01") in its name
  const anchorId = filename.replace('.mp3', '');
  const files = zip.files;
  let file = null;
  for (const fileName in files) {
    if (fileName.includes(anchorId) && fileName.endsWith('.mp3')) {
      file = zip.file(fileName);
      break;
    }
  }
  if (!file) throw new Error(`Audio file containing ${anchorId} not found in zip`);

  const audioBlob = await file.async('blob');
  // Ensure the blob has the correct MIME type for MP3
  const mp3Blob = new Blob([audioBlob], { type: 'audio/mpeg' });
  await storeAsset(cacheKey, mp3Blob);

  return URL.createObjectURL(mp3Blob);
};

export function play(url: string, title: string, zipUrl?: string) {
  if (audio) {
    audio.pause();
  }

  state.loading = true;
  state.error = null;
  notify();

  // If zipUrl provided, extract from zip
  if (zipUrl) {
    getAudioBlobUrl(zipUrl, url).then(blobUrl => {
      audio = new Audio(blobUrl);

      state.id = title;
      state.title = title;
      state.loading = false;
      state.playing = true;

      audio.onloadedmetadata = () => {
        state.duration = audio!.duration;
        notify();
      };

      audio.ontimeupdate = () => {
        state.currentTime = audio!.currentTime;
        notify();
      };

      audio.onended = () => {
        state.playing = false;
        state.id = null;
        state.title = null;
        state.currentTime = 0;
        URL.revokeObjectURL(blobUrl);
        notify();
      };

      audio.play();
      notify();
    }).catch(err => {
      console.error('Failed to load audio:', err);
      state.loading = false;
      state.error = err instanceof Error ? err.message : 'Failed to load audio';
      notify();
    });
  } else {
    // Fallback for direct URLs
    audio = new Audio(url);

    state.id = title;
    state.title = title;
    state.loading = false;
    state.playing = true;

    audio.onloadedmetadata = () => {
      state.duration = audio!.duration;
      notify();
    };

    audio.ontimeupdate = () => {
      state.currentTime = audio!.currentTime;
      notify();
    };

    audio.onended = () => {
      state.playing = false;
      state.id = null;
      state.title = null;
      state.currentTime = 0;
      notify();
    };

    audio.play();
    notify();
  }
}

export function seek(time: number) {
  if (audio) {
    audio.currentTime = time;
  }
}

export function pause() {
  audio?.pause();
  state.playing = false;
  state.loading = false;
  notify();
}

export function resume() {
  audio?.play();
  state.playing = true;
  state.loading = false;
  notify();
}

export function stop() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  state = {
    id: null,
    title: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    loading: false,
    error: null,
    downloadProgress: -1
  };

  notify();
}