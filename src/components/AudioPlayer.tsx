import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { subscribe, seek, stop, pause, resume } from "../utils/audioPlayer";

export default function AudioPlayer() {
  const [state, setState] = createSignal({
    id: null as string | null,
    currentTime: 0,
    duration: 0,
    playing: false
  });

  const [visible, setVisible] = createSignal(false);

  let seekbar!: HTMLDivElement;
  let dragging = false;

  // subscribe to global audio state
  onMount(() => {
    subscribe((s) => {
      setState(s);

      // show player when audio starts
      if (s.id) setVisible(true);

      // hide when stopped (id null)
      if (!s.id) setVisible(false);
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
    stop();         // reset audio
    setVisible(false); // hide player
  };

  return (
    <Show when={visible()}>
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          "max-width": "600px",
          background: "#222",
          color: "white",
          padding: "12px",
          "border-radius": "10px",
          "box-shadow": "0 4px 12px rgba(0,0,0,0.3)",
          "font-family": "sans-serif"
        }}
      >
        {/* Title */}
        <div style={{ "font-size": "14px", "margin-bottom": "6px" }}>
          {state().id ?? "No audio"}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "8px", "margin-bottom": "8px" }}>
          <button onClick={togglePlayPause}>
            {state().playing ? "⏸ Pause" : "▶ Play"}
          </button>

          <button onClick={handleStop}>
            ⏹ Stop
          </button>
        </div>

        {/* Seek bar */}
        <div
          ref={seekbar}
          style={{
            height: "6px",
            background: "#555",
            cursor: "pointer",
            position: "relative",
            "border-radius": "3px"
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {/* progress */}
          <div
            style={{
              width: `${progress()}%`,
              height: "100%",
              background: "#4caf50",
              "border-radius": "3px"
            }}
          />

          {/* knob */}
          <div
            style={{
              position: "absolute",
              left: `${progress()}%`,
              top: "50%",
              width: "12px",
              height: "12px",
              background: "white",
              "border-radius": "50%",
              transform: "translate(-50%, -50%)"
            }}
          />
        </div>

        {/* Time */}
        <div
          style={{
            "font-size": "12px",
            "margin-top": "6px",
            display: "flex",
            "justify-content": "space-between"
          }}
        >
          <span>{formatTime(state().currentTime)}</span>
          <span>{formatTime(state().duration)}</span>
        </div>
      </div>
    </Show>
  );
}

// helper
function formatTime(sec: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}