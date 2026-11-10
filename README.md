# FreeVoice — Zobaerio Technologies

> **Offline migration status:** The Windows desktop build now has a first local TTS path using installed Windows speech voices (System.Speech/SAPI) and WAV output. It does not call Cartesia or OpenAI for desktop speech generation. This is a lightweight system-voice tier, not neural synthesis or voice cloning. Android/web still use the legacy provider integration until their local engines are implemented and tested.

FreeVoice is available as an installable Android app and Windows desktop app. The complete interface is bundled locally in each app. **No Vercel, website hosting, or Zobaerio backend is required.**

## Features
- Windows desktop: offline WAV text-to-speech through installed Windows system voices.
- Android/web preview: legacy Cartesia Sonic 3.6 text-to-speech, MP3/WAV output while local mobile engines are being developed.
- Android/web preview: legacy Cartesia-based personal voice cloning; not available in the Windows offline desktop mode.
- Saved voice profile IDs are kept in the device's local library; the Cartesia API key remains session-only.
- Bengali, English, Hindi and additional language selections.
- Voice ID, emotion and speaking-speed controls.
- Android/web preview: optional OpenAI script writer. Windows desktop script writing is manual/offline for now.
- Audio preview, local script history, save/share generated audio.
- API keys entered by the user in the app; never committed to GitHub or sent to a Zobaerio backend.

## Download installers from GitHub
Open the repository's **Releases** page and download:
- Android: `app-debug.apk`
- Windows 64-bit: `FreeVoice-Setup-1.0.0-x64.exe`

Windows installer provides a normal setup wizard, Start Menu shortcut, Desktop shortcut, installation-folder selection, and Windows uninstall entry.

## Windows offline voice engine (first local tier)\n\nThe Windows desktop app lists speech voices installed in Windows and generates WAV audio locally through the Windows System.Speech runtime. No Cartesia API key, OpenAI API key, cloud account, or internet connection is required for this desktop speech-generation path. Available languages and voice quality depend on the speech voices installed in Windows. Bengali is only available if a compatible Windows Bengali speech voice is installed. This tier is not neural voice cloning.\n\n## Motion Graphics Studio (Windows-first)

Open **Motion Studio** from the FreeVoice desktop/home screen. The first foundation release includes:
- An independent 16:9 scene editor with editable text, rectangles and circles.
- Layer selection, color, position, size, timing and entrance-animation controls.
- A multi-layer timeline and live playback preview.
- Local audio import for soundtrack preview.
- Local save/restore and portable `.fvmotion` editable project files.
- SVG scene export for vector editing in compatible design tools.

This is a local-first editor foundation, not yet a finished MP4 renderer. Advanced keyframe curves, media/video tracks, transitions, captions, 3D scenes, prompt-to-storyboard generation and final MP4 export are planned as later phases. The project does not call Cartesia or any paid video-generation API. Imported audio remains on the device.

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

Windows desktop offline TTS runs locally. Android/web legacy AI generation still requires internet and provider API keys until their local replacements are complete. GitHub Actions creates unsigned Windows setup installers; Windows may show a SmartScreen warning for an unsigned app. Code signing can be added later.
