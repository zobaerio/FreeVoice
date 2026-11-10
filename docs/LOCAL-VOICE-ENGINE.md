# FreeVoice Local Voice Engine — Product Plan

## Product decision

FreeVoice should be able to generate speech without Cartesia, OpenAI, ElevenLabs, Google, or another hosted speech API. The target architecture is local-first and offline after the user installs the selected model assets.

The application, editor, project format, audio pipeline, and model manager are Zobaerio-owned. Speech models and runtimes remain third-party open-source components and must retain their required notices and licences.

## Engine tiers

1. **Lightweight offline voices:** Piper-class ONNX/runtime voices for lower-spec Windows PCs. These are preset voices, not personal voice cloning. Check the licence of every voice asset independently.
2. **Natural neural voices:** Kokoro-class local models for supported languages and hardware. These do not provide arbitrary personal voice cloning.
3. **Personal voice cloning:** Evaluate Chatterbox multilingual and other commercially usable local model candidates. Do not ship any model until its code, weights, dataset terms, redistribution terms, output restrictions, and language support have been checked.
4. **Language validation:** Bengali is a must-test language. Do not claim Bengali support or high-fidelity Bengali cloning until native-speaker listening tests pass. Keep language support model-specific rather than assuming every engine supports every language.

## Desktop architecture

- Electron main process owns the local engine lifecycle and secure IPC boundary.
- A managed local worker/runtime generates audio on the user's computer.
- Model files are optional, downloaded by the user on first setup, with disk-space estimates and integrity checks.
- Voice samples and generated audio stay on-device by default.
- No API key, account, cloud queue, remote generation endpoint, or metered character billing.
- Users may import their own audio and may clone only their own voice or a voice for which they have explicit permission.
- Provide CPU mode and optional GPU acceleration; show estimated performance and memory needs.
- Keep a small default installer; download large models separately and let users choose the storage drive.

## Migration sequence

1. **Windows system-voice tier:** offline WAV generation uses installed Windows System.Speech voices through a secure Electron preload/IPC bridge. Quality and language availability depend on Windows speech packs.
2. **Piper neural TTS adapter (in progress):** Windows desktop can point to a user-installed Piper executable and a local `.onnx` voice model with its matching `.onnx.json` config. The app invokes Piper as a local child process (no shell, no network request), validates the model/config pair, and writes WAV output to a temporary app directory. Runtime and models are not bundled or downloaded by FreeVoice. Piper's current official standard voice list does not include Bengali; do not present it as a Bengali solution. Piper runtime is GPL-3.0; model/voice licences are separate and must be reviewed individually before redistribution or commercial use. See the official project and CLI guide: https://github.com/OHF-Voice/piper1-gpl and https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md.
3. Verify offline generation, voice selection, Unicode/Bengali behavior, cancellation, and packaging on real Windows devices.
4. Add a commercially usable local cloning engine after code/weights/dataset licence and language review.
5. Migrate voice profiles to local files and update project metadata.
6. Remove legacy Cartesia endpoints and API key fields after local neural TTS and cloning pass acceptance tests; do not merge Cartesia-dependent PR #6.
7. Build Android-native offline inference only after the Windows engine is stable; some larger models may not fit mobile devices.

## Acceptance tests

- Airplane-mode TTS generation after model installation.
- No outbound network request during speech generation.
- No API key required.
- Voice sample never leaves the device.
- Model/voice licence notices included in installer and About screen.
- Bengali and English quality reviewed separately by human listeners.
- Low-memory behavior, cancellation, progress reporting, and recovery from interrupted model downloads.
