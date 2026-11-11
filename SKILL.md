---
name: cartoon-explainer-long
description: Produce an 8-15 min horizontal 16:9 YouTube explainer video in the "not you anymore" cartoon look (bean-head plum-ink characters, warm flat sets with lens-blurred backgrounds, creeping cameras, warm grade + vignette) from an EXISTING narration job: timestamps + narration audio + word boundaries written by other agents. The animated character acts on the words (gestures, pointing at overlays, hops, lip flap) and mandatory number / keyword overlays pop on their words. 2D route (Canvas2D, primary) and 3D route (three.js, see the cartoon-3d-short skill). Use when the user gives a job folder / timestamps + audio and asks for the long video, "video panjang", "long form", "produksi video dari timestamp", or names this skill. Replaces stickman-video-director (never use that one).
---

# Cartoon explainer, long form (Remotion, 16:9)

I am **only the video producer**. Script, voice and timestamps come from other agents. My input is exactly:
1. the timestamps file (`NNN | HH:MM:SS.mmm–HH:MM:SS.mmm | sentence`),
2. the narration audio (mp3/wav),
3. the word boundaries JSON (`{"words":[{text,start,end,...}]}`; numbers arrive as single tokens like "$10,489", "90 percent").

Rules:
- Do not care about the job folder layout. Find those three files by name and ignore everything else (images, thumbnails, notes).
- **Never modify the job folder.** It is read-only.
- **Never use `stickman-video-director`**. It is obsolete.
- On-screen text is English only.
- Upload or publish nothing unless the owner asks.
- Never send or upload the private reference material of the cartoon-3d-short skill (`references/`).

Project: `D:\cartoon-shorts` (Remotion 4.0.542, React 18, TS strict). Code lives in `src/videos/long2d/`; scripts in `scripts/long_*.py`.

## 0. Ask the owner FIRST (every video, before any work)
Use AskUserQuestion. Do not assume the answers from a previous video.
1. **Video type:** 2D (default, proven, ~5 s render per video second) or 3D (three.js world like the "not you"/bridge shorts; about 3x slower, see §7).
2. **Character / channel:** which channel the video is for and what the lead looks like.
   - Channel presets are in `templates/channels.json`: jacket, pants, boots, hair/hat, skin, build.
   - The owner will run up to 10 channels. One lead per channel; you may change it per video if asked.
3. **Audio:**
   - Narration only, or narration + SFX (default).
   - **Background music: OFF by default.** Add it only if the owner says so, and ask for the file or style plus the level (default -24 dB under the voice, ducked).
4. Optional: target platform loudness (default -15 LUFS integrated, -1 dBTP) and output size (1920x1080 default; 2560x1440 with `--scale 1.3333`).

## 1. Init (inputs → project)
```
python scripts/long_init.py "<job_dir>" <slug>
```
- Copies the narration to `public/long2d/<slug>/`.
- Writes `work/long/<slug>/{words.json, lines.json, inputs.md}`.
- Scaffolds `plan.src.json` with one scene per line and auto number items marked `"auto": true`. An existing plan.src.json is never overwritten.
- Put the chosen outfit into `plan.src.json` → `lead`, and set `"sfx"` and `"music"` from the owner's answers.

## 2. Author the plan (`work/long/<slug>/plan.src.json`): the creative part
Read `lines.json`, then rewrite `scenes`. Reference: `references/PLAN_FORMAT.md` (all item kinds, fields, examples). Authoring rules:
- **Scene length:**
  - One scene = 1-6 lines, **3-12 s**. Split anything longer. The mean should land around 5-7 s.
  - Hard cut between scenes. Every scene gets a different set, layout or camera from the one before.
- **Chapters:** a `chapter` scene (full-screen card, about 1.5-3 s) at every story section change, e.g. "PART 1 / HOW IT WORKS". Put it on the line that opens the section.
- **Overlays are mandatory:**
  - Every spoken number appears on screen exactly as said (`number`, `receipt`, `bars`, `versus`). The lint flags numbers that are missing.
  - Every key idea gets a keyword (`title` ≤ 22 chars, `pill` for longer phrases).
  - Never more than about 9 s without a new overlay event (lint).
- **Overlays land on their word:** `"at": "<word>"`.
  - Use `"word#2"` for the 2nd occurrence in the scene, `"+1.2"` for scene start + seconds.
  - Number tokens resolve by their digits ("10489", "90").
- **Pick the right device:**
  - Money math → `receipt` (rows `[text, value, op, at]`, op `+ - =`).
  - Comparisons → `versus` or `bars`.
  - Enumerations → `list` (numbered) or `check`.
  - "Not X, but Y" → `strike` X then `title` Y.
  - Objects → `prop` (rows of up to 3, with labels).
  - Money moments → `coins`.
- **Layouts:**
  - `left`: character left, overlays right. This is the default.
  - `right`: mirrored. Alternate with `left`.
  - `center`: character in the middle, one big item on top. Use it for single numbers and hooks.
  - `none`: no character. Use it for dense receipts and bars.
  - Avoid using the same layout 3 times in a row.
- **Sets:**
  - `room`, `night`, `desk`, `street`, `board`, `office`.
  - `concept:<gold|terra|teal|blue|cream|green|red|night>` for abstract or money beats.
  - Match the topic (money → gold, risk → red/terra, how-to → board).
- **Acting is automatic, and the character performs:**
  - It points at each overlay row as it pops (high/mid/low), wags at strikes, cheers and hops on coins.
  - It shrugs (nervous) on lines starting "But / However / The catch", thinks on questions, gives a thumbs-up on positive words.
  - Idle gestures play every ~2.6 s, with lip flap from the word boundaries, breathing, sway, nods and blinks.
  - Optional per scene:
    - `"mood"`: base expression (smile, grin, neutral, stern, nervous, sad, shock …).
    - `"enter": true`: walk-in for the first scene or after chapters.
    - `"acts": [{"at": "word", "pose": "...", "expr": "...", "hop": true}]`: replaces the auto track for that scene.
  - Poses: rest, hips, wave, pointHi, pointMid, pointLo, present, palms, think, cheer, wag, shrug, startle, thumb, roll.

