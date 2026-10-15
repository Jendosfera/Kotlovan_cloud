import React from 'react';
import { Sliders, X, Check } from 'lucide-react';
import { ViewerUISettings } from '../types';

interface SettingsModalProps {
  settings: ViewerUISettings;
  onChange: (s: ViewerUISettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-5 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sliders size={18} />
            <span>Настройки интерфейса</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Icon Scale Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">Размер иконок</span>
            <span className="text-amber-400 font-mono">x{settings.iconScale.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={settings.iconScale}
            onChange={(e) =>
              onChange({ ...settings, iconScale: parseFloat(e.target.value) })
            }
            className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>x0.1</span>
            <span>x1.0</span>
            <span>x3.0</span>
          </div>
        </div>

        {/* Icon Opacity Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">Прозрачность иконок</span>
            <span className="text-amber-400 font-mono">
              {Math.round(settings.iconOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.iconOpacity}
            onChange={(e) =>
              onChange({ ...settings, iconOpacity: parseFloat(e.target.value) })
            }
            className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
        >
          <Check size={16} />
          <span>Готово</span>
        </button>
      </div>
    </div>
  );
};
