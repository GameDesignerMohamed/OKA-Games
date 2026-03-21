# IP Clash

**Idea:** Arena shooter where you hold 3 fictional IP cards — each one bends the rules of combat for 8 seconds when played.
**Status:** Working prototype ✅
**Date:** 2026-03-21
**Build:** #22

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-21-ip-clash && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A fully playable Three.js top-down arena shooter. Player fights 3 waves of escalating enemies (8/14/20 count, increasing HP and speed). Player holds 3 IP cards — press 1/2/3 to activate:

- **🕹️ ARCADE DYNASTY** (key 1): Every shot splits into 3 spread-cone projectiles for 8 seconds
- **⚔️ DUNGEON LORD** (key 2): All enemies slow to 20% speed for 8 seconds (you move at full speed)
- **💫 NEON SYNDICATE** (key 3): Enemies home toward *each other* — chain collisions damage both

Each card activation triggers a full-screen flash with IP name in giant text + color palette shift. One-time use per run. Strategic timing is the core decision space.

## Market Signal Tested
Scout March 20 — Balatro's 25 IP collaborations drove 150M hours played. "IP injected into familiar loops" as retention driver. This tests: does "each card changes the rules" (Balatro's core feel — rule-bending as mechanic identity) create emergent surprise and strategic depth in a real-time shooter?

## Stack
- Three.js r169 via CDN importmap
- EffectComposer + UnrealBloomPass (strength 0.55)
- Web Audio API — 140 BPM driving arpeggio BGM + full SFX suite
- Single index.html (793 lines), static only
- OctahedronGeometry player, Tetrahedron/Icosahedron/Dodecahedron enemies
- Particle burst deaths, hit flash, camera shake, starfield background

## Key Takeaway
The "rule-bend window" creates natural dramatic pacing — calm → chaotic → calm. Each IP card is a 8-second power fantasy with a distinct character. Neon Syndicate in particular creates genuinely cinematic moments (enemies crashing into each other). The strategic depth question: when do you burn your best card?

## What I'd Change Next
- Add draft phase (choose 3 from 6 cards) to deepen the portfolio strategy signal
- Persistent best score to create cross-run mastery arc
- More IP cards (5-6 total) with more asymmetric effects — "Media Mogul" (buys enemy allegiance), "Retro Lords" (enemies move in grid-locked patterns)
- Sound design: distinct music theme per IP card while active
