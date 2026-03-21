# IP Clash

**Idea:** A real-time top-down shooter where each of 3 IP cards fundamentally bends the rules of combat when activated — split shots, time slow, or enemy chaos.

**Status:** Working prototype

**Date:** 2026-03-21

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-21-ip-clash
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Three.js + WebGPU (WebGL fallback) top-down arena shooter. Player moves with WASD, aims/shoots with mouse. 3 waves of enemies: wave 1 rushes (6 enemies), wave 2 is tankier (10 enemies, 2 HP), wave 3 is tankier + shoots back (16 enemies). Three one-use IP cards: **Arcade Dynasty** (split shots into 3), **Dungeon Lord** (time slows to 40% for 6s), **Neon Syndicate** (enemies home toward each other for 5s instead of the player). Each activation triggers a full-screen IP title flash. Particles on enemy death, floating score text, HP bar.

## Key Takeaway
The Neon Syndicate moment is the money shot — watching enemies crash into each other mid-wave produces the exact "I did that" emergent chaos that Pixel's brief promised. Dungeon Lord's slow-mo + split shots combo is satisfying but the card is one-use-per-run so it never gets stale. The market signal (IP name = felt power) holds: seeing "DUNGEON LORD" flash in giant text before everything slows down *feels* different from a generic power-up even with placeholder box graphics. The IP branding does real work.

## What I'd Change Next
- Add a 5-card draft phase between waves (the mechanic Pixel cut for scope — now's the time)
- Visual differentiation per IP: Arcade Dynasty should shift the screen to arcade RGB, Dungeon Lord to desaturated blue
- Score leaderboard / run history so IP card combos have a meta-game purpose
