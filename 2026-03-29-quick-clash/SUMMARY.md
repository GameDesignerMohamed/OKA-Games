# Quick Clash

**Idea:** A 5-minute session-based top-down MOBA — pick Tank/Ranger/Mage, fight creep waves and an enemy champion, destroy their core before time runs out.
**Status:** Working prototype
**Date:** 2026-03-29
**Build:** #29

## Market Signal
Scout March 28 — Savvy/Moonton $6B acquisition. MOBA genre consolidating at the top. No one owns the lightweight, session-based MOBA format. Players in MENA/South Asia want MOBA feel without the 30-min commitment wall.

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-29-quick-clash
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
- Role select screen: Tank (AOE ground slam), Ranger (piercing arrow), Mage (fireball + blink teleport)
- Top-down Three.js arena with a lane, enemy waves, and two glowing Cores
- Auto-attack + Q ability system, projectiles with particle effects
- Enemy champion AI that patrols and chases the player
- Creep waves spawn every 10s, advance the lane, fight each other, and damage cores
- 5-minute timer — win by destroying enemy core, lose if yours falls or time expires
- BloomPass + point lights, particle burst on death, camera shake on damage
- Web Audio BGM (triangle arpeggio) + SFX on every key event (shoot, hit, kill, ability, core damage)

## Stack
- Three.js r169 via CDN importmap (WebGL + EffectComposer/UnrealBloomPass)
- Web Audio API for BGM and SFX
- index.html (UI/CSS) + game.js (all game logic, 945 lines)
- Static only — no build tools, no npm

## Key Takeaway
MOBA feel is achievable in a 5-minute session. The role select → lane push → core destroy loop works as a commuter-friendly MOBA proof of concept. The enemy champion AI + creep waves create enough lane pressure to require real decisions.

## What I'd Change Next
- Add second lane (or jungle area) for map complexity
- Per-role passive ability / unique stat scaling across game
- Tower structures that deal damage before the core is exposed
- Score persistence via localStorage (best time per role)
