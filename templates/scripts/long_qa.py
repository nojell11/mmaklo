# Frame-by-frame QA of a rendered long-form 16:9 video (8-15 min). Streams the frames (constant memory, fine on a
# 7.7 GB machine): specs, loudness, per-frame luma / saturation / motion, black / white / frozen / pop detection
# (scene cuts from shots.json are planned), per-scene stats and contact sheets (1 frame per second, 60 per sheet).
# Usage: python scripts/long_qa.py <video.mp4> <outdir> [shots.json]
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

vid, out = sys.argv[1], sys.argv[2]
meta = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
shots = meta.get("shots", [])
planned = set()
for s in shots: planned.update((s["a"] - 1, s["a"], s["a"] + 1))
os.makedirs(out, exist_ok=True)
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
R = []
pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels:format=duration", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video")
au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
fps = eval(v["r_frame_rate"])
R.append(f"SPECS {v['width']}x{v['height']} {v['r_frame_rate']} fps, {v.get('nb_frames')} frames, {float(pr['format']['duration']):.3f} s; audio: "
         + (", ".join(f"{s['codec_name']} {s['sample_rate']} Hz {s['channels']}ch" for s in au) if au else "NONE"))
if au:
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = e[e.rfind("Summary:"):]
    R.append("LOUDNESS " + " | ".join(l.strip() for l in tail.splitlines() if l.strip().startswith(("I:", "LRA:", "Peak:"))))
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "silencedetect=n=-45dB:d=1.2", "-f", "null", "-").stderr
    sil = [l.split("] ")[-1] for l in e.splitlines() if "silence_end" in l]
    R.append(f"SILENCES >1.2 s: {len(sil)} " + ("; ".join(sil[:12]) if sil else ""))

W, H = 192, 108
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", vid, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
fs = W * H * 3
mean, std, p2, p98, sat, diff = [], [], [], [], [], []
prev, thumbs, i = None, [], 0
lw = np.array([0.2126, 0.7152, 0.0722], np.float32)
while True:
    b = p.stdout.read(fs * 64)
    if not b: break
    F = np.frombuffer(b, np.uint8).reshape(-1, H, W, 3)
    f32 = F.astype(np.float32) / 255; L = (f32 @ lw).reshape(len(F), -1)
    mx, mn = f32.max(-1), f32.min(-1)
    mean += list(L.mean(1)); std += list(L.std(1)); p2 += list(np.percentile(L, 2, 1)); p98 += list(np.percentile(L, 98, 1))
    sat += list(np.where(mx > 0.06, (mx - mn) / np.maximum(mx, 1e-6), 0).reshape(len(F), -1).mean(1))
    seq = np.concatenate([prev[None], F]) if prev is not None else F
    diff += list(np.abs(np.diff(seq.astype(np.int16), axis=0)).mean(axis=(1, 2, 3)))
    for j in range(len(F)):
        if (i + j) % round(fps) == 0: thumbs.append((i + j, F[j].copy()))
    prev = F[-1].copy(); i += len(F)
n = i
mean, diff = np.array(mean), np.array(diff)
med = np.array([np.median(diff[max(0, k - 8):k + 9]) for k in range(len(diff))])
pops = [k + 1 for k in range(len(diff)) if diff[k] > 3 * med[k] + 1.0 and (k + 1) not in planned]
black = [k for k in range(n) if mean[k] < 0.04]
white = [k for k in range(n) if mean[k] > 0.93]
frozen, rs = [], None
for k in range(len(diff)):
    if diff[k] < 0.02: rs = k if rs is None else rs
    else:
        if rs is not None and k - rs >= 12: frozen.append((rs, k))
        rs = None
R.append(f"FRAMES {n}; black {black[:20]}; white {white[:20]}; frozen spans >=12f {frozen[:20]}")
R.append(f"POPS (unplanned frame-diff spikes > 3x local median): {len(pops)} {pops[:40]}")
R.append(f"MOTION mean diff {diff.mean():.2f}; held frames (diff<0.3): {int((diff < 0.3).sum())} ({(diff < 0.3).mean() * 100:.0f}%)")
R.append("\nPER SCENE (frames: luma mean / std / p2 / p98 / saturation, medians)")
S = {"mean": mean, "std": np.array(std), "p2": np.array(p2), "p98": np.array(p98), "sat": np.array(sat)}
for s in shots or [{"id": 0, "a": 0, "b": n}]:
    a, b = s["a"], min(s["b"], n)
    if a < b: R.append(f"  scene {s['id']:>3} f{a}-{b - 1}: " + " / ".join(f"{np.median(S[k][a:b]):.3f}" for k in S))
np.savez(os.path.join(out, "perframe.npz"), diff=diff, **S)
cw, ch = 192, 108  # sheets: 1 frame per second, 6 x 10 grid = 1 minute per sheet
for k in range(0, len(thumbs), 60):
    Im = Image.new("RGB", (cw * 6, ch * 10), "black"); d = ImageDraw.Draw(Im)
    for j, (fr, im) in enumerate(thumbs[k:k + 60]):
        x, y = (j % 6) * cw, (j // 6) * ch
        Im.paste(Image.fromarray(im), (x, y)); d.rectangle([x, y, x + 44, y + 12], fill="black"); d.text((x + 2, y + 1), str(fr), fill="yellow")
    Im.save(os.path.join(out, f"sheet_{k // 60:02d}.jpg"), quality=85)
open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(R) + "\n")
print("\n".join(R))
