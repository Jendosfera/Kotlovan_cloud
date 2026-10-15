import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppScreen, BlueprintArray, CellData } from './types';
import {
  loadActiveArrayFromStorage,
  saveActiveArrayToStorage,
  chooseSaveLocationAndExport,
  syncArrayToFileHandle,
  getAttachedFileName,
} from './services/storageService';
import { MainMenu } from './components/MainMenu';
import { ArrayBuilder } from './components/ArrayBuilder';
import { CellCardModal } from './components/CellCardModal';
import { ViewerMode } from './components/ViewerMode';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('MAIN_MENU');
  const [currentArray, setCurrentArray] = useState<BlueprintArray | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(getAttachedFileName());

  // Target coordinates for cell editor
  const [editingCellTarget, setEditingCellTarget] = useState<{ row: number; col: number } | null>(null);

  // Keep ref for immediate flush on app close/minimize without closure staleness
  const currentArrayRef = useRef<BlueprintArray | null>(null);
  currentArrayRef.current = currentArray;

  // Auto-sync function
  const flushCurrentArrayToFile = useCallback(() => {
    if (currentArrayRef.current) {
      saveActiveArrayToStorage(currentArrayRef.current);
      syncArrayToFileHandle(currentArrayRef.current);
    }
  }, []);

  // Load existing array from local storage on mount
  useEffect(() => {
    const saved = loadActiveArrayFromStorage();
    if (saved) {
      setCurrentArray(saved);
    }
  }, []);

  // Sync to storage & file whenever currentArray updates
  useEffect(() => {
    if (currentArray) {
      saveActiveArrayToStorage(currentArray);
      syncArrayToFileHandle(currentArray);
    }
  }, [currentArray]);

  // Hook listeners for app minimization, backgrounding, and closing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCurrentArrayToFile();
      }
    };

    const handlePageHide = () => {
      flushCurrentArrayToFile();
    };

    const handleBeforeUnload = () => {
      flushCurrentArrayToFile();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushCurrentArrayToFile]);

  // Handler: Start creating array directly inside the cell builder!
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

  // Handler: Loaded existing or demo array
  const handleArrayLoaded = (arr: BlueprintArray) => {
    setCurrentArray(arr);
    setActiveFileName(getAttachedFileName());
    setScreen('VIEWER');
  };

  // Handler: Open cell card editor
  const handleOpenCellEditor = (row: number, col: number) => {
    setEditingCellTarget({ row, col });
    setScreen('CELL_EDITOR');
  };

  // Handler: Confirm cell card data & update dynamic array bounds
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

  // Handler: Return to main menu with auto-save to file
  const handleReturnToMainMenu = () => {
    flushCurrentArrayToFile();
    setScreen('MAIN_MENU');
  };

  // Handler: Save array to device storage with location picker
  const handleSaveArrayToFile = async () => {
    if (!currentArray) return;
    const res = await chooseSaveLocationAndExport(currentArray);
    if (res.success) {
      setActiveFileName(res.fileName);
      setScreen('VIEWER');
    }
  };

  return (
    <main className="h-full w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center overflow-hidden">
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
