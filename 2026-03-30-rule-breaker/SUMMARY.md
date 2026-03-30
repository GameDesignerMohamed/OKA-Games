# Rule Breaker

**Idea:** A 3-round arena shooter where YOU vote on one rule modifier per round — then survive the chaos you chose.
**Status:** Working prototype ✅
**Date:** 2026-03-30
**Build:** #30

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-30-rule-breaker && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A fully playable Three.js top-down arena game. Three 30-second rounds. Between rounds, an HTML vote screen overlays the Three.js canvas presenting 3 random modifier cards. Player clicks one. The modifier activates for the next round, changing what skill class the session demands. WASD move, mouse aim, click shoot. Enemies spawn and chase. Survive all 3 rounds to win.

**5 modifiers:**
- 🌀 Gravity Flip — enemies rain from above (positioning vs. dodging)
- 🔬 Tiny You — player shrinks 60% (precision aim required)
- 🐌 Slow World — 40% speed across all entities (patience/timing replaces reflexes)
- 🪞 Mirror Mode — WASD inverted (muscle memory rewiring)
- 🔫 Turret Only — player immobile, auto-fires (spatial positioning prediction)

**Stack:** Three.js r169 CDN importmap, WebGL renderer + EffectComposer/UnrealBloomPass, Web Audio API BGM + SFX, single index.html, static only.

## Key Takeaway
Proved: pre-round rule voting creates "player authors the condition" ownership at *session structure* level, not just card-activation level (IP Clash Neon Syndicate). The death screen showing which modifier you voted for is the shareable moment — "I chose this and it destroyed me."

## What I'd Change Next
- Per-modifier best-time tracking (localStorage) to create cross-run mastery identity per modifier
- Show run history of voted modifiers on win screen (was already implemented)
- Add a 4th round or escalating modifier combo (stack two modifiers by round 3) for deeper chaos arc
