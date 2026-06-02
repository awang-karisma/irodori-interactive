import { m } from "../i18n/messages";
import { baseLocale, isLocale, locales, setLocale } from "../i18n/runtime";

export default function TopBar(props: { lang: string, chapter?: string | null, onBack?: () => void }) {
  const langOptions = locales

  const handleLangChange = (newLang: string) => {
    const validatedLang = isLocale(newLang) ? newLang : baseLocale;
    setLocale(validatedLang, { reload: false });

    const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
    const afterBase = base && window.location.pathname.startsWith(base)
      ? window.location.pathname.slice(base.length)
      : window.location.pathname;

    const localeRegex = new RegExp(`^/${props.lang}(?=/|$|\\?)`);
    const newAfterBase = afterBase.replace(localeRegex, `/${validatedLang}`);

    window.location.href = window.location.origin + base + newAfterBase + window.location.search + window.location.hash;
  };

  return (
    <div class="fixed top-0 left-0 w-full h-15 bg-gray-200 flex items-center px-5 box-border z-[1000]">
      {props.chapter ? (
        <>
          <button onClick={props.onBack} class="p-2 bg-white rounded border border-gray-400">{m.back()}</button>
          <div class="flex-1 text-center">{m.chapter()} {parseInt(props.chapter)}</div>
        </>
      ) : null}
      <select
        value={props.lang}
        onChange={(e) => handleLangChange(e.target.value)}
        class="ml-auto p-2 rounded border border-gray-400 bg-white"
      >
        {langOptions.map(opt => (
          <option value={opt}>{ m.language_name({}, { locale: opt })}</option>
        ))}
      </select>
    </div>
  );
}
