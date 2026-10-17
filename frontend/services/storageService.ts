import { BlueprintArray, CellData } from '../types';

const STORAGE_KEY = 'kotlovan_active_array_v1';
const ATTACHED_FOLDER_NAME_KEY = 'kotlovan_attached_folder_name_v1';
const ATTACHED_FILE_NAME_KEY = 'kotlovan_attached_filename_v1';

// References to user-granted file system handles for Android / desktop
let activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
let activeFileHandle: FileSystemFileHandle | null = null;

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

export const setAttachedStorageInfo = (folderName: string | null, fileName: string | null): void => {
  try {
    if (folderName) {
      localStorage.setItem(ATTACHED_FOLDER_NAME_KEY, folderName);
    } else {
      localStorage.removeItem(ATTACHED_FOLDER_NAME_KEY);
    }
    if (fileName) {
      localStorage.setItem(ATTACHED_FILE_NAME_KEY, fileName);
    } else {
      localStorage.removeItem(ATTACHED_FILE_NAME_KEY);
    }
  } catch {
    // Ignore quota / permissions errors
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
    console.warn('Storage quota exceeded for active array data', err);
  }
};

export const loadActiveArrayFromStorage = (): BlueprintArray | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BlueprintArray;
  } catch (err) {
    console.error('Failed to parse active array from local storage', err);
    return null;
  }
};

// Convert DataURL to Blob for saving image files
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  
  if (parts[0].includes('base64')) {
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } else {
    // URL encoded SVG or plain text
    const text = decodeURIComponent(parts[1]);
    return new Blob([text], { type: mime });
  }
};

/**
 * Write updated array directly to the user-selected folder/file on Android
 */
export const syncArrayToFileHandle = async (array: BlueprintArray): Promise<boolean> => {
  saveActiveArrayToStorage(array);

  // If a directory handle was selected and permission granted
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

  // If a single file handle was selected
  if (activeFileHandle) {
    try {
      const jsonStr = serializeArrayConfig(array);
      const writable = await activeFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Direct sync to file handle failed:', err);
    }
  }

  return false;
};

export interface SaveResult {
  success: boolean;
  folderName?: string;
  fileName: string;
  error?: string;
}

/**
 * Запрос разрешений и выбор места в файловой системе устройства Android.
 * Сохраняет папку массива с файлом конфигурации и файлами изображений чертежей.
 */
export const chooseSaveLocationAndExport = async (
  array: BlueprintArray
): Promise<SaveResult> => {
  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  const configFileName = `${safeName}_config.json`;

  // 1. Попытка выбора папки на устройстве (Android Chrome / WebView с поддержкой showDirectoryPicker)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker: (opts?: unknown) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker({
        mode: 'readwrite',
      });

      // Явный запрос разрешения на чтение и запись в выбранную папку
      if (dirHandle.requestPermission) {
        const permissionStatus = await (dirHandle as unknown as {
          requestPermission: (opts: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: 'readwrite' });

        if (permissionStatus !== 'granted') {
          return {
            success: false,
            fileName: '',
            error: 'Разрешение на запись в папку устройства отклонено пользователем.',
          };
        }
      }

      activeDirectoryHandle = dirHandle;
      const folderName = dirHandle.name || 'Папка устройства';

      // 1. Сохраняем текстовый файл конфигурации массива
      const configFileHandle = await dirHandle.getFileHandle(configFileName, { create: true });
      const configWritable = await configFileHandle.createWritable();
      await configWritable.write(serializeArrayConfig(array));
      await configWritable.close();

      // 2. Сохраняем изображения каждой ячейки отдельными файлами в ту же папку
      const cellEntries = Object.values(array.cells);
      for (const cell of cellEntries) {
        if (cell.imageDataUrl) {
          try {
            const ext = cell.imageDataUrl.includes('image/svg') ? 'svg' : cell.imageDataUrl.includes('image/jpeg') ? 'jpg' : 'png';
            const imgFileName = `plan_cell_${cell.row + 1}_${cell.col + 1}.${ext}`;
            const imgFileHandle = await dirHandle.getFileHandle(imgFileName, { create: true });
            const imgWritable = await imgFileHandle.createWritable();
            const blob = dataUrlToBlob(cell.imageDataUrl);
            await imgWritable.write(blob);
            await imgWritable.close();
          } catch (imgErr) {
            console.warn('Could not save cell image file to folder:', imgErr);
          }
        }
      }

      setAttachedStorageInfo(folderName, configFileName);
      saveActiveArrayToStorage(array);

      return {
        success: true,
        folderName,
        fileName: configFileName,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, fileName: '' };
      }
      console.warn('showDirectoryPicker failed, trying showSaveFilePicker:', err);
    }
  }

  // 2. Попытка выбора отдельного файла через showSaveFilePicker
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const pickerOptions: SaveFilePickerOptions = {
        suggestedName: configFileName,
        types: [
          {
            description: 'Конфигурация чертежного массива «Котлован» (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      };

      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker(pickerOptions);

      if (handle.requestPermission) {
        const perm = await (handle as unknown as {
          requestPermission: (opts: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          return { success: false, fileName: '', error: 'Разрешение на запись отклонено' };
        }
      }

      activeFileHandle = handle;
      const jsonStr = serializeArrayConfig(array);
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      setAttachedStorageInfo('Хранилище устройства', handle.name || configFileName);
      saveActiveArrayToStorage(array);

      return {
        success: true,
        folderName: 'Хранилище устройства',
        fileName: handle.name || configFileName,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, fileName: '' };
      }
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // 3. Фолбэк для мобильных браузеров: сохранение через Web Share API или автоматическое скачивание
  try {
    const jsonStr = serializeArrayConfig(array);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], configFileName, { type: 'application/json' });

    // Проверяем Web Share API (вызывает системный Android диалог сохранения файлов/диска)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Массив «${array.name}»`,
        text: 'Файл конфигурации чертежного массива Котлован',
        files: [file],
      });
      setAttachedStorageInfo('Android Хранилище', configFileName);
      saveActiveArrayToStorage(array);
      return {
        success: true,
        folderName: 'Android Хранилище',
        fileName: configFileName,
      };
    }
  } catch (shareErr) {
    console.debug('Web share fallback skipped or canceled:', shareErr);
  }

  // 4. Традиционный URL-download для сохранения в папку «Загрузки» Android
  exportArrayToJsonFile(array);
  setAttachedStorageInfo('Папка «Загрузки»', configFileName);
  return {
    success: true,
    folderName: 'Папка «Загрузки»',
    fileName: configFileName,
  };
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
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (parsed.array && parsed.array.rows && parsed.array.cols) {
    setAttachedStorageInfo('Загруженная папка', file.name);
    return parsed.array as BlueprintArray;
  } else if (parsed.rows && parsed.cols && parsed.cells) {
    setAttachedStorageInfo('Загруженная папка', file.name);
    return parsed as BlueprintArray;
  }
  throw new Error('Файл не содержит корректную конфигурацию массива «Котлован»');
};
