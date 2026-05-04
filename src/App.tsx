import { createResource, Show, onMount } from "solid-js";
import { Router, Route, useParams, useLocation, useNavigate } from "@solidjs/router";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import { getPdfUrl, getAudioZipUrl, getAudioMapping } from "./utils/assetUtils";
import { requestPersistentStorage } from "./utils/idb";
import { getLocale, setLocale, shouldRedirect } from "./i18n/runtime";

async function checkRedirect() {
	const decision = await shouldRedirect({ url: window.location.href });

	if (decision.shouldRedirect && decision.redirectUrl) {
		window.location.href = decision.redirectUrl.href;
	}
}
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

export default function App() {
  onMount(async () => {
    checkRedirect()
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
    <Router>
      <Show when={assetsData.state === 'pending'}>
        <div class="text-center p-5">Loading...</div>
      </Show>
      <Show when={assetsData.state === 'errored'}>
        <div class="p-5 text-center">
          <h2 class="text-xl font-bold mb-4">Assets URLs Not Found</h2>
          <p>Unable to load asset URLs from assets_urls.json</p>
          <p class="mb-4 text-xs opacity-40">Error: {assetsData.error?.message || 'Unknown error'}</p>
        </div>
      </Show>
      <Show when={assetsData.state === 'ready'}>
        <Route path="/" component={DefaultRedirect} />
        <Route path="/:lang" component={DefaultRedirect} />
        <Route path="/:lang/home" component={() => <HomeRoute assetsData={assetsData()!} />} />
        <Route path="/:lang/viewer/:level/:chapter" component={() => <ViewerRoute assetsData={assetsData()!} />} />
      </Show>
    </Router>
  );
}

function HomeRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string }>();
  const navigate = useNavigate();

  setLocale(params.lang as "en" | "id" | "kr");

  const langOptions = assetsData.languages.map((lang: { id: string, name: string }) => ({ value: lang.id, label: lang.name }));

  const handleSelectChapter = (level: string, chapter: string) => {
    navigate(`/${params.lang}/viewer/${level}/${chapter}?page=1`);
  };

  const handleLangChange = (newLang: string) => {
    navigate(`/${newLang}/home`);
  };

  return (
    <>
      <TopBar lang={params.lang} setLang={handleLangChange} chapter={null} langOptions={langOptions} />
      <Home assets={assetsData.assets} onSelectChapter={handleSelectChapter} />
    </>
  );
}

function ViewerRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string; level: string; chapter: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  setLocale(params.lang as "en" | "id" | "kr");

  const page = () => new URLSearchParams(location.search).get('page') || '1';

  const pdfUrl = getPdfUrl(assetsData.assets, params.level, params.lang, parseInt(params.chapter))!;
  const zipUrl = getAudioZipUrl(assetsData.assets, params.level, parseInt(params.chapter))!;
  const audioMapping = getAudioMapping(parseInt(params.chapter));
  const langOptions = assetsData.languages.map((lang: { id: string, name: string }) => ({ value: lang.id, label: lang.name }));

  const handleLangChange = (newLang: string) => {
    navigate(`/${newLang}/viewer/${params.level}/${params.chapter}?page=${page()}`);
  };

  const handleBack = () => {
    navigate(`/${params.lang}/home`);
  };

  return (
    <>
      <TopBar lang={params.lang} setLang={handleLangChange} chapter={params.chapter} langOptions={langOptions} onBack={handleBack} />
      <Viewer pdfUrl={pdfUrl} chapter={params.chapter} level={params.level} zipUrl={zipUrl} mapping={{ audio: audioMapping }} />
    </>
  );
}
