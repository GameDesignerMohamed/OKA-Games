# Gravity Shift

**Idea:** A physics survival game where the player flips gravity direction to navigate a collapsing space station — everything in the scene responds to each flip.
**Status:** Working prototype
**Date:** 2026-03-07

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-07-gravity-shift
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built

A fully playable 3D physics survival game in Three.js. You're a maintenance bot trapped in a dying space station. Press WASD/Arrow keys to flip gravity direction (4 directions) — the player, all debris chunks, and energy cores all immediately respond to the gravity shift. Collect 5 glowing energy cores each wave, then reach the escape hatch. 5 waves total, each with more debris and less time.

Key mechanics:
- **4-directional gravity flip** — WASD/Arrows reorient gravity instantly. Player, debris, and cores all fall the new direction.
- **Two-variable constraint** — position yourself AND choose when to flip (Principle 8: two-variable skill architecture)
- **Physics debris** — spinning hazard cubes/tetrahedra bouncing off walls, accelerating with each gravity flip
- **Core collection** — 5 glowing spheres per wave, press Space when within 2.5 units to collect
- **Escape hatch** — activates after all 5 cores collected, player must reach it before timer expires
- **Wave progression** — 5 waves, debris count grows (+3/wave), timer shrinks (30s→15s)
- **Slow-motion wave clear** — 0.15× speed on wave clear (Rule #7 breathing room)
- **Red flash + restart on hit** — single-life per wave, instant visual feedback (Rule #3)

## Three.js Implementation

- OctahedronGeometry player + PointLight + glow sphere child
- BoxGeometry/TetrahedronGeometry/CylinderGeometry debris with per-object spin physics
- SphereGeometry energy cores with gentle pulsing scale
- BoxGeometry escape hatch with PointLight glow activation
- FogExp2 atmospheric depth, colored arena walls, grid lines
- EffectComposer + UnrealBloomPass (strength 1.4)
- THREE.Points particle bursts on core pickup, player hit, wave clear
- 800-point starfield background (slow rotation)
- All T1 rules: .set()/.copy() everywhere, no Object.assign() on Three.js objects
- All T2 rules: every game-critical variable at module scope

## Audio (Web Audio API)

- Bass drone + tension oscillator + metal arpeggio = ambient station soundscape
- Gravity flip SFX: sawtooth sweep + whoosh sound
- Core pickup: 3-note ascending chime
- Player hit: sawtooth alarm
- Wave clear: 5-note ascending arpeggio
- Timer urgent: heartbeat beep at <8s
- Death: 6-voice descending alarm

## Key Takeaway

The two-variable constraint (WHERE to be + WHEN to flip) creates a distinct mechanic class — same architecture Pulse proved with position+timing. Gravity flip as "everything responds" mechanic makes every decision visually dramatic. The emergent chaos of physics debris + constrained collection creates natural "holy sh*t" moments.

## What I'd Change Next

- Add gravity-locked zones (some debris immune to flips — forces route planning)
- Add a "gravity cooldown" meter (can't spam flips — adds timing skill layer)
- Side-view camera option (orthographic side view makes gravity direction more readable)
