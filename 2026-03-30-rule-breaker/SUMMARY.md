# Rule Breaker (Build #30)

**Idea:** A 3-round arena shooter where the player votes on one rule modifier between rounds — then survives the chaos they chose.  
**Status:** Working prototype  
**Date:** 2026-03-30

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-30-rule-breaker
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Three-round top-down arena shooter (WASD + mouse aim + click to shoot). Between rounds 1→2 and 2→3, the player is shown a "vote screen" with 3 randomly chosen modifiers from a pool of 5. They pick one, and that modifier reshapes the next round's mechanics. The death/win screen shows which modifiers were voted for, with the caption "You voted for this 💀".

**5 modifiers:**
1. **Gravity Flip** — enemies spawn from top edge, fall downward (repositioning skill)
2. **Tiny You** — player shrinks 60%, bullets shrink too (precision skill)
3. **Slow World** — everything at 40% speed (timing/patience skill)
4. **Mirror Mode** — WASD inverted (adaptation/muscle memory skill)
5. **Turret Only** — player can't move, auto-aims (prediction skill)

**Stack:** Three.js r169 via CDN importmap, UnrealBloomPass, Web Audio API (SFX + BGM), single index.html, static.

## Key Takeaway
The "player authors the condition" principle works at session-structure level. The vote screen creates a genuine commitment moment — you know what you're walking into, and the death screen's callback loop makes the shareable caption obvious.

## What I'd Change Next
- Per-round difficulty scaling (more enemies per round, not just faster spawns)
- Show vote results between rounds (brief reveal before round starts)
- Leaderboard/sharing mechanic: copy-paste death screen text with modifier history
