import { createSignal, onMount, onCleanup } from "solid-js";
import { subscribe, seek, stop, pause, resume } from "../utils/audioPlayer";
import IconMdiPlay from 'virtual:icons/mdi/play';
import IconMdiPause from 'virtual:icons/mdi/pause';
import IconMdiStop from 'virtual:icons/mdi/stop';

export default function AudioPlayer() {
  const [state, setState] = createSignal({
    id: null as string | null,
    currentTime: 0,
    duration: 0,
    playing: false
  });

  let seekbar!: HTMLDivElement;
  let dragging = false;

  // subscribe to global audio state
  onMount(() => {
    subscribe((s) => {
      setState(s);
    });

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  });

  onCleanup(() => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);

    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  });

  // progress %
  const progress = () =>
    state().duration
      ? (state().currentTime / state().duration) * 100
      : 0;

  // seek logic
  const handleSeek = (clientX: number, rect: DOMRect) => {
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    const time = percent * state().duration;
    seek(time);
  };

  // mouse events
  const onMouseDown = (e: MouseEvent) => {
    dragging = true;
    handleSeek(e.clientX, seekbar.getBoundingClientRect());
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    handleSeek(e.clientX, seekbar.getBoundingClientRect());
  };

  const onMouseUp = () => {
    dragging = false;
  };

  // touch events
  const onTouchStart = (e: TouchEvent) => {
    dragging = true;
    handleSeek(e.touches[0].clientX, seekbar.getBoundingClientRect());
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!dragging) return;
    handleSeek(e.touches[0].clientX, seekbar.getBoundingClientRect());
  };

  const onTouchEnd = () => {
    dragging = false;
  };

  // controls
  const togglePlayPause = () => {
    if (!state().id) return;

    if (state().playing) {
      pause();
    } else {
      resume();
    }
  };

  const handleStop = () => {
    stop(); // reset audio
  };

  return (
    <div class="flex items-center px-5 box-border gap-2.5">
      {/* Title */}
      <div class="font-bold min-w-25">
        {state().id ?? "No audio"}
      </div>

      {/* Controls */}
      <div class="w-15 flex gap-1">
        <button onClick={togglePlayPause} class="p-1">
          {state().playing ? <IconMdiPause class="w-6 h-6" /> : <IconMdiPlay class="w-6 h-6" />}
        </button>
        <button onClick={handleStop} class="p-1">
          <IconMdiStop class="w-6 h-6" />
        </button>
      </div>

      {/* Current Time */}
      <span class="min-w-10 text-center">
        {formatTime(state().currentTime)}
      </span>

      {/* Seek bar */}
      <div
        ref={seekbar}
        class="flex-1 h-1 bg-gray-300 cursor-pointer relative rounded"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* progress */}
        <div class="absolute top-0 left-0 h-full bg-green-500 rounded" style={{ width: `${progress()}%` }} />

        {/* knob */}
        <div class="absolute top-1/2 w-2 h-2 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${progress()}%` }} />
      </div>

      {/* Duration */}
      <span class="min-w-10 text-center">
        {formatTime(state().duration)}
      </span>
    </div>
  );
}

// helper
function formatTime(sec: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}