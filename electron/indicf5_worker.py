import contextlib
import json
import os
import sys

_model = None
_model_key = None
_torch = None
_np = None
_sf = None


def load_model(model_dir):
    global _model, _model_key, _torch, _np, _sf
    import numpy as np
    import soundfile as sf
    import torch
    from transformers import AutoModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    key = (os.path.abspath(model_dir), device)
    if _model is None or _model_key != key:
        _model = AutoModel.from_pretrained(
            model_dir, trust_remote_code=True, local_files_only=True
        ).to(device)
        _model_key = key
    _torch, _np, _sf = torch, np, sf
    return device


def handle(req):
    required = ("id", "model_dir", "reference_audio", "output", "text", "reference_text")
    if any(not isinstance(req.get(k), str) or not req.get(k) for k in required):
        raise ValueError("Invalid IndicF5 worker request.")
    if not os.path.isfile(os.path.join(req["model_dir"], "config.json")):
        raise RuntimeError("IndicF5 model config.json is missing.")
    if not os.path.isfile(req["reference_audio"]):
        raise RuntimeError("Reference audio file does not exist.")

    device = load_model(req["model_dir"])
    info = _sf.info(req["reference_audio"])
    if info.frames <= 0 or info.samplerate <= 0 or info.duration > 30:
        raise RuntimeError("Reference WAV must contain audio and be 30 seconds or shorter.")

    with _torch.inference_mode():
        audio = _model(
            req["text"],
            ref_audio_path=req["reference_audio"],
            ref_text=req["reference_text"],
        )
    if isinstance(audio, _torch.Tensor):
        audio = audio.detach().float().cpu().numpy()
    if getattr(audio, "dtype", None) == _np.int16:
        audio = audio.astype(_np.float32) / 32768.0
    audio = _np.squeeze(_np.asarray(audio, dtype=_np.float32))
    if audio.size == 0 or audio.ndim != 1 or not _np.isfinite(audio).all():
        raise RuntimeError("IndicF5 returned empty or invalid audio.")

    output_dir = os.path.dirname(os.path.abspath(req["output"]))
    os.makedirs(output_dir, exist_ok=True)
    _sf.write(req["output"], audio, samplerate=24000, subtype="PCM_16")
    return {"id": req["id"], "ok": True, "device": device}


def main():
    for line in sys.stdin:
        req = {}
        try:
            req = json.loads(line)
            # Keep stdout exclusively for the worker's JSON-lines protocol.
            # Model libraries may print progress or warnings during inference.
            with contextlib.redirect_stdout(sys.stderr):
                result = handle(req)
            print(json.dumps(result, ensure_ascii=False), flush=True)
        except Exception as exc:
            request_id = req.get("id", "") if isinstance(req, dict) else ""
            print(
                json.dumps(
                    {"id": request_id, "ok": False, "error": str(exc)[:1200]},
                    ensure_ascii=False,
                ),
                flush=True,
            )


if __name__ == "__main__":
    main()
