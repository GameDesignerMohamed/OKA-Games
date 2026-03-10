# Breach — Action Roguelike

**Concept:** Top-down action roguelike where you breach procedurally generated AI vault rooms. Read enemy telegraphs, dodge, counter-attack. Systems mastery rewarded — brute force punished.
**Player fantasy:** You are a surgical infiltration agent who learns the system and dominates it.

## Market Signal
Tests whether systems mastery + spatial action + roguelike structure works as a short-session browser game. Slay the Spire 2's 430K concurrent peak = roguelike renaissance. Players hungry for depth over spectacle. Breach is OKA's real-time, 3D answer to that same learn-die-retry loop.

## Controls
- **WASD** — Move (8-directional)
- **Mouse aim** — Player faces cursor at all times
- **Left Click / Space** — Shoot (primary weapon)
- **Right Click / Shift** — Dodge roll (grants invincibility frames)
- **Auto-collect** — XP orbs + ammo pickups collected on proximity

## Core Game Loop
Enter room → enemies telegraph attacks (visible wind-up flash + directional arc) → player reads telegraphs, dodges, counter-attacks → room cleared → brief exhale (loot drop, HP restore chance) → next room. Five rooms + one boss. Each room is a distinct spatial puzzle; enemy composition and layout randomized per run.

## Win / Lose / Progression
- **Win:** Defeat boss on room 6
- **Lose:** 3 HP depleted → run over, restart from room 1
- **Progression:** 3 loadout picks at run start (weapon type + ability). Between rooms, choose 1 of 3 upgrades.

## Juice / Feel
- Dodge roll: motion blur + brief slow-mo on frame-perfect dodge
- Enemy death: satisfying pop + screen micro-shake
- Room clear: slow-mo 0.5s + "BREACH CLEAR" stamp
- Hit feedback: red flash + camera shake
- Boss entry: music layer adds in

## Scope (One Night)
- 1 player archetype, 3 loadout sets, 3 upgrade types
- 4 enemy types (grunt, shielder, sniper, exploder) + 1 boss
- 6 rooms, procedurally composed from geometry prefabs
- All Three.js geometry, no sprite sheets

## Lessons Applied
| Rule | Application |
|------|-------------|
| G1 (HP buffer) | 3 HP, no one-hit death |
| G9 (iframes work) | Dodge roll = 0.4s iframes, death check tests flag |
| G4/S4 (randomize) | Room composition + layout seeded per run |
| G6 (music loops) | 64-second combat track, boss adds layer |
| G3 (auto-collect) | XP orbs + ammo auto-collect on proximity |
| G5 (collision radius) | Hitbox matches visual radius |
| G7 (camera tracks) | 0.06 lerp camera always centered on player |
| G8 (content not timers) | No countdown — difficulty from enemy density |
| T1/T2/T3 | Three.js technical rules — Forge's mandate |

---
*Pixel 🎮 | March 10, 2026*
