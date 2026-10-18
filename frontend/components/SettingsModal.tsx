import React, { useState, useEffect } from 'react';
import { Sliders, X, Check, Shield, Folder, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { ViewerUISettings } from '../types';
import { sound } from '../services/soundService';
import {
  checkStoragePermission,
  requestStoragePermission,
  openAppSettings,
  StoragePermissionState,
} from '../services/permissionService';
import { getAttachedFolderName, chooseSaveLocationAndExport } from '../services/storageService';
import { STORAGE_MESSAGES } from '../constants';

interface SettingsModalProps {
  settings: ViewerUISettings;
  onChange: (s: ViewerUISettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [permissionState, setPermissionState] = useState<StoragePermissionState>('prompt');
  const [currentFolder, setCurrentFolder] = useState<string>(getAttachedFolderName() || STORAGE_MESSAGES.FOLDER_NOT_SET);

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
    </div>
  );
};
