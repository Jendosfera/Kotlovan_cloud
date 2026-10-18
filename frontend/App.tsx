import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppScreen, BlueprintArray, CellData } from './types';
import {
  loadActiveArrayFromStorage,
  saveActiveArrayToStorage,
  chooseSaveLocationAndExport,
  syncArrayToFileHandle,
  getAttachedFileName,
  getAttachedFolderName,
} from './services/storageService';
import { checkStoragePermission, openAppSettings } from './services/permissionService';
import { STORAGE_MESSAGES } from './constants';
import { MainMenu } from './components/MainMenu';
import { ArrayBuilder } from './components/ArrayBuilder';
import { CellCardModal } from './components/CellCardModal';
import { ViewerMode } from './components/ViewerMode';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('MAIN_MENU');
  const [currentArray, setCurrentArray] = useState<BlueprintArray | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(getAttachedFileName());
  const [activeFolderName, setActiveFolderName] = useState<string | null>(getAttachedFolderName());
  
  // Global snackbar for permission or storage feedback
  const [globalErrorToast, setGlobalErrorToast] = useState<{ message: string; showSettings: boolean } | null>(null);

  const [editingCellTarget, setEditingCellTarget] = useState<{ row: number; col: number } | null>(null);

  const currentArrayRef = useRef<BlueprintArray | null>(null);
  currentArrayRef.current = currentArray;

  const flushCurrentArrayToFile = useCallback(() => {
    if (currentArrayRef.current) {
      saveActiveArrayToStorage(currentArrayRef.current);
      syncArrayToFileHandle(currentArrayRef.current);
    }
  }, []);

  // Initial load and permission state check on startup
  useEffect(() => {
    checkStoragePermission().then((status) => {
      if (status === 'denied') {
        setGlobalErrorToast({
          message: STORAGE_MESSAGES.ERR_PERMISSION_DENIED,
          showSettings: true,
        });
      }
    });

    const saved = loadActiveArrayFromStorage();
    if (saved) {
      setCurrentArray(saved);
      setActiveFileName(getAttachedFileName());
      setActiveFolderName(getAttachedFolderName());
    }
  }, []);

  useEffect(() => {
    if (currentArray) {
      saveActiveArrayToStorage(currentArray);
      syncArrayToFileHandle(currentArray);
    }
  }, [currentArray]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCurrentArrayToFile();
      }
    };

    const handlePageHide = () => flushCurrentArrayToFile();
    const handleBeforeUnload = () => flushCurrentArrayToFile();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushCurrentArrayToFile]);

  const handleStartCreate = () => {
    const newArr: BlueprintArray = {
      id: `arr_${Date.now()}`,
      name: 'Новый массив чертежей',
      rows: 1,
      cols: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cells: {},
      lastViewedCell: { row: 0, col: 0 },
    };
    setCurrentArray(newArr);
    setScreen('ARRAY_BUILDER');
  };

  const handleArrayLoaded = (arr: BlueprintArray) => {
    setCurrentArray(arr);
    setActiveFileName(getAttachedFileName());
    setActiveFolderName(getAttachedFolderName());
    setScreen('VIEWER');
  };

  const handleOpenCellEditor = (row: number, col: number) => {
    setEditingCellTarget({ row, col });
    setScreen('CELL_EDITOR');
  };

  const handleConfirmCell = (cellData: CellData) => {
    if (!currentArray) return;
    const key = `${cellData.row}_${cellData.col}`;
    const nextCells = {
      ...currentArray.cells,
      [key]: cellData,
    };

    const keys = Object.keys(nextCells);
    let r0 = 0, r1 = 0, c0 = 0, c1 = 0;
    if (keys.length > 0) {
      r0 = Math.min(...keys.map((k) => nextCells[k].row));
      r1 = Math.max(...keys.map((k) => nextCells[k].row));
      c0 = Math.min(...keys.map((k) => nextCells[k].col));
      c1 = Math.max(...keys.map((k) => nextCells[k].col));
    }

    const updated: BlueprintArray = {
      ...currentArray,
      rows: Math.max(1, r1 - r0 + 1),
      cols: Math.max(1, c1 - c0 + 1),
      updatedAt: Date.now(),
      cells: nextCells,
    };
    setCurrentArray(updated);
    setScreen('ARRAY_BUILDER');
    setEditingCellTarget(null);
  };

  const handleReturnToMainMenu = () => {
    flushCurrentArrayToFile();
    setScreen('MAIN_MENU');
  };

  const handleSaveArrayToFile = async () => {
    if (!currentArray) return;
    try {
      const res = await chooseSaveLocationAndExport(currentArray);
      if (res.success) {
        setActiveFileName(res.fileName);
        setActiveFolderName(res.folderName);
        setScreen('VIEWER');
      } else if (res.error) {
        setGlobalErrorToast({
          message: res.error,
          showSettings: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : STORAGE_MESSAGES.ERR_WRITE_ACCESS;
      setGlobalErrorToast({
        message: msg,
        showSettings: true,
      });
    }
  };

  return (
    <main className="h-full w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center overflow-hidden relative">
      {/* Global Storage Warning Snackbar */}
      {globalErrorToast && (
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between p-3.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 shadow-2xl animate-in slide-in-from-top-4">
          <div className="text-xs text-rose-200 pr-2">
            {globalErrorToast.message}
          </div>
          <div className="flex items-center gap-2">
            {globalErrorToast.showSettings && (
              <button
                onClick={() => openAppSettings()}
                className="py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-[11px] whitespace-nowrap"
              >
                {STORAGE_MESSAGES.BTN_OPEN_SETTINGS}
              </button>
            )}
            <button
              onClick={() => setGlobalErrorToast(null)}
              className="p-1 rounded-lg text-rose-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {screen === 'MAIN_MENU' && (
        <MainMenu
          onStartCreate={handleStartCreate}
          onArrayLoaded={handleArrayLoaded}
          hasExistingActive={!!currentArray}
          onResumeActive={() => setScreen('VIEWER')}
        />
      )}

      {screen === 'ARRAY_BUILDER' && currentArray && (
        <ArrayBuilder
          array={currentArray}
          attachedFileName={activeFileName}
          attachedFolderName={activeFolderName}
          onBack={handleReturnToMainMenu}
          onOpenCellEditor={handleOpenCellEditor}
          onSaveArray={handleSaveArrayToFile}
          onStartViewer={() => setScreen('VIEWER')}
          onUpdateArray={(updated) => setCurrentArray(updated)}
        />
      )}

      {screen === 'CELL_EDITOR' && editingCellTarget && currentArray && (
        <CellCardModal
          row={editingCellTarget.row}
          col={editingCellTarget.col}
          initialCell={currentArray.cells[`${editingCellTarget.row}_${editingCellTarget.col}`]}
          onBack={() => setScreen('ARRAY_BUILDER')}
          onConfirm={handleConfirmCell}
        />
      )}

      {screen === 'VIEWER' && currentArray && (
        <ViewerMode
          array={currentArray}
          onBack={() => setScreen('ARRAY_BUILDER')}
          onUpdateArray={(updated) => setCurrentArray(updated)}
        />
      )}
    </main>
  );
};

export default App;
