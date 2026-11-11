# Long-form video, step 4: render the Long2D composition in chunks (8-15 min would not fit one Chrome session on a
# 7.7 GB machine), concat them losslessly, and mux with mix.wav. One bundle per run; chunks that already exist are
# skipped, so a crashed run resumes. Usage:
#   python scripts/long_render.py <slug> [--chunk 1800] [--conc 2] [--crf 18] [--frames A-B] [--scale 1]
#   -> out/long2d/<slug>/<slug>.mp4 (h264 + AAC 320k), chunks in out/long2d/<slug>/chunks/
import json, os, subprocess, sys, time
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
TMP = "D:/remotion-tmp"
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"


def arg(n, d=None):
    return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d


def run(cmd, log):
    print(">", " ".join(cmd)[:200], flush=True)
    with open(log, "a", encoding="utf-8") as f:
        if cmd[0] == "npx" and os.name == "nt": cmd = ["npx.cmd"] + cmd[1:]
        r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, env={**os.environ, "TEMP": TMP, "TMP": TMP}, cwd=ROOT)
    if r.returncode: sys.exit(f"failed ({r.returncode}), see {log}")


def main():
    slug = sys.argv[1]
    plan = json.load(open(os.path.join(ROOT, "public", "long2d", slug, "plan.json"), encoding="utf-8"))
    total = round(plan["duration"] * plan["fps"])
    a, b = (map(int, arg("--frames").split("-")) if arg("--frames") else (0, total - 1))
    chunk, conc, crf, scale = int(arg("--chunk", 1800)), arg("--conc", "2"), arg("--crf", "18"), arg("--scale", "1")
    out = os.path.join(ROOT, "out", "long2d", slug); cdir = os.path.join(out, "chunks"); os.makedirs(cdir, exist_ok=True)
    log = os.path.join(out, "render.log")
    bundle = os.path.join(TMP, f"long-bundle-{slug}")
    run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", bundle], log)
    props = json.dumps({"plan": f"long2d/{slug}/plan.json"})
    pf = os.path.join(out, "props.json"); open(pf, "w").write(props)
    parts, t0 = [], time.time()
    for s in range(a, b + 1, chunk):
        e = min(b, s + chunk - 1)
        p = os.path.join(cdir, f"c_{s:06d}_{e:06d}.mp4"); parts.append(p)
        if os.path.exists(p) and os.path.getsize(p) > 10000: print("skip", p); continue
        run(["npx", "remotion", "render", bundle, "Long2D", p + ".part.mp4", f"--frames={s}-{e}", "--codec=h264", f"--crf={crf}",
             f"--concurrency={conc}", f"--scale={scale}", "--muted", f"--props={pf}", f"--browser-executable={CHROME}",
             "--timeout=240000"], log)
        os.replace(p + ".part.mp4", p)
        print(f"chunk {s}-{e} done, {time.time() - t0:.0f} s elapsed", flush=True)
    lst = os.path.join(cdir, "list.txt")
    open(lst, "w").write("".join(f"file '{p.replace(os.sep, '/')}'\n" for p in parts))
    video = os.path.join(out, "video.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], log)
    mix = os.path.join(ROOT, "work", "long", slug, "mix.wav")
    final = os.path.join(out, f"{slug}.mp4")
    ss, dur = a / plan["fps"], (b - a + 1) / plan["fps"]
    run(["ffmpeg", "-y", "-v", "error", "-i", video, "-ss", f"{ss:.3f}", "-t", f"{dur:.3f}", "-i", mix, "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], log)
    print("final:", final, f"({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
