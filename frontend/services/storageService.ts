import { BlueprintArray } from '../types';
import { STORAGE_MESSAGES } from '../constants';

const STORAGE_KEY = 'kotlovan_active_array_v1';
const ATTACHED_FOLDER_NAME_KEY = 'kotlovan_saf_folder_name_v1';
const ATTACHED_FILE_NAME_KEY = 'kotlovan_attached_filename_v1';

// In-memory reference to user-selected file / directory handle
let activeFileHandle: FileSystemFileHandle | null = null;
let activeDirectoryHandle: FileSystemDirectoryHandle | null = null;

// ==========================================
// ПРОВЕРКА И ЗАПРОС РАЗРЕШЕНИЙ ХРАНИЛИЩА
// ==========================================
export type StoragePermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'limited'
  | 'unsupported';

export class StoragePermissionError extends Error {
  public code: string;
  public permanentlyDenied: boolean;

  constructor(message: string, code: string = 'PERMISSION_DENIED', permanentlyDenied: boolean = false) {
    super(message);
    this.name = 'StoragePermissionError';
    this.code = code;
    this.permanentlyDenied = permanentlyDenied;
  }
}

let cachedPermissionState: StoragePermissionState | null = null;
let deniedCount = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    cachedPermissionState = null;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      cachedPermissionState = null;
    }
  });
}

export const checkStoragePermission = async (): Promise<StoragePermissionState> => {
  if (cachedPermissionState) {
    return cachedPermissionState;
  }

  const cap = (window as unknown as { Capacitor?: { Plugins?: { Filesystem?: { checkPermissions?: () => Promise<{ publicStorage?: string }> } } } }).Capacitor;
  if (cap?.Plugins?.Filesystem?.checkPermissions) {
    try {
      const res = await cap.Plugins.Filesystem.checkPermissions();
      const status = res.publicStorage;
      if (status === 'granted') {
        cachedPermissionState = 'granted';
        return 'granted';
      }
      if (status === 'denied') {
        cachedPermissionState = 'denied';
        return 'denied';
      }
      cachedPermissionState = 'prompt';
      return 'prompt';
    } catch (err) {
      console.warn('Capacitor checkPermissions error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    if ('showDirectoryPicker' in window || 'showSaveFilePicker' in window) {
      cachedPermissionState = 'granted';
      return 'granted';
    }
    cachedPermissionState = 'granted';
    return 'granted';
  }

  cachedPermissionState = 'unsupported';
  return 'unsupported';
};

export const requestStoragePermission = async (): Promise<StoragePermissionState> => {
  const current = await checkStoragePermission();
  if (current === 'granted') {
    return 'granted';
  }

  if (await isPermanentlyDenied()) {
    return 'denied';
  }

  const cap = (window as unknown as { Capacitor?: { Plugins?: { Filesystem?: { requestPermissions?: () => Promise<{ publicStorage?: string }> } } } }).Capacitor;
  if (cap?.Plugins?.Filesystem?.requestPermissions) {
    try {
      const res = await cap.Plugins.Filesystem.requestPermissions();
      const status = res.publicStorage === 'granted' ? 'granted' : 'denied';
      cachedPermissionState = status;
      if (status === 'denied') {
        deniedCount++;
      }
      return status;
    } catch (err) {
      console.warn('Capacitor requestPermissions error:', err);
      deniedCount++;
      cachedPermissionState = 'denied';
      return 'denied';
    }
  }

  cachedPermissionState = 'granted';
  return 'granted';
};

export const isPermanentlyDenied = async (): Promise<boolean> => {
  return deniedCount >= 2;
};

export const openAppSettings = async (): Promise<void> => {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { openUrl?: (opts: { url: string }) => Promise<void> } } } }).Capacitor;
  if (cap?.Plugins?.App?.openUrl) {
    try {
      await cap.Plugins.App.openUrl({ url: 'app-settings:' });
      return;
    } catch {}
  }

  alert(STORAGE_MESSAGES.ERR_PERMANENTLY_DENIED);
};

export const ensureStorageAccess = async (): Promise<void> => {
  const status = await checkStoragePermission();
  if (status === 'granted') {
    return;
  }

  const requested = await requestStoragePermission();
  if (requested !== 'granted') {
    const permDenied = await isPermanentlyDenied();
    throw new StoragePermissionError(
      permDenied ? STORAGE_MESSAGES.ERR_PERMANENTLY_DENIED : STORAGE_MESSAGES.ERR_PERMISSION_DENIED,
      'PERMISSION_DENIED',
      permDenied
    );
  }
};

