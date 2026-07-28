# Atrangi Document Workspace Android v1

Basic installable Android wrapper for Atrangi Document Workspace v7.1.

## Features
- Runs the v7.1 all-in-one scanner/document/passport workspace inside Android WebView.
- Camera/gallery/file picker through Android chooser.
- Generated PDF/image/document downloads are saved through the Android bridge to `Downloads/Atrangi Workspace`.
- Internet access is retained for optional lazy-loaded conversion/OCR libraries.
- Minimum Android version: Android 10 (API 29).

## Build
Run `gradle assembleDebug`. The APK is generated under `app/build/outputs/apk/debug/app-debug.apk`.

## Website
The same packaged web app is published from `app/src/main/assets/www/index.html` using the GitHub Pages workflow.