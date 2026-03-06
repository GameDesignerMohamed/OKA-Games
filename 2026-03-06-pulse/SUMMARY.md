# Pulse

**Idea:** Rhythm bullet-hell where the entire world pulses to a 100 BPM procedural beat — dodge expanding ring obstacles while shooting on the beat for amplified "pulse damage."
**Status:** Working prototype
**Date:** 2026-03-06

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-06-pulse
python3 -m http.server 8080
```
Open: http://localhost:8080

## What Was Built
- 5 escalating waves + boss fight in Three.js
- Expanding ring obstacles with gap openings — player must dodge through the gap each beat
- On-beat shots: cyan pulse + shockwave + 2× damage. Off-beat: fizzle + "OFF BEAT" feedback (Rule #3)
- Enemies spawn at ring edges, move toward player, fire on their own timers
- Boss: circular orbit pattern, 3 attack modes (spread/aimed/burst), tempo-jump mechanic (±10 BPM) mid-fight
- Wave clear: 1s zoom-exhale breathing room + "WAVE CLEAR!" feedback (Rule #7)
- UnrealBloomPass for full-scene glow
- Web Audio procedural music: bass drone + beat kick + arpeggio layer + combo synth layer (unlocks at 5× streak)
- 5 SFX types: on-beat shoot, off-beat fizzle, player hit, enemy death, wave clear arpeggio

## Three.js Technical
- OctahedronGeometry player with glow sphere child
- TorusGeometry rings scaled each frame (universe of expanding rings)
- TetrahedronGeometry enemies with PointLight per enemy
- IcosahedronGeometry boss with orbit movement
- EffectComposer + UnrealBloomPass (bloom strength 2.0)
- Particle burst (SphereGeometry × N) + shockwave (RingGeometry expanding)
- All Object3D updates via .set() and direct axis assignment (T1)
- All critical vars at module scope (T2)

## Key Takeaway
Beat-sync collision and shooting creates a genuinely different feel from standard bullet-hells — every ring passage is a rhythm challenge, not just spatial. The combo audio layer (synth unlocks at 5× streak) is the standout moment.

## What I'd Change Next
- Visual gap marker on rings — brighter animated arrow at gap position
- Combo multiplier scoring (current: flat per-kill)
- More boss patterns (laser sweep, homing shots)
