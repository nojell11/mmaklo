# Long-form video, step 1: find the inputs (timestamps + narration audio + word boundaries) anywhere under a job folder,
# copy the audio into the Remotion project, and scaffold an editable plan with one scene per timestamp line.
# The job folder is only READ (never modified). Folder layout does not matter: files are found by name pattern.
# Usage: python scripts/long_init.py <job_dir> <slug>
#   -> public/long2d/<slug>/narration.mp3, work/long/<slug>/plan.src.json (scaffold), work/long/<slug>/inputs.md
import glob, json, os, re, shutil, subprocess, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
LINE = re.compile(r"^\s*(\d+)\s*\|\s*([\d:.]+)\s*[–-]\s*([\d:.]+)\s*\|\s*(.*)$")


def hms(s):
    p = [float(x) for x in s.split(":")]
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1]


def find(job, pats):
    for pat in pats:
        hits = sorted(glob.glob(os.path.join(job, "**", pat), recursive=True))
        if hits:
            return hits[0]
    return None


NUM = re.compile(r"\$[\d,]+(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:percent|%)|\b\d[\d,]*(?:\.\d+)?\b")


def main():
    job, slug = sys.argv[1], sys.argv[2]
    ts = find(job, ["*timestamps*.txt", "*timestamp*.txt"])
    au = find(job, ["narration.mp3", "narration.wav", "*.mp3", "*.wav"])
    wb = find(job, ["*wordboundary*.json", "*words*.json"])
    missing = [n for n, p in (("timestamps", ts), ("audio", au), ("word boundaries", wb)) if not p]
    if missing:
        sys.exit(f"missing inputs under {job}: {', '.join(missing)}")
    lines = []
    for raw in open(ts, encoding="utf-8"):
        m = LINE.match(raw)
        if m:
            lines.append({"n": int(m[1]), "a": hms(m[2]), "b": hms(m[3]), "text": m[4].strip()})
    W = json.load(open(wb, encoding="utf-8"))
    words = W["words"] if isinstance(W, dict) else W
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", au],
                               capture_output=True, text=True).stdout.strip())
    pub = os.path.join(ROOT, "public", "long2d", slug); os.makedirs(pub, exist_ok=True)
    ext = os.path.splitext(au)[1]
    shutil.copyfile(au, os.path.join(pub, "narration" + ext))
    work = os.path.join(ROOT, "work", "long", slug); os.makedirs(work, exist_ok=True)
    json.dump([{"text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in words],
              open(os.path.join(work, "words.json"), "w", encoding="utf-8"))
    json.dump(lines, open(os.path.join(work, "lines.json"), "w", encoding="utf-8"), indent=0)
    src = os.path.join(work, "plan.src.json")
    if os.path.exists(src):
        print(f"{src} exists: left untouched (delete it to re-scaffold)")
    else:
        scenes = []
        for L in lines:
            nums = NUM.findall(L["text"])
            sc = {"lines": [L["n"], L["n"]], "say": L["text"], "set": "room", "layout": "left", "mood": "neutral", "items": []}
            for v in nums[:2]:  # suggestion only: review every auto item
                sc["items"].append({"kind": "number", "text": v.replace(" percent", "%").strip(), "at": v.split()[0].lstrip("$").split(",")[0], "auto": True})
            scenes.append(sc)
        plan = {"slug": slug, "fps": 30, "audio": f"long2d/{slug}/narration{ext}", "duration": round(dur, 3),
                "lead": {"jacket": "#2f8f8a", "pants": "#3a3f52", "boots": "#2e2a36", "hat": "hair", "hair": "#3a2a22"},
                "sfx": True, "music": None, "chapters": [], "scenes": scenes}
        json.dump(plan, open(src, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    with open(os.path.join(work, "inputs.md"), "w", encoding="utf-8") as f:
        f.write(f"# Inputs ({slug})\n- job: {job}\n- timestamps: {ts} ({len(lines)} lines)\n- audio: {au} ({dur:.3f} s)\n"
                f"- word boundaries: {wb} ({len(words)} words)\n- last line ends {lines[-1]['b']:.3f} s\n")
    print(open(os.path.join(work, "inputs.md"), encoding="utf-8").read())


if __name__ == "__main__":
    main()
