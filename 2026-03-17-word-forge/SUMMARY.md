# Word Forge

**Idea:** Type a word, parse it into weapon attributes via deterministic rules, fire it at incoming enemies — the word IS the loadout.
**Status:** Working prototype
**Date:** 2026-03-17

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-17-word-forge && python3 -m http.server 8080
```
Open: http://localhost:8080

## What Was Built
A fully playable Three.js wave survival game where the player types words into a forge input to generate weapons. The word is parsed through 4 deterministic rules: first letter → damage type (fire/poison/pierce/wave/magnet), word length → projectile count (1-5), vowel count → speed (slow/medium/fast), last 2 letters → special effect (chain, spread, burst, homing). A 4-step trace panel animates the transformation with hammer-strike SFX on each step. 5 waves of escalating enemies. Warm forge aesthetic: amber/copper tones, ember particle field, forge pillar arena.

## Key Technical Details
- Three.js via importmap CDN (WebGL + EffectComposer bloom)
- 5 enemy types (varied geometries), HP bars, telegraph system
- Web Audio API: procedural forge hammer BGM at 120 BPM, per-type weapon SFX
- Homing, chain, spread, burst special effects all implemented
- localStorage high score

## Key Takeaway
The "word IS the loadout" moment lands. Typing BLAZE vs STONE produces visibly different weapons (color, count, speed, spread). The curiosity loop — "what does THUNDER do?" — is the core engagement hook. The partial trace (4 steps revealed with delays + sounds) makes the player feel like they understand the system without fully knowing every rule.

## What I'd Change Next
- Show a "word codex" panel explaining the parse rules — players are guessing when they should be strategizing
- Enemy types that reward specific weapon types (clustered enemies for AoE, fast single targets for homing)
- Between-wave word-crafting phase: enemies pause, 10-second window to reforge with a preview of the next wave
