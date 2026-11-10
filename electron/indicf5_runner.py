import argparse
import os
import sys

def main():
    parser = argparse.ArgumentParser(description="FreeVoice local IndicF5 inference runner")
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--reference-audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--reference-text", required=True)
    args = parser.parse_args()

    if not os.path.isdir(args.model_dir):
        raise RuntimeError("IndicF5 model folder does not exist.")
    if not os.path.isfile(args.reference_audio):
        raise RuntimeError("Reference audio file does not exist.")
    if not os.path.isfile(os.path.join(args.model_dir, "config.json")):
        raise RuntimeError("Selected folder does not look like a downloaded Hugging Face model snapshot (config.json missing).")

    try:
        import numpy as np
        import soundfile as sf
        from transformers import AutoModel
    except Exception as exc:
        raise RuntimeError("Missing IndicF5 Python dependencies. Install the official AI4Bharat IndicF5 package in this Python environment. " + str(exc))

    model = AutoModel.from_pretrained(args.model_dir, trust_remote_code=True, local_files_only=True)
    audio = model(args.text, ref_audio_path=args.reference_audio, ref_text=args.reference_text)
    if getattr(audio, "dtype", None) == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0:
        raise RuntimeError("IndicF5 returned empty audio.")
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    sf.write(args.output, audio, samplerate=24000, subtype="PCM_16")
    print("FREEVOICE_INDICF5_OK", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
