# Flux

**Idea:** 45-second arena survival where your weapon cycles each run — Boomerang → Scatter → Gravity Well → Chain Lightning — testing whether mastery compounds when the instrument mutates.
**Status:** Working prototype
**Date:** 2026-03-12

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-12-flux && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
4 behaviorally distinct weapon forms that cycle deterministically per run. Boomerang arcs out and returns dealing damage both ways. Scatter fires 5-shot cone rapid fire. Gravity Well pulls all nearby enemies for 2s then detonates. Chain Lightning jumps across 3 nearest enemies with visible arc geometry. 45-second countdown with escalating enemy waves. Full bloom, FogExp2, starfield, camera shake, and Web Audio BGM + per-weapon SFX.

## Key Takeaway
The weapon identity is immediately legible from first projectile — each weapon demands a completely different engagement range and timing. Gravity Well has emergent compound kill moments when enemies cluster. The 45s format creates natural shareable pressure.

## What I'd Change Next
- Add a combo multiplier that rewards killing multiple enemies in quick succession
- Gravity Well cursor placement currently snaps to ground plane — add a visual preview sphere while hovering
- Per-weapon high score tracking across runs to surface the mastery-compounds-over-runs loop more explicitly
