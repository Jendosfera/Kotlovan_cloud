import { BlueprintArray, CellData } from '../types';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const CONFIG_FOLDER = 'configs';

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');

  return `${cleaned || 'config'}.json`;
}

/** Сохраняет конфигурацию во внутреннем хранилище приложения. */
export async function saveConfig(
  name: string,
  config: unknown,
): Promise<string> {
  const fileName = safeFileName(name);

  const result = await Filesystem.writeFile({
    path: `CONFIGFOLDER/{CONFIG_FOLDER}/CONFIGF​OLDER/{fileName}`,
    data: JSON.stringify(config, null, 2),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  return result.uri;
}

/** Разбирает выбранный JSON-файл. */
export async function loadConfigFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

/** Сохраняет и отправляет конфигурацию через системное меню Android. */
export async function exportConfig(
  name: string,
  config: unknown,
): Promise<void> {
  const uri = await saveConfig(name, config);

  await Share.share({
    title: 'Экспорт конфигурации',
    text: `Конфигурация ${safeFileName(name)}`,
    files: [uri],
    dialogTitle: 'Сохранить или отправить конфигурацию',
  });
}


const STORAGE_KEY = 'kotlovan_active_array_v1';
const ATTACHED_FOLDER_NAME_KEY = 'kotlovan_saf_folder_name_v1';
const ATTACHED_FOLDER_URI_KEY = 'kotlovan_saf_folder_uri_v1';
const ATTACHED_FILE_NAME_KEY = 'kotlovan_saf_filename_v1';

// Global reference for Android SAF folder tree handle and file handle
let activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
let activeFileHandle: FileSystemFileHandle | null = null;

// Definition for optional Android WebView native SAF bridge
declare global {
  interface Window {
    AndroidSAF?: {
      openDocumentTree?: () => void;
      saveFile?: (fileName: string, mimeType: string, base64Data: string) => string;
      createDocument?: (suggestedName: string, mimeType: string, content: string) => string;
      hasStoragePermission?: () => boolean;
      requestStoragePermission?: () => void;
    };
    AndroidBridge?: {
      saveArrayPackage?: (jsonConfig: string, imagesJson: string) => boolean;
    };
  }
}

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

export const setAttachedStorageInfo = (
  folderName: string | null,
  fileName: string | null,
  safUri?: string | null
): void => {
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
    if (safUri) {
      localStorage.setItem(ATTACHED_FOLDER_URI_KEY, safUri);
    }
  } catch {
    // Ignore storage quota warnings
  }
};

/**
 * Создание конфигурационного объекта массива в точном соответствии с ТЗ:
 * информация о массиве (строки, столбцы),
 * информация о каждой ячейке (адрес в массиве, название файла изображения и относительный путь к нему,
 * название карточки, координаты и размер комментариев с текстом, Свое положение, Общая точка).
 */
export const buildArrayExportPackage = (array: BlueprintArray) => {
  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  const cellsMap: { [key: string]: unknown } = {};

  Object.entries(array.cells).forEach(([key, cell]) => {
    const ext = cell.imageDataUrl.includes('image/svg')
      ? 'svg'
      : cell.imageDataUrl.includes('image/jpeg')
      ? 'jpg'
      : 'png';
    const relativeImageFile = `plans/${cell.imageFileName || `cell_${cell.row + 1}_${cell.col + 1}.${ext}`}`;

    cellsMap[key] = {
      address: { row: cell.row, col: cell.col },
      cellCardTitle: cell.title,
      imageFileName: cell.imageFileName || `cell_${cell.row + 1}_${cell.col + 1}.${ext}`,
      imageRelativePath: relativeImageFile,
      customPosition: cell.customPosition || false,
      commonPoint: cell.commonPoint || {
        x: Math.round((cell.imageWidth || 1200) / 2),
        y: Math.round((cell.imageHeight || 800) / 2),
      },
      comments: cell.comments.map((comm) => ({
        id: comm.id,
        x: comm.x,
        y: comm.y,
        radius: comm.radius,
        title: comm.title,
        text: comm.text,
        createdAt: comm.createdAt,
      })),
      viewport: cell.viewport,
      imageWidth: cell.imageWidth,
      imageHeight: cell.imageHeight,
    };
  });

  return {
    app: 'Котлован',
    version: '1.2.0',
    storageFramework: 'Android Storage Access Framework (SAF)',
    savedAt: new Date().toISOString(),
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
      cells: cellsMap,
    },
  };
};

