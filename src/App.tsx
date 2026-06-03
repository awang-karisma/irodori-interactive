import { createResource, Show, onMount } from "solid-js";
import { Router, Route, useParams, useNavigate } from "@solidjs/router";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import Settings from "./pages/Settings";
import ReloadPrompt from "./components/ReloadPrompt";
import { getPdfUrl, getAudioZipUrl, getAudioMapping, getPdfSignature, getAudioSignature } from "./utils/assetUtils";
import { requestPersistentStorage } from "./utils/idb";
import { baseLocale, isLocale, getLocale, setLocale } from "./i18n/runtime";
import { m } from "./i18n/messages";

// Patch getLocale so it understands non-root base paths.
// Must be imported before any component calls getLocale().
import "./utils/localeOverride";

interface Language {
  id: string;
  name: string;
}

interface AssetEntry {
  id: string;
  type: 'pdf' | 'audio';
  level: string;
  lang?: string;
  name?: string;
  urls: string[];
  signatures?: string[];
}

interface AssetsUrlsData {
  languages: Language[];
  assets: AssetEntry[];
}

function DefaultRedirect() {
  const navigate = useNavigate();
  navigate(`/${getLocale()}/home`, { replace: true });
  return null;
}

const defaultLocale = (currentLocale: string) => {
  if (isLocale(currentLocale)) {
    return setLocale(currentLocale, { reload: false })
  }
  return setLocale(baseLocale, { reload: false })
}

export default function App() {
  onMount(async () => {
    // Request persistent storage for better caching
    const granted = await requestPersistentStorage();
    if (granted) {
      console.log('Persistent storage granted');
    } else {
      console.log('Persistent storage not granted');
    }
  });

  const [assetsData] = createResource(async () => {
    const url = new URL("/assets_urls.json", import.meta.url).href
    const res = await fetch(url);
    if (!res.ok) throw new Error('Assets URLs not found');
    return await res.json();
  });

  return (
    <Router base={import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ReloadPrompt />
      <Show when={assetsData.state === 'pending'}>
        <div class="text-center p-5">{m.loading()}</div>
      </Show>
      <Show when={assetsData.state === 'errored'}>
        <div class="p-5 text-center">
          <h2 class="text-xl font-bold mb-4">{m.asset_no_url_found_title()}</h2>
          <p>{m.asset_no_url_found_message()}</p>
          <p class="mb-4 text-xs opacity-40">{m.error()}: {assetsData.error?.message || m.error_unknown()}</p>
        </div>
      </Show>
      <Show when={assetsData.state === 'ready'}>
        <Route path="/" component={DefaultRedirect} />
        <Route path="/:lang" component={DefaultRedirect} />
        <Route path="/:lang/home" component={() => <HomeRoute assetsData={assetsData()!} />} />
        <Route path="/:lang/settings" component={() => <SettingsRoute assetsData={assetsData()!} />} />
        <Route path="/:lang/viewer/:level/:chapter" component={() => <ViewerRoute assetsData={assetsData()!} />} />
      </Show>
    </Router>
  );
}

function HomeRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string }>();
  const navigate = useNavigate();

  defaultLocale(params.lang);

  const handleSelectChapter = (level: string, chapter: string) => {
    navigate(`/${params.lang}/viewer/${level}/${chapter}?page=1`);
  };

  return (
    <>
      <TopBar lang={params.lang} chapter={null} />
      <Home assets={assetsData.assets} onSelectChapter={handleSelectChapter} />
    </>
  );
}

function SettingsRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string }>();

  defaultLocale(params.lang);

  return (
    <>
      <TopBar lang={params.lang} chapter={null} />
      <Settings assets={assetsData.assets} languages={assetsData.languages} />
    </>
  );
}

function ViewerRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string; level: string; chapter: string }>();
  const navigate = useNavigate();

  defaultLocale(params.lang);

  const pdfUrl = getPdfUrl(assetsData.assets, params.level, params.lang, parseInt(params.chapter))!;
  const zipUrl = getAudioZipUrl(assetsData.assets, params.level, parseInt(params.chapter))!;
  const pdfSignature = getPdfSignature(assetsData.assets, params.level, params.lang, parseInt(params.chapter)) || undefined;
  const zipSignature = getAudioSignature(assetsData.assets, params.level, parseInt(params.chapter)) || undefined;
  const audioMapping = getAudioMapping(parseInt(params.chapter));

  const handleBack = () => {
    navigate(`/${params.lang}/home`);
  };

  return (
    <>
      <TopBar lang={params.lang} chapter={params.chapter} onBack={handleBack} />
      <Viewer pdfUrl={pdfUrl} pdfSignature={pdfSignature} chapter={params.chapter} level={params.level} zipUrl={zipUrl} zipSignature={zipSignature} mapping={{ audio: audioMapping }} />
    </>
  );
}