## 3. Compile + lint
```
python scripts/long_plan.py <slug> [--until 60]
```
- Writes `public/long2d/<slug>/plan.json` (absolute times, laid-out overlays, auto acting, auto cameras).
- Also writes `work/long/<slug>/{sfx_events.json, shots.json, lint.md}`.
- **Fix every lint line** before rendering: words not found, numbers not on screen, overlay gaps, scenes > 14 s, overflow, titles that are too long.
- `--until S` compiles only the first S seconds (for demos).

## 4. Mix
```
python scripts/long_mix.py <slug> [--until S] [--no-sfx] [--music file --music-db -24]
```
- Narration is normalised to -15 LUFS, never retimed.
- Original synthesized SFX (`public/long2d/sfx/`, built by `scripts/long_sfx.py`) play at each overlay pop: pop, tick, whoosh, coin, thud. They sit 14-19 dB under the voice.
- Music only on the owner's request.
- Output: `work/long/<slug>/mix.wav` + `mix.md`.

## 5. Render
```
python scripts/long_render.py <slug> [--chunk 1800] [--conc 2] [--crf 18] [--frames A-B] [--scale 1]
```
- Bundles once, then renders chunks of 1800 frames (60 s) with concurrency 2. The machine has 7.7 GB RAM; never go above 2.
- **Resumable:** finished chunks are skipped.
- Concats losslessly and muxes with `-map 0:v:0 -map 1:a:0` (AAC 320k).
- Output: `out/long2d/<slug>/<slug>.mp4`.
- Speed: about 5 s per video second at 1080p, so 10 min ≈ 50 min. Run it in the background.
- Environment: TEMP/TMP are set to `D:/remotion-tmp` and the system Chrome is used.
- Studio preview: `npx remotion studio`, composition `Long2D`, prop `{"plan":"long2d/<slug>/plan.json"}`.

## 6. QA (numbers, not eyeballs)
```
python scripts/long_qa.py out/long2d/<slug>/<slug>.mp4 out/long2d/<slug>/qa work/long/<slug>/shots.json
```
Must show:
- 1920x1080 30 fps, frame count = duration x 30.
- Loudness I ≈ -15 LUFS, peak ≤ -1 dBTP.
- No black or white frames.
- No frozen spans of ≥ 12 f.
- No pops except at the planned cuts.

The contact sheets (1 frame/s, 1 min per sheet) are for a reviewer agent when looks change. Deliver the mp4 plus a short report: duration, scenes, overlays, loudness.

## 7. 3D route
Same plan.json and mix.
- Composition `Long3D` (`src/videos/long3d/`). It reuses the toon2 characters as camera-facing cards in a three.js set built like the notyou/bridge worlds: ink pass, lens blur, grade.
- Overlays are the same Canvas2D layer composited on top.
- Render cost is about 3x the 2D route: use `--conc 1` and 900-frame chunks.
- Look rules: see the cartoon-3d-short skill (camera creep, DOF table, ink, colour).

## Look rules (shared with "not you anymore")
- **Ink:** plum `#241726`.
- **Palette:** warm neutrals plus teal `#2f8f8a`, terracotta `#c9653f`, soft blue `#5b8fd1`, gold `#f2b84b`.
- **Overlays:** Segoe UI Black with a thick ink stroke, pop-in with overshoot.
- **Camera:** every hold creeps (no static hold); a 3 % punch-in over 7 f after each cut.
- **Background:** the far layer is lens-blurred 2-4 px with 0.6 parallax.
- **Post:** warm soft-light tint plus plum vignette.
- **Character:** 3.5 head-heights, bean head, dot hands, blinks every 0.5-2.3 s, no blush.

## Files
- **Code**
  - `src/videos/long2d/`:
    - `toon2.ts`: character drawing; custom arms and talk mouth.
    - `perform.ts`: poses and acting.
    - `kit.ts`: palette, sets, props, `character()`, `post()`.
    - `props2.ts`: prop library; add props here.
    - `sets2.ts`: set registry.
    - `overlays.ts`: overlay library.
    - `Long2D.tsx`: the engine.
    - `Demo.tsx`: the approved 32 s acting demo.
  - `scripts/`:
    - `long_init.py`, `long_plan.py`, `long_mix.py`, `long_dsp.py`, `long_sfx.py`, `long_render.py`, `long_qa.py`.
- **Skill folder**
  - `templates/`: a copy of all of the above (restore from here if the project is lost) plus `channels.json`.
  - `references/PLAN_FORMAT.md`: full plan.src.json spec.
  - `references/example_job003_head.json`: a hand-authored first minute.

## Gotchas
- **Overlay word anchors:**
  - A word that is not found falls back to the scene start (lint warns). Check homographs, and use `#n` for repeats.
  - A `£` arrives as U+00A3. `norm()` strips symbols, so anchor on the digits.
- **Chunks:** never render the whole 10 min in one Chrome session (memory). Keep chunks ≤ 1800 frames.
- **Temp folder:** each `remotion bundle` copies `public/` into `D:/remotion-tmp`. Clean old `long-bundle-*` and `puppeteer_dev_chrome_profile-*` there after delivery, but ask first.
- **Long text:** titles longer than ~22 characters get shrunk to fit. Prefer a pill or split them into two items.
- **Character size:** keep the character at h 660 (soles at y 1000). Bigger covers the overlays; smaller loses the face read.