export const serializeArrayConfig = (array: BlueprintArray): string => {
  return JSON.stringify(buildArrayExportPackage(array), null, 2);
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
    const text = decodeURIComponent(parts[1]);
    return new Blob([text], { type: mime });
  }
};

/**
 * Автоматическая синхронизация при выходе, сворачивании приложения и возврате в меню.
 * Вызывается без участия пользователя, перезаписывая файл конфигурации в выделенном дереве SAF.
 */
export const syncArrayToFileHandle = async (array: BlueprintArray): Promise<boolean> => {
  saveActiveArrayToStorage(array);

  // 1. Запись через активный SAF Directory Handle (ACTION_OPEN_DOCUMENT_TREE)
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
      console.warn('SAF folder autosync failed:', err);
    }
  }

  // 2. Запись через активный SAF File Handle (ACTION_CREATE_DOCUMENT)
  if (activeFileHandle) {
    try {
      const jsonStr = serializeArrayConfig(array);
      const writable = await activeFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('SAF file autosync failed:', err);
    }
  }

  // 3. Запись через нативный Android SAF WebView Bridge, если скомпилировано в APK
  if (typeof window !== 'undefined' && window.AndroidBridge?.saveArrayPackage) {
    try {
      const jsonStr = serializeArrayConfig(array);
      return window.AndroidBridge.saveArrayPackage(jsonStr, '{}');
    } catch (err) {
      console.warn('AndroidBridge.saveArrayPackage failed:', err);
    }
  }

  return false;
};

export interface SAFSaveResult {
  success: boolean;
  folderName?: string;
  fileName: string;
  safMode: 'SAF_DIRECTORY_TREE' | 'SAF_SINGLE_DOCUMENT' | 'SAF_WEBVIEW_BRIDGE' | 'STANDARD_STORAGE';
  error?: string;
}

/**
 * Основная функция сохранения массива через Storage Access Framework (SAF) на Android.
 * Создает папку с файлом конфигурации и файлами чертежей с запросом прав доступа readwrite.
 */
