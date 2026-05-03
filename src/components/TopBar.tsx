import { createSignal } from "solid-js";
import AudioPlayer from "./AudioPlayer";

export default function TopBar(props: { lang: string, setLang: (lang: string) => void }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "60px",
      backgroundColor: "#f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      boxSizing: "border-box",
      zIndex: 1000
    }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => props.setLang("en")}>EN</button>
        <button onClick={() => props.setLang("id")}>ID</button>
      </div>
      <AudioPlayer />
    </div>
  );
}
