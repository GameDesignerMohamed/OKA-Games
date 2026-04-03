# Nexus Raid

**Idea:** An asymmetric top-down arena shooter where choosing your Nexus Core changes the fundamental physics of how you interact with enemies — not cosmetically, but mechanically.
**Status:** Working prototype
**Date:** 2026-04-03

## How to Run
```
cd ~/Projects/OKA-Games/2026-04-03-nexus-raid && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Three fully asymmetric player cores — Shield (deflection-only offense), Blade (lunge chain system), Flux (charge-and-release plasma). 5-wave arena with drone/tank/boss enemies, upgrade system between waves, full Web Audio soundtrack unique to each core, particle effects, camera shake, screen vignette flash, and win/loss states.

## Key Takeaway
The Sonic Rumble failure thesis holds in prototype — Shield Core players genuinely play a DIFFERENT game (redirect vs direct-fire) vs Blade or Flux players. The identity handshake creates divergent skill trees from minute one. Even in raw prototype form, Core selection creates meaningful ownership.

## What I'd Change Next
- Add visual feedback for Blade charge bar (UI element showing lunge range)
- Boss phase 2 at 50% HP (new attack pattern)
- Persistent leaderboard between sessions to reinforce identity ownership data
- Add 2+ more Core types (Ghost Core, Swarm Core) for deeper re-play diversity
