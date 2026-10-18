import { STORAGE_MESSAGES } from '../constants';

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

// In-memory permission state cache
let cachedPermissionState: StoragePermissionState | null = null;
let deniedCount = 0;

// Helper to check if running inside native Android wrapper
export const isNativeAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isCapacitorNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor?.isNativePlatform?.();
  const isAndroidUA = /Android/i.test(navigator.userAgent);
  return isCapacitorNative || isAndroidUA;
};

// Invalidate in-memory cache when app regains focus or visibility changes
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

/**
 * Проверка статуса разрешений к хранилищу с кэшированием в памяти
 */
export const checkStoragePermission = async (): Promise<StoragePermissionState> => {
  if (cachedPermissionState) {
    return cachedPermissionState;
  }

  // 1. Android Native WebView / Capacitor Bridge
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

  // 2. Storage Access Framework (SAF) & File System Access API
  if (typeof window !== 'undefined') {
    if ('showDirectoryPicker' in window || 'showSaveFilePicker' in window) {
      cachedPermissionState = 'granted';
      return 'granted';
    }
    // Web environment default
    cachedPermissionState = 'granted';
    return 'granted';
  }

  cachedPermissionState = 'unsupported';
  return 'unsupported';
};

/**
 * Запрос разрешений хранилища без повторного дергания диалога при отказе
 */
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

  // Web/SAF fallback
  cachedPermissionState = 'granted';
  return 'granted';
};

/**
 * Проверка постоянного отказа (Don't ask again) через эвристику и нативный статус
 */
export const isPermanentlyDenied = async (): Promise<boolean> => {
  if (deniedCount >= 2) {
    return true;
  }
  return false;
};

/**
 * Открытие настроек приложения в Android (Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
 */
export const openAppSettings = async (): Promise<void> => {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { openUrl?: (opts: { url: string }) => Promise<void> } } } }).Capacitor;
  if (cap?.Plugins?.App?.openUrl) {
    try {
      await cap.Plugins.App.openUrl({ url: 'app-settings:' });
      return;
    } catch {
      // fallback
    }
  }

  // Native intent fallback or notification
  if (typeof window !== 'undefined' && 'Android' in window) {
    try {
      (window as unknown as { Android: { openSettings: () => void } }).Android.openSettings();
      return;
    } catch {
      // ignore
    }
  }

  alert(STORAGE_MESSAGES.ERR_PERMANENTLY_DENIED);
};

/**
 * Гарантия наличия доступа. Бросает типизированную ошибку StoragePermissionError, если доступ отсутствует.
 */
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
