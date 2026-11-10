# FreeVoice — Zobaerio Technologies

FreeVoice is a local-first voice and motion-editing application. Windows desktop has offline speech engines; Android is still in migration and must not be described as fully offline yet.

## Current platform status

| Platform | Speech generation | Voice cloning | Network requirement |
|---|---|---|---|
| Windows desktop | Windows System.Speech/SAPI; optional local Piper; experimental local IndicF5 | IndicF5 reference-conditioned synthesis (experimental; use your own voice or obtain explicit speaker permission) | Local engines work offline after runtimes/models are installed |
| Android | Legacy provider integration remains | Legacy provider integration remains | Internet and provider credentials required for legacy features |
| Web preview | Legacy provider integration remains | Legacy provider integration remains | Internet and provider credentials required |

Windows System.Speech quality and available languages depend on voices installed in Windows. Piper language support depends on the selected model; do not assume a Bengali voice is available. IndicF5 lists Bengali among its supported languages, but FreeVoice has not yet passed a native-speaker Bengali quality test on target Windows hardware.

No Vercel deployment, Zobaerio backend, Cartesia account, or OpenAI API key is required for Windows local speech generation. Optional local engines require their own runtimes and model files, which are not bundled in the installer.

## Features

- Windows offline WAV generation using installed Windows speech voices.
- Optional local Piper neural TTS using a user-supplied Piper executable and matching ONNX model/config.
- Experimental local IndicF5 reference-conditioned synthesis for supported Indic languages, including Bengali.
- Audio preview, script history, and save/share generated audio.
- Motion Studio foundation: editable text/shapes, timeline, keyframes, local audio preview, .fvmotion project save/import, and SVG export.
- Android app build is available, but Android speech generation is not yet fully migrated to local offline engines.

## Windows installer

Open the repository Releases page and download the latest Windows x64 installer. GitHub Actions also retains a Windows installer artifact for each successful build.

The installer is unsigned. Windows SmartScreen may display a warning until the application is code-signed.

## Windows offline System.Speech

The Windows desktop app can list voices installed in Windows and generate WAV files locally through System.Speech. No cloud API key or internet connection is required for this path after FreeVoice is installed. Available languages and voice quality depend on installed Windows speech voices. This is not neural voice cloning.

## Optional local Piper neural TTS

Piper is not bundled. Provide a compatible Windows Piper executable and a matching voice model with its .onnx.json configuration file. Keep the model and config together, then select both in FreeVoice.

Check the selected model's individual licence before commercial distribution. The Piper engine and voice model have separate licence terms; do not assume every community model permits commercial use. Bengali support depends on a suitable model being available.

## Experimental local IndicF5 setup (Windows)

IndicF5 is a heavier research-grade local engine. It is not a one-click bundled feature yet. You need Windows 10/11 x64, a dedicated Python 3.10 virtual environment, IndicF5 dependencies, a complete local model snapshot containing config.json and model weights, a reference WAV of 30 seconds or shorter, and the exact transcript spoken in that recording.

Example setup from the repository root (review upstream project instructions and model licences before installing):

```powershell
py -3.10 -m venv .venv-indicf5
.\.venv-indicf5\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-indicf5.txt
```

Then in FreeVoice desktop: select the virtual environment's python.exe, select the downloaded model snapshot folder itself (not its parent cache directory), select a WAV reference, run diagnostics, enter the exact reference transcript, and generate speech. Confirm the recording is your own voice or that you have explicit permission from the speaker.

**Model security:** the current IndicF5 integration loads model code with Transformers trust_remote_code=True. This can execute Python code from the selected model snapshot. Only use a model snapshot obtained from a source you trust and have reviewed. FreeVoice inference uses local-only model loading.

**Quality and hardware caveat:** CI checks code syntax, automated helper tests, Windows speech runtime availability, and installer packaging. CI does not prove that a real IndicF5 model loads, Bengali pronunciation is natural, or the model fits a particular PC's memory. Those checks require real model files and listening/performance tests on the target Windows computer.

The model and weights are not downloaded automatically or included in the installer. Check the upstream IndicF5 repository and exact model card for current installation instructions, provenance, and commercial-use licence terms before use.

## Motion Studio (Windows-first)

Open Motion Studio from the FreeVoice desktop/home screen. The current foundation includes a 16:9 scene editor with editable text and shapes, layer controls, timeline and playback preview, local audio preview, .fvmotion project save/import, and SVG export.

This is not yet a finished MP4 renderer. Advanced media/video tracks, transitions, captions, 3D scenes, prompt-to-storyboard generation, and final MP4 export remain future development work.

## Build Android APK locally

Requires Node.js 20+, Java 21, and Android SDK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK: android/app/build/outputs/apk/debug/app-debug.apk.

## Build Windows installer locally

Requires Node.js 20+ and Windows.

```bash
npm install
npm run desktop:package
```

Installer: release/FreeVoice-Setup-1.0.0-x64.exe.

## Privacy and API keys

Windows local System.Speech, Piper, and IndicF5 inference run on the device. IndicF5 model setup and downloads are user-managed. Reference audio and generated temporary WAV files are handled locally; generated temporary files are removed after the app reads them.

Android/web still retain legacy provider-backed features until local replacements are implemented and tested. Provider-backed requests send data to that provider, not to a Zobaerio backend. Never commit API keys or distribute an app prefilled with private credentials.

## GitHub Actions

GitHub Actions runs automated tests and packages Windows/Android builds according to workflow configuration. A green installer build is not a substitute for testing a real neural model and listening to its output.
