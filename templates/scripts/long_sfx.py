# Synthesize the small UI SFX set used by the long-form 2D engine (overlay pops, whooshes, ticks, coins, a thud).
# Original, generated here (no samples). Writes 48 kHz 16-bit mono WAVs to public/long2d/sfx/.
# Usage: python scripts/long_sfx.py
import os, wave
import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "long2d", "sfx")
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a, d):
    """attack a s, exponential decay with time constant d s"""
    x = np.arange(n) / SR
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s; y[i] = s
    return y


def write(name, x, peak_db=-6.0):
    x = x / (np.abs(x).max() + 1e-9) * 10 ** (peak_db / 20)
    fade = min(len(x), int(0.004 * SR)); x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    # pop: rising sine blip with a click transient (overlay / pill pop-in)
    d = t(0.12); f = 520 + 900 * (1 - np.exp(-d / 0.02))
    write("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(d), 0.002, 0.035) + 0.3 * rng.standard_normal(len(d)) * env(len(d), 0.0005, 0.003), -8)
    # whoosh: band-limited noise swell (titles, scene-wide moves)
    d = t(0.42); n = rng.standard_normal(len(d)); sw = np.sin(np.pi * np.clip(d / 0.42, 0, 1)) ** 2
    write("whoosh", (lp(n, 2400) - lp(n, 500)) * sw, -10)
    # tick: short wooden tick (checklist rows, list items)
    d = t(0.07); write("tick", (np.sin(2 * np.pi * 1850 * d) + 0.5 * np.sin(2 * np.pi * 3100 * d)) * env(len(d), 0.0005, 0.012), -9)
    # coin: two bright pings (money)
    d = t(0.5); x = np.sin(2 * np.pi * 2093 * d) * env(len(d), 0.001, 0.09)
    k = int(0.07 * SR); x[k:] += 0.9 * np.sin(2 * np.pi * 2794 * d[:-k]) * env(len(d) - k, 0.001, 0.16)
    write("coin", x, -10)
    # thud: low soft hit (strike-through, bad news, drop)
    d = t(0.3); f = 140 * np.exp(-d / 0.08) + 55
    write("thud", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(d), 0.002, 0.07), -7)
    print("wrote", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
