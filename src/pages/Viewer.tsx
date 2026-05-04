import PdfViewer from "../components/PdfViewer";
import AudioPlayer from "../components/AudioPlayer";

interface ViewerProps {
  pdfUrl: string;
  chapter: string;
  level: string;
  zipUrl: string;
  mapping: { audio: any };
}

export default function Viewer(props: ViewerProps) {
  return (
    <div class="pb-15">
      <PdfViewer pdfUrl={props.pdfUrl} chapter={props.chapter} level={props.level} zipUrl={props.zipUrl} mapping={props.mapping} />
      <AudioPlayer />
    </div>
  );
}