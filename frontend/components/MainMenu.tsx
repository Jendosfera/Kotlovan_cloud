import React, { useRef, useState, useEffect } from 'react';
import { Layers, FolderOpen, PlusSquare, Sparkles, AlertCircle, Compass, Gem, Volume2, VolumeX, HardDrive } from 'lucide-react';
import { BlueprintArray } from '../types';
import { parseArrayConfigFile, getAttachedFolderName } from '../services/storageService';
import { checkStoragePermission } from '../services/permissionService';
import { createSampleDemoArray, STORAGE_MESSAGES } from '../constants';
import { sound } from '../services/soundService';

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
  const [hoveredIdx, setHoveredIdx] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted);
  const [attachedFolder, setAttachedFolder] = useState<string | null>(null);

  useEffect(() => {
    checkStoragePermission();
    setAttachedFolder(getAttachedFolderName());
  }, []);

  const toggleSound = () => {
    sound.isMuted = !sound.isMuted;
    setMuted(sound.isMuted);
    if (!sound.isMuted) {
      sound.playConfirm();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const loaded = await parseArrayConfigFile(file);
      sound.playConfirm();
      onArrayLoaded(loaded);
    } catch (err: unknown) {
      sound.playCancel();
      const msg = err instanceof Error ? err.message : STORAGE_MESSAGES.ERR_READ_ACCESS;
      setErrorMessage(msg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadDemo = () => {
    sound.playConfirm();
    const demo = createSampleDemoArray();
    onArrayLoaded(demo);
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-md mx-auto p-5 select-none overflow-hidden bg-slate-950">
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 20%, #38bdf8 1px, transparent 1px), radial-gradient(circle at 20% 70%, #fbbf24 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Banner Window */}
      <div className="ff9-window p-5 text-center mt-3 shadow-2xl relative">
        <button
          onClick={toggleSound}
          className="absolute right-3 top-3 p-1.5 rounded-lg bg-blue-950/80 border border-slate-400/60 text-amber-300 hover:text-white active:scale-95 transition"
          title="Звук FF9"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-400/20 to-blue-900/60 border-2 border-amber-300/60 text-cyan-300 mb-2 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
          <Gem size={32} className="animate-pulse" />
        </div>

        <h1 
          className="text-3xl font-extrabold tracking-widest text-amber-200 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Котлован
        </h1>
        <div className="flex items-center justify-center gap-2 my-1 text-amber-400/90 text-xs font-semibold">
          <span>✦</span>
          <span className="tracking-widest uppercase text-[10px] text-slate-300">Android SAF Edition</span>
          <span>✦</span>
        </div>
        <p className="text-[11px] text-slate-300/90 font-medium tracking-wide">
          Инспекция инженерных чертежей по единой опорной точке
        </p>

        {attachedFolder && (
          <div className="mt-2 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-blue-950/90 border border-cyan-400/40 text-[10px] text-cyan-200">
            <HardDrive size={12} className="text-amber-400" />
            <span className="truncate max-w-[200px]">Папка: {attachedFolder}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-2.5 bg-rose-950/90 border border-rose-400 rounded-xl text-xs text-rose-200 flex items-center gap-2 text-left">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Command Menu */}
      <div className="ff9-window p-5 my-auto flex flex-col gap-3 shadow-2xl">
        {hasExistingActive && (
          <button
            onClick={() => {
              sound.playConfirm();
              onResumeActive();
            }}
            onMouseEnter={() => {
              setHoveredIdx(0);
              sound.playCursor();
            }}
            className="group relative flex items-center justify-start gap-4 w-full py-3.5 px-4 rounded-xl ff9-btn border-emerald-400/80 hover:border-amber-300"
          >
            <span className="text-xl animate-ff9-finger transition-opacity text-amber-300 drop-shadow">
              👉
            </span>
            <Layers size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-slate-100 tracking-wide">
              Продолжить работу
            </span>
          </button>
        )}

        <button
          onClick={() => {
            sound.playConfirm();
            fileInputRef.current?.click();
          }}
          onMouseEnter={() => {
            setHoveredIdx(1);
            sound.playCursor();
          }}
          className="group relative flex items-center justify-start gap-4 w-full py-3.5 px-4 rounded-xl ff9-btn hover:border-amber-300"
        >
          <span className={`text-xl transition-opacity text-amber-300 ${hoveredIdx === 1 ? 'animate-ff9-finger opacity-100' : 'opacity-0'}`}>
            👉
          </span>
          <FolderOpen size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-slate-100 tracking-wide">
            Загрузить массив
          </span>
        </button>

        <button
          onClick={() => {
            sound.playConfirm();
            onStartCreate();
          }}
          onMouseEnter={() => {
            setHoveredIdx(2);
            sound.playCursor();
          }}
          className="group relative flex items-center justify-start gap-4 w-full py-3.5 px-4 rounded-xl ff9-btn-gold"
        >
          <span className={`text-xl transition-opacity text-slate-950 ${hoveredIdx === 2 ? 'animate-ff9-finger opacity-100' : 'opacity-70'}`}>
            👉
          </span>
          <PlusSquare size={20} className="stroke-[2.5]" />
          <span className="text-sm font-extrabold tracking-wide">
            Создать массив
          </span>
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent flex-1" />
          <Compass size={14} className="text-amber-400" />
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent flex-1" />
        </div>

        <button
          onClick={handleLoadDemo}
          onMouseEnter={() => {
            setHoveredIdx(3);
            sound.playCursor();
          }}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 active:scale-95 text-cyan-200 text-xs font-semibold border border-cyan-500/40 transition"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span>Демо: Комплекс «Котлован» (АР / ОВ / ЭО / ВК)</span>
        </button>
      </div>

      {/* Footer Info Box */}
      <div className="ff9-window py-2.5 px-4 text-center text-[10px] text-slate-300/80 flex items-center justify-between border-t border-slate-700">
        <span>Котлован v1.4</span>
        <span className="text-amber-300 font-mono">Storage Access Framework</span>
        <span>Автосохранение</span>
      </div>
    </div>
  );
};