// ==========================================
// РАБОТА С ФАЙЛАМИ И ПАПКАМИ
// ==========================================
export const getAttachedFolderName = (): string | null => {
  try {
    return localStorage.getItem(ATTACHED_FOLDER_NAME_KEY);
  } catch {
    return null;
  }
};

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
  } catch {}
};

export const setAttachedStorageInfo = (folderName: string | null, fileName: string | null): void => {
  try {
    if (folderName) localStorage.setItem(ATTACHED_FOLDER_NAME_KEY, folderName);
    else localStorage.removeItem(ATTACHED_FOLDER_NAME_KEY);

    if (fileName) localStorage.setItem(ATTACHED_FILE_NAME_KEY, fileName);
    else localStorage.removeItem(ATTACHED_FILE_NAME_KEY);
  } catch {}
};

export const serializeArrayConfig = (array: BlueprintArray): string => {
  const exportPayload = {
    app: 'Котлован',
    version: '1.4.0',
    storageFramework: 'Storage Access Framework (SAF) / Filesystem API',
    updatedAt: new Date().toISOString(),
    array: {
      id: array.id,
      name: array.name,
      rows: array.rows,
      cols: array.cols,
      createdAt: array.createdAt,
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

export const syncArrayToFileHandle = async (array: BlueprintArray): Promise<boolean> => {
  saveActiveArrayToStorage(array);

  if (activeDirectoryHandle) {
    try {
      const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
      const configFileName = `${safeName}_config.json`;
      const fileHandle = await activeDirectoryHandle.getFileHandle(configFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(serializeArrayConfig(array));
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Direct sync to folder handle failed:', err);
    }
  }

  if (activeFileHandle) {
    try {
      const jsonStr = serializeArrayConfig(array);
      const writable = await activeFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Could not write directly to attached file handle:', err);
    }
  }

  return false;
};

export const chooseSaveLocationAndExport = async (
  array: BlueprintArray
): Promise<{ success: boolean; folderName: string; fileName: string; error?: string }> => {
  await ensureStorageAccess();

  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  const defaultFileName = `${safeName}_config.json`;

  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker: (opts?: unknown) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      if (dirHandle.requestPermission) {
        const perm = await (dirHandle as unknown as {
          requestPermission: (opts: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          return {
            success: false,
            folderName: '',
            fileName: '',
            error: STORAGE_MESSAGES.ERR_PERMISSION_DENIED,
          };
        }
      }

      activeDirectoryHandle = dirHandle;
      const folderName = dirHandle.name || 'Папка чертежей';

      const configFile = await dirHandle.getFileHandle(defaultFileName, { create: true });
      const configWriter = await configFile.createWritable();
      await configWriter.write(serializeArrayConfig(array));
      await configWriter.close();

      setAttachedStorageInfo(folderName, defaultFileName);
      saveActiveArrayToStorage(array);

      return {
        success: true,
        folderName,
        fileName: defaultFileName,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, folderName: '', fileName: '' };
      }
      console.warn('showDirectoryPicker failed:', err);
    }
  }

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
      const folderName = 'Папка устройства';
      setAttachedStorageInfo(folderName, handle.name || defaultFileName);

      const jsonStr = serializeArrayConfig(array);
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      saveActiveArrayToStorage(array);
      return { success: true, folderName, fileName: handle.name || defaultFileName };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, folderName: '', fileName: '' };
      }
      console.warn('showSaveFilePicker fallback:', err);
    }
  }

  exportArrayToJsonFile(array);
  setAttachedStorageInfo('Папка «Загрузки»', defaultFileName);
  return { success: true, folderName: 'Папка «Загрузки»', fileName: defaultFileName };
};

export const exportArrayToJsonFile = (array: BlueprintArray): void => {
  const jsonStr = serializeArrayConfig(array);
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
  await ensureStorageAccess();
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (parsed.array && parsed.array.rows && parsed.array.cols) {
    setAttachedStorageInfo('Загруженный файл', file.name);
    return parsed.array as BlueprintArray;
  } else if (parsed.rows && parsed.cols && parsed.cells) {
    setAttachedStorageInfo('Загруженный файл', file.name);
    return parsed as BlueprintArray;
  }
  throw new StoragePermissionError(STORAGE_MESSAGES.ERR_INVALID_PATH, 'INVALID_CONFIG');
};
