# Long-form video, step 2: compile work/long/<slug>/plan.src.json (scenes written by the producer) into
# public/long2d/<slug>/plan.json for the Long2D composition: absolute times from the word boundaries, auto layout of
# overlays, an auto performance track for the character (gestures toward overlays, keyword reactions, idle beats),
# auto cameras, plus sfx_events.json (for long_mix.py), shots.json (for QA) and a lint report.
# Usage: python scripts/long_plan.py <slug> [--until SECONDS]
import json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
PAL = {"wall": "#efe2cc", "teal": "#2f8f8a", "tealLt": "#8fcfc6", "terra": "#c9653f", "terraLt": "#f0b79a", "blue": "#5b8fd1",
       "blueLt": "#cfe0f2", "cream": "#fbf4e6", "gold": "#f2b84b", "green": "#5d9a4a", "red": "#d23a3a"}
W, H = 1920, 1080
CHAR_W = 0.70  # average advance of an uppercase Segoe UI Black glyph, in px per px of font size
WARN = []


def col(c):
    return None if c is None else PAL.get(c, c)


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


class Clock:
    """resolves `at` references: a word ("car", "again#2" = 2nd occurrence in the scene), "+1.5" (scene start + s),
    or a number (absolute seconds)"""

    def __init__(self, words):
        self.w = words
        self.n = [[norm(p) for p in w["text"].split()] + [norm(w["text"])] for w in words]

    def at(self, ref, a, b, ctx=""):
        if isinstance(ref, (int, float)):
            return float(ref)
        ref = str(ref).strip()
        if ref.startswith("+"):
            return a + float(ref[1:])
        q, k = (ref.rsplit("#", 1) + ["1"])[:2] if "#" in ref else (ref, "1")
        q, k = norm(q), int(k)
        for exact in (True, False):
            hits = [w["start"] for w, ns in zip(self.w, self.n) if a - 0.35 <= w["start"] < b + 0.05
                    and any(p == q if exact else ((len(q) >= 3 or q.isdigit()) and p.startswith(q)) for p in ns)]
            if len(hits) >= k:
                return hits[k - 1]
        WARN.append(f"{ctx}: word '{ref}' not found in {a:.2f}-{b:.2f} s, used scene start")
        return a

    def onsets(self, a, b):
        return [w["start"] for w in self.w if a <= w["start"] < b]

    def words_in(self, a, b):
        return [w for w in self.w if a <= w["start"] < b]


# ------------------------------------------------------------------ layout
AREAS = {  # content area per layout: x0, x1, y0, y1
    "left": (760, 1840, 110, 960), "right": (80, 1160, 110, 960), "none": (140, 1780, 110, 980), "center": (140, 1780, 60, 330),
}
WHO = {"left": (380, 1000, 660, False), "right": (1540, 1000, 660, True), "center": (960, 990, 690, False)}


def fit_px(text, px, width):
    return max(26, min(px, int(width / max(1, len(text) * CHAR_W))))


def measure(it, aw):
    """returns (height, item) with font sizes fitted to the area width"""
    k = it["kind"]
    if k == "title":
        it["px"] = fit_px(it["text"], it.get("px", 150), aw); return it["px"] * 1.25
    if k == "pill":
        it["px"] = fit_px(it["text"], it.get("px", 54), aw * 0.8); return it["px"] * 1.7
    if k == "number":
        it["px"] = fit_px(it["text"], it.get("px", 170), aw * 0.9)
        return it["px"] * 1.1 + (it["px"] * 0.55 if it.get("label") else 0)
    if k == "strike":
        it["px"] = fit_px(it["text"], it.get("px", 200), aw * 0.85); it["w"] = len(it["text"]) * it["px"] * CHAR_W * 1.05
        return it["px"] * 1.25
    if k in ("check", "list"):
        longest = max(len(r["text"]) for r in it["rows"])
        it["px"] = fit_px("X" * (longest + 3), it.get("px", 58), aw * 0.92)
        it["gap"] = it["px"] * (2.25 if k == "check" else 2.1)
        return len(it["rows"]) * it["gap"] + (it["px"] * 0.6 if k == "check" else 0)
    if k == "receipt":
        it["w"] = min(aw, 900); it["px"] = it.get("px", 48)
        return len(it["rows"]) * it["px"] * 1.75 + it["px"] * 1.2
    if k == "bars":
        it["w"] = aw; it["px"] = it.get("px", 42); return len(it["bars"]) * it["px"] * 2.3
    if k == "versus":
        it["w"] = min(aw, 1100); return 340
    if k == "props":
        return max(p["s"] for p in it["list"]) * 260 + 70
    return 0


