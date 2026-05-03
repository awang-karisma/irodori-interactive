import { createSignal, createResource, Show, onMount } from "solid-js";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";
import { getPdfUrl, getAudioZipUrl, getAudioMapping } from "./utils/assetUtils";
import { requestPersistentStorage } from "./utils/idb";

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

export default function App() {
  const [level, setLevel] = createSignal("starter");
  const [lang, setLang] = createSignal("en");
  const [chapter, setChapter] = createSignal<string | null>(null);

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
    const res = await fetch(import.meta.env.BASE_URL + 'assets_urls.json');
    if (!res.ok) throw new Error('Assets URLs not found');
    return await res.json();
  });

  return (
    <>
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
        {(() => {
          const data = assetsData() as AssetsUrlsData;
          const pdfUrl = chapter() ? getPdfUrl(data.assets, level(), lang(), parseInt(chapter()!)) : null;
          const zipUrl = chapter() ? getAudioZipUrl(data.assets, level(), parseInt(chapter()!)) : null;
          const audioMapping = chapter() ? getAudioMapping(parseInt(chapter()!)) : null;
          const langOptions = data.languages.map((lang: { id: string, name: string }) => ({ value: lang.id, label: lang.name }));

          // Generate level options from assets
          const levels = ['starter', 'elementary1'];

          return (
            <>
              <TopBar lang={lang()} setLang={setLang} chapter={chapter()} langOptions={langOptions} />
              {chapter() ? (
                <PdfViewer pdfUrl={pdfUrl!} chapter={chapter()!} level={level()} zipUrl={zipUrl!} mapping={{ audio: audioMapping! }} />
              ) : (
                <div class="chapter-lists p-5 mt-15">
                  {levels.map((levelKey) => {
                    // Get chapters from PDF assets for this level
                    const pdfAssets = data.assets.filter(a => a.type === 'pdf' && a.level === levelKey);
                    const maxChapters = Math.max(...pdfAssets.map(a => a.urls.length));
                    const levelChapters = Array.from({ length: maxChapters }, (_, i) => (i + 1).toString().padStart(2, '0'));

                    return (
                      <div class="mb-8">
                        <h2 class="text-2xl mb-4">{levelKey.charAt(0).toUpperCase() + levelKey.slice(1)}</h2>
                        <div class="grid grid-cols-6 gap-4">
                          {levelChapters.map(ch => (
                            <button
                              class="p-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                              onClick={() => {
                                setLevel(levelKey);
                                setChapter(ch);
                              }}
                            >
                              Chapter {parseInt(ch)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </Show>
    </>
  );
}
