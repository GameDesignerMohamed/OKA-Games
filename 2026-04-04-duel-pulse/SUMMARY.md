# Duel Pulse

**Idea:** A tight 1v1 skill-based duel arena where the session itself is the shareable social moment — the antithesis of Rec Room's freeform no-loop failure.
**Status:** Working prototype
**Date:** 2026-04-04
**Build:** #33

## How to Run
```
cd ~/Projects/OKA-Games/2026-04-04-duel-pulse
python3 -m http.server 8080
```
Open: http://localhost:8080

## What Was Built

A fully playable Three.js top-down skill duel. Player vs AI in a circular arena.
- **Controls:** WASD move · Mouse aim · Click/Space fire · Shift dodge dash (1.5s cooldown)
- **Loop:** Strafe around the arena, aim pulse shots at the AI, dodge incoming fire. First to 3 hits wins.
- **AI:** Circle-strafes the player, maintains 4–6 unit distance, fires on timer with slight spread, randomizes strafe direction
- **Hit feedback:** Emissive flash on mesh, screen shake, particle burst, screen overlay flash
- **KO:** Particle explosion × 4 bursts, PULSE KO text animation, freeze → result screen
- **Audio:** Web Audio API — looping BGM that accelerates as HP drops, SFX on every event (shoot, hit, dash, KO, win/lose)
- **Visual:** Three.js r169 · OctahedronGeometry player · IcosahedronGeometry enemy · UnrealBloomPass · animated rings/crowns/spikes · starfield · grid arena · pillar accent lights

## Signal Tested
Scout April 3, 2026: Rec Room shutdown — 150M players, zero profitability, no owned core loop.
Thesis: A tight mechanical loop creates sessions that ARE the content. No sandbox, no freeform — just skill vs skill, clear winner, clear moment.

## Key Takeaway
The loop works. Within 30 seconds of first contact you have: strafe angle decisions, dodge timing against AI fire, the moment of landing a hit with full feedback stack. The "session is the content" thesis is testable here.

## What I'd Change Next
- Add copy-to-clipboard on result screen: "I beat DUEL PULSE in 45s — 3-0 clean" (same UA loop as Rule Breaker)
- Add 2-3 AI difficulty tiers with faster strafe/fire
- Track best-time per session (localStorage) for cross-session mastery signal
