# Breach

**Idea:** Top-down action roguelike — breach procedurally generated vault rooms, read enemy telegraphs, dodge-roll through attacks, eliminate everyone to advance. 3 loadouts, 5 rooms + boss, permanent death.
**Status:** Working prototype
**Date:** 2026-03-10

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-10-breach
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A fully playable Three.js action roguelike. Player selects from 3 loadouts (Vanguard/Phantom/Breaker) then clears 6 rooms. Enemies telegraph attacks with visible ring wind-ups before attacking. 4 enemy types: Grunt (melee chase), Shielder (front-shielded), Sniper (ranged), Exploder (proximity bomb). Boss with phase transition at 50% HP. Between rooms, choose 1 of 3 upgrades (+HP, +damage, +roll cooldown). Dodge roll grants 0.5s invincibility frames. UnrealBloomPass glow, 64-second looping combat music with irregular spread (S6), camera lerp tracking player (G7).

## Key Takeaway
The roguelike structure works as a short-session browser game. The telegraph system (visible wind-up ring before enemy attacks) makes the skill floor readable — players can see why they died and learn to avoid it. Proved: action roguelike + browser Three.js + 5-room runs is a viable format.

## What I'd Change Next
- Add run meta-progression (unlock new loadouts across runs)
- Procedural room tile assembly (currently seeded obstacle placement)
- Boss has 2 patterns but needs a 3rd at 25% HP for final tension spike
