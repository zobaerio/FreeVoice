# FreeVoice — Zobaerio Technologies

Native Android voice-over studio. The complete interface and assets are bundled inside the APK. **No Vercel, website hosting, or remote frontend.**

## Features
- Cartesia Sonic 3.6 TTS, MP3/WAV output.
- Bengali, English, Hindi and additional language selections.
- Voice ID, emotion and speaking-speed controls.
- Optional OpenAI script writer.
- Audio preview, local script history, save/share generated audio.
- API keys entered by the user on-device; never committed to GitHub or sent to a Zobaerio backend.

## Build Android APK locally
Requires Node.js 20+, Java 17 and Android SDK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Build and download from GitHub
Open Actions → Build Android APK → Run workflow. After successful build, download the installable APK from the workflow artifact. A push to main also publishes a prerelease with the APK attached. No hosting account is needed.

## API keys and privacy
Open API Settings in the app and enter your own Cartesia API key. OpenAI key is optional for AI script writing. Keys remain in app memory for the current session only and are not saved to disk; re-enter after restarting. Requests go directly from the device to the respective provider. Do not distribute an APK prefilled with your private key.

Network access is required for AI generation. The app UI and script history are local; voice generation is not offline. API use is billed/limited by your own provider accounts. Debug APKs are suitable for personal testing; Play Store distribution requires a managed signing key and signed release build.
