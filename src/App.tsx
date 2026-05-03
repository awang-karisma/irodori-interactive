import { createSignal, createResource, Show } from "solid-js";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";

interface Language {
  id: string;
  name: string;
}

interface Chapter {
  id: number;
  audio: Record<string, string>;
  lang: Record<string, string>;
}

interface LevelData {
  chapters: Chapter[];
  languages: { id: string; name: string }[];
}

interface AssetsData {
  levels: Record<string, LevelData>;
  languages: Language[];
}

export default function App() {
  const [level, setLevel] = createSignal("starter");
  const [lang, setLang] = createSignal("en");
  const [chapter, setChapter] = createSignal<string | null>(null);

  const [assetsData] = createResource(async () => {
    const res = await fetch('/assets/data.json');
    if (!res.ok) throw new Error('Assets not found');
    return await res.json();
  });

  return (
    <>
      <Show when={assetsData.state === 'pending'}>
        <div class="text-center p-5">Loading...</div>
      </Show>
      <Show when={assetsData.state === 'errored'}>
        <div class="p-5 text-center">
          <h2 class="text-xl font-bold mb-4">Assets Not Found</h2>
          <p>Please run <code class="bg-gray-100 p-1 rounded">npm run download-assets</code> to generate assets/data.json</p>
          <p class="mb-4 text-xs opacity-40">Error: {assetsData.error?.message || 'Unknown error'}</p>
        </div>
      </Show>
      <Show when={assetsData.state === 'ready'}>
        {(() => {
          const data = assetsData() as AssetsData;
          const levels = data.levels;
          const currentLevelData = levels[level()];
          const currentChapter = chapter() ? currentLevelData.chapters.find(ch => ch.id === parseInt(chapter()!)) : null;
          const langOptions = data.languages.map((lang: { id: string, name: string }) => ({ value: lang.id, label: lang.name }));
          return (
            <>
              <TopBar lang={lang()} setLang={setLang} chapter={chapter()} langOptions={langOptions} />
              {chapter() ? (
                <PdfViewer pdfUrl={currentChapter!.lang[lang()]} chapter={chapter()!} mapping={currentChapter!} />
              ) : (
                <div class="chapter-lists p-5 mt-15">
                  {Object.entries(levels).map(([levelKey, levelData]) => {
                    const levelChapters = levelData.chapters.map(ch => ch.id.toString().padStart(2, '0')).sort();
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
