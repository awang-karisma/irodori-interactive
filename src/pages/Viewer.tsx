import PdfViewer from "../components/PdfViewer";
import AudioPlayer from "../components/AudioPlayer";

interface ViewerProps {
  pdfUrl: string;
  pdfSignature?: string;
  chapter: string;
  level: string;
  zipUrl: string;
  zipSignature?: string;
  mapping: { audio: any };
}

export default function Viewer(props: ViewerProps) {
  return (
    <div class="pb-15">
      <PdfViewer pdfUrl={props.pdfUrl} pdfSignature={props.pdfSignature} chapter={props.chapter} level={props.level} zipUrl={props.zipUrl} zipSignature={props.zipSignature} mapping={props.mapping} />
      <AudioPlayer />
    </div>
  );
}