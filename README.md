# FreeVoice — Zobaerio Technologies

FreeVoice is available as an installable Android app and Windows desktop app. The complete interface is bundled locally in each app. **No Vercel, website hosting, or Zobaerio backend is required.**

## Features
- Cartesia Sonic 3.6 text-to-speech, MP3/WAV output.
- Bengali, English, Hindi and additional language selections.
- Voice ID, emotion and speaking-speed controls.
- Optional OpenAI script writer.
- Audio preview, local script history, save/share generated audio.
- API keys entered by the user in the app; never committed to GitHub or sent to a Zobaerio backend.

## Download installers from GitHub
Open the repository's **Releases** page and download:
- Android: `app-debug.apk`
- Windows 64-bit: `FreeVoice-Setup-1.0.0-x64.exe`

Windows installer provides a normal setup wizard, Start Menu shortcut, Desktop shortcut, installation-folder selection, and Windows uninstall entry.

## Build Android APK locally
Requires Node.js 20+, Java 21 and Android SDK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Build Windows installer locally
Requires Node.js 20+ and Windows.

```bash
npm install
npm run desktop:package
```
Installer: `release/FreeVoice-Setup-1.0.0-x64.exe`.

## GitHub Actions builds
A push to main builds both Android APK and Windows installer. Each workflow publishes its own prerelease in GitHub Releases and retains a downloadable workflow artifact.

## API keys and privacy
Open API Settings in the app and enter your own Cartesia API key. OpenAI key is optional for AI script writing. Keys remain in app memory for the current session only and are not saved to disk; re-enter after restarting. Requests go directly from the app to the respective provider. Do not distribute an app prefilled with your private key.

Internet is required for AI generation. The app interface and script history are local; voice generation is not offline. API usage is billed/limited by your own provider accounts. GitHub Actions creates unsigned Windows setup installers; Windows may show a SmartScreen warning for an unsigned app. Code signing can be added later.
