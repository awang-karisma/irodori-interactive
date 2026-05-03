import AudioPlayer from "./AudioPlayer";

export default function TopBar(props: { lang: string, setLang: (lang: string) => void, chapter?: string | null, langOptions: { value: string, label: string }[] }) {
  return (
    <div class="fixed top-0 left-0 w-full h-15 bg-gray-200 flex items-center px-5 box-border z-[1000]">
      {props.chapter && <AudioPlayer />}
      <select
        value={props.lang}
        onChange={(e) => props.setLang(e.target.value)}
        class="ml-auto p-2 rounded border border-gray-400 bg-white"
      >
        {props.langOptions.map(opt => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
