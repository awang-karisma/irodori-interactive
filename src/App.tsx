import { createResource, Show, onMount } from "solid-js";
import { Router, Route, useParams, useNavigate } from "@solidjs/router";
import TopBar from "./components/TopBar";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import { getPdfUrl, getAudioZipUrl, getAudioMapping } from "./utils/assetUtils";
import { requestPersistentStorage } from "./utils/idb";
import { baseLocale, getLocale, isLocale, setLocale, shouldRedirect } from "./i18n/runtime";
import { m } from "./i18n/messages";

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

function defaultLocale(currentLocale) {
  if (isLocale(currentLocale)) {
    return setLocale(currentLocale)
  }
  return setLocale(baseLocale)
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

function ViewerRoute({ assetsData }: { assetsData: AssetsUrlsData }) {
  const params = useParams<{ lang: string; level: string; chapter: string }>();
  const navigate = useNavigate();

  defaultLocale(params.lang);

  const pdfUrl = getPdfUrl(assetsData.assets, params.level, params.lang, parseInt(params.chapter))!;
  const zipUrl = getAudioZipUrl(assetsData.assets, params.level, parseInt(params.chapter))!;
  const audioMapping = getAudioMapping(parseInt(params.chapter));

  const handleBack = () => {
    navigate(`/${params.lang}/home`);
  };

  return (
    <>
      <TopBar lang={params.lang} chapter={params.chapter} onBack={handleBack} />
      <Viewer pdfUrl={pdfUrl} chapter={params.chapter} level={params.level} zipUrl={zipUrl} mapping={{ audio: audioMapping }} />
    </>
  );
}
