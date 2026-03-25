# DESIGN.md — Drift

**Date:** 2026-03-25  
**Build:** #26  
**Signal:** Google mandating AI gameplay assistants → AI companions as core mechanics, not bolt-ons  

---

## Market Signal
Google mandating Gemini "Play Games Sidekick" as a condition for 15% IAP rates. 90 games already integrated. Signal: AI companions at platform-level demand. This build tests whether a *named, stateful* AI partner creates emotional attachment vs. a generic assistant.

---

## Player Controls
- **WASD** — move player ship
- **Mouse aim** — rotate/aim
- **Left click / hold** — fire
- **E** — issue command to Drift: cycle AGGRESSIVE / DEFENSIVE / RETREAT
- Raw movement and positioning matter — no dash, no reload

---

## Core Game Loop
Survive 10 waves of enemy drones. Enemies target BOTH player and Drift independently.  
**Score = waves survived × Drift HP remaining** — incentivizes keeping Drift alive, not just yourself.

---

## Drift Behavior (the entity, not the tool)
Drift has its own HP bar (upper-left, distinct color). Its **stress level** (0–100) updates every 2s:

| Stress | Behavior |
|--------|---------|
| 0–40 (calm) | Flanks enemies, aggressive shots, idle drift patterns |
| 40–70 (tense) | Stays closer to player, defensive fire, erratic movement |
| 70–100 (panic) | Retreats behind player, fires rarely, visual panic bursts |

- Drift does NOT follow the player cursor — has its own pathfinding
- Drift can die — when it does: score multiplier drops, screen desaturates, audio shifts
- "DRIFT" nameplate always visible above it

---

## Win / Lose / Progression
- **Win:** Survive 10 waves  
- **Lose:** Player HP = 0 (Drift death = penalty, not game over)  
- **Post-run:** Waves survived + "Drift survived: yes/no" + final score

---

## Juice / Feel
- Drift stress state changes → subtle audio cue shift
- Enemy death → particle burst (THREE.Points)
- Drift panic → visible wobble in flight path
- Hit feedback: screen flash + camera shake
- Screen desaturation on Drift death

---

## Stack
Single `index.html`. Three.js r169 CDN importmap. No bundler.  
Geometry: player (ConeGeometry), Drift (SphereGeometry + ring), enemies (IcosahedronGeometry).  
Arena: flat plane with boundary walls.
