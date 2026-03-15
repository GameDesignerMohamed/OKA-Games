# Dead Beat — Game Design Brief
**Pixel 🎮 | March 15, 2026 | Build #17**

## Concept
Top-down rhythm brawler. You punch enemies to the beat. Beat-timing IS the skill axis — on-beat hits deal 3× damage and stagger; off-beat hits deal 1× damage. Enemies telegraph their attacks on the beat — so your dodge timing must also be rhythmically accurate.

## Market Signal
Dead as Disco (GDC 2026 standout) — "rhythm brawler, Hi-Fi Rush × Batman Arkham DNA." OKA-Games has never tested the rhythm-brawler class (Pulse was bullet-hell, not melee).

## Player Controls
- **WASD** — move
- **Left-click** — punch (one attack per beat window)
- **Space** — dodge (timed to beat = iframe; off-beat = no iframe)
- Beat window: a **shrinking ring** pulses toward the player character 0.5 beats early — as it reaches the character it "snaps" = NOW window. Attack or dodge DURING the snap = on-beat.

## Core Game Loop
**On-beat hit:** 2-frame freeze-frame, screen-edge flash, deep bass "THWACK" SFX, enemy staggers + 3× damage, combo counter ticks up.
**Off-beat hit:** dull thud, grey particle puff, no stagger, 1× damage, combo resets.
**Dodge on-beat:** full iframe + slow-mo dash trail.
**Dodge off-beat:** movement only, no iframe — enemy attack connects.
Enemies flash a **1-beat warning ring** before striking — the dodge and the attack are on the same clock. Rhythm is offense AND defense.

## Win / Lose / Progression
- 3 arenas. Each arena: 3 waves + 1 rhythm-synced mini-boss.
- Beat tempo escalates per arena (100 → 120 → 140 BPM).
- Player has 3 HP. Combo multiplier (×1–×5) drives score.
- Die = arena restart. Clear all 3 = win screen with "Max Combo" + "Perfect Hits %" stats.

## Juice / Feel
**On-beat:** 2-frame freeze + zoom-punch camera snap + bass thud SFX + emissive flash on enemy mesh + screen-edge chromatic aberration.
**Miss:** grey puff + harsh "clunk" SFX + combo counter breaks with a visible crack animation.
**Boss death:** full beat-drop pause (0.5s silence) → explosion synced to next downbeat.

## Scope (One Night)
- 3 arenas, 1 background track per arena (Web Audio API tone synthesis)
- 2 enemy types: **Grunts** (small/purple, 1-beat telegraph) and **Heavies** (large/red, 2-beat telegraph)
- 1 mini-boss per arena (Grunt behavior + extra HP + faster tempo)
- No upgrade system — combo score IS the progression signal
- All geometry: simple shapes only

## Lessons Applied
| Rule | Application |
|------|-------------|
| T10 | Enemy telegraph timers use `attackTimer` on enemy object decremented by `dt` — no `setTimeout` for beat-sync damage |
| T2 | Beat clock, combo counter, BPM value declared at module scope |
| B2 | `gameState` guarded before terminal transitions |
| G1 | Player has 3 HP — no one-hit death |
| FX9 | Off-beat dodge = no iframe AND no mesh flicker. On-beat dodge = emissive flicker during iframe window |
| FX11 | Each wave announced: "WAVE N" flash + audio sting before enemies spawn |
| FX7 | Multi-hit combo (3+ on-beat in sequence) triggers visible streak counter + bonus SFX layer |
| CL5 | Grunts = small/fast/purple. Heavies = large/slow/red. Visual identity encodes threat |
| V6 | BGM = sine/triangle only. Hit SFX = sawtooth |
| What Works ✓ | Shrinking beat-ring = anticipation before window. Telegraph rings before every attack |
