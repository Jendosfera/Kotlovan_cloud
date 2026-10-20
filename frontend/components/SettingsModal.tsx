import React, { useState, useEffect } from 'react';
import { Sliders, X, Check, Shield, Folder, RefreshCw, ExternalLink, FileCode, Download } from 'lucide-react';
import { ViewerUISettings } from '../types';
import {
  checkStoragePermission,
  requestStoragePermission,
  openAppSettings,
  StoragePermissionState,
  getAttachedFolderName,
} from '../services/storageService';
import { STORAGE_MESSAGES, sound } from '../constants';

interface SettingsModalProps {
  settings: ViewerUISettings;
  onChange: (s: ViewerUISettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [permissionState, setPermissionState] = useState<StoragePermissionState>('prompt');
  const [currentFolder, setCurrentFolder] = useState<string>(getAttachedFolderName() || STORAGE_MESSAGES.FOLDER_NOT_SET);
  const [showManifestViewer, setShowManifestViewer] = useState<boolean>(false);
  const [manifestContent, setManifestContent] = useState<string>('');

  useEffect(() => {
    checkStoragePermission().then(setPermissionState);
  }, []);

  const handleRequestPermission = async () => {
    sound.playConfirm();
    const res = await requestStoragePermission();
    setPermissionState(res);
  };

  const handleOpenSettings = async () => {
    sound.playCursor();
    await openAppSettings();
  };

  const handleLoadManifest = async () => {
    sound.playCursor();
    try {
      const res = await fetch('public/AndroidManifest.xml');
      if (res.ok) {
        const text = await res.text();
        setManifestContent(text);
        setShowManifestViewer(true);
      }
    } catch (err) {
      console.warn('Could not fetch AndroidManifest.xml', err);
    }
  };

  const handleDownloadManifest = () => {
    sound.playConfirm();
    const blob = new Blob([manifestContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AndroidManifest.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="ff9-window w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-400 pb-2.5">
          <div 
            className="flex items-center gap-2 text-amber-300 font-bold text-sm tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <Sliders size={18} />
            <span>Настройки приложения</span>
          </div>
          <button
            onClick={() => {
              sound.playCancel();
              onClose();
            }}
            className="p-1 rounded-lg bg-blue-950 border border-slate-400 text-slate-300 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* БЛОК: Доступ к файловой системе Android & SAF */}
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-blue-950/70 border border-slate-500 text-xs">
          <div className="flex items-center justify-between text-amber-300 font-bold">
            <div className="flex items-center gap-1.5">
              <Shield size={16} className="text-emerald-400" />
              <span>Доступ к файлам (Android SAF)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
              permissionState === 'granted' 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' 
                : 'bg-rose-500/20 text-rose-300 border-rose-400'
            }`}>
              {permissionState === 'granted' ? STORAGE_MESSAGES.STATUS_GRANTED : STORAGE_MESSAGES.STATUS_DENIED}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <Folder size={14} className="text-cyan-400 shrink-0" />
            <span className="truncate">Папка: <b className="text-cyan-200">{currentFolder}</b></span>
          </div>

          <div className="flex gap-2 mt-1">
            {permissionState !== 'granted' ? (
              <button
                onClick={handleRequestPermission}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg ff9-btn-gold text-[10px] font-bold text-slate-950"
              >
                <RefreshCw size={12} />
                <span>{STORAGE_MESSAGES.BTN_RETRY_PERMISSION}</span>
              </button>
            ) : null}

            <button
              onClick={handleOpenSettings}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg ff9-btn text-[10px] font-semibold text-slate-200 border-slate-400"
            >
              <ExternalLink size={12} className="text-amber-300" />
              <span>{STORAGE_MESSAGES.BTN_OPEN_SETTINGS}</span>
            </button>
          </div>

          <button
            onClick={handleLoadManifest}
            className="flex items-center justify-center gap-2 py-2 px-3 mt-1 rounded-lg bg-blue-900/80 hover:bg-blue-800 border border-slate-400 text-cyan-200 text-[11px] font-medium transition"
          >
            <FileCode size={14} className="text-amber-300" />
            <span>Просмотреть AndroidManifest.xml</span>
          </button>
        </div>

        {/* Настройки отображения иконок */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-200">Размер иконок управления</span>
            <span className="text-amber-300 font-mono">x{settings.iconScale.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={settings.iconScale}
            onChange={(e) => {
              sound.playCursor();
              onChange({ ...settings, iconScale: parseFloat(e.target.value) });
            }}
            className="w-full accent-amber-400 h-2 bg-blue-950 rounded-lg cursor-pointer border border-slate-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-200">Прозрачность иконок</span>
            <span className="text-amber-300 font-mono">
              {Math.round(settings.iconOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.iconOpacity}
            onChange={(e) => {
              sound.playCursor();
              onChange({ ...settings, iconOpacity: parseFloat(e.target.value) });
            }}
            className="w-full accent-amber-400 h-2 bg-blue-950 rounded-lg cursor-pointer border border-slate-400"
          />
        </div>

        <button
          onClick={() => {
            sound.playConfirm();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl ff9-btn-gold font-bold text-xs flex items-center justify-center gap-2 shadow-lg mt-1"
        >
          <Check size={16} />
          <span>Готово</span>
        </button>
      </div>

      {/* Модальное окно просмотра AndroidManifest.xml */}
      {showManifestViewer && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center backdrop-blur-md">
          <div className="ff9-window w-full max-w-lg p-5 flex flex-col gap-3 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-400 pb-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <FileCode size={16} />
                <span>AndroidManifest.xml (Android permissions)</span>
              </div>
              <button
                onClick={() => setShowManifestViewer(false)}
                className="p-1 rounded-lg bg-blue-950 text-slate-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <pre className="flex-1 overflow-auto p-3 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[10px] leading-relaxed border border-slate-700 selection:bg-amber-500 selection:text-black">
              {manifestContent}
            </pre>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadManifest}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl ff9-btn-gold text-slate-950 font-bold text-xs"
              >
                <Download size={14} />
                <span>Скачать AndroidManifest.xml</span>
              </button>
              <button
                onClick={() => setShowManifestViewer(false)}
                className="py-2 px-4 rounded-xl ff9-btn text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
