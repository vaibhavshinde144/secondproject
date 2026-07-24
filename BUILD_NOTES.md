# Build notes

The GitHub Actions workflow builds and verifies an installable APK and uploads it as an artifact named `Atrangi-Ledger-Android-v1.0.0`.

The app launches `https://atrangi-ledger.web.app/`. If Digital Asset Links verification is not yet deployed for this APK signing certificate, Android Browser Helper safely uses Chrome Custom Tabs. The web application's Google authentication remains compatible.
