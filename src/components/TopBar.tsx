import { baseLocale, isLocale, locales, setLocale } from "../i18n/runtime";

const handleLangChange = (lang: string) => {
  if (isLocale(lang)) return setLocale(lang)
  return setLocale(baseLocale)
}
export default function TopBar(props: { lang: string, chapter?: string | null, onBack?: () => void }) {
  const langOptions = locales
  return (
    <div class="fixed top-0 left-0 w-full h-15 bg-gray-200 flex items-center px-5 box-border z-[1000]">
      {props.chapter ? (
        <>
          <button onClick={props.onBack} class="p-2 bg-white rounded border border-gray-400">Back</button>
          <div class="flex-1 text-center">Chapter {parseInt(props.chapter)}</div>
        </>
      ) : null}
      <select
        value={props.lang}
        onChange={(e) => handleLangChange(e.target.value)}
        class="ml-auto p-2 rounded border border-gray-400 bg-white"
      >
        {langOptions.map(opt => (
          <option value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
