import argparse
import importlib.metadata
import importlib.util
import json
import os
import sys


def package_version(name):
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def main():
    parser = argparse.ArgumentParser(description="Offline FreeVoice IndicF5 setup diagnostics")
    parser.add_argument("--model-dir", default="")
    parser.add_argument("--reference-audio", default="")
    args = parser.parse_args()

    checks = []
    def add(name, ok, detail, level="error"):
        checks.append({"name": name, "ok": bool(ok), "detail": str(detail), "level": level})

    py_ok = sys.version_info[:2] == (3, 10)
    add("Python", py_ok, sys.version.split()[0] + (" · recommended 3.10" if not py_ok else " · supported version"))

    versions = {}
    for module, distribution in (("torch", "torch"), ("transformers", "transformers"),
                                 ("numpy", "numpy"), ("soundfile", "soundfile")):
        available = importlib.util.find_spec(module) is not None
        version = package_version(distribution) if available else None
        versions[module] = version
        add(distribution, available, ("installed " + str(version)) if available else "Not installed in this Python environment")

    cuda_ok = False
    gpu_name = "Not detected"
    if importlib.util.find_spec("torch") is not None:
        try:
            import torch
            cuda_ok = bool(torch.cuda.is_available())
            if cuda_ok:
                gpu_name = torch.cuda.get_device_name(0)
            add("CUDA / GPU", cuda_ok, gpu_name if cuda_ok else "CUDA is unavailable; IndicF5 can fall back to CPU", "info")
        except Exception as exc:
            add("CUDA / GPU", False, "Torch check failed: " + str(exc), "warning")
    else:
        add("CUDA / GPU", False, "Install PyTorch to check GPU availability", "warning")

    model_dir = args.model_dir
    if model_dir and os.path.isdir(model_dir):
        names = set(os.listdir(model_dir))
        config_ok = "config.json" in names
        weights_ok = any(n in names for n in ("model.safetensors", "pytorch_model.bin")) or any(
            n.startswith("model-") and n.endswith(".safetensors") for n in names
        )
        add("Model snapshot", config_ok and weights_ok,
            "config.json and model weights found" if config_ok and weights_ok else "Missing config.json or model weight files")
    else:
        add("Model snapshot", False, "Select a downloaded local IndicF5 model folder")

    if args.reference_audio and os.path.isfile(args.reference_audio):
        try:
            import soundfile as sf
            info = sf.info(args.reference_audio)
            ok = info.frames > 0 and info.samplerate > 0 and info.duration <= 30
            add("Reference WAV", ok, "{} Hz · {:.1f}s · {} channel(s)".format(
                info.samplerate, info.duration, info.channels
            ) if ok else "WAV is empty or longer than 30 seconds")
        except Exception as exc:
            add("Reference WAV", False, "Could not inspect WAV: " + str(exc))
    else:
        add("Reference WAV", False, "Select a reference WAV file")

    required = ("torch", "transformers", "numpy", "soundfile")
    deps_ok = all(versions.get(name) for name in required)
    add("Python dependencies", deps_ok, "Required modules are available" if deps_ok else "Install the missing IndicF5 dependencies")
    ready = all(item["ok"] for item in checks if item["level"] == "error")
    print(json.dumps({
        "ready": ready,
        "python": sys.version.split()[0],
        "device": "cuda" if cuda_ok else "cpu",
        "gpuName": gpu_name,
        "checks": checks
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ready": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
