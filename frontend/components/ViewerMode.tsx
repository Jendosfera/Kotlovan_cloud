import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Flashlight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Info,
  MapPin,
  X,
} from 'lucide-react';
import {
  BlueprintArray,
  CellData,
  CommentCircle,
  EyeDisplayMode,
  ViewerUISettings,
} from '../types';
import { toggleDeviceTorch } from '../services/torchService';
import { SettingsModal } from './SettingsModal';
import { CommentModal } from './CommentModal';

interface ViewerModeProps {
  array: BlueprintArray;
  onBack: () => void;
  onUpdateArray: (updated: BlueprintArray) => void;
}

export const ViewerMode: React.FC<ViewerModeProps> = ({
  array,
  onBack,
  onUpdateArray,
}) => {
  // Current active cell coordinates in matrix
  const [currentCoord, setCurrentCoord] = useState<{ row: number; col: number }>(
    array.lastViewedCell || { row: 0, col: 0 }
  );

  // Viewport transforms (offset in screen pixels, scale multiplier)
  const [scale, setScale] = useState<number>(array.globalScale || 1.0);
  const [offsetX, setOffsetX] = useState<number>(array.globalOffsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(array.globalOffsetY || 0);

  // Sub-modes
  const [isSettingCommonPoint, setIsSettingCommonPoint] = useState<boolean>(false);
  const [isSettingComment, setIsSettingComment] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Comment editing state
  const [editingComment, setEditingComment] = useState<{
    comment: Partial<CommentCircle>;
    isNew: boolean;
  } | null>(null);
  const [readingComment, setReadingComment] = useState<CommentCircle | null>(null);

  // Eye display mode (cycled by double tap on eye)
  const [eyeMode, setEyeMode] = useState<EyeDisplayMode>(EyeDisplayMode.STANDARD);

  // UI customization settings
  const [uiSettings, setUiSettings] = useState<ViewerUISettings>({
    iconScale: 1.0,
    iconOpacity: 0.9,
  });

  // Torch state & feedback
  const [isTorchActive, setIsTorchActive] = useState<boolean>(false);
  const [torchFlashScreen, setTorchFlashScreen] = useState<boolean>(false);

  // Container refs for measuring and touch gestures
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{
    time: number;
    touches: { x: number; y: number }[];
    initialDist: number;
    initialScale: number;
    initialOffset: { x: number; y: number };
    isTwoFinger: boolean;
    hasMoved: boolean;
  } | null>(null);

  // Tap timers for double-tap detection
  const lastEyeTapTimeRef = useRef<number>(0);
  const lastFlashlightTapTimeRef = useRef<number>(0);
  const commentTapTimeRef = useRef<{ id: string; time: number } | null>(null);
  const commentLongPressTimerRef = useRef<number | null>(null);

  // Current cell data
  const currentKey = `${currentCoord.row}_${currentCoord.col}`;
  const currentCell: CellData | undefined = array.cells[currentKey];

  // Ensure default "Общая точка" is set to center of image if never set
  useEffect(() => {
    if (!currentCell) return;
    if (!currentCell.commonPoint && !currentCell.customPosition) {
      const defaultCenter = {
        x: Math.round((currentCell.imageWidth || 1200) / 2),
        y: Math.round((currentCell.imageHeight || 800) / 2),
      };
      const updatedCells = {
        ...array.cells,
        [currentKey]: {
          ...currentCell,
          commonPoint: defaultCenter,
        },
      };
      onUpdateArray({ ...array, cells: updatedCells });
    }
  }, [currentKey, currentCell, array, onUpdateArray]);

  // Load cell specific viewport if it has customPosition === true
  useEffect(() => {
    if (currentCell?.customPosition && currentCell.viewport) {
      setScale(currentCell.viewport.scale);
      setOffsetX(currentCell.viewport.offsetX);
      setOffsetY(currentCell.viewport.offsetY);
    }
  }, [currentCoord.row, currentCoord.col]);

  // Persist global scale/offset and cell viewport
  const persistViewport = useCallback(
    (newScale: number, newX: number, newY: number) => {
      if (!currentCell) return;

      if (currentCell.customPosition) {
        const updatedCells = {
          ...array.cells,
          [currentKey]: {
            ...currentCell,
            viewport: { scale: newScale, offsetX: newX, offsetY: newY },
          },
        };
        onUpdateArray({
          ...array,
          lastViewedCell: currentCoord,
          cells: updatedCells,
        });
      } else {
        onUpdateArray({
          ...array,
          lastViewedCell: currentCoord,
          globalScale: newScale,
          globalOffsetX: newX,
          globalOffsetY: newY,
        });
      }
    },
    [array, currentCell, currentKey, currentCoord, onUpdateArray]
  );

  // Navigation between array cells
  const goToCell = useCallback(
    (r: number, c: number) => {
      if (r < 0 || r >= array.rows || c < 0 || c >= array.cols) return;
      const key = `${r}_${c}`;
      if (!array.cells[key]) return; // empty cell, skip

      setCurrentCoord({ row: r, col: c });
      onUpdateArray({
        ...array,
        lastViewedCell: { row: r, col: c },
      });
    },
    [array, onUpdateArray]
  );

  // Helpers to get image center coordinates relative to "Общая точка"
  const getAnchor = (): { x: number; y: number } => {
    if (currentCell?.commonPoint) {
      return currentCell.commonPoint;
    }
    return {
      x: (currentCell?.imageWidth || 1200) / 2,
      y: (currentCell?.imageHeight || 800) / 2,
    };
  };

  /* ----------------- GESTURE CONTROLLER ----------------- */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
    const isTwo = touches.length >= 2;

    let initialDist = 0;
    if (isTwo) {
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      initialDist = Math.hypot(dx, dy);
    }

    touchStartRef.current = {
      time: Date.now(),
      touches,
      initialDist,
      initialScale: scale,
      initialOffset: { x: offsetX, y: offsetY },
      isTwoFinger: isTwo,
      hasMoved: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;

    const currentTouches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));

    // Two-finger pinch zoom & two-finger drag
    if (e.touches.length >= 2 && start.isTwoFinger) {
      const dx = currentTouches[0].x - currentTouches[1].x;
      const dy = currentTouches[0].y - currentTouches[1].y;
      const dist = Math.hypot(dx, dy);

      if (start.initialDist > 0) {
        // Pinch Zoom relative to midpoint
        const pinchFactor = dist / start.initialDist;
        const targetScale = Math.max(0.15, Math.min(12, start.initialScale * pinchFactor));

        // Midpoint of current fingers
        const midX = (currentTouches[0].x + currentTouches[1].x) / 2;
        const midY = (currentTouches[0].y + currentTouches[1].y) / 2;
        const initialMidX = (start.touches[0].x + start.touches[1].x) / 2;
        const initialMidY = (start.touches[0].y + start.touches[1].y) / 2;

        // Two-finger pan offset
        const panDx = midX - initialMidX;
        const panDy = midY - initialMidY;

        setScale(targetScale);
        setOffsetX(start.initialOffset.x + panDx);
        setOffsetY(start.initialOffset.y + panDy);
        start.hasMoved = true;
      }
    } else if (e.touches.length === 1 && !start.isTwoFinger) {
      // Single finger drag tracking for swipe detection
      start.hasMoved = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    // Single-finger swipe detection
    if (!start.isTwoFinger && e.changedTouches.length === 1) {
      const endTouch = e.changedTouches[0];
      const startTouch = start.touches[0];
      const dx = endTouch.clientX - startTouch.x;
      const dy = endTouch.clientY - startTouch.y;
      const dist = Math.hypot(dx, dy);
      const timeDiff = Date.now() - start.time;

      // Swipes trigger regardless of zoom level
      if (dist > 45 && timeDiff < 600) {
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe: next/prev column
          if (dx < 0) {
            goToCell(currentCoord.row, currentCoord.col + 1);
          } else {
            goToCell(currentCoord.row, currentCoord.col - 1);
          }
        } else {
          // Vertical swipe: next/prev row
          if (dy < 0) {
            goToCell(currentCoord.row + 1, currentCoord.col);
          } else {
            goToCell(currentCoord.row - 1, currentCoord.col);
          }
        }
        return;
      }
    }

    // Persist scale/offsets if two-finger moved
    if (start.hasMoved && start.isTwoFinger) {
      persistViewport(scale, offsetX, offsetY);
    }
  };

  // Mouse wheel zoom for desktop development/testing
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.15, Math.min(12, scale * factor));
    setScale(newScale);
    persistViewport(newScale, offsetX, offsetY);
  };

  /* ----------------- EYE ICON DOUBLE TAP CYCLING ----------------- */
  const handleEyeTap = () => {
    const now = Date.now();
    if (now - lastEyeTapTimeRef.current < 450) {
      // Double tap detected! Cycle mode
      setEyeMode((prev) => {
        if (prev === EyeDisplayMode.STANDARD) return EyeDisplayMode.BLINKING;
        if (prev === EyeDisplayMode.BLINKING) return EyeDisplayMode.UNIFORM_SIZE;
        return EyeDisplayMode.STANDARD;
      });
      lastEyeTapTimeRef.current = 0;
    } else {
      lastEyeTapTimeRef.current = now;
    }
  };

  /* ----------------- FLASHLIGHT DOUBLE TAP ----------------- */
  const handleFlashlightTap = async () => {
    const now = Date.now();
    if (now - lastFlashlightTapTimeRef.current < 450) {
      // Double tap detected! Toggle flashlight
      const res = await toggleDeviceTorch();
      if (res.success) {
        setIsTorchActive(res.isTorchOn);
      } else {
        // Fallback: screen flashlight overlay toggle
        setTorchFlashScreen((prev) => !prev);
        setIsTorchActive((prev) => !prev);
      }
      lastFlashlightTapTimeRef.current = 0;
    } else {
      lastFlashlightTapTimeRef.current = now;
    }
  };

  /* ----------------- "ОБЩАЯ ТОЧКА" CONFIRMATION ----------------- */
  const handleConfirmCommonPoint = () => {
    if (!currentCell) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const screenCenterX = (rect?.width || window.innerWidth) / 2;
    const screenCenterY = (rect?.height || window.innerHeight) / 2;

    // Calculate image coordinate currently sitting at the center of viewport
    const anchor = getAnchor();
    const imgX = anchor.x + (screenCenterX - (screenCenterX + offsetX)) / scale;
    const imgY = anchor.y + (screenCenterY - (screenCenterY + offsetY)) / scale;

    const newPoint = {
      x: Math.round(Math.max(0, Math.min(currentCell.imageWidth, imgX))),
      y: Math.round(Math.max(0, Math.min(currentCell.imageHeight, imgY))),
    };

    const updatedCell: CellData = {
      ...currentCell,
      commonPoint: newPoint,
    };

    onUpdateArray({
      ...array,
      cells: {
        ...array.cells,
        [currentKey]: updatedCell,
      },
    });

    // Reset center offset relative to the newly set anchor
    setOffsetX(0);
    setOffsetY(0);
    setIsSettingCommonPoint(false);
  };

  /* ----------------- "УСТАНОВИТЬ КОММЕНТАРИЙ" CONFIRMATION ----------------- */
  const handleConfirmCommentCirclePosition = () => {
    if (!currentCell) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const screenCenterX = (rect?.width || window.innerWidth) / 2;
    const screenCenterY = (rect?.height || window.innerHeight) / 2;

    const anchor = getAnchor();
    const imgX = anchor.x + (screenCenterX - (screenCenterX + offsetX)) / scale;
    const imgY = anchor.y + (screenCenterY - (screenCenterY + offsetY)) / scale;

    // Visual radius in screen pixels is 32px; convert to drawing units
    const radiusInDrawingUnits = 32 / scale;

    const newComment: Partial<CommentCircle> = {
      id: `comm_${Date.now()}`,
      x: Math.round(imgX),
      y: Math.round(imgY),
      radius: radiusInDrawingUnits,
      title: '',
      text: '',
      createdAt: Date.now(),
    };

    setIsSettingComment(false);
    setEditingComment({ comment: newComment, isNew: true });
  };

  /* ----------------- COMMENT CIRCLE TOUCH HANDLERS ----------------- */
  const handleCommentCircleTouchStart = (c: CommentCircle) => {
    commentLongPressTimerRef.current = window.setTimeout(() => {
      // Long press triggers edit modal
      setEditingComment({ comment: c, isNew: false });
    }, 600);
  };

  const handleCommentCircleTouchEnd = (c: CommentCircle) => {
    if (commentLongPressTimerRef.current) {
      clearTimeout(commentLongPressTimerRef.current);
      commentLongPressTimerRef.current = null;
    }

    const now = Date.now();
    if (commentTapTimeRef.current?.id === c.id && now - commentTapTimeRef.current.time < 400) {
      // Double tap on comment circle -> view full comment note
      setReadingComment(c);
      commentTapTimeRef.current = null;
    } else {
      commentTapTimeRef.current = { id: c.id, time: now };
    }
  };

  /* ----------------- SAVE / DELETE COMMENT ----------------- */
  const handleSaveComment = (title: string, text: string) => {
    if (!editingComment || !currentCell) return;
    const target = editingComment.comment;

    let updatedComments: CommentCircle[];
    if (editingComment.isNew) {
      const full: CommentCircle = {
        id: target.id || `c_${Date.now()}`,
        x: target.x || 0,
        y: target.y || 0,
        radius: target.radius || 30,
        title,
        text,
        createdAt: target.createdAt || Date.now(),
      };
      updatedComments = [...currentCell.comments, full];
    } else {
      updatedComments = currentCell.comments.map((c) =>
        c.id === target.id ? { ...c, title, text } : c
      );
    }

    onUpdateArray({
      ...array,
      cells: {
        ...array.cells,
        [currentKey]: {
          ...currentCell,
          comments: updatedComments,
        },
      },
    });

    setEditingComment(null);
  };

  const handleDeleteComment = () => {
    if (!editingComment || !currentCell) return;
    const targetId = editingComment.comment.id;
    const updated = currentCell.comments.filter((c) => c.id !== targetId);

    onUpdateArray({
      ...array,
      cells: {
        ...array.cells,
        [currentKey]: {
          ...currentCell,
          comments: updated,
        },
      },
    });

    setEditingComment(null);
  };

  // Toggle "Свое положение" in context menu
  const handleToggleCustomPosition = () => {
    if (!currentCell) return;
    const nextVal = !currentCell.customPosition;
    const updated: CellData = {
      ...currentCell,
      customPosition: nextVal,
      viewport: nextVal
        ? { scale, offsetX, offsetY }
        : undefined,
    };
    onUpdateArray({
      ...array,
      cells: {
        ...array.cells,
        [currentKey]: updated,
      },
    });
    setShowContextMenu(false);
  };

  const anchor = getAnchor();
  const isSpecialMode = isSettingCommonPoint || isSettingComment;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-slate-950 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Screen Flashlight Emulator */}
      {torchFlashScreen && (
        <div className="absolute inset-0 bg-white z-[999] opacity-95 pointer-events-none transition-opacity" />
      )}

      {/* Drawing Viewport Layer */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center will-change-transform"
        style={{
          transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
        }}
      >
        {currentCell?.imageDataUrl ? (
          <div
            className="relative"
            style={{
              width: `${currentCell.imageWidth}px`,
              height: `${currentCell.imageHeight}px`,
              transform: `scale(${scale}) translate3d(${-anchor.x + (currentCell.imageWidth / 2)}px, ${-anchor.y + (currentCell.imageHeight / 2)}px, 0)`,
              transformOrigin: `${anchor.x}px ${anchor.y}px`,
            }}
          >
            {/* Base blueprint image */}
            <img
              src={currentCell.imageDataUrl}
              alt={currentCell.title}
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Independent Comment Layer on top of the drawing */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              style={{ overflow: 'visible' }}
            >
              {currentCell.comments.map((comm) => {
                // Circle visual sizing per eye mode
                const r =
                  eyeMode === EyeDisplayMode.UNIFORM_SIZE
                    ? 32 / scale
                    : comm.radius;

                // Blinking opacity in mode 2
                const circleClass =
                  eyeMode === EyeDisplayMode.BLINKING
                    ? 'animate-pulse fill-amber-500/40 stroke-amber-300 stroke-2'
                    : 'fill-amber-500/25 stroke-amber-400 stroke-2';

                // Scaled label text size
                const fontSize = Math.max(12 / scale, r * 0.45);

                return (
                  <g
                    key={comm.id}
                    className="cursor-pointer pointer-events-auto"
                    onTouchStart={() => handleCommentCircleTouchStart(comm)}
                    onTouchEnd={() => handleCommentCircleTouchEnd(comm)}
                    onDoubleClick={() => setReadingComment(comm)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setEditingComment({ comment: comm, isNew: false });
                    }}
                  >
                    {/* Circle Anchor */}
                    <circle
                      cx={comm.x}
                      cy={comm.y}
                      r={r}
                      className={circleClass}
                    />
                    <circle
                      cx={comm.x}
                      cy={comm.y}
                      r={Math.max(2, 4 / scale)}
                      fill="#f59e0b"
                    />

                    {/* Short Title Label above circle */}
                    {comm.title && (
                      <text
                        x={comm.x}
                        y={comm.y - r - 6 / scale}
                        textAnchor="middle"
                        fill="#fde68a"
                        fontSize={fontSize}
                        fontWeight="bold"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      >
                        {comm.title}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Visual mark for "Общая точка" (subtle guide) */}
              {currentCell.commonPoint && (
                <g opacity={0.65}>
                  <circle
                    cx={currentCell.commonPoint.x}
                    cy={currentCell.commonPoint.y}
                    r={8 / scale}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth={2 / scale}
                    strokeDasharray={`${3 / scale},${3 / scale}`}
                  />
                  <line
                    x1={currentCell.commonPoint.x - 14 / scale}
                    y1={currentCell.commonPoint.y}
                    x2={currentCell.commonPoint.x + 14 / scale}
                    y2={currentCell.commonPoint.y}
                    stroke="#06b6d4"
                    strokeWidth={1.5 / scale}
                  />
                  <line
                    x1={currentCell.commonPoint.x}
                    y1={currentCell.commonPoint.y - 14 / scale}
                    x2={currentCell.commonPoint.x}
                    y2={currentCell.commonPoint.y + 14 / scale}
                    stroke="#06b6d4"
                    strokeWidth={1.5 / scale}
                  />
                </g>
              )}
            </svg>
          </div>
        ) : (
          <div className="text-slate-500 text-sm">Чертеж не загружен в ячейку</div>
        )}
      </div>

      {/* Pulsating Target Circle in Center during Setting Modes */}
      {isSpecialMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="relative flex items-center justify-center">
            {/* Pulsating ring */}
            <div className="w-16 h-16 rounded-full border-2 border-amber-400 animate-target-pulse bg-amber-400/20" />
            {/* Center crosshair point */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
            <div className="absolute w-10 h-0.5 bg-amber-400/70" />
            <div className="absolute h-10 w-0.5 bg-amber-400/70" />
            <span className="absolute -top-7 text-[11px] font-bold text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded bg-black/70">
              {isSettingCommonPoint ? 'Общая точка' : 'Кружок комментария'}
            </span>
          </div>
        </div>
      )}

      {/* TOP LEFT: Back button (always visible) */}
      <div
        className="absolute top-4 left-4 z-40 transition-transform"
        style={{
          transform: `scale(${uiSettings.iconScale})`,
          opacity: uiSettings.iconOpacity,
        }}
      >
        <button
          onClick={
            isSpecialMode
              ? () => {
                  setIsSettingCommonPoint(false);
                  setIsSettingComment(false);
                }
              : onBack
          }
          className="p-3 rounded-2xl bg-slate-900/90 text-slate-200 border border-slate-700/80 shadow-xl active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
      </div>

      {/* TOP MIDDLE: Flashlight Icon (double-tap activates) */}
      {!isSpecialMode && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 transition-transform"
          style={{
            transform: `translateX(-50%) scale(${uiSettings.iconScale})`,
            opacity: uiSettings.iconOpacity,
          }}
        >
          <button
            onClick={handleFlashlightTap}
            className={`p-3 rounded-2xl border shadow-xl active:scale-95 transition-all ${
              isTorchActive
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80'
            }`}
            title="Двойное касание включает фонарик"
          >
            <Flashlight size={20} className={isTorchActive ? 'animate-bounce' : ''} />
          </button>
        </div>
      )}

      {/* TOP RIGHT: Context Menu Icon */}
      {!isSpecialMode && (
        <div
          className="absolute top-4 right-4 z-40 transition-transform"
          style={{
            transform: `scale(${uiSettings.iconScale})`,
            opacity: uiSettings.iconOpacity,
          }}
        >
          <button
            onClick={() => setShowContextMenu((prev) => !prev)}
            className="p-3 rounded-2xl bg-slate-900/90 text-slate-200 border border-slate-700/80 shadow-xl active:scale-95"
          >
            <MoreVertical size={22} />
          </button>
        </div>
      )}

      {/* Context Menu Popup */}
      {showContextMenu && !isSpecialMode && (
        <div className="absolute top-16 right-4 z-50 w-64 rounded-2xl bg-slate-900/95 border border-slate-750 shadow-2xl p-2 flex flex-col gap-1 text-xs text-slate-200 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {/* Item 1: Общая точка */}
          <button
            onClick={() => {
              setShowContextMenu(false);
              setIsSettingCommonPoint(true);
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 active:bg-slate-750 text-left font-semibold text-slate-200 transition"
          >
            <MapPin size={18} className="text-cyan-400 shrink-0" />
            <span>Общая точка</span>
          </button>

          {/* Item 2: Свое положение */}
          <button
            onClick={handleToggleCustomPosition}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 active:bg-slate-750 text-left font-semibold text-slate-200 transition"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <span>Свое положение</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentCell?.customPosition
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentCell?.customPosition ? 'true' : 'false'}
            </span>
          </button>

          {/* Item 3: Установить комментарий */}
          <button
            onClick={() => {
              setShowContextMenu(false);
              setIsSettingComment(true);
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 active:bg-slate-750 text-left font-semibold text-slate-200 transition"
          >
            <span className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0 flex items-center justify-center text-[9px] font-bold text-amber-400">
              +
            </span>
            <span>Установить комментарий</span>
          </button>

          {/* Item 4: Настройки */}
          <button
            onClick={() => {
              setShowContextMenu(false);
              setShowSettingsModal(true);
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 active:bg-slate-750 text-left font-semibold text-slate-200 transition border-t border-slate-800 mt-1"
          >
            <span className="text-slate-400 text-base leading-none">⚙</span>
            <span>Настройки</span>
          </button>
        </div>
      )}

      {/* BOTTOM LEFT: Eye Icon (Modes cycled by double-tap) OR Confirm Checkmark in setting modes */}
      <div
        className="absolute bottom-6 left-6 z-40 transition-transform"
        style={{
          transform: `scale(${uiSettings.iconScale})`,
          opacity: uiSettings.iconOpacity,
        }}
      >
        {isSpecialMode ? (
          <button
            onClick={
              isSettingCommonPoint
                ? handleConfirmCommonPoint
                : handleConfirmCommentCirclePosition
            }
            className="p-4 rounded-2xl bg-amber-500 text-slate-950 shadow-2xl active:scale-95 border-2 border-amber-300 font-extrabold flex items-center justify-center"
            title="Подтвердить позицию"
          >
            <Check size={28} className="stroke-[3.5]" />
          </button>
        ) : (
          <button
            onClick={handleEyeTap}
            className={`p-3.5 rounded-2xl border shadow-xl active:scale-95 transition-all flex items-center justify-center ${
              eyeMode === EyeDisplayMode.BLINKING
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : eyeMode === EyeDisplayMode.UNIFORM_SIZE
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
            }`}
            title="Двойное касание переключает режим кружков"
          >
            {/* Precise Eye SVG Icons matching the 3 modes */}
            {eyeMode === EyeDisplayMode.STANDARD && (
              // Mode 1: Half-closed eye
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7" />
                <path d="M5 12c1.5 2 4 3 7 3s5.5-1 7-3" />
                <circle cx="12" cy="12" r="3" />
                <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" strokeDasharray="2,2"/>
              </svg>
            )}

            {eyeMode === EyeDisplayMode.BLINKING && (
              // Mode 2: Open eye, pupil contracted (pulsating mode)
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            )}

            {eyeMode === EyeDisplayMode.UNIFORM_SIZE && (
              // Mode 3: Open eye, pupil dilated (uniform screen size mode)
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="4.5" fill="currentColor" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* BOTTOM CENTER: Current plan indicator and arrow navigation helpers */}
      {!isSpecialMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-xl pointer-events-auto">
          {/* Left Arrow */}
          <button
            onClick={() => goToCell(currentCoord.row, currentCoord.col - 1)}
            disabled={currentCoord.col === 0}
            className="disabled:opacity-20 hover:text-amber-400 p-0.5"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="truncate max-w-[140px] text-center text-slate-200">
            {currentCell?.title || `Чертеж [${currentCoord.row + 1}, ${currentCoord.col + 1}]`}
          </span>

          {/* Right Arrow */}
          <button
            onClick={() => goToCell(currentCoord.row, currentCoord.col + 1)}
            disabled={currentCoord.col >= array.cols - 1}
            className="disabled:opacity-20 hover:text-amber-400 p-0.5"
          >
            <ChevronRight size={16} />
          </button>

          <div className="h-3 w-px bg-slate-700 mx-0.5" />

          {/* Vertical navigation indicators */}
          <div className="flex flex-col">
            <button
              onClick={() => goToCell(currentCoord.row - 1, currentCoord.col)}
              disabled={currentCoord.row === 0}
              className="disabled:opacity-20 hover:text-amber-400 leading-none"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={() => goToCell(currentCoord.row + 1, currentCoord.col)}
              disabled={currentCoord.row >= array.rows - 1}
              className="disabled:opacity-20 hover:text-amber-400 leading-none"
            >
              <ChevronDown size={12} />
            </button>
          </div>
        </div>
      )}

      {/* FULL NOTE READER MODAL (Double Tap on Circle) */}
      {readingComment && (
        <div className="absolute inset-0 bg-black/80 z-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Info size={18} />
                <span>{readingComment.title || 'Комментарий к чертежу'}</span>
              </div>
              <button
                onClick={() => setReadingComment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
              {readingComment.text || 'Нет текста описания.'}
            </p>
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              <span>Кружок r = {Math.round(readingComment.radius)}px</span>
              <button
                onClick={() => {
                  const comm = readingComment;
                  setReadingComment(null);
                  setEditingComment({ comment: comm, isNew: false });
                }}
                className="text-amber-400 underline font-semibold"
              >
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENT CREATION / EDITING MODAL */}
      {editingComment && (
        <CommentModal
          comment={editingComment.comment}
          onBack={() => setEditingComment(null)}
          onSave={handleSaveComment}
          onDelete={!editingComment.isNew ? handleDeleteComment : undefined}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          settings={uiSettings}
          onChange={setUiSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
