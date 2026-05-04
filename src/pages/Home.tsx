

interface HomeProps {
  assets: any[];
  onSelectChapter: (level: string, chapter: string) => void;
}

export default function Home(props: HomeProps) {
  const levels = ['starter', 'elementary1'];

  return (
    <div class="chapter-lists p-5 mt-15">
      {levels.map((levelKey) => {
        // Get chapters from PDF assets for this level
        const pdfAssets = props.assets.filter((a: any) => a.type === 'pdf' && a.level === levelKey);
        const maxChapters = Math.max(...pdfAssets.map((a: any) => a.urls.length));
        const levelChapters = Array.from({ length: maxChapters }, (_, i) => (i + 1).toString().padStart(2, '0'));

        return (
          <div class="mb-8">
            <h2 class="text-2xl mb-4">{levelKey.charAt(0).toUpperCase() + levelKey.slice(1)}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {levelChapters.map(ch => (
                <button
                  class="p-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  onClick={() => props.onSelectChapter(levelKey, ch)}
                >
                  Chapter {parseInt(ch)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}