def place(scene, items, layout, ctx):
    x0, x1, y0, y1 = AREAS[layout]
    aw, cx = x1 - x0, (x0 + x1) / 2
    # group consecutive props into rows of up to 3
    blocks, run = [], []
    for it in items:
        if it["kind"] == "prop":
            run.append(it)
            if len(run) == 3: blocks.append({"kind": "props", "list": run}); run = []
        else:
            if run: blocks.append({"kind": "props", "list": run}); run = []
            blocks.append(it)
    if run: blocks.append({"kind": "props", "list": run})
    for b in blocks:
        if b["kind"] == "props":
            for p in b["list"]:
                p.setdefault("s", round(min(1.0, (aw / len(b["list"])) / 330), 2))
    flow = [b for b in blocks if b["kind"] not in ("coins", "chapter")]
    hs = [measure(b, aw) for b in flow]
    gap = 46
    total = sum(hs) + gap * (len(hs) - 1 if hs else 0)
    avail = y1 - y0
    if total > avail:
        k = avail / total
        if k < 0.62: WARN.append(f"{ctx}: overlays too tall for the {layout} area ({total:.0f} > {avail} px): split the scene")
        for b in flow:
            for key in ("px",):
                if key in b: b[key] = int(b[key] * max(k, 0.62))
            if b["kind"] == "props":
                for p in b["list"]: p["s"] = round(p["s"] * max(k, 0.62), 2)
        hs = [measure(b, aw) for b in flow]; total = sum(hs) + gap * (len(hs) - 1)
    y = y0 + max(0, (avail - total) / 2)
    out = []
    for b, h in zip(flow, hs):
        k = b["kind"]
        if k == "props":
            n = len(b["list"])
            for i, p in enumerate(b["list"]):
                p["x"] = round(x0 + aw * (i + 0.5) / n); p["y"] = round(y + 130 * p["s"]); out.append(p)
        elif k in ("check", "list"):
            longest = max(len(r["text"]) for r in b["rows"])
            wid = b["px"] * (1.6 + CHAR_W * longest) + 40
            b["x"] = round(cx - wid / 2); b["y"] = round(y + b["px"] * (0.9 if k == "check" else 0.65))
            if k == "check": b["panel"] = [round(cx - wid / 2 - 50), round(y - 10), round(wid + 100), round(h + 20)]
            out.append(b)
        elif k in ("receipt", "bars", "versus"):
            b["x"] = round(cx - b["w"] / 2); b["y"] = round(y); out.append(b)
        else:
            b["x"] = round(cx); b["y"] = round(y + (b["px"] * 0.6 if k in ("title", "strike") else b["px"] * 0.55 if k == "number" else h / 2))
            out.append(b)
        b["_cy"] = y + h / 2
        y += h + gap
    for b in blocks:
        if b["kind"] == "coins":
            b["x"], b["y"] = round(cx), round((y0 + y1) / 2); b["_cy"] = (y0 + y1) / 2; out.append(b)
    return out


# ------------------------------------------------------------------ performance track
POS_WORDS = {"profit", "free", "great", "win", "earn", "earns", "paid", "pays", "extra", "easy", "best", "good", "bonus", "save", "saves"}
NEG_START = ("but ", "however", "the catch", "here is the catch", "unfortunately", "the problem")


def item_times(it):
    if it["kind"] in ("check", "list"): return [(r["at"], i) for i, r in enumerate(it["rows"])]
    if it["kind"] == "receipt": return [(r["at"], i) for i, r in enumerate(it["rows"])]
    if it["kind"] == "bars": return [(r["at"], i) for i, r in enumerate(it["bars"])]
    if it["kind"] == "versus": return [(it["a"]["at"], 0), (it["b"]["at"], 1)]
    return [(it.get("at", 0), 0)]


def row_y(it, i):
    if it["kind"] in ("check", "list"): return it["y"] + i * it["gap"]
    if it["kind"] == "receipt": return it["y"] + it["px"] * 0.6 + (i + 0.5) * it["px"] * 1.75
    if it["kind"] == "bars": return it["y"] + (i + 0.4) * it["px"] * 2.3
    return it.get("_cy", it.get("y", 540))


