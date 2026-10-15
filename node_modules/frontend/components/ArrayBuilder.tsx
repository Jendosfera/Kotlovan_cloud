import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
} from 'lucide-react';
import { BlueprintArray, CellData } from '../types';

interface ArrayBuilderProps {
  array: BlueprintArray;
  attachedFileName?: string | null;
  onBack: () => void;
  onOpenCellEditor: (row: number, col: number) => void;
  onSaveArray: () => Promise<void> | void;
  onStartViewer: () => void;
  onUpdateArray: (updated: BlueprintArray) => void;
}

export const ArrayBuilder: React.FC<ArrayBuilderProps> = ({
  array,
  attachedFileName,
  onBack,
  onOpenCellEditor,
  onSaveArray,
  onStartViewer,
  onUpdateArray,
}) => {
  const { cells } = array;
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Canvas viewport navigation (scale and translation)
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Swap / Move mode state
  const [swapSourceKey, setSwapSourceKey] = useState<string | null>(null);

  // Double tap detection tracker
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  // Long press timer
  const longPressTimerRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Touch gesture tracker
  const touchStateRef = useRef<{
    time: number;
    startTouches: { x: number; y: number }[];
    initialDist: number;
    initialScale: number;
    initialOffset: { x: number; y: number };
    isTwoFinger: boolean;
    hasMoved: boolean;
  } | null>(null);

  // Filled keys
  const filledKeys = Object.keys(cells);
  const hasAnyCell = filledKeys.length > 0;

  // Determine grid bounding box for rendering
  const { minR, maxR, minC, maxC } = useMemo(() => {
    if (!hasAnyCell) {
      return { minR: 0, maxR: 0, minC: 0, maxC: 0 };
    }
    let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    filledKeys.forEach((key) => {
      const cell = cells[key];
      if (cell.row < r0) r0 = cell.row;
      if (cell.row > r1) r1 = cell.row;
      if (cell.col < c0) c0 = cell.col;
      if (cell.col > c1) c1 = cell.col;
    });
    // Add 1 margin in all 4 directions for adjacent "+" buttons
    return {
      minR: r0 - 1,
      maxR: r1 + 1,
      minC: c0 - 1,
      maxC: c1 + 1,
    };
  }, [cells, filledKeys, hasAnyCell]);

  // Check if position (r, c) should display a 3D '+' button in 4 directions
  const isPlusSlot = useCallback(
    (r: number, c: number): boolean => {
      const key = `${r}_${c}`;
      if (cells[key]) return false; // Already filled

      if (!hasAnyCell) {
        return r === 0 && c === 0; // First initial cell
      }

      // 4 directions: top, bottom, left, right
      const hasTop = !!cells[`${r - 1}_${c}`];
      const hasBottom = !!cells[`${r + 1}_${c}`];
      const hasLeft = !!cells[`${r}_${c - 1}`];
      const hasRight = !!cells[`${r}_${c + 1}`];

      return hasTop || hasBottom || hasLeft || hasRight;
    },
    [cells, hasAnyCell]
  );

  // Center canvas on first load
  useEffect(() => {
    setCanvasOffset({ x: 0, y: 0 });
    setCanvasScale(1.0);
  }, []);

  /* ----------------- CANVAS TOUCH GESTURES (SCALE & DRAG) ----------------- */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
    const isTwo = touches.length >= 2;

    let initialDist = 0;
    if (isTwo) {
      initialDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
    }

    touchStateRef.current = {
      time: Date.now(),
      startTouches: touches,
      initialDist,
      initialScale: canvasScale,
      initialOffset: { ...canvasOffset },
      isTwoFinger: isTwo,
      hasMoved: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    if (!state) return;

    const currentTouches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));

    // Two-finger pinch to zoom & two-finger pan
    if (e.touches.length >= 2 && state.initialDist > 0) {
      state.hasMoved = true;
      const t0 = currentTouches[0];
      const t1 = currentTouches[1];
      const dist = Math.hypot(t0.x - t1.x, t0.y - t1.y);

      const scaleRatio = dist / state.initialDist;
      const newScale = Math.max(0.35, Math.min(3.5, state.initialScale * scaleRatio));

      // Pan offset
      const midX = (t0.x + t1.x) / 2;
      const midY = (t0.y + t1.y) / 2;
      const initMidX = (state.startTouches[0].x + state.startTouches[1].x) / 2;
      const initMidY = (state.startTouches[0].y + state.startTouches[1].y) / 2;

      setCanvasScale(newScale);
      setCanvasOffset({
        x: state.initialOffset.x + (midX - initMidX),
        y: state.initialOffset.y + (midY - initMidY),
      });
    } else if (e.touches.length === 1 && !swapSourceKey) {
      // Single finger drag to pan canvas across wide layouts
      const dx = currentTouches[0].x - state.startTouches[0].x;
      const dy = currentTouches[0].y - state.startTouches[0].y;
      if (Math.hypot(dx, dy) > 8) {
        state.hasMoved = true;
        setCanvasOffset({
          x: state.initialOffset.x + dx,
          y: state.initialOffset.y + dy,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = null;
  };

  // Wheel zoom for desktop / trackpad
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setCanvasScale((prev) => Math.max(0.35, Math.min(3.5, prev * factor)));
  };

  /* ----------------- CELL TAP / DOUBLE TAP / LONG PRESS ----------------- */
  const handleItemTouchStart = (key: string) => {
    // Start long-press timer for moving/swapping cells
    if (cells[key]) {
      longPressTimerRef.current = window.setTimeout(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate?.(45);
        }
        setSwapSourceKey(key);
      }, 550);
    }
  };

  const handleItemTouchEnd = (key: string, r: number, c: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If swap mode is currently active:
    if (swapSourceKey) {
      if (swapSourceKey === key) {
        // Tapped same cell -> cancel swap
        setSwapSourceKey(null);
        return;
      }
      // Swap contents of swapSourceKey and (r, c)
      handleSwapCells(swapSourceKey, r, c);
      setSwapSourceKey(null);
      return;
    }

    // Double tap detector
    const now = Date.now();
    if (lastTapRef.current?.id === key && now - lastTapRef.current.time < 380) {
      // DOUBLE TAP CONFIRMED -> Open create / edit
      onOpenCellEditor(r, c);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: key, time: now };
    }
  };

  /* ----------------- SWAP / MOVE CELLS LOGIC ----------------- */
  const handleSwapCells = (sourceKey: string, destR: number, destC: number) => {
    const destKey = `${destR}_${destC}`;
    const sourceCell = cells[sourceKey];
    if (!sourceCell) return;

    const destCell = cells[destKey];
    const newCells = { ...cells };

    if (destCell) {
      // Both cells exist -> swap payloads with updated row/col
      newCells[sourceKey] = {
        ...destCell,
        row: sourceCell.row,
        col: sourceCell.col,
      };
      newCells[destKey] = {
        ...sourceCell,
        row: destR,
        col: destC,
      };
    } else {
      // Destination is empty -> move source cell to dest
      delete newCells[sourceKey];
      newCells[destKey] = {
        ...sourceCell,
        row: destR,
        col: destC,
      };
    }

    // Recalculate dimensions
    const keys = Object.keys(newCells);
    let r0 = 0, r1 = 0, c0 = 0, c1 = 0;
    if (keys.length > 0) {
      r0 = Math.min(...keys.map((k) => newCells[k].row));
      r1 = Math.max(...keys.map((k) => newCells[k].row));
      c0 = Math.min(...keys.map((k) => newCells[k].col));
      c1 = Math.max(...keys.map((k) => newCells[k].col));
    }

    onUpdateArray({
      ...array,
      rows: Math.max(1, r1 - r0 + 1),
      cols: Math.max(1, c1 - c0 + 1),
      cells: newCells,
    });
  };

  const handleSaveClick = async () => {
    try {
      setIsSaving(true);
      await onSaveArray();
    } finally {
      setIsSaving(false);
    }
  };

  // Dimensions of grid items in pixels
  const itemW = 105;
  const itemH = 135;
  const gap = 16;

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-lg mx-auto bg-slate-950 text-slate-100 border-x border-slate-800 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md z-20">
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
            {hasAnyCell
              ? `Заполнено чертежей: ${filledKeys.length}`
              : 'Нажмите 2 раза на «+» для добавления чертежа'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setCanvasScale(1.0);
              setCanvasOffset({ x: 0, y: 0 });
            }}
            title="Сбросить вид"
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-amber-400 active:scale-95"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Storage and Swap HUD status */}
      <div className="z-20 px-4 pt-2 flex flex-col gap-1.5">
        {swapSourceKey && (
          <div className="p-2.5 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-between text-xs text-amber-200 animate-pulse shadow-lg">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-amber-400" />
              <span>Выберите другую ячейку или «+» для перемещения</span>
            </div>
            <button
              onClick={() => setSwapSourceKey(null)}
              className="p-1 rounded-lg bg-slate-900 text-slate-300 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {attachedFileName && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span className="text-slate-400">Файл массива:</span>
            <span className="font-semibold text-emerald-300 truncate">{attachedFileName}</span>
          </div>
        )}
      </div>

      {/* Pannable and Zoomable Interactive Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #38bdf8 1px, transparent 1px), radial-gradient(circle, #38bdf8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
          }}
        />

        {/* Viewport Transform Wrapper */}
        <div
          className="relative transition-transform duration-75 will-change-transform"
          style={{
            transform: `translate3d(${canvasOffset.x}px, ${canvasOffset.y}px, 0) scale(${canvasScale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Virtual Grid Container */}
          <div
            className="relative"
            style={{
              width: `${(maxC - minC + 1) * (itemW + gap)}px`,
              height: `${(maxR - minR + 1) * (itemH + gap)}px`,
            }}
          >
            {Array.from({ length: maxR - minR + 1 }).map((_, rIdx) => {
              const row = minR + rIdx;
              return Array.from({ length: maxC - minC + 1 }).map((_, cIdx) => {
                const col = minC + cIdx;
                const key = `${row}_${col}`;
                const cell = cells[key];
                const showPlus = isPlusSlot(row, col);
                const isSelectedForSwap = swapSourceKey === key;

                const leftPos = (col - minC) * (itemW + gap);
                const topPos = (row - minR) * (itemH + gap);

                if (cell) {
                  return (
                    <div
                      key={key}
                      style={{
                        position: 'absolute',
                        left: `${leftPos}px`,
                        top: `${topPos}px`,
                        width: `${itemW}px`,
                        height: `${itemH}px`,
                      }}
                      onTouchStart={() => handleItemTouchStart(key)}
                      onTouchEnd={() => handleItemTouchEnd(key, row, col)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSwapSourceKey(key);
                      }}
                      className={`relative flex flex-col items-center justify-between p-2 rounded-2xl bg-slate-900 border-2 cursor-pointer shadow-xl transition-all ${
                        isSelectedForSwap
                          ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105 z-10 animate-pulse bg-slate-850'
                          : 'border-amber-500/70 hover:border-amber-400 active:scale-95'
                      }`}
                    >
                      <div className="w-full flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>[{row + 1},{col + 1}]</span>
                        {cell.comments.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                            {cell.comments.length}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden my-1 flex items-center justify-center relative">
                        {cell.imageDataUrl ? (
                          <img
                            src={cell.imageDataUrl}
                            alt={cell.title}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <ImageIcon size={20} className="text-slate-600" />
                        )}
                      </div>

                      <div className="w-full text-center truncate text-[10px] font-bold text-slate-200">
                        {cell.title || `Чертеж ${row + 1}-${col + 1}`}
                      </div>

                      <div className="text-[8px] text-slate-500 uppercase tracking-tight">
                        Двойной тап: ред.
                      </div>
                    </div>
                  );
                }

                if (showPlus) {
                  return (
                    <div
                      key={key}
                      style={{
                        position: 'absolute',
                        left: `${leftPos}px`,
                        top: `${topPos}px`,
                        width: `${itemW}px`,
                        height: `${itemH}px`,
                      }}
                      onTouchStart={() => handleItemTouchStart(key)}
                      onTouchEnd={() => handleItemTouchEnd(key, row, col)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all ${
                        swapSourceKey
                          ? 'bg-amber-500/10 border-2 border-dashed border-amber-400/80 hover:bg-amber-500/20 active:scale-95'
                          : 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-2 border-slate-700/80 shadow-[0_6px_0_0_#1e293b,0_10px_16px_rgba(0,0,0,0.6)] hover:border-amber-400/80 active:translate-y-[4px] active:shadow-[0_2px_0_0_#1e293b]'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-110">
                        <Plus size={26} className="stroke-[3]" />
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 mt-2">
                        {swapSourceKey ? 'Сюда' : `[${row + 1},${col + 1}]`}
                      </span>
                      <span className="text-[8px] text-slate-500">
                        {swapSourceKey ? 'Переместить' : 'Двойной тап'}
                      </span>
                    </div>
                  );
                }

                return null;
              });
            })}
          </div>
        </div>

        {/* Floating Zoom Controls for Convenience */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => setCanvasScale((s) => Math.min(3.5, s + 0.25))}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-400 shadow-xl active:scale-95"
            title="Приблизить"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setCanvasScale((s) => Math.max(0.35, s - 0.25))}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-400 shadow-xl active:scale-95"
            title="Отдалить"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-2 backdrop-blur-md z-20">
        <div className="flex gap-3">
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-sm border border-slate-700 disabled:opacity-50 transition"
          >
            <HardDrive size={18} className="text-amber-400" />
            <span>{isSaving ? 'Выбор места...' : 'Сохранить массив'}</span>
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

        <div className="text-center text-[10px] text-slate-500">
          Двойной тап: открыть ячейку • Долгое нажатие: обмен местами • Щипок: зум и перемещение
        </div>
      </div>
    </div>
  );
};
