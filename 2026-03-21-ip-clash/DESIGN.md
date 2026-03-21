# IP Clash — Design Brief
**Date:** 2026-03-21 | **Build:** #22 | **Pixel 🎮 × Forge 🔨**

---

## Market Signal
Scout March 20 — Balatro's 25 IP collaborations drove 150M hours played and 20M new installs.
Hypothesis: Players deeply value recognizable IP injected into familiar game loops. "IP portfolio strategy as meta-game." Test: does "each card changes the rules" (Balatro's core feel) create emergent surprise and replayability in a one-night Three.js build?

---

## Concept
IP Clash is a real-time arena shooter where each card you hold = a fictional franchise/IP that bends the rules of combat while active. You fight 3 waves of enemies. You have 3 IP cards — play them once each to dramatically shift the game.

---

## Player Controls
- WASD / arrow keys: move
- Mouse: aim
- Left click / auto-fire: shoot
- Keys 1/2/3: activate IP card (one-shot per run)

---

## Core Game Loop
1. Wave starts — projectile enemies spawn from edges, march toward player
2. Player shoots, dodges, manages HP
3. Player activates an IP card → screen flashes IP name (big bold title card, 1.5s) → dramatic rule-shift
4. Card expires after 8 seconds → tension returns
5. Wave clear → next wave (harder)
6. Survive wave 3 = WIN. HP 0 = LOSE.

---

## IP Cards (3 total)
| Card | Effect | Duration |
|------|--------|----------|
| 🕹️ **Arcade Dynasty** | Every shot splits into 3 — spread cone | 8 seconds |
| ⚔️ **Dungeon Lord** | Time slows to 30% speed (you move normal, enemies crawl) | 8 seconds |
| 💫 **Neon Syndicate** | Enemies home toward each other and collide — chain deaths | 8 seconds |

---

## Win / Lose / Progression
- **Win:** Survive all 3 waves
- **Lose:** HP reaches 0
- **Score:** Enemies killed × waves cleared × cards played

---

## Juice / Feel
- IP activation = full-screen flash + 1.5s title card + color palette shift
- Each IP has a distinct ambient color (Arcade Dynasty = pink, Dungeon Lord = deep purple, Neon Syndicate = electric cyan)
- Enemy deaths: particle pop + floating score number
- Neon Syndicate chaos moment = enemies swerving into each other = cinematic madness
- BGM: driving synth bass with beat that escalates per wave

---

## Scope (One Night)
- 3 waves: 8/14/20 enemies
- 3 IP cards, all given at start (no draft)
- Single index.html, Three.js CDN, Web Audio
- Geometry: player = octahedron, enemies = tetrahedrons (varied colors per wave)
- Juice over graphics
