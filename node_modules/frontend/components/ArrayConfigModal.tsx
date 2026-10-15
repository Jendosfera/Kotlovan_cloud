import React, { useState } from 'react';
import { ArrowLeft, Check, Grid, Minus, Plus } from 'lucide-react';

interface ArrayConfigModalProps {
  onBack: () => void;
  onConfirm: (rows: number, cols: number, name: string) => void;
}

export const ArrayConfigModal: React.FC<ArrayConfigModalProps> = ({ onBack, onConfirm }) => {
  const [rows, setRows] = useState<number>(2);
  const [cols, setCols] = useState<number>(2);
  const [name, setName] = useState<string>('Новый чертежный массив');

  const handleConfirm = () => {
    onConfirm(rows, cols, name.trim() || 'Чертежный массив');
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-md mx-auto p-6 bg-slate-950 text-slate-100 border-x border-slate-800 select-none">
      {/* Top Bar with back arrow */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          aria-label="Назад"
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-800 transition"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="text-sm uppercase tracking-widest font-bold text-amber-400">Параметры массива</span>
        <div className="w-10"></div>
      </div>

      {/* Settings Form */}
      <div className="flex flex-col gap-6 my-auto">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-2 border border-amber-500/20">
            <Grid size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Размерность сетки</h2>
          <p className="text-xs text-slate-400 mt-1">
            Задайте количество строк и столбцов инженерных планов
          </p>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Название массива
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm font-medium"
            placeholder="Например: План 1-го этажа (Секция 1)"
          />
        </div>

        {/* Rows Counter */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-200">Количество строк</div>
            <div className="text-xs text-slate-400">Вертикальное направление (свайп вверх/вниз)</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRows((r) => Math.max(1, r - 1))}
              disabled={rows <= 1}
              className="w-10 h-10 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              <Minus size={18} />
            </button>
            <span className="w-8 text-center text-xl font-extrabold text-amber-400">{rows}</span>
            <button
              onClick={() => setRows((r) => Math.min(10, r + 1))}
              disabled={rows >= 10}
              className="w-10 h-10 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Cols Counter */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-200">Количество столбцов</div>
            <div className="text-xs text-slate-400">Горизонтальное направление (свайп влево/вправо)</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCols((c) => Math.max(1, c - 1))}
              disabled={cols <= 1}
              className="w-10 h-10 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              <Minus size={18} />
            </button>
            <span className="w-8 text-center text-xl font-extrabold text-amber-400">{cols}</span>
            <button
              onClick={() => setCols((c) => Math.min(10, c + 1))}
              disabled={cols >= 10}
              className="w-10 h-10 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Visual Mini Grid Preview */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col items-center gap-2">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Сетка: {rows} × {cols} ({rows * cols} чертежей)</span>
          <div
            className="grid gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: rows * cols }).map((_, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400"
              >
                {idx === 0 ? '+' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="pb-4">
        <button
          onClick={handleConfirm}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-base shadow-xl shadow-amber-950/50 transition-all"
        >
          <Check size={22} className="stroke-[3]" />
          <span>Подтвердить</span>
        </button>
      </div>
    </div>
  );
};
