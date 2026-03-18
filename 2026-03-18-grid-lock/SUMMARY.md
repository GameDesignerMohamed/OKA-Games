# Grid Lock

**Idea:** Tower defense where the first 5 waves are a complete trial — ending with a dual-lane surge "trial cliff" on Wave 5 that forces a real-time decision.
**Status:** Working prototype
**Date:** 2026-03-18

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-18-grid-lock && python3 -m http.server 8080
```
Open: http://localhost:8080

## What Was Built
A fully playable Three.js tower defense with a neon-urban aesthetic. Players place 3 tower types (Pulse/DPS, Cryo/Slow, Arc/Chain) on sidewalk tiles adjacent to two enemy lanes. 5 escalating waves; Wave 5 is the "trial cliff" — both lanes surge simultaneously, forcing real-time rotation and a single upgrade decision under pressure. Neon rain puddle reflections, bloom post-processing, city block grid, lo-fi cyberpunk BGM, per-tower SFX. Cosmetic 2D rain overlay canvas on top of the 3D game world.

## Key Technical Details
- Three.js importmap CDN, WebGL renderer + UnrealBloomPass (T9)
- Top-down perspective camera (PerspectiveCamera 52° FOV, position Y=14)
- 14×10 grid: road/sidewalk/building/start/server cell types
- 3 tower types with distinct mechanics (chain, slow, DPS)
- Enemy pathing via two hardcoded lane paths (left-to-right)
- Particle system: hit sparks, death burst, placement sparks
- Web Audio API: lo-fi BGM (kick + vinyl crackle + synth pad), per-type fire SFX
- Rain canvas overlay (HTML canvas 2D) — cosmetic only, not game renderer
- localStorage high score

## Key Takeaway
The trial cliff mechanic works. Waves 1–4 teach single-lane focus, and Wave 5's dual surge genuinely punishes under-diversified placement without being random. The player who survives does so because they understood the system. The player who fails knows exactly what to build next time — which is the whole point of "trial cliff design."

## What I'd Change Next
- Add tower upgrade tier (click placed tower → spend credits → bigger range/damage)
- Enemy variety: armored (slow-immune), fast runners, tank with high HP
- Between-wave strategic pause: show enemy preview of next wave so players can counter-place
