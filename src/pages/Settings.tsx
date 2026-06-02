import { createSignal, createEffect, createMemo, For, Show } from "solid-js";
import { m } from "../i18n/messages";
import { baseLocale, getLocale, isLocale, locales } from "../i18n/runtime";
import { getStorageEstimate, clearCache, hasAsset } from "../utils/idb";
import { getPdfUrl, getAudioZipUrl } from "../utils/assetUtils";
import { preloadChapter } from "../utils/preload";
import type { PreloadProgress } from "../utils/preload";
import IconMdiDownload from 'virtual:icons/mdi/download';
import IconMdiCheckCircle from 'virtual:icons/mdi/check-circle';
import IconMdiAlertCircle from 'virtual:icons/mdi/alert-circle';

interface SettingsProps {
  assets: any[];
  languages: { id: string; name: string }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Settings(props: SettingsProps) {
  const [storageEstimate, setStorageEstimate] = createSignal<{ quota?: number; usage?: number } | null>(null);
  const [cacheCleared, setCacheCleared] = createSignal(false);
  const [selectedLang, setSelectedLang] = createSignal(getLocale());
  const [preloadStatuses, setPreloadStatuses] = createSignal<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({});
  const [preloadProgress, setPreloadProgress] = createSignal<Record<string, PreloadProgress>>({});
  const [downloadStatuses, setDownloadStatuses] = createSignal(new Map<string, boolean>());

  const refreshStorage = () => {
    getStorageEstimate().then(setStorageEstimate);
  };

  createEffect(() => {
    refreshStorage();
  });

  const allLevels = createMemo(() => [...new Set(props.assets.map((a: any) => a.level))]);

  const levelData = createMemo(() => {
    const lang = selectedLang();
    const data: Record<string, { levelName: string; chapters: number }> = {};
    allLevels().forEach(level => {
      const audioAsset = props.assets.find((a: any) => a.type === 'audio' && a.level === level);
      if (audioAsset) {
        const numChapters = audioAsset.urls.length;
        const somePdfAsset = props.assets.find((a: any) => a.type === 'pdf' && a.level === level && a.lang === lang);
        data[level] = {
          levelName: somePdfAsset?.name || level,
          chapters: numChapters,
        };
      }
    });
    return data;
  });

  createEffect(() => {
    const lang = selectedLang();
    Object.entries(levelData()).forEach(([level, { chapters }]) => {
      for (let ch = 1; ch <= chapters; ch++) {
        const pdfUrl = getPdfUrl(props.assets, level, lang, ch);
        const zipUrl = getAudioZipUrl(props.assets, level, ch);
        const key = `${level}-${ch}-${lang}`;
        if (pdfUrl) {
          hasAsset(`pdf-${btoa(pdfUrl)}`).then(cached => {
            setDownloadStatuses(prev => {
              const newMap = new Map(prev);
              newMap.set(`${key}-pdf`, cached);
              return newMap;
            });
          });
        }
        if (zipUrl) {
          hasAsset(`zip-${btoa(zipUrl)}`).then(cached => {
            setDownloadStatuses(prev => {
              const newMap = new Map(prev);
              newMap.set(`${key}-audio`, cached);
              return newMap;
            });
          });
        }
      }
    });
  });

  const isChapterCached = (level: string, chapter: number, lang: string): boolean => {
    const key = `${level}-${chapter}-${lang}`;
    return (downloadStatuses().get(`${key}-pdf`) ?? false) && (downloadStatuses().get(`${key}-audio`) ?? false);
  };

  const handleClearCache = async () => {
    if (confirm(m.clear_cache_confirm())) {
      await clearCache();
      setCacheCleared(true);
      refreshStorage();
      setDownloadStatuses(new Map());
      setTimeout(() => setCacheCleared(false), 3000);
    }
  };

  const handlePreloadChapter = async (level: string, chapter: number, lang: string) => {
    const key = `${level}-${chapter}-${lang}`;
    setPreloadStatuses(prev => ({ ...prev, [key]: 'loading' }));

    try {
      await preloadChapter(props.assets, level, lang, chapter, (p) => {
        setPreloadProgress(prev => ({ ...prev, [key]: p }));
      });
      setPreloadStatuses(prev => ({ ...prev, [key]: 'done' }));
      refreshStorage();
      const pdfUrl = getPdfUrl(props.assets, level, lang, chapter);
      const zipUrl = getAudioZipUrl(props.assets, level, chapter);
      if (pdfUrl) {
        setDownloadStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(`${key}-pdf`, true);
          return newMap;
        });
      }
      if (zipUrl) {
        setDownloadStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(`${key}-audio`, true);
          return newMap;
        });
      }
    } catch {
      setPreloadStatuses(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const [selectedChapters, setSelectedChapters] = createSignal<Set<string>>(new Set());
  const [overallProgress, setOverallProgress] = createSignal<{ completed: number; total: number } | null>(null);

  const isAnyLoading = () => Object.values(preloadStatuses()).some(s => s === 'loading');

  const chapterKey = (level: string, ch: number) => `${level}-${ch}-${selectedLang()}`;

  const toggleChapter = (key: string) => {
    setSelectedChapters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleLevel = (level: string) => {
    const { chapters } = levelData()[level];
    const lang = selectedLang();
    const keys = Array.from({ length: chapters }, (_, i) => `${level}-${i + 1}-${lang}`);
    const allSelected = keys.every(k => selectedChapters().has(k) || isChapterCached(...k.split('-').slice(0, 2).map((v, i) => i === 0 ? v : Number(v)) as [string, number], lang));

    setSelectedChapters(prev => {
      const next = new Set(prev);
      keys.forEach(k => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const handlePreloadSelected = async () => {
    const lang = selectedLang();
    const toPreload = [...selectedChapters()].filter(key => {
      const [level, ch] = key.split('-');
      return preloadStatuses()[key] !== 'loading' && !isChapterCached(level, parseInt(ch), lang);
    });

    setOverallProgress({ completed: 0, total: toPreload.length });

    for (const key of toPreload) {
      const [level, ch] = key.split('-');
      await handlePreloadChapter(level, parseInt(ch), lang);
      setOverallProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
    }

    setSelectedChapters(new Set<string>());
    setTimeout(() => setOverallProgress(null), 1000);
  };

  const usage = () => storageEstimate()?.usage ?? 0;
  const quota = () => storageEstimate()?.quota ?? 0;
  const usedPercent = () => quota() > 0 ? Math.min(Math.round((usage() / quota()) * 100), 100) : 0;
  const freeSpace = () => quota() - usage();

  return (
    <div class="p-5 mt-15 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">{m.settings()}</h1>

      <section class="mb-8 bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
        <h2 class="text-xl font-semibold mb-4">{m.storage_usage()}</h2>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 mb-3 overflow-hidden">
          <div
            class="h-4 rounded-full transition-all duration-500"
            classList={{
              'bg-green-500': usedPercent() < 50,
              'bg-yellow-500': usedPercent() >= 50 && usedPercent() < 80,
              'bg-red-500': usedPercent() >= 80,
            }}
            style={{ width: `${usedPercent()}%` }}
          />
        </div>
        <div class="flex justify-between text-sm mb-4">
          <span>{m.storage_used()}: {formatBytes(usage())}</span>
          <span>{m.storage_free()}: {formatBytes(freeSpace() > 0 ? freeSpace() : 0)}</span>
        </div>
        <button
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          onClick={handleClearCache}
        >
          {m.clear_cache()}
        </button>
        <Show when={cacheCleared()}>
          <span class="ml-3 text-green-600">{m.cache_cleared()}</span>
        </Show>
      </section>

      <section class="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
        <h2 class="text-xl font-semibold mb-4">{m.preload()}</h2>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">{m.preload_language()}</label>
          <select
            value={selectedLang()}
            onChange={(e) => isLocale(e.target.value) && setSelectedLang(e.target.value)}
            class="p-2 rounded border border-gray-400 bg-white dark:bg-gray-700 dark:text-white"
          >
            <For each={props.languages}>
              {(lang) => (
                <option value={lang.id}>
                  {m.language_name({}, { locale: isLocale(lang.id) ? lang.id : baseLocale })}
                </option>
              )}
            </For>
          </select>
        </div>

          <For each={Object.entries(levelData())}>
            {([level, { levelName, chapters }]) => {
              const lang = selectedLang();
              const allLevelKeys = () => Array.from({ length: chapters }, (_, i) => `${level}-${i + 1}-${lang}`);
              const allSelected = () => allLevelKeys().every(k => selectedChapters().has(k) || isChapterCached(...k.split('-').slice(0, 2).map((v, i) => i === 0 ? v : Number(v)) as [string, number], lang));
              const someSelected = () => allLevelKeys().some(k => selectedChapters().has(k)) && !allSelected();

              return (
                <div class="mb-6">
                  <label class="flex items-center gap-2 text-lg font-medium cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected()}
                      ref={(el) => { el.indeterminate = someSelected(); }}
                      onChange={() => toggleLevel(level)}
                      class="w-4 h-4"
                    />
                    {levelName}
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <For each={Array.from({ length: chapters }, (_, i) => i + 1)}>
                      {(ch) => {
                        const key = chapterKey(level, ch);
                        const status = () => preloadStatuses()[key] || 'idle';
                        const cached = () => isChapterCached(level, ch, selectedLang());
                        const progress = () => preloadProgress()[key];
                        const checked = () => selectedChapters().has(key);
                        const chapterProgress = () => {
                          const p = progress();
                          if (!p || p.progress < 0) return 0;
                          return p.progress;
                        };

                        return (
                          <label
                            class="relative flex items-center justify-between p-3 rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition overflow-hidden"
                          >
                            <div
                              class="absolute bottom-0 left-0 h-1 transition-all duration-300"
                              classList={{
                                'bg-blue-500': status() === 'loading',
                                'bg-green-500': status() === 'done' || cached(),
                                'bg-red-500': status() === 'error',
                              }}
                              style={{
                                width: status() === 'loading'
                                  ? `${chapterProgress()}%`
                                  : (status() === 'done' || cached()) ? '100%'
                                    : status() === 'error' ? '100%'
                                    : '0%',
                              }}
                            />
                            <div class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked() || cached()}
                                disabled={cached() || status() === 'loading'}
                                onChange={() => toggleChapter(key)}
                                class="w-4 h-4"
                              />
                              <span class="font-medium">{m.chapter()} {ch}</span>
                            </div>
                            <Show when={status() === 'loading'}>
                              <span class="text-xs text-blue-500 font-medium">
                                {progress() ? (progress()!.progress >= 0 ? `${progress()!.progress}%` : '...') : ''}
                              </span>
                            </Show>
                            <Show when={status() === 'error'}>
                              <IconMdiAlertCircle class="w-5 h-5 text-red-500" />
                            </Show>
                            <Show when={status() !== 'loading' && status() !== 'error'}>
                              <Show when={cached()} fallback={null}>
                                <IconMdiCheckCircle class="w-5 h-5 text-green-500" />
                              </Show>
                            </Show>
                          </label>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>

          <Show when={selectedChapters().size > 0 || isAnyLoading()}>
            <div class="sticky bottom-0 bg-white dark:bg-gray-800 p-4 -mx-5 -mb-5 mt-4 rounded-b-lg">
              <Show when={overallProgress() && overallProgress()!.total > 0}>
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    class="h-2 rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.round((overallProgress()!.completed / overallProgress()!.total) * 100)}%` }}
                  />
                </div>
              </Show>
              <div class="flex items-center justify-between">
                <span class="text-sm">
                  <Show when={overallProgress()} fallback={`${selectedChapters().size} selected`}>
                    {`${overallProgress()!.completed}/${overallProgress()!.total} ${m.preloading().toLowerCase()}`}
                  </Show>
                </span>
                <button
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center gap-2 disabled:opacity-50"
                  onClick={handlePreloadSelected}
                  disabled={isAnyLoading()}
                >
                  <IconMdiDownload class="w-5 h-5" />
                  {m.preload()} ({selectedChapters().size})
                </button>
              </div>
            </div>
          </Show>
      </section>
    </div>
  );
}
