import React, { useRef, useState } from 'react';
import { Layers, FolderOpen, PlusSquare, FileCode2, Sparkles, AlertCircle } from 'lucide-react';
import { BlueprintArray } from '../types';
import { parseArrayConfigFile } from '../services/storageService';
import { createSampleDemoArray } from '../constants';
import { CatInHardHat } from './CatInHardHat';

interface MainMenuProps {
  onStartCreate: () => void;
  onArrayLoaded: (arr: BlueprintArray) => void;
  hasExistingActive: boolean;
  onResumeActive: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartCreate,
  onArrayLoaded,
  hasExistingActive,
  onResumeActive,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const loaded = await parseArrayConfigFile(file);
      onArrayLoaded(loaded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось прочитать файл конфигурации';
      setErrorMessage(msg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadDemo = () => {
    const demo = createSampleDemoArray();
    onArrayLoaded(demo);
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-md mx-auto p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-2xl border-x border-slate-800">
      {/* Hidden file selector for loading array configuration */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header and Brand with Black Cat in Hard Hat Mascot */}
      <div className="pt-8 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 mb-4 shadow-[0_0_35px_rgba(245,158,11,0.25)] relative group cursor-pointer transition-transform hover:scale-105 active:scale-95">
          <CatInHardHat size={68} className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
          <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/60 text-[9px] font-extrabold text-amber-400 tracking-wider uppercase shadow-md">
            Кот-Инженер
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-wider text-slate-50 uppercase drop-shadow">
          Котлован
        </h1>
        <p className="mt-2 text-xs font-medium text-slate-400 tracking-wide uppercase">
          Инспекция многослойных сканов чертежей и сетей
        </p>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2 text-left">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-4 my-auto w-full">
        {hasExistingActive && (
          <button
            onClick={onResumeActive}
            className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-950/60 transition-all border border-emerald-400/40"
          >
            <Layers size={22} />
            <span>Продолжить работу</span>
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-100 font-bold text-base shadow-lg shadow-black/40 border border-slate-700 hover:border-amber-500/40 transition-all"
        >
          <FolderOpen size={22} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Загрузить массив</span>
        </button>

        <button
          onClick={onStartCreate}
          className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-extrabold text-base shadow-xl shadow-amber-950/40 border border-amber-300/50 transition-all"
        >
          <PlusSquare size={22} className="stroke-[2.5]" />
          <span>Создать массив</span>
        </button>

        <div className="pt-2 flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1"></div>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">или</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <button
          onClick={handleLoadDemo}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:scale-[0.98] text-slate-300 hover:text-amber-300 font-semibold text-xs border border-slate-800 transition-all"
        >
          <Sparkles size={16} className="text-amber-400" />
          <span>Загрузить готовый демо-массив (АР / ОВ / ЭО / ВК)</span>
        </button>
      </div>

      {/* Footer info */}
      <div className="pb-4 text-center text-slate-500 text-[11px] flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          <FileCode2 size={13} />
          <span>Формат хранения: JSON + Сканы (PNG / JPG / SVG)</span>
        </div>
        <span>Синхронизация по «Общей точке» для единого масштаба</span>
      </div>
    </div>
  );
};
