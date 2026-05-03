import { createSignal } from "solid-js";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";
import AudioPlayer from "./components/AudioPlayer";

export default function App() {
  const [lang, setLang] = createSignal("en");

  return (
    <>
      <TopBar lang={lang()} setLang={setLang} />
      <PdfViewer lang={lang()} chapter="09" />
      <AudioPlayer />
    </>
  );
}
