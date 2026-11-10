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
        import torch
        from transformers import AutoModel
    except Exception as exc:
        raise RuntimeError("Missing IndicF5 Python dependencies. Install the official AI4Bharat IndicF5 package in this Python environment. " + str(exc))

    # Validate the selected WAV before loading the large model.
    try:
        reference_info = sf.info(args.reference_audio)
    except Exception as exc:
        raise RuntimeError("Could not read the reference WAV. Re-export it as a valid PCM WAV file. " + str(exc))
    if reference_info.frames <= 0 or reference_info.samplerate <= 0:
        raise RuntimeError("The reference WAV contains no usable audio.")
    if reference_info.duration > 30:
        raise RuntimeError("Use a reference recording of 30 seconds or less to limit memory use.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("FREEVOICE_INDICF5_DEVICE=" + device, flush=True)
    model = AutoModel.from_pretrained(
        args.model_dir,
        trust_remote_code=True,
        local_files_only=True,
    )
    model = model.to(device)
    with torch.inference_mode():
        audio = model(args.text, ref_audio_path=args.reference_audio, ref_text=args.reference_text)

    if isinstance(audio, torch.Tensor):
        audio = audio.detach().float().cpu().numpy()
    if getattr(audio, "dtype", None) == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0:
        raise RuntimeError("IndicF5 returned empty audio.")
    if not np.isfinite(audio).all():
        raise RuntimeError("IndicF5 returned invalid audio values.")
    audio = np.squeeze(audio)
    if audio.ndim != 1:
        raise RuntimeError("IndicF5 returned an unsupported audio shape.")
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    sf.write(args.output, audio, samplerate=24000, subtype="PCM_16")
    print("FREEVOICE_INDICF5_OK", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
