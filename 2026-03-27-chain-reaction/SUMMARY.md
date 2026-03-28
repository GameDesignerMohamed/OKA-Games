# Chain Reaction

**Idea:** Fixed cannon + one-shot cascade — fire into dense enemy cluster, chain explosions escalate in color from white→yellow→orange→red, PERFECT CHAIN triggers slow-mo freeze frame.
**Status:** Working prototype ✅
**Date:** 2026-03-28 (Build #28)

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-27-chain-reaction
python3 -m http.server 8080
```
Open: http://localhost:8080

## What Was Built
A 5-wave Three.js arcade puzzle. Player is a fixed cannon at the arena bottom — mouse to aim, click to fire. One projectile per wave (two on waves 4-5). Projectile hits first enemy, chain explosions cascade to nearby enemies. Chain count displayed in real-time with color escalation (white → yellow → orange → red → pink). PERFECT CHAIN (all enemies cleared with 1 shot) triggers slow-motion debris freeze + "PERFECT CHAIN!" banner + bonus score. Three failed waves (chain < 3) ends the game. Best chain persisted in localStorage.

Visual: Three.js EffectComposer + UnrealBloomPass, animated enemy meshes (IcosahedronGeometry/OctahedronGeometry/TetrahedronGeometry), shockwave rings (RingGeometry), particle bursts (THREE.Points), trajectory line (LineDashedMaterial), starfield + FogExp2.

Audio: Web Audio API — escalating pitch SFX per chain hit, bass boom per explosion, perfect chain fanfare, looping BGM (triangle wave arpeggio).

## Key Takeaway
The "one-tap consequence chain" mechanic creates a clear shareable moment — the PERFECT CHAIN slow-mo freeze is visually spectacular. The real design tension is in finding the optimal shot angle for maximum cascade. Formations get progressively denser across waves.

## What I'd Change Next
- Add trajectory prediction showing estimated first-hit (like billiards ghost ball)
- Ricochet projectile variant (bounces off walls, enables line-shot strategies)
- Combo chain with multiple projectiles for waves 4-5 (fire → wait for cascade → fire second into survivors)
- Score share screenshot mode triggered on PERFECT CHAIN
