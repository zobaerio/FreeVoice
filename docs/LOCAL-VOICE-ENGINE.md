# FreeVoice Local Voice Engine

## Product decision

FreeVoice targets local-first voice generation. The application, editor, project format, audio pipeline and model manager are Zobaerio-owned. Third-party runtimes and voice models retain their own notices and licences.

## Windows engine tiers

1. Windows System.Speech: lightweight offline baseline. Quality and language availability depend on installed Windows voices.
2. Piper: optional local neural TTS for compatible ONNX models. The user supplies the Piper executable and ONNX plus matching ONNX JSON model pair. Piper runtime is GPL-3.0; each voice model has a separate licence. Piper's standard official voice catalogue does not currently provide Bengali.
3. IndicF5 (experimental): Bengali-capable reference-conditioned neural synthesis. The user supplies a Python 3.10 environment, a local AI4Bharat IndicF5 model snapshot, a WAV reference voice and the exact transcript spoken in that WAV. FreeVoice invokes a bundled Python runner with shell disabled; the runner loads the selected model with local_files_only enabled, so generation does not download model files or call a hosted API. The official model supports Bengali among 11 languages and uses reference audio plus reference transcript as inputs. The upstream model card identifies the model as MIT-licensed; review the complete upstream and dataset notices before redistribution. The model is larger and more demanding than Piper; no low-end CPU performance or voice similarity guarantee is made.
4. Indic-Speak research candidate: supports Bengali and English but is a roughly 3.78B-parameter model and currently uses a model-specific licence with upstream Llama/SNAC/Vocos obligations. It is not the default target for lower-spec PCs or cloning because it uses preset voices rather than personal reference-voice cloning.

## IndicF5 Windows setup

1. Install Python 3.10 and create a dedicated virtual environment.
2. Install the official AI4Bharat IndicF5 package and its dependencies using the upstream instructions: https://github.com/AI4Bharat/IndicF5. The repository includes requirements-indicf5.txt as a starting point; install PyTorch using the build appropriate for your CPU/GPU and Windows setup.
3. The official Hugging Face model repository is gated: sign in to Hugging Face, review and accept the model's access conditions (which currently require sharing contact information), then authenticate the same Python environment with `hf auth login`. FreeVoice does not ask for, store or transmit your Hugging Face token.
4. Download the official `ai4bharat/IndicF5` snapshot to a local folder while online, for example with `hf download ai4bharat/IndicF5 --local-dir D:\\Models\\IndicF5`. Confirm that the folder contains `config.json` and all model files before going offline.
5. In FreeVoice choose the virtual environment's `python.exe`, the downloaded model folder and a WAV reference recording.
6. Enter the exact words spoken in the reference WAV. Use only your own voice or a speaker who has explicitly consented.
7. Generate after setup. The local runner uses `local_files_only=True`; if files or dependencies are missing it reports an error rather than falling back to a cloud service.

IndicF5 reference conditioning is not a guarantee of an identical clone. A human Bengali listening test is required before claiming production-quality Bangladeshi pronunciation. Keep the reference WAV on-device and remove it when no longer needed.

## IndicF5 implementation notes

- Electron main process owns process spawning and file access.
- Renderer reaches the engine only through the context-isolated preload bridge.
- Python executable, model folder and reference WAV paths are stored in the app user-data directory.
- The runner is packaged as a resource outside ASAR.
- Python arguments are passed as an array with shell disabled.
- Output WAV is created in a temporary directory, read by the app and deleted in a finally block.
- The app never sends voice samples or scripts to a remote endpoint from this engine.
- First-time Python/model installation and model download require user setup; inference after setup is local.

## Safety and licence requirements

- Only use the reference speaker's own voice or obtain explicit permission.
- IndicF5 is loaded with the upstream `trust_remote_code=True` integration. Select only a model snapshot obtained from the official AI4Bharat Hugging Face repository; a model folder can contain executable Python code.
- Do not use this feature for impersonation, fraud or deceptive identity claims.
- Include upstream model/runtime notices when redistributing any dependency.
- Check the complete model, code, dataset and upstream component licences before bundling weights in a commercial installer.
- Do not bundle model weights in the default installer; let users choose the model location.

## Android roadmap

Android-native local inference remains a separate milestone. Do not claim Android offline neural TTS until the model can be packaged or downloaded safely, run within mobile RAM/storage limits, and pass physical-device tests.
