import { BlueprintArray } from '../types';

const STORAGE_KEY = 'kotlovan_active_array_v1';
const RECENT_KEYS = 'kotlovan_saved_arrays_catalog_v1';

export const saveActiveArrayToStorage = (array: BlueprintArray): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
  } catch (err) {
    console.warn('Storage quota exceeded for active array full data', err);
  }
};

export const loadActiveArrayFromStorage = (): BlueprintArray | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BlueprintArray;
  } catch (err) {
    console.error('Failed to parse active array', err);
    return null;
  }
};

export const exportArrayToJsonFile = (array: BlueprintArray): void => {
  const exportPayload = {
    app: 'Котлован',
    version: '1.0.0',
    array: {
      id: array.id,
      name: array.name,
      rows: array.rows,
      cols: array.cols,
      createdAt: array.createdAt,
      updatedAt: Date.now(),
      lastViewedCell: array.lastViewedCell,
      globalScale: array.globalScale,
      globalOffsetX: array.globalOffsetX,
      globalOffsetY: array.globalOffsetY,
      cells: array.cells,
    },
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  a.href = url;
  a.download = `${safeName}_config.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseArrayConfigFile = async (file: File): Promise<BlueprintArray> => {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (parsed.array && parsed.array.rows && parsed.array.cols) {
    return parsed.array as BlueprintArray;
  } else if (parsed.rows && parsed.cols && parsed.cells) {
    return parsed as BlueprintArray;
  }
  throw new Error('Файл не содержит корректную конфигурацию массива «Котлован»');
};
