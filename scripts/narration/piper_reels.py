"""Synthesize reel narration with Piper, one WAV per reel, and report exact line timings.

Called by scripts/narrate-reels.mjs with: <job.json> <out_dir>
job.json: {"model": path, "length_scale": float, "gaps": {...}, "reels": [{"id", "frames": [{"lines": [str]}]}]}
Prints one JSON object on stdout: {"<reel id>": {"duration": s, "frames": [{"start", "end", "lines": [[s, e]]}]}}.
Uses Piper as installed for shortgen; it never writes into shortgen.
"""
import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig


def main() -> None:
    job = json.loads(Path(sys.argv[1]).read_text())
    out_dir = Path(sys.argv[2])
    voice = PiperVoice.load(job["model"])
    config = SynthesisConfig(length_scale=job["length_scale"], volume=0.8)
    gaps = job["gaps"]
    report = {}
    for reel in job["reels"]:
        rate = None
        width = channels = None
        chunks: list[bytes] = []
        cursor = 0  # samples written so far
        frames_out = []

        def silence(seconds: float) -> None:
            nonlocal cursor
            count = int(round(seconds * rate))
            chunks.append(b"\x00\x00" * channels * count)
            cursor += count

        for f_index, frame in enumerate(reel["frames"]):
            spans = []
            for l_index, line in enumerate(frame["lines"]):
                tmp = out_dir / f"_{reel['id']}_{f_index}_{l_index}.wav"
                with wave.open(str(tmp), "wb") as w:
                    voice.synthesize_wav(line, w, syn_config=config)
                with wave.open(str(tmp), "rb") as r:
                    if rate is None:
                        rate, width, channels = r.getframerate(), r.getsampwidth(), r.getnchannels()
                        silence(gaps["lead"])
                    elif l_index > 0:
                        silence(gaps["line"])
                    data = r.readframes(r.getnframes())
                    start = cursor / rate
                    chunks.append(data)
                    cursor += r.getnframes()
                    spans.append([round(start, 3), round(cursor / rate, 3)])
                tmp.unlink()
            frames_out.append({"lines": spans})
            silence(gaps["frame"] if f_index < len(reel["frames"]) - 1 else gaps["tail"])
        duration = cursor / rate
        for i, frame in enumerate(frames_out):
            frame["start"] = 0.0 if i == 0 else frame["lines"][0][0] - 0.12
            frame["end"] = round(duration, 3) if i == len(frames_out) - 1 else None
        for i in range(len(frames_out) - 1):
            frames_out[i]["end"] = round(frames_out[i + 1]["start"], 3)
        for frame in frames_out:
            frame["start"] = round(frame["start"], 3)
        with wave.open(str(out_dir / f"{reel['id']}.wav"), "wb") as w:
            w.setnchannels(channels)
            w.setsampwidth(width)
            w.setframerate(rate)
            w.writeframes(b"".join(chunks))
        report[reel["id"]] = {"duration": round(duration, 3), "frames": frames_out}
    print(json.dumps(report))


if __name__ == "__main__":
    main()
