// src/utils/audioPlayer.ts

let audio: HTMLAudioElement | null = null;

let listeners: ((state: AudioState) => void)[] = [];

export type AudioState = {
  id: string | null;
  title: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
};

let state: AudioState = {
  id: null,
  title: null,
  playing: false,
  currentTime: 0,
  duration: 0
};

function notify() {
  listeners.forEach(fn => fn({ ...state }));
}

export function subscribe(fn: (s: AudioState) => void) {
  listeners.push(fn);
}

export function play(url: string, title: string) {
  if (audio) {
    audio.pause();
  }

  audio = new Audio(url);

  state.id = url;
  state.title = title;
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

export function seek(time: number) {
  if (audio) {
    audio.currentTime = time;
  }
}

export function pause() {
  audio?.pause();
  state.playing = false;
  notify();
}

export function resume() {
  audio?.play();
  state.playing = true;
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
    duration: 0
  };

  notify();
}