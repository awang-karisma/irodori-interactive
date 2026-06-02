import { useNavigate } from "@solidjs/router";
import { m } from "../i18n/messages";
import { baseLocale, isLocale, locales, setLocale } from "../i18n/runtime";
import IconMdiCog from 'virtual:icons/mdi/cog';
import IconMdiArrowLeft from 'virtual:icons/mdi/arrow-left';

export default function TopBar(props: { lang: string, chapter?: string | null, onBack?: () => void }) {
  const navigate = useNavigate();
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

  const isInViewer = !!props.chapter;
  const isInSettings = () => !isInViewer && window.location.pathname.includes('/settings');

  return (
    <div class="fixed top-0 left-0 w-full h-15 bg-gray-200 flex items-center px-5 box-border z-[1000]">
      {isInViewer ? (
        <>
          <button onClick={props.onBack} class="p-2 bg-white rounded border border-gray-400 hover:bg-gray-100 transition" title={m.back()}>
            <IconMdiArrowLeft class="w-5 h-5" />
          </button>
          <div class="flex-1 text-center">{m.chapter()} {parseInt(props.chapter!)}</div>
        </>
      ) : null}
      {!isInViewer && (
        <button
          class="p-2 bg-white rounded border border-gray-400 hover:bg-gray-100 transition"
          onClick={() => navigate(`/${props.lang}/home`)}
          title={m.back()}
        >
          <IconMdiArrowLeft class="w-5 h-5" />
        </button>
      )}
      {!isInViewer && !isInSettings() && (
        <button
          class="ml-auto p-2 bg-white rounded border border-gray-400 hover:bg-gray-100 transition"
          onClick={() => navigate(`/${props.lang}/settings`)}
          title={m.settings()}
        >
          <IconMdiCog class="w-5 h-5" />
        </button>
      )}
      <select
        value={props.lang}
        onChange={(e) => handleLangChange(e.target.value)}
        class={`${!isInViewer && !isInSettings() ? 'ml-2' : 'ml-auto'} p-2 rounded border border-gray-400 bg-white`}
      >
        {langOptions.map(opt => (
          <option value={opt}>{ m.language_name({}, { locale: opt })}</option>
        ))}
      </select>
    </div>
  );
}
