import { m } from "../i18n/messages";
import { getLocale } from "../i18n/runtime";


interface HomeProps {
  assets: any[];
  onSelectChapter: (level: string, chapter: string) => void;
}

export default function Home(props: HomeProps) {
  const levels = [...new Set(props.assets.map((a: any) => a.level))];

  return (
    <div class="chapter-lists p-5 mt-15">
      {levels.map((levelKey) => {
        // Get chapters from PDF assets for this level
        const pdfAsset = props.assets.find((a: any) => a.type === 'pdf' && a.level === levelKey && a.lang === getLocale());
        const levelChapters = Array.from({ length: pdfAsset.urls.length }, (_, i) => (i + 1).toString().padStart(2, '0'));
        const levelName = pdfAsset.name || levelKey;

        return (
          <div class="mb-8">
            <h2 class="text-2xl mb-4">{levelName}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {levelChapters.map(ch => (
                <button
                  class="p-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  onClick={() => props.onSelectChapter(levelKey, ch)}
                >
                  {m.chapter()} {parseInt(ch)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}