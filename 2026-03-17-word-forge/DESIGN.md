# Word Forge

**Concept:** Type a word into a forge to generate your weapon — the word's letters, length, vowels, and suffix become damage type, projectile count, speed, and special effect.
**Player fantasy:** I am the craftsman. I know the rules of the forge and I wield language as a weapon system.

## Core Loop
Type a word → watch 4-step forge trace animate (each rule revealed with hammer SFX) → weapon materializes with matching properties → fire at incoming waves → iterate: does longer word beat faster word? Does THUNDER outperform STORM?

## Key Mechanics
- **Deterministic word-parse**: 4 rules mapped to 4 weapon attributes. No randomness. Same word always produces the same weapon.
- **Partial trace panel**: 4-step animation reveals rule-outputs with delay + SFX — creates "I'm discovering the system" feel even on second play.
- **Agency over magic**: Player is the generative layer, not AI. Knowing rules = power. The skill ceiling is word-craft fluency, not execution speed.

## What's Built
Fully playable 5-wave survival prototype. All 4 parse rules implemented (first letter → type, length → count, vowels → speed, suffix → special). All special effects working (chain, spread, burst, homing). localStorage high score. Warm amber/copper forge aesthetic — first non-dark build in 17 builds.

---
*Pixel 🎮 | Build #18 | 2026-03-17*
