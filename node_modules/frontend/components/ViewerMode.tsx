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
  Move,
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

  // Viewport transforms (offset in screen pixels relative to commonPoint, scale multiplier)
  const [scale, setScale] = useState<number>(array.globalScale || 1.0);
  const [offsetX, setOffsetX] = useState<number>(array.globalOffsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(array.globalOffsetY || 0);

  // Container viewport dimensions for 1:1 screen mapping
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 700,
  });

  // Animation direction for smooth cell transition
  const [transitionAnimClass, setTransitionAnimClass] = useState<string>('animate-cell-fade');

  // Sub-modes
  const [isSettingCommonPoint, setIsSettingCommonPoint] = useState<boolean>(false);
  const [isSettingComment, setIsSettingComment] = useState<boolean>(false);
  const [repositioningCommentId, setRepositioningCommentId] = useState<string | null>(null);
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
  const touchStateRef = useRef<{
    time: number;
    startTouches: { x: number; y: number }[];
    initialMid: { x: number; y: number };
    initialDist: number;
    initialScale: number;
    initialOffset: { x: number; y: number };
    imgPointAtMid: { x: number; y: number };
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

  // Measure container viewport size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const screenCenterX = containerSize.width / 2;
  const screenCenterY = containerSize.height / 2;

  // Helper to obtain anchor ("Общая точка")
  const getAnchor = useCallback((): { x: number; y: number } => {
    if (currentCell?.commonPoint) {
      return currentCell.commonPoint;
    }
    return {
      x: (currentCell?.imageWidth || 1200) / 2,
      y: (currentCell?.imageHeight || 800) / 2,
    };
  }, [currentCell]);

  /**
   * Clamp offset so the edges of the drawing NEVER go beyond the center of the viewport:
   * Left edge (x = 0): screenCenterX + offsetX + (0 - anchor.x) * scale <= screenCenterX
   *  => offsetX <= anchor.x * scale
   * Right edge (x = W): screenCenterX + offsetX + (W - anchor.x) * scale >= screenCenterX
   *  => offsetX >= -(W - anchor.x) * scale
   * Top edge (y = 0): screenCenterY + offsetY + (0 - anchor.y) * scale <= screenCenterY
   *  => offsetY <= anchor.y * scale
   * Bottom edge (y = H): screenCenterY + offsetY + (H - anchor.y) * scale >= screenCenterY
   *  => offsetY >= -(H - anchor.y) * scale
   */
  const clampOffsets = useCallback(
    (ox: number, oy: number, currentS: number): { x: number; y: number } => {
      if (!currentCell) return { x: ox, y: oy };
      const anchor = getAnchor();
      const w = currentCell.imageWidth || 1200;
      const h = currentCell.imageHeight || 800;

      const minX = -(w - anchor.x) * currentS;
      const maxX = anchor.x * currentS;

      const minY = -(h - anchor.y) * currentS;
      const maxY = anchor.y * currentS;

      const clampedX = Math.max(minX, Math.min(maxX, ox));
      const clampedY = Math.max(minY, Math.min(maxY, oy));

      return { x: clampedX, y: clampedY };
    },
    [currentCell, getAnchor]
  );

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
      const s = currentCell.viewport.scale;
      const clamped = clampOffsets(currentCell.viewport.offsetX, currentCell.viewport.offsetY, s);
      setScale(s);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    }
  }, [currentCoord.row, currentCoord.col, currentCell, clampOffsets]);

  // Persist global scale/offset and cell viewport
  const persistViewport = useCallback(
    (newScale: number, newX: number, newY: number) => {
      if (!currentCell) return;
      const clamped = clampOffsets(newX, newY, newScale);

      if (currentCell.customPosition) {
        const updatedCells = {
          ...array.cells,
          [currentKey]: {
            ...currentCell,
            viewport: { scale: newScale, offsetX: clamped.x, offsetY: clamped.y },
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
          globalOffsetX: clamped.x,
          globalOffsetY: clamped.y,
        });
      }
    },
    [array, currentCell, currentKey, currentCoord, onUpdateArray, clampOffsets]
  );

  // Navigation between array cells with smooth slide/fade animation
  const goToCell = useCallback(
    (r: number, c: number) => {
      if (r < 0 || r >= array.rows || c < 0 || c >= array.cols) return;
      const key = `${r}_${c}`;
      if (!array.cells[key]) return; // empty cell, skip

      // Determine animation direction
      if (c > currentCoord.col) {
        setTransitionAnimClass('animate-cell-right');
      } else if (c < currentCoord.col) {
        setTransitionAnimClass('animate-cell-left');
      } else if (r > currentCoord.row) {
        setTransitionAnimClass('animate-cell-down');
      } else if (r < currentCoord.row) {
        setTransitionAnimClass('animate-cell-up');
      } else {
        setTransitionAnimClass('animate-cell-fade');
      }

      setCurrentCoord({ row: r, col: c });
      onUpdateArray({
        ...array,
        lastViewedCell: { row: r, col: c },
      });
    },
    [array, currentCoord, onUpdateArray]
  );

  /* ----------------- GESTURE CONTROLLER ----------------- */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
    const isTwo = touches.length >= 2;

    let initialDist = 0;
    let mid = { x: touches[0].x, y: touches[0].y };

    if (isTwo) {
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      initialDist = Math.hypot(dx, dy);
      mid = {
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2,
      };
    }

    const anchor = getAnchor();
    // Image point directly under the midpoint of touches at gesture start
    const imgPointAtMid = {
      x: anchor.x + (mid.x - screenCenterX - offsetX) / scale,
      y: anchor.y + (mid.y - screenCenterY - offsetY) / scale,
    };

    touchStateRef.current = {
      time: Date.now(),
      startTouches: touches,
      initialMid: mid,
      initialDist,
      initialScale: scale,
      initialOffset: { x: offsetX, y: offsetY },
      imgPointAtMid,
      isTwoFinger: isTwo,
      hasMoved: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    if (!state) return;

    const currentTouches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));

    // Two-finger pinch zoom & two-finger drag
    if (e.touches.length >= 2 && state.isTwoFinger && state.initialDist > 0) {
      state.hasMoved = true;

      const t0 = currentTouches[0];
      const t1 = currentTouches[1];
      const dist = Math.hypot(t0.x - t1.x, t0.y - t1.y);
      const currMid = {
        x: (t0.x + t1.x) / 2,
        y: (t0.y + t1.y) / 2,
      };

      // 1. Scale is current distance divided by initial distance * initialScale
      const scaleRatio = dist / state.initialDist;
      const newScale = Math.max(0.15, Math.min(12, state.initialScale * scaleRatio));

      // 2. The point on the image under initialMid must stay under currMid
      const anchor = getAnchor();
      const rawOffsetX = currMid.x - screenCenterX - (state.imgPointAtMid.x - anchor.x) * newScale;
      const rawOffsetY = currMid.y - screenCenterY - (state.imgPointAtMid.y - anchor.y) * newScale;

      // Clamp so edges never pass beyond viewport center
      const clamped = clampOffsets(rawOffsetX, rawOffsetY, newScale);

      setScale(newScale);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    } else if (e.touches.length === 1 && !state.isTwoFinger) {
      // Single finger drag tracking for swipe detection
      state.hasMoved = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    touchStateRef.current = null;
    if (!state) return;

    // Single-finger swipe detection (swipes trigger regardless of zoom level)
    if (!state.isTwoFinger && e.changedTouches.length === 1) {
      const endTouch = e.changedTouches[0];
      const startTouch = state.startTouches[0];
      const dx = endTouch.clientX - startTouch.x;
      const dy = endTouch.clientY - startTouch.y;
      const dist = Math.hypot(dx, dy);
      const timeDiff = Date.now() - state.time;

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
    if (state.hasMoved && state.isTwoFinger) {
      persistViewport(scale, offsetX, offsetY);
    }
  };

  // Mouse wheel zoom for desktop development/testing pivoted at cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.15, Math.min(12, scale * factor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const anchor = getAnchor();

    // Image point under mouse
    const imgX = anchor.x + (mouseX - screenCenterX - offsetX) / scale;
    const imgY = anchor.y + (mouseY - screenCenterY - offsetY) / scale;

    const rawOffsetX = mouseX - screenCenterX - (imgX - anchor.x) * newScale;
    const rawOffsetY = mouseY - screenCenterY - (imgY - anchor.y) * newScale;

    const clamped = clampOffsets(rawOffsetX, rawOffsetY, newScale);

    setScale(newScale);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
    persistViewport(newScale, clamped.x, clamped.y);
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
    const anchor = getAnchor();

    // Exact image coordinate under screen center crosshair
    const imgX = anchor.x - offsetX / scale;
    const imgY = anchor.y - offsetY / scale;

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

  /* ----------------- "УСТАНОВИТЬ / СМЕНИТЬ КОММЕНТАРИЙ" CONFIRMATION ----------------- */
  const handleConfirmCommentCirclePosition = () => {
    if (!currentCell) return;
    const anchor = getAnchor();

    // Exact image coordinate currently sitting at the center crosshair of viewport
    const imgX = anchor.x - offsetX / scale;
    const imgY = anchor.y - offsetY / scale;

    const radiusInDrawingUnits = 32 / scale;

    if (repositioningCommentId) {
      // Reposition existing comment
      const existing = currentCell.comments.find((c) => c.id === repositioningCommentId);
      const updatedComments = currentCell.comments.map((c) =>
        c.id === repositioningCommentId
          ? { ...c, x: Math.round(imgX), y: Math.round(imgY), radius: radiusInDrawingUnits }
          : c
      );

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

      setIsSettingComment(false);
      setRepositioningCommentId(null);

      // Re-open editor with updated coordinates
      if (existing) {
        setEditingComment({
          comment: {
            ...existing,
            x: Math.round(imgX),
            y: Math.round(imgY),
            radius: radiusInDrawingUnits,
          },
          isNew: false,
        });
      }
    } else {
      // Creating a new comment
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
    }
  };

  /* ----------------- TRIGGER REPOSITIONING FROM MODAL ----------------- */
  const handleStartRepositioning = (draftTitle: string, draftText: string) => {
    if (!editingComment || !currentCell) return;
    const target = editingComment.comment;
    const commentId = target.id || `comm_${Date.now()}`;

    // Update memory with current draft text so nothing is lost
    const updatedDraft: Partial<CommentCircle> = {
      ...target,
      id: commentId,
      title: draftTitle,
      text: draftText,
    };

    setEditingComment({ comment: updatedDraft, isNew: editingComment.isNew });
    setRepositioningCommentId(commentId);
    setEditingComment(null); // Close modal
    setIsSettingComment(true); // Open viewport target mode

    // If comment already had position, center viewport on it so user sees current anchor
    const anchor = getAnchor();
    if (typeof target.x === 'number' && typeof target.y === 'number') {
      const targetOffsetX = -(target.x - anchor.x) * scale;
      const targetOffsetY = -(target.y - anchor.y) * scale;
      const clamped = clampOffsets(targetOffsetX, targetOffsetY, scale);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    }
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

      {/* Animated Cell Transition Container */}
      <div
        key={currentKey}
        className={`absolute inset-0 will-change-transform ${transitionAnimClass}`}
      >
        {/* Drawing Viewport Layer: Origin 0,0 translated to (screenCenterX + offsetX - anchor.x * scale) */}
        {currentCell?.imageDataUrl ? (
          <div
            className="absolute left-0 top-0 will-change-transform pointer-events-none"
            style={{
              width: `${currentCell.imageWidth}px`,
              height: `${currentCell.imageHeight}px`,
              transformOrigin: '0 0',
              transform: `translate3d(${screenCenterX + offsetX - anchor.x * scale}px, ${screenCenterY + offsetY - anchor.y * scale}px, 0) scale(${scale})`,
            }}
          >
            {/* Base blueprint image */}
            <img
              src={currentCell.imageDataUrl}
              alt={currentCell.title}
              className="w-full h-full object-contain pointer-events-none block"
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Чертеж не загружен в ячейку
          </div>
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
            <span className="absolute -top-7 text-[11px] font-bold text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 shadow">
              {isSettingCommonPoint
                ? 'Общая точка'
                : repositioningCommentId
                ? 'Новое положение'
                : 'Кружок комментария'}
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
                  setRepositioningCommentId(null);
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
              setRepositioningCommentId(null);
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const comm = readingComment;
                    setReadingComment(null);
                    setRepositioningCommentId(comm.id);
                    setIsSettingComment(true);
                    // Center on comment
                    const anchor = getAnchor();
                    const targetOffsetX = -(comm.x - anchor.x) * scale;
                    const targetOffsetY = -(comm.y - anchor.y) * scale;
                    const clamped = clampOffsets(targetOffsetX, targetOffsetY, scale);
                    setOffsetX(clamped.x);
                    setOffsetY(clamped.y);
                  }}
                  className="text-cyan-400 underline font-semibold flex items-center gap-1"
                >
                  <Move size={12} />
                  <span>Переместить</span>
                </button>
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
        </div>
      )}

      {/* COMMENT CREATION / EDITING MODAL */}
      {editingComment && (
        <CommentModal
          comment={editingComment.comment}
          onBack={() => setEditingComment(null)}
          onSave={handleSaveComment}
          onDelete={!editingComment.isNew ? handleDeleteComment : undefined}
          onReposition={handleStartRepositioning}
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
