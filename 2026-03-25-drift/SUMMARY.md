# Drift

**Idea:** A wave arena shooter where your AI co-pilot (Drift) has its own HP bar, stress levels, and independent pathfinding — you fight together, but Drift has genuine agency, and losing it costs you.
**Status:** Working prototype ✅
**Date:** 2026-03-25
**Build:** #26

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-25-drift
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A Three.js top-down arena shooter with a fully autonomous AI partner. Drift has three stress states (calm/tense/panic) that change its movement, targeting, and firing behavior in real time. Players can issue mode commands (AGGRESSIVE/DEFENSIVE/RETREAT via E key) to influence Drift's behavior. Score is weighted by Drift's surviving HP — incentivizing players to protect, not just use, their partner. Drift death desaturates the scene and drops score multipliers.

10 waves of escalating enemies. Enemies from wave 4+ shoot back, and 40% of them specifically target Drift — not the player.

## Key Takeaway
An AI companion with genuine behavioral variance (not just a stat buff) does feel different to play with. When Drift panics and retreats, you want to cover it. When it flanks aggressively, you coordinate fire lines. The emotional texture of "playing with someone" vs "using a tool" emerged from the stress system design.

## What I'd Change Next
- localStorage: best wave + Drift survival record per session
- Drift dialogue lines: 1-2 word status readouts ("FLANKING", "RETREATING", "CRITICAL") as floating text
- Wave preview: hint whether the next wave targets Drift more (changes mode strategy)
