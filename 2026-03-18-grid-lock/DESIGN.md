# Grid Lock — Game Design Brief
**Pixel 🎮 | March 18, 2026 | Build #19**

---

## Market Signal Being Tested
Google Play "Game Trials" — Trial Cliff Design. First 3–5 minutes must be mechanically complete and satisfying, ending on a peak mastery moment that leaves the player wanting more. Does a 5-wave tower defense with a dual-lane surge on Wave 5 deliver that cliff?

---

## Player Controls
- **Click city block tiles** to place towers
- **Right-click / key** to cycle tower selection
- No tower rotation — placement geometry is the skill expression

---

## Core Game Loop
```
SELECT TOWER → PLACE ON SIDEWALK TILE → ENEMIES ENTER CORRIDOR → TOWER FIRES → KILL/BREACH → WAVE CLEAR → EARN CREDITS → UPGRADE/PLACE → NEXT WAVE
```
Enemies (neon data packets / street runners) travel down lit corridors toward the server node. Player places towers on sidewalk tiles to intercept them.

---

## The Trial Cliff — Wave 5
Waves 1–4 teach single-lane coverage and tower synergy. Wave 5 splits into a **dual-lane surge** — both corridors flood simultaneously. Player must rotate between lanes, realizing their setup was optimized for one. One upgrade slot available mid-surge. Choose fast. Survive: "DISTRICT SECURED" blazes across grid. Fail: player knows EXACTLY what to do differently.

---

## Tower Types (3)
| Tower | Effect | Visual |
|-------|--------|--------|
| **Pulse Node** | Rapid short-range zap (DPS) | Pink neon glow |
| **Cryo Vent** | Slows enemies in cone (control) | Blue steam on wet asphalt |
| **Arc Relay** | Chains damage between nearby towers (synergy) | Green lightning |

---

## Win / Lose
- **Win:** Survive all 5 waves
- **Lose:** 3 enemies breach the server node
- **Credits:** Earned per wave kill, spent on upgrades or new towers

---

## Juice / Feel
- Screen-flash on kills
- Neon splatter on asphalt
- Camera micro-shake on wave launch
- Credits pop with coin-ding
- DISTRICT SECURED banner with glitch flicker

---

## Visual Palette
Rain-slick black asphalt grid. City block overhead view. Pink/cyan/green neon tower glows. Wet reflections on tile surfaces. Living city street at 2 AM — not a dark arena.

## Audio
Lo-fi cyberpunk: muted 808 kick, vinyl crackle, synth pads that intensify on Wave 5. Kill SFX: crisp electric zap. Breach SFX: distorted buzz.

---

## Scope Constraint
- Single `index.html` + game.js
- Three.js via importmap CDN (WebGL renderer, top-down camera)
- Grid: fixed city block layout (2 lanes, sidewalk tiles)
- 5 waves, hardcoded enemy paths
- 3 tower types, 2-tier upgrades

---

*Brief by Pixel 🎮 — Build #19 — 2026-03-18*
