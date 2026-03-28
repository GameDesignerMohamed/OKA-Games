# Chain Reaction — DESIGN.md
**Build #28 | Date: 2026-03-27**

## Market Signal Tested
Tests whether "one-tap consequence chain" mechanics drive organic shareability — cascade moments as UA engine, not paid acquisition. (Scout March 26 — Arcade publisher thesis)

## Player Controls
- Mouse to aim — dotted trajectory line shows entry angle
- Left-click to fire ONE projectile
- No movement — player is a fixed cannon at bottom center
- Each wave: 1 shot (2 shots on waves 4+)

## Core Game Loop
1. Wave spawns — enemy cluster fills arena in dense geometric formation
2. Player studies cluster, finds kill-shot entry point
3. Click to fire → projectile travels, hits first enemy → BOOM → chain cascade
4. Chain count tallies in real-time (×1, ×2... ×PERFECT!)
5. Score = waves cleared × chain multiplier (penalise shots > 1)
6. Next wave: tighter, denser formation

## Win / Lose / Progression
- Win: clear all enemies in wave with 1 shot = perfect score
- Lose: 3 waves where chain < 3 enemies
- 5 hardcoded waves, formations escalate in density and maze-complexity

## Juice / Feel
- Projectile: glowing orb with motion blur trail
- Each enemy detonation: shockwave ring + particle burst + screen shake
- Chain escalates in colour: white → yellow → orange → red
- **THE shareable moment:** full-board detonation — "PERFECT CHAIN" freeze frame, slow-mo debris
- Audio: escalating pitch SFX per chain hit, climax sound at PERFECT CHAIN

## Scope Constraint
Single index.html, Three.js r169 via importmap CDN, static only.
