# Long-form video, step 3: the audio mix. Narration (unchanged timing) + the original synthesized SFX cues from
# work/long/<slug>/sfx_events.json (written by long_plan.py) + OPTIONAL music (only when the owner asked for it).
# Voice is normalised to TARGET LUFS integrated, SFX sit well under it, true peak capped at -1 dBTP.
# Usage: python scripts/long_mix.py <slug> [--until S] [--no-sfx] [--music file.wav --music-db -24]
#   -> work/long/<slug>/mix.wav (48 kHz stereo 24-bit, exact plan length) + mix.md report
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from long_dsp import SR, integrated, true_peak, read_wav, write_wav, lp, dbg, st

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
TARGET = -15.0  # LUFS integrated (YouTube plays at -14; voice-only content sits best a touch under)
# level of each cue relative to the voice (dB under the voice's integrated loudness, per cue peak-momentary)
SFX_DB = {"pop": -15, "tick": -19, "whoosh": -17, "coin": -16, "thud": -14}
MIN_GAP = 0.14  # s: same-type cues closer than this are merged


def decode(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64)


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    slug = sys.argv[1]
    work = os.path.join(ROOT, "work", "long", slug)
    src = json.load(open(os.path.join(work, "plan.src.json"), encoding="utf-8"))
    dur = float(arg("--until", src["duration"]))
    n = int(round(dur * SR))
    v = decode(os.path.join(ROOT, "public", src["audio"]))[:n]
    v = np.pad(v, (0, n - len(v)))
    gv = dbg(TARGET - integrated(v)); v = v * gv
    out = st(v).copy()
    rep = [f"# mix ({slug})", f"- voice gain {20*np.log10(gv):+.1f} dB -> {integrated(v):.1f} LUFS"]
    use_sfx = src.get("sfx", True) and "--no-sfx" not in sys.argv
    if use_sfx:
        ev = json.load(open(os.path.join(work, "sfx_events.json")))
        bank = {}
        for name in SFX_DB:
            x, sr = read_wav(os.path.join(ROOT, "public", "long2d", "sfx", name + ".wav"))
            bank[name] = x.mean(0)
        last, placed = {}, 0
        for i, (t, name) in enumerate(sorted(ev)):
            if t >= dur or t - last.get(name, -9) < MIN_GAP: continue
            last[name] = t
            s = bank[name] * dbg(SFX_DB[name]) * 10 ** ((TARGET + 15) / 20) * (1 + 0.08 * np.sin(i * 7.3))
            a = int(max(0, t - 0.02) * SR); b = min(n, a + len(s))
            pan = 0.12 * np.sin(i * 2.1)  # small stereo spread
            out[0, a:b] += s[:b - a] * (1 - pan); out[1, a:b] += s[:b - a] * (1 + pan); placed += 1
        rep.append(f"- sfx cues placed {placed} (of {len(ev)})")
    music = arg("--music") or src.get("music")
    if music:
        m, sr = read_wav(music) if music.endswith(".wav") else (st(decode(music)), SR)
        m = st(m); reps = int(np.ceil(n / m.shape[1])); m = np.tile(m, reps)[:, :n]
        m = m * dbg(TARGET + float(arg("--music-db", -24)) - integrated(m))
        env = lp(np.abs(v), 3.0); env = env / (env.max() + 1e-9)
        duck = dbg(-8 * np.clip(env * 6, 0, 1))  # up to -8 dB under speech
        out += m * duck; rep.append(f"- music {music} at {arg('--music-db', -24)} dB under target, ducked")
    else:
        rep.append("- no music (default; only on the owner's request)")
    fade = int(0.4 * SR); out[:, -fade:] *= np.linspace(1, 0, fade)
    tp = true_peak(out)
    if tp > -1.0:  # soft-knee limiting of the rare peaks, then a gain trim if still over
        thr = dbg(-3.0); a = np.abs(out); over = a > thr
        out[over] = np.sign(out[over]) * (thr + (1 - thr) * np.tanh((a[over] - thr) / (1 - thr)))
        tp2 = true_peak(out)
        if tp2 > -1.0: out *= dbg(-1.0 - tp2)
    rep += [f"- final {integrated(out):.2f} LUFS, true peak {true_peak(out):.2f} dBTP, length {out.shape[1]/SR:.3f} s"]
    write_wav(os.path.join(work, "mix.wav"), out)
    open(os.path.join(work, "mix.md"), "w").write("\n".join(rep) + "\n"); print("\n".join(rep))


if __name__ == "__main__":
    main()
