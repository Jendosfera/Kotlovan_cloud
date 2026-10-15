import { BlueprintArray } from '../types';

const STORAGE_KEY = 'kotlovan_active_array_v1';
const ATTACHED_FILE_NAME_KEY = 'kotlovan_attached_filename_v1';

// In-memory reference to user-selected FileSystemFileHandle for background writes
let activeFileHandle: FileSystemFileHandle | null = null;

export const getAttachedFileName = (): string | null => {
  try {
    return localStorage.getItem(ATTACHED_FILE_NAME_KEY);
  } catch {
    return null;
  }
};

export const setAttachedFileName = (name: string | null): void => {
  try {
    if (name) {
      localStorage.setItem(ATTACHED_FILE_NAME_KEY, name);
    } else {
      localStorage.removeItem(ATTACHED_FILE_NAME_KEY);
    }
  } catch {
    // Ignore quota / permission errors
  }
};

export const serializeArrayConfig = (array: BlueprintArray): string => {
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
  return JSON.stringify(exportPayload, null, 2);
};

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

/**
 * Write updated array directly to the user-selected file on the device
 */
export const syncArrayToFileHandle = async (array: BlueprintArray): Promise<boolean> => {
  saveActiveArrayToStorage(array);

  if (!activeFileHandle) {
    return false;
  }

  try {
    const jsonStr = serializeArrayConfig(array);
    const writable = await activeFileHandle.createWritable();
    await writable.write(jsonStr);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Could not write directly to attached file handle:', err);
    return false;
  }
};

/**
 * Open native system storage picker to choose destination folder and filename,
 * bind handle, and save initial config.
 */
export const chooseSaveLocationAndExport = async (
  array: BlueprintArray
): Promise<{ success: boolean; fileName: string }> => {
  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  const defaultFileName = `${safeName}_config.json`;

  // Check if modern File System Access API is available in browser / WebView
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const pickerOptions: SaveFilePickerOptions = {
        suggestedName: defaultFileName,
        types: [
          {
            description: 'Конфигурация чертежного массива «Котлован» (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      };

      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker(pickerOptions);
      activeFileHandle = handle;
      setAttachedFileName(handle.name || defaultFileName);

      const jsonStr = serializeArrayConfig(array);
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      saveActiveArrayToStorage(array);
      return { success: true, fileName: handle.name || defaultFileName };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User canceled dialog
        return { success: false, fileName: '' };
      }
      console.warn('showSaveFilePicker fallback:', err);
    }
  }

  // Fallback for browsers without File System Access API: standard download trigger
  const jsonStr = serializeArrayConfig(array);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setAttachedFileName(defaultFileName);
  saveActiveArrayToStorage(array);
  return { success: true, fileName: defaultFileName };
};

export const parseArrayConfigFile = async (file: File): Promise<BlueprintArray> => {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (parsed.array && parsed.array.rows && parsed.array.cols) {
    setAttachedFileName(file.name);
    return parsed.array as BlueprintArray;
  } else if (parsed.rows && parsed.cols && parsed.cells) {
    setAttachedFileName(file.name);
    return parsed as BlueprintArray;
  }
  throw new Error('Файл не содержит корректную конфигурацию массива «Котлован»');
};
