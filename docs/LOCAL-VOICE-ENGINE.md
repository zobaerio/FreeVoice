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

1. Add a local engine interface and capability registry.
2. Add a lightweight local TTS engine and voice/model manager.
3. Verify Windows offline generation and packaging.
4. Add a commercially usable local cloning engine after licence and language review.
5. Migrate voice profiles to local files and update project metadata.
6. Remove Cartesia endpoints, API key fields, and Cartesia-specific clone PR only after local TTS and cloning pass acceptance tests.
7. Build Android-specific local inference only after the Windows engine is stable; some larger models may not fit mobile devices.

## Acceptance tests

- Airplane-mode TTS generation after model installation.
- No outbound network request during speech generation.
- No API key required.
- Voice sample never leaves the device.
- Model/voice licence notices included in installer and About screen.
- Bengali and English quality reviewed separately by human listeners.
- Low-memory behavior, cancellation, progress reporting, and recovery from interrupted model downloads.
