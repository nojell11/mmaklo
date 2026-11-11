# plan.src.json format (input to scripts/long_plan.py)

```json
{
 "slug": "job003", "fps": 30, "audio": "long2d/job003/narration.mp3", "duration": 661.824,
 "lead": {"jacket": "#2f8f8a", "pants": "#3a3f52", "boots": "#2e2a36", "hat": "hair", "hair": "#3a2a22"},
 "sfx": true, "music": null,
 "scenes": [ { "lines": [2, 6], "set": "room", "layout": "left", "mood": "smile", "items": [ ... ] } ]
}
```

## Scene fields
| field | meaning |
|---|---|
| `lines` | `[first, last]` timestamp line numbers. Scenes must be contiguous and cover every line; the lint lists any that are missing. The scene starts at the first line's start and ends where the next scene starts. |
| `set` | `room`, `night`, `desk`, `street`, `board`, `office`, or `concept:<gold, terra, teal, blue, cream, green, red, night>` |
| `layout` | `left` (character left, overlays right), `right`, `center` (one big item on top), `none` (no character) |
| `mood` | base expression: neutral, smile, smile_closed, grin, laugh, stern, nervous, shock, relief, sad, tired, dazed, pained … |
| `enter` | `true` makes the character walk in during the first second |
| `acts` | optional manual track `[{"at": "word", "pose": "pointHi", "expr": "grin", "hop": true, "dur": 0.3}]` that replaces the auto track |
| `cam` | optional `{"z0", "z1", "x0", "x1", "y0", "y1", "blur"}`; the default is chosen automatically and varies per scene |

## `at` anchors
- `"car"` is the first word in the scene that matches. A prefix match works for words of 3+ characters and for numbers.
- `"again#2"` is the 2nd occurrence of the word in the scene.
- `"+1.5"` is scene start + 1.5 s.
- `12.34` is an absolute time in seconds.

## Item kinds (positions and sizes are computed automatically)
| kind | fields | use |
|---|---|---|
| `title` | text (≤ 22 chars), at, color? | key word, big ink-stroked |
| `pill` | text, at, color? | longer phrase in a capsule |
| `number` | text ("$10,489", "90%"), label?, at, color? | counts up, with a label pill |
| `strike` | text, at, strikeAt? | "not X": the text pops, then a red strike |
| `check` | rows `[[text, at], ...]` | checklist on a cream panel, ticks |
| `list` | rows `[[text, at], ...]`, start? | numbered list |
| `receipt` | rows `[[text, value or "", op ("+", "-", "=" or ""), at], ...]` | money math card |
| `bars` | bars `[[label, value, text, at], ...]` | horizontal bar comparison |
| `versus` | a `[head, value, at]`, b `[head, value, at]`, win? ("a", "b"), winAt? | A vs B cards |
| `prop` | prop, label?, at, s? | icon. Props: car, garage, bed, camera, pool, house, coin, coins, cash, bag, phone, calendar, wrench, shield, doc, chart, warning, clock, key, tent, tools, party, storage |
| `coins` | at | coin burst (money moment) |
| `chapter` | num ("PART 2"), text, at, color? | full-screen chapter card; the scene has no character |

Colours: palette names (teal, terra, blue, gold, green, red, cream, tealLt, terraLt, blueLt) or hex.

## Example (job-003, lines 7-9)
```json
{"lines": [7, 9], "set": "concept:gold", "layout": "left", "mood": "grin", "items": [
  {"kind": "coins", "at": "pay"},
  {"kind": "title", "text": "THEY PAY YOU", "at": "pay"},
  {"kind": "strike", "text": "SELL THEM", "at": "selling"},
  {"kind": "title", "text": "RENT THEM", "at": "renting", "color": "teal"}]}
```
