import { createSignal, createEffect, createMemo } from "solid-js";
import { m } from "../i18n/messages";
import { getLocale } from "../i18n/runtime";
import { hasAsset } from "../utils/idb";
import { getPdfUrl } from "../utils/assetUtils";
import IconMdiDownload from 'virtual:icons/mdi/download';

interface HomeProps {
  assets: any[];
  onSelectChapter: (level: string, chapter: string) => void;
}

export default function Home(props: HomeProps) {
  const allLevels = createMemo(() => [...new Set(props.assets.map((a: any) => a.level))]);
  const [downloadStatuses, setDownloadStatuses] = createSignal(new Map<string, boolean>());

  const levelData = createMemo(() => {
    const data: Record<string, { levelName: string; levelChapters: string[]; pdfUrls: (string | null)[] }> = {};
    allLevels().forEach(level => {
      const audioAsset = props.assets.find((a: any) => a.type === 'audio' && a.level === level);
      if (audioAsset) {
        const numChapters = audioAsset.urls.length;
        const somePdfAsset = props.assets.find((a: any) => a.type === 'pdf' && a.level === level);
        const levelChapters = Array.from({ length: numChapters }, (_, i) => (i + 1).toString().padStart(2, '0'));
        const pdfUrls = levelChapters.map((_, i) => getPdfUrl(props.assets, level, getLocale(), i + 1));
        data[level] = {
          levelName: somePdfAsset?.name || level,
          levelChapters,
          pdfUrls,
        };
      }
    });
    return data;
  });

  createEffect(() => {
    Object.entries(levelData()).forEach(([level, { levelChapters, pdfUrls }]) => {
      levelChapters.forEach((chapter, index) => {
        const pdfUrl = pdfUrls[index];
        if (pdfUrl) {
          hasAsset(`pdf-${btoa(pdfUrl)}`).then(downloaded => {
            setDownloadStatuses(prev => {
              const newMap = new Map(prev);
              newMap.set(`${level}-${chapter}`, downloaded);
              return newMap;
            });
          });
        }
      });
    });
  });

  return (
    <div class="chapter-lists p-5 mt-15">
      {Object.entries(levelData()).map(([levelKey, { levelName, levelChapters, pdfUrls }]) => {
        return (
          <div class="mb-8">
            <h2 class="text-2xl mb-4">{levelName}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {levelChapters.map((ch, index) => {
                const chapterNum = parseInt(ch);
                const pdfUrl = pdfUrls[index];
                const disabled = !pdfUrl;
                const downloaded = downloadStatuses().get(`${levelKey}-${ch}`) || false;
                return (
                  <button
                    class={`p-4 rounded transition ${disabled ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    disabled={disabled}
                    onClick={() => !disabled && props.onSelectChapter(levelKey, ch)}
                  >
                    {m.chapter()} {chapterNum}
                    {downloaded && <IconMdiDownload class="ml-2 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}