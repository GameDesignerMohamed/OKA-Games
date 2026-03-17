# Word Forge — Game Design Brief
**Pixel 🎮 | March 17, 2026 | Build #18**

---

## Market Signal Being Tested
10six Games (GDC AI Week): "AI empowers the player." Their hook — type natural language, get a playable entity. **Our test:** Strip out the AI. Make the transformation *deterministic and learnable*. Does the player want to be the generative layer when they can see and master the rules? Hypothesis: **agency over magic** is more satisfying long-term.

---

## Player Controls
- **Type a word** into the forge input box (3–10 letters)
- Press **ENTER** — watch the 2-step forge trace animate (letter scan → attribute resolve → weapon appears)
- **Click / hold to fire** weapon at incoming enemies
- **Type a new word** anytime to reforge (2-second cooldown)

Type → fire → survive.

---

## Core Game Loop
```
TYPE WORD → see forge trace → weapon materializes → fire at enemies → wave clears → next wave arrives → retype or experiment
```
Enemy wave enters from edges. Player fires from center. Between waves: 5-second window to reforge. Curiosity loop: "What does THUD do vs BLADE vs FIZZ?"

---

## Win / Lose / Progression
- **Win:** Survive 5 waves
- **Lose:** 3 enemies reach center
- **Progression:** Wave 1 = 5 enemies / Wave 5 = 20. Enemy speed scales. No stat upgrades — the weapon IS the variable. Players get better by learning the parse system.

---

## Juice / Feel — The Aha Moment
Player types **BLAZE** → forge trace reads: `B → fire-type | 5 letters → 3 projectiles | vowels: A,E → fast | -ZE → spread` → a fan of 3 flaming fast-shots erupts. They type **STONE** → `S → poison | 5 letters → 3 | vowels: O,E → fast | -NE → pierce` — totally different behavior, same length word.

**The aha:** "The word IS the loadout." No menus. No stats screen. Just literacy as weapon design.

Spark burst animation on forge completion. Hammer-strike SFX on each transformation step reveal. Molten amber glow on weapon while firing.

---

## Word-Parsing Mechanic Spec (Deterministic)

| Input | Attribute | Rule |
|-------|-----------|------|
| **First letter** | Damage type | B/P/F/V → fire/explosion; S/Z/H → poison/spray; T/D/C/K → sharp/pierce; L/R/W → wave/AoE; M/N → magnet/pull |
| **Word length** | Projectile count | 3 letters = 1; 4 = 2; 5 = 3; 6 = 4; 7+ = 5 |
| **Vowel count** | Speed | 1 vowel = slow; 2 = medium; 3+ = fast |
| **Last 2 letters** | Special FX | -NG → chain (hits 2 targets); -SH → spread (45° cone); -ST → burst (AoE on hit); -ER → homing; anything else → straight |

**Example trace for FLASH:**
```
F → fire-type
5 letters → 3 projectiles  
A = 1 vowel → slow
-SH → spread cone
```
Result: 3 slow fire projectiles in a spread cone. Visible in the forge panel as 4 sequential reveal steps.

Words with no vowels → treated as 1 vowel. All rules run on uppercase input — normalize on entry.

---

## Scope Constraint
- Single `index.html` + supporting game.js
- Three.js via importmap CDN (WebGL renderer)
- Enemies: simple 3D meshes (boxes/spheres)
- Forge trace: DOM overlay panel, CSS transitions
- 5 waves, hardcoded spawn escalation
- Audio: Web Audio API synth metal clanks + SFX
- One-night completable

---

*Brief by Pixel 🎮 — Build #18 — 2026-03-17*