def point_pose(y):
    return "pointHi" if y < 430 else "pointMid" if y < 680 else "pointLo"


def auto_track(sc, items, clock, lines, layout, idx):
    a, b, mood = sc["a"], sc["b"], sc.get("mood", "smile")
    ev = []  # (t, key, priority)
    base = ["hips", "palms", "rest", "present"][idx % 4] if layout != "center" else ["palms", "rest"][idx % 2]
    ev.append((a, {"pose": base, "expr": mood, "look": 1 if layout != "center" else 0}, 9))
    first = True
    for it in items:
        for t, i in item_times(it):
            y = row_y(it, i)
            if layout == "center":
                pose = "present" if it["kind"] != "coins" else "cheer"
            elif it["kind"] == "strike": pose = "wag"
            elif it["kind"] == "coins": pose = "cheer"
            elif it["kind"] in ("number", "title") and first: pose = "present"
            else: pose = point_pose(y)
            key = {"pose": pose}
            if it["kind"] == "coins": key.update(expr="grin", hop=True)
            if it["kind"] == "strike": key.update(expr="stern")
            if first and it["kind"] in ("title", "number", "coins"): key["hop"] = True
            ev.append((t, key, 5)); first = False
    for L in lines:
        tx = L["text"].lower()
        if tx.startswith(NEG_START):
            ev.append((max(a, L["a"]), {"pose": "shrug", "expr": "nervous", "hop": "catch" in tx}, 7))
        if L["text"].rstrip().endswith("?"):
            ev.append((max(a, L["a"]), {"pose": "think", "expr": "neutral"}, 6))
        for w in clock.words_in(L["a"], L["b"]):
            if norm(w["text"]) in POS_WORDS and not tx.startswith(NEG_START):
                ev.append((w["start"], {"pose": "thumb", "expr": "grin"}, 4)); break
    ev.sort(key=lambda e: (e[0], -e[2]))
    keys, last_t, last_hop = [], -9.0, -9.0
    for t, k, pr in ev:
        if keys and t - last_t < (0.25 if keys[-1]["_pr"] == 9 else 0.6):
            if pr > keys[-1]["_pr"] and t - last_t < 0.15: keys[-1] = {"t": round(t, 3), **k, "_pr": pr}
            continue
        if k.get("hop") and t - last_hop < 3.5: k = {**k}; k.pop("hop")
        if k.get("hop"): last_hop = t
        if keys and k.get("pose") == keys[-1].get("pose"):
            k = {**k, "dur": 0.38}  # same pose again: perform.ts re-gestures from a pulled-back hand
        keys.append({"t": round(t, 3), **k, "_pr": pr}); last_t = t
    # idle beats: never hold one gesture longer than ~3.5 s while talking
    cyc = ["palms", "present", "hips", "rest", "present", "palms"]
    out, j = [], 0
    for i, k in enumerate(keys):
        out.append(k)
        nxt = keys[i + 1]["t"] if i + 1 < len(keys) else b
        t = k["t"]
        while nxt - t > 3.6:
            mid = t + 2.6
            on = [o for o in clock.onsets(mid - 0.6, mid + 0.8)]
            tb = on[0] if on else mid
            if nxt - tb < 1.0: break
            p = cyc[(idx + j) % len(cyc)]; j += 1
            if p == (out[-1].get("pose")): p = cyc[(idx + j) % len(cyc)]; j += 1
            out.append({"t": round(tb, 3), "pose": p, "expr": mood, "_pr": 1}); t = tb
    for k in out: k.pop("_pr", None)
    return out


# ------------------------------------------------------------------ cameras
def auto_cam(i, set_name, dur, layout):
    blur = 4 if set_name.startswith("concept") or set_name == "desk" else 2 if set_name == "board" else 3
    rate = min(0.07, 0.012 * dur + 0.02)  # longer scenes creep further, capped
    v = i % 4
    sx = -1 if layout == "right" else 1
    if v == 0: return {"z0": 1.0, "z1": 1.0 + rate, "blur": blur}
    if v == 1: return {"z0": 1.02 + rate, "z1": 1.02, "blur": blur}
    if v == 2: return {"z0": 1.0, "z1": 1.0 + rate, "x0": 0, "x1": 40 * sx, "blur": blur}
    return {"z0": 1.01, "z1": 1.01 + rate, "y0": 10, "y1": -20, "blur": blur}


