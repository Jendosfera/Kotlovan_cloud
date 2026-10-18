# Справка по нативной конфигурации Android APK для «Котлован»

## 1. Сравнение стратегий доступа к хранилищу

| Вариант | Что даёт | Разрешения | Риски и особенности |
|---|---|---|---|
| **A. App-scoped** (`Directory.Data`) | Приватная папка | Не нужны | Файлы не видны в «Проводнике» Android |
| **B. SAF (Выбран в приложении)** | Выбор папки пользователем | **Не требуются опасные права** | **Безопасно, 100% одобрение в Google Play** |
| **C. `MANAGE_EXTERNAL_STORAGE`** | Полный доступ ко всем файлам | `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION` | **Высокий риск блокировки в Google Play**, если приложение не антивирус/файловый менеджер |

---

## 2. Матрица версий Android
* **Android ≤ 9 (API ≤ 29)**: работают `READ_EXTERNAL_STORAGE` и `WRITE_EXTERNAL_STORAGE`.
* **Android 10–12 (API 30–32)**: `WRITE_EXTERNAL_STORAGE` игнорируется системой. Работа с публичными каталогами — через **Storage Access Framework (SAF)**.
* **Android 13+ (API 33+)**: `READ_EXTERNAL_STORAGE` заменено на `READ_MEDIA_IMAGES`. Произвольные файлы JSON/чертежей доступны через SAF (`ACTION_OPEN_DOCUMENT_TREE`).

---

## 3. Фрагмент `android/app/src/main/AndroidManifest.xml`
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="ru.kotlovan.blueprints">

    <!-- Для чтения сканов на старых устройствах API <= 29 -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

    <!-- Для фонарика -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Котлован"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:requestLegacyExternalStorage="true">
        
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="Котлован"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 4. Команды сборки Capacitor
```bash
npm i @capacitor/core @capacitor/cli @capacitor/filesystem @capacitor/app
npx cap add android
npx cap sync android
```
