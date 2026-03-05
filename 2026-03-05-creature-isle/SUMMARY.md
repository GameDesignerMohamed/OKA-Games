# Creature Isle

**Idea:** A cozy creature-collection sandbox — place terrain, food, and shelter on a floating island to attract wandering creatures who settle only when their specific needs are met.
**Status:** Working prototype
**Date:** 2026-03-05

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-05-creature-isle
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A Three.js cozy sandbox where the player builds a habitat for 3 creature archetypes:
- 🦦 **Riverpaw** — needs Water tile nearby + Fish on water + Burrow on Grass
- 🦔 **Spinekin** — needs Forest tile nearby + Mushroom on Forest + Den on Stone
- 🐦 **Featherling** — needs Grass tile nearby + Berries on Grass + Nest anywhere

Creatures wander in from island edges every ~6-10s, broadcast their needs as floating emoji, evaluate surroundings for 20 seconds, and either spin into a settled flag or drift away. Win by settling 10 creatures.

## Key Design Features
- **Teaching without tutorial:** Creatures float their needs icons while wandering (💧🐟🕳️ for Riverpaw)
- **No lose state:** Creatures drift away gently, nudging the player to iterate
- **Music layering:** Ambient music gains instrument layers at 0/2/5/8 settled creatures
- **Max 8 active wanderers:** Creates tension without overwhelming the grid

## Three.js Implementation
- Instanced tile geometry (BoxGeometry per cell, TERRAIN_MAT shared)
- Emoji sprites via CanvasTexture → PlaneGeometry (billboarded)
- UnrealBloomPass postprocessing for atmospheric glow
- EffectComposer pipeline
- Web Audio API — 4 procedural music layers + 6 SFX events
- Ripple effect (RingGeometry) on tile placement
- Particle burst on win state
- Ground plane raycasting for click-to-place

## Key Takeaway
The "needs floating above creature" teaching mechanic means zero tutorial text needed — players read the emoji and understand immediately. The cozy no-punish loop lets players experiment freely.

## What I'd Change Next
- Add a tile budget (limited tiles per type) to create resource decisions
- Creature personality: Riverpaws that swim in water tiles, Featherlings that perch on nests
- Seasons system: different creature types visit at different times