# ------------------------------------------------------------------ main
def resolve_items(src_items, clock, a, b, ctx):
    out = []
    for n, it in enumerate(src_items):
        c = f"{ctx} item {n + 1} ({it['kind']})"
        k = it["kind"]
        o = {"kind": k}
        A = lambda r: round(clock.at(r, a, b, c), 3)
        if k in ("title", "pill", "number", "prop", "coins"):
            o["at"] = A(it.get("at", "+0"))
            for f in ("text", "label", "prop", "px"):
                if f in it: o[f] = it[f]
            if "s" in it: o["s"] = it["s"]
            if it.get("color"): o["color"] = col(it["color"])
            if k == "title" and len(it["text"]) > 22: WARN.append(f"{c}: title over 22 characters, use a pill or split")
        elif k == "strike":
            o.update(text=it["text"], at=A(it.get("at", "+0")))
            o["strikeAt"] = A(it["strikeAt"]) if "strikeAt" in it else round(o["at"] + 0.55, 3)
            if it.get("color"): o["color"] = col(it["color"])
        elif k in ("check", "list"):
            o["rows"] = [{"text": r[0], "at": A(r[1])} for r in it["rows"]]
            if "start" in it: o["start"] = it["start"]
        elif k == "receipt":
            o["rows"] = [{"text": r[0], "value": r[1] or None, "op": r[2] or "", "at": A(r[3])} for r in it["rows"]]
            for r in o["rows"]:
                if r["value"] is None: r.pop("value")
        elif k == "bars":
            o["bars"] = [{"label": r[0], "value": r[1], "text": r[2], "at": A(r[3])} for r in it["bars"]]
        elif k == "versus":
            o["a"] = {"head": it["a"][0], "value": it["a"][1], "at": A(it["a"][2])}
            o["b"] = {"head": it["b"][0], "value": it["b"][1], "at": A(it["b"][2])}
            if it.get("win"): o["win"] = it["win"]; o["winAt"] = A(it.get("winAt", "+0"))
        elif k == "chapter":
            o.update(num=it.get("num", ""), text=it["text"], at=A(it.get("at", "+0")), color=col(it.get("color", "teal")))
        else:
            WARN.append(f"{c}: unknown kind"); continue
        out.append(o)
    return out


