import { createSignal, onMount, onCleanup } from "solid-js";
import { subscribe, seek, stop, pause, resume } from "../utils/audioPlayer";

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
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "60px",
      background: "#f0f0f0",
      display: "flex",
      "align-items": "center",
      padding: "0 20px",
      "box-sizing": "border-box",
      "z-index": 999,
      gap: "10px"
    }}>
      {/* Title */}
      <div style={{ "font-weight": "bold", "min-width": "100px" }}>
        {state().id ?? "No audio"}
      </div>

      {/* Controls */}
      <div style={{ width: "60px", display: "flex", gap: "4px" }}>
        <button onClick={togglePlayPause}>
          {state().playing ? "⏸" : "▶"}
        </button>
        <button onClick={handleStop}>
          ⏹
        </button>
      </div>

      {/* Current Time */}
      <span style={{ "min-width": "40px", "text-align": "center" }}>
        {formatTime(state().currentTime)}
      </span>

      {/* Seek bar */}
      <div
        ref={seekbar}
        style={{
          flex: 1,
          height: "4px",
          background: "#ccc",
          cursor: "pointer",
          position: "relative",
          "border-radius": "2px"
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* progress */}
        <div style={{
          width: `${progress()}%`,
          height: "100%",
          background: "#4caf50",
          "border-radius": "2px"
        }} />

        {/* knob */}
        <div style={{
          position: "absolute",
          left: `${progress()}%`,
          top: "50%",
          width: "8px",
          height: "8px",
          background: "#4caf50",
          "border-radius": "50%",
          transform: "translate(-50%, -50%)"
        }} />
      </div>

      {/* Duration */}
      <span style={{ "min-width": "40px", "text-align": "center" }}>
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