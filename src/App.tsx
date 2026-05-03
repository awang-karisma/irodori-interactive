import { createSignal, createResource, Show } from "solid-js";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";

export default function App() {
  const [lang, setLang] = createSignal("en");
  const [chapter, setChapter] = createSignal<string | null>(null);

  const [assetsData] = createResource(async () => {
    const res = await fetch('/assets.json');
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
          <p>Please run <code class="bg-gray-100 p-1 rounded">npm run download-assets</code> to generate assets.json</p>
          <p class="mb-4 text-xs opacity-40">Error: {assetsData.error?.message || 'Unknown error'}</p>
        </div>
      </Show>
      <Show when={assetsData.state === 'ready'}>
        {(() => {
          const mapping = assetsData().mapping;
          const languages = assetsData().languages;
          const langOptions = languages.map((lang: { id: string, displayName: string }) => ({ value: lang.id, label: lang.displayName }));
          const chapters = Object.keys(mapping).map(i => i.toString().padStart(2, '0')).sort();
          return (
            <>
              <TopBar lang={lang()} setLang={setLang} chapter={chapter()} langOptions={langOptions} />
              {chapter() ? (
                <PdfViewer pdfUrl={mapping[parseInt(chapter()!)][lang()]} chapter={chapter()!} />
              ) : (
                <div class="chapter-list p-5 mt-15">
                  <h2 class="text-2xl mb-4">Select a Chapter</h2>
                  <div class="grid grid-cols-6 gap-4">
                    {chapters.map(ch => (
                      <button
                        class="p-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        onClick={() => setChapter(ch)}
                      >
                        Chapter {parseInt(ch)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </Show>
    </>
  );
}