def main():
    slug = sys.argv[1]
    until = float(sys.argv[sys.argv.index("--until") + 1]) if "--until" in sys.argv else None
    work = os.path.join(ROOT, "work", "long", slug)
    src = json.load(open(os.path.join(work, "plan.src.json"), encoding="utf-8"))
    words = json.load(open(os.path.join(work, "words.json"), encoding="utf-8"))
    lines = json.load(open(os.path.join(work, "lines.json"), encoding="utf-8"))
    LN = {L["n"]: L for L in lines}
    clock = Clock(words)
    dur = src["duration"]
    scenes, sfx, used_lines = [], [], set()
    S = src["scenes"]
    for i, sc in enumerate(S):
        l0, l1 = sc["lines"]
        a = 0.0 if i == 0 else scenes[-1]["b"]
        b = dur if i == len(S) - 1 else LN[S[i + 1]["lines"][0]]["a"]
        ctx = f"scene {i + 1} (lines {l0}-{l1})"
        for n in range(l0, l1 + 1): used_lines.add(n)
        lay = sc.get("layout", "left")
        items = resolve_items(sc.get("items", []), clock, a, b, ctx)
        chapter = any(it["kind"] == "chapter" for it in items)
        if chapter: lay = "none"
        placed = place(sc, [it for it in items if it["kind"] != "chapter"], lay, ctx) + [it for it in items if it["kind"] == "chapter"]
        set_name = sc.get("set", "room")
        out = {"a": round(a, 3), "b": round(b, 3), "set": set_name, "cam": sc.get("cam") or auto_cam(i, set_name, b - a, lay), "items": placed, "who": None}
        if lay in WHO and not chapter:
            x, y, h, flip = WHO[lay]
            sl = [LN[n] for n in range(l0, l1 + 1)]
            track = {"keys": sc["acts"] if "acts" in sc else auto_track({**sc, "a": a, "b": b}, placed, clock, sl, lay, i)}
            if "acts" in sc:
                for k in track["keys"]: k["t"] = round(clock.at(k.pop("at"), a, b, ctx), 3)
            if sc.get("enter"):
                dx = -520 if not flip else 520
                track["walk"] = [{"t0": a, "t1": a + 1.0, "x0": x + dx, "x1": x}]
                track["keys"] = [k for k in track["keys"] if k["t"] >= a + 1.0 or k is track["keys"][0]]
            out["who"] = {"x": x, "y": y, "h": h, "flip": flip, "track": track}
        for it in placed:
            k = it["kind"]
            if k == "chapter": sfx.append([it["at"], "whoosh"])
            elif k == "title": sfx.append([it["at"], "whoosh"])
            elif k == "strike": sfx += [[it["at"], "pop"], [it["strikeAt"], "thud"]]
            elif k == "coins": sfx.append([it["at"], "coin"])
            elif k in ("check", "list"): sfx += [[r["at"], "tick"] for r in it["rows"]]
            elif k == "receipt": sfx += [[r["at"], "tick"] for r in it["rows"]]
            elif k == "bars": sfx += [[r["at"], "pop"] for r in it["bars"]]
            elif k == "versus": sfx += [[it["a"]["at"], "pop"], [it["b"]["at"], "pop"]]
            elif k == "number": sfx.append([it["at"], "coin" if "$" in it["text"] else "pop"])
            else: sfx.append([it["at"], "pop"])
        for it in placed: it.pop("_cy", None)
        scenes.append(out)
        if b - a > 14: WARN.append(f"{ctx}: {b - a:.1f} s long, split it (max ~12 s per scene)")
        if not placed and b - a > 5 and not chapter: WARN.append(f"{ctx}: {b - a:.1f} s without any overlay")
    missing = [n for n in LN if n not in used_lines]
    if missing: WARN.append(f"timestamp lines not covered by any scene: {missing[:30]}")
    # overlay coverage: every number spoken should be on screen; flag gaps of > 9 s without a new overlay event
    ev_t = sorted(t for t, _ in sfx)
    for p, q in zip([0.0] + ev_t, ev_t + [dur]):
        if q - p > 9: WARN.append(f"no new overlay between {p:.1f} s and {q:.1f} s ({q - p:.1f} s)")
    shown = " ".join(json.dumps(s["items"]) for s in scenes)
    shown_n = norm(shown)
    for L in lines:
        for m in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", L["text"]):
            v = norm(m)
            if len(v) >= 2 and v not in shown_n and not (1900 <= int(v[:4] or 0) <= 2100 and len(v) == 4):
                WARN.append(f"line {L['n']}: number '{m}' is spoken but not on screen")
    fps = src.get("fps", 30)
    plan = {"slug": slug, "fps": fps, "duration": dur, "lead": src["lead"], "words": [[w["start"], w["end"]] for w in words], "scenes": scenes}
    if until:
        plan["scenes"] = [s for s in scenes if s["a"] < until - 0.5]; plan["scenes"][-1]["b"] = until; plan["duration"] = until
        WARN[:] = [w for w in WARN if "not covered" not in w]
    pub = os.path.join(ROOT, "public", "long2d", slug); os.makedirs(pub, exist_ok=True)
    json.dump(plan, open(os.path.join(pub, "plan.json"), "w", encoding="utf-8"), separators=(",", ":"))
    json.dump([e for e in sorted(sfx) if not until or e[0] < until], open(os.path.join(work, "sfx_events.json"), "w"), indent=0)
    cuts = [{"id": i + 1, "a": round(s["a"] * fps), "b": round(s["b"] * fps)} for i, s in enumerate(plan["scenes"])]
    json.dump({"shots": cuts}, open(os.path.join(work, "shots.json"), "w"), indent=0)
    rep = [f"# plan lint ({slug}{', until ' + str(until) + ' s' if until else ''})", f"scenes {len(plan['scenes'])}, duration {plan['duration']:.2f} s, "
           f"overlay events {len(sfx)}, mean scene {plan['duration'] / max(1, len(plan['scenes'])):.1f} s"] + [f"- {w}" for w in WARN]
    open(os.path.join(work, "lint.md"), "w", encoding="utf-8").write("\n".join(rep) + "\n")
    print("\n".join(rep))


if __name__ == "__main__":
    main()
