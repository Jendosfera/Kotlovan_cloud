import React from 'react';
import { ArrowLeft, Save, Play, Plus, Image as ImageIcon } from 'lucide-react';
import { BlueprintArray } from '../types';

interface ArrayBuilderProps {
  array: BlueprintArray;
  onBack: () => void;
  onOpenCellEditor: (row: number, col: number) => void;
  onSaveArray: () => void;
  onStartViewer: () => void;
}

export const ArrayBuilder: React.FC<ArrayBuilderProps> = ({
  array,
  onBack,
  onOpenCellEditor,
  onSaveArray,
  onStartViewer,
}) => {
  const { rows, cols, cells } = array;

  // Determine which cells have content or should display the 3D "+" button
  const hasAnyCell = Object.keys(cells).length > 0;

  // Check if cell at (r, c) should display a 3D '+' button
  const shouldShowPlus = (r: number, c: number): boolean => {
    // If array is totally empty, only the first cell (0, 0) shows the '+' button
    if (!hasAnyCell) {
      return r === 0 && c === 0;
    }

    const key = `${r}_${c}`;
    if (cells[key]) return false; // Already filled

    // Show '+' if left cell or top cell is filled
    const leftFilled = c > 0 && !!cells[`${r}_${c - 1}`];
    const topFilled = r > 0 && !!cells[`${r - 1}_${c}`];

    return leftFilled || topFilled;
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-lg mx-auto bg-slate-950 text-slate-100 border-x border-slate-800 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm z-10">
        <button
          onClick={onBack}
          aria-label="Назад"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 border border-slate-700 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center px-2 truncate">
          <div className="text-xs uppercase tracking-wider font-extrabold text-amber-400 truncate">
            {array.name}
          </div>
          <div className="text-[11px] text-slate-400">
            Размерность: {rows} строк × {cols} столбцов
          </div>
        </div>
        <div className="w-9"></div>
      </div>

      {/* Visual Array Grid */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div
          className="grid gap-4 max-w-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(80px, 110px))`,
          }}
        >
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const key = `${r}_${c}`;
              const cell = cells[key];
              const showPlus = shouldShowPlus(r, c);

              if (cell) {
                // Filled cell with card preview
                return (
                  <button
                    key={key}
                    onClick={() => onOpenCellEditor(r, c)}
                    className="relative flex flex-col items-center justify-between w-full aspect-[4/5] p-2 rounded-2xl bg-slate-900 border-2 border-amber-500/70 shadow-lg shadow-black/50 hover:border-amber-400 active:scale-95 transition-all overflow-hidden group"
                  >
                    <div className="w-full flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>[{r + 1},{c + 1}]</span>
                      {cell.comments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          {cell.comments.length}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden my-1 flex items-center justify-center relative">
                      {cell.imageDataUrl ? (
                        <img
                          src={cell.imageDataUrl}
                          alt={cell.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ImageIcon size={20} className="text-slate-600" />
                      )}
                    </div>

                    <div className="w-full text-center truncate text-[11px] font-bold text-slate-200">
                      {cell.title || `Чертеж ${r + 1}-${c + 1}`}
                    </div>
                  </button>
                );
              }

              if (showPlus) {
                // Embossed 3D tactile "+" button
                return (
                  <button
                    key={key}
                    onClick={() => onOpenCellEditor(r, c)}
                    className="relative flex flex-col items-center justify-center w-full aspect-[4/5] rounded-2xl bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-2 border-slate-700/80 shadow-[0_6px_0_0_#1e293b,0_12px_20px_rgba(0,0,0,0.6)] hover:border-amber-400/80 active:translate-y-[4px] active:shadow-[0_2px_0_0_#1e293b] text-amber-400 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center group-hover:scale-110 group-hover:text-amber-300 transition-all shadow-inner">
                      <Plus size={28} className="stroke-[3]" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-2">
                      [{r + 1},{c + 1}]
                    </span>
                  </button>
                );
              }

              // Invisible placeholder for unfilled distant cells
              return (
                <div
                  key={key}
                  className="w-full aspect-[4/5] rounded-2xl border border-dashed border-slate-800/40 opacity-20 pointer-events-none"
                />
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex gap-3 backdrop-blur-sm">
        <button
          onClick={onSaveArray}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-sm border border-slate-700 transition"
        >
          <Save size={18} className="text-amber-400" />
          <span>Сохранить массив</span>
        </button>

        {hasAnyCell && (
          <button
            onClick={onStartViewer}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/40 transition"
          >
            <Play size={18} className="fill-slate-950" />
            <span>В просмотр</span>
          </button>
        )}
      </div>
    </div>
  );
};