export const chooseSaveLocationAndExport = async (
  array: BlueprintArray
): Promise<SAFSaveResult> => {
  const safeName = array.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') || 'massiv_kotlovan';
  const configFileName = `${safeName}_config.json`;

  // --- ВАРИАНТ 1: Нативный мост Android SAF в APK WebView ---
  if (typeof window !== 'undefined' && window.AndroidSAF) {
    try {
      const jsonStr = serializeArrayConfig(array);
      const resultUri = window.AndroidSAF.createDocument?.(configFileName, 'application/json', jsonStr);
      if (resultUri) {
        setAttachedStorageInfo('SAF Android Папка', configFileName, resultUri);
        saveActiveArrayToStorage(array);
        return {
          success: true,
          folderName: 'SAF Android Папка',
          fileName: configFileName,
          safMode: 'SAF_WEBVIEW_BRIDGE',
        };
      }
    } catch (bridgeErr) {
      console.warn('Native AndroidSAF bridge failed:', bridgeErr);
    }
  }

  // --- ВАРИАНТ 2: Android SAF Document Tree Picker (showDirectoryPicker) ---
  // На Android Chrome/Edge/WebView этот API напрямую вызывает системный Activity:
  // Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), запрашивая Uri с флагом FLAG_GRANT_PERSISTABLE_URI_PERMISSION.
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker: (opts?: unknown) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Явный запрос разрешений Storage Access Framework
      if (dirHandle.requestPermission) {
        const permissionStatus = await (dirHandle as unknown as {
          requestPermission: (opts: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: 'readwrite' });

        if (permissionStatus !== 'granted') {
          return {
            success: false,
            fileName: '',
            safMode: 'SAF_DIRECTORY_TREE',
            error: 'Разрешение Android Storage Access Framework (SAF) отклонено пользователем.',
          };
        }
      }

      activeDirectoryHandle = dirHandle;
      const folderName = dirHandle.name || 'Выбранная папка (SAF)';

      // 1. Создаем/перезаписываем текстовый файл конфигурации массива
      const configFileHandle = await dirHandle.getFileHandle(configFileName, { create: true });
      const configWritable = await configFileHandle.createWritable();
      await configWritable.write(serializeArrayConfig(array));
      await configWritable.close();

      // 2. Создаем подпапку "plans" для изоляции файлов изображений
      let plansDirHandle: FileSystemDirectoryHandle = dirHandle;
      try {
        plansDirHandle = await dirHandle.getDirectoryHandle('plans', { create: true });
      } catch {
        plansDirHandle = dirHandle;
      }

      // 3. Записываем каждое изображение как отдельный файл в папку чертежей
      const cellEntries = Object.values(array.cells);
      for (const cell of cellEntries) {
        if (cell.imageDataUrl) {
          try {
            const ext = cell.imageDataUrl.includes('image/svg')
              ? 'svg'
              : cell.imageDataUrl.includes('image/jpeg')
              ? 'jpg'
              : 'png';
            const imgFileName = cell.imageFileName || `cell_${cell.row + 1}_${cell.col + 1}.${ext}`;
            const imgFileHandle = await plansDirHandle.getFileHandle(imgFileName, { create: true });
            const imgWritable = await imgFileHandle.createWritable();
            const blob = dataUrlToBlob(cell.imageDataUrl);
            await imgWritable.write(blob);
            await imgWritable.close();
          } catch (imgErr) {
            console.warn(`Не удалось сохранить скан ${cell.title}:`, imgErr);
          }
        }
      }

      setAttachedStorageInfo(folderName, configFileName);
      saveActiveArrayToStorage(array);

      return {
        success: true,
        folderName,
        fileName: configFileName,
        safMode: 'SAF_DIRECTORY_TREE',
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Пользователь нажал "Отмена" в системном SAF-диалоге
        return { success: false, fileName: '', safMode: 'SAF_DIRECTORY_TREE' };
      }
      console.warn('showDirectoryPicker SAF fallback:', err);
    }
  }

  // --- ВАРИАНТ 3: Android SAF Create Document Picker (showSaveFilePicker) ---
  // Системный вызов Intent(Intent.ACTION_CREATE_DOCUMENT)
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
          return {
            success: false,
            fileName: '',
            safMode: 'SAF_SINGLE_DOCUMENT',
            error: 'Доступ к файлу не был подтвержден в SAF.',
          };
        }
      }

      activeFileHandle = handle;
      const jsonStr = serializeArrayConfig(array);
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      setAttachedStorageInfo('SAF Хранилище', handle.name || configFileName);
      saveActiveArrayToStorage(array);

      return {
        success: true,
        folderName: 'SAF Хранилище',
        fileName: handle.name || configFileName,
        safMode: 'SAF_SINGLE_DOCUMENT',
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, fileName: '', safMode: 'SAF_SINGLE_DOCUMENT' };
      }
      console.warn('showSaveFilePicker fallback:', err);
    }
  }

  // --- ВАРИАНТ 4: Web Share API или автоматическое скачивание в Download ---
  try {
    const jsonStr = serializeArrayConfig(array);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], configFileName, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Чертежный массив «${array.name}»`,
        text: 'Конфигурация массива Котлован для Android',
        files: [file],
      });
      setAttachedStorageInfo('Android Хранилище', configFileName);
      saveActiveArrayToStorage(array);
      return {
        success: true,
        folderName: 'Android Хранилище',
        fileName: configFileName,
        safMode: 'STANDARD_STORAGE',
      };
    }
  } catch {
    // Skip share error
  }

  // Фолбэк прямого сохранения
  exportArrayToJsonFile(array);
  setAttachedStorageInfo('Папка «Загрузки»', configFileName);
  return {
    success: true,
    folderName: 'Папка «Загрузки»',
    fileName: configFileName,
    safMode: 'STANDARD_STORAGE',
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

  let loadedArray: BlueprintArray | null = null;
  if (parsed.array && parsed.array.rows && parsed.array.cols) {
    loadedArray = parsed.array as BlueprintArray;
  } else if (parsed.rows && parsed.cols && parsed.cells) {
    loadedArray = parsed as BlueprintArray;
  }

  if (!loadedArray) {
    throw new Error('Файл не содержит корректную конфигурацию массива «Котлован»');
  }

  // Приведение адресов ячеек из SAF пакета к рабочему типу CellData
  const normalizedCells: { [key: string]: CellData } = {};
  Object.entries(loadedArray.cells).forEach(([key, val]: [string, any]) => {
    normalizedCells[key] = {
      row: val.address?.row ?? val.row ?? 0,
      col: val.address?.col ?? val.col ?? 0,
      title: val.cellCardTitle || val.title || `Чертеж ${key}`,
      imageFileName: val.imageFileName || 'plan.png',
      imageDataUrl: val.imageDataUrl || '',
      imageWidth: val.imageWidth || 1200,
      imageHeight: val.imageHeight || 800,
      customPosition: !!val.customPosition,
      commonPoint: val.commonPoint,
      viewport: val.viewport,
      comments: val.comments || [],
    };
  });

  loadedArray.cells = normalizedCells;
  setAttachedStorageInfo('SAF Папка чертежей', file.name);
  return loadedArray;
};
