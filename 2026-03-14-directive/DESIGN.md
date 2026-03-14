# DESIGN.md — Directive

**Signal:** Google GDC agentic AI pipeline reveal (Scout, March 13, 2026 — 🔴 HIGH)
**Concept:** You command 4 autonomous agent units by assigning goals. Prove that "issuing goals to AI sub-units" is a satisfying game mechanic.
**Build:** Forge #16 | 2026-03-14

---

## Market Signal
Google unveiled autonomous AI agent frameworks at GDC — "agentic pipelines" where developers describe goals in natural language and AI agents execute them. The mechanic hypothesis: if this mirrors real production workflows, it should feel intuitive AND novel as a gameplay system.

## Player Controls
- Left-click agent → select (ring highlight)
- Left-click map location / enemy / ally → assign goal (move-to, attack, repair, scout)
- 1-4 hotkeys → quick-select Scout / Builder / Fighter / Medic
- NO direct unit control — you are the director, not the soldier

## Core Loop
Assign → Watch agents execute → Read failures (red ❌ bubble: "OUT OF RANGE" / "ALREADY ENGAGED" / "NO VALID PATH") → Reassign → Wave cleared → Build phase (place one fortification) → Next wave.

## Win / Lose / Progression
- LOSE: Core structure reaches 0 HP (3-hit buffer — G1)
- WIN: Survive 7 waves. 2s slow-mo + camera moment before overlay (Creature Isle rule #7)
- PROGRESSION: Each wave unlocks one new agent ability:
  - Wave 1: Scout reveals fog of war radius
  - Wave 2: Builder reinforces a wall section (+HP)
  - Wave 3: Fighter taunts enemies (redirects to Fighter)
  - Wave 4: Medic AoE heals nearby agents

## Agent Types
| Agent | Silhouette | Color | Role |
|-------|-----------|-------|------|
| Scout | Slim, hooded | Cyan | Fast, reveals fog, weak |
| Builder | Stocky, hard-hat | Yellow | Places fortifications |
| Fighter | Armored | Red-orange | High damage + HP |
| Medic | Cross-emblem | Green | Heals allies |

## Juice / Feel
- Enemy attacks telegraph with expanding red rings 0.8s before impact (Breach best mechanic)
- Click-assign-watch-payoff rhythm → player feels like a general
- Camera shake scaled to damage source
- BGM adds a layer per wave (4 unlock milestones over 7 waves)
- Rejection bubbles ❌ with exact reason — never silent failure

## Lessons Applied
| Rule | Implementation |
|------|---------------|
| CL5 | Each agent: unique color + silhouette + icon. Role readable at glance |
| Creature Isle #2 | Agents path toward assigned goal tile — no random walk evaluation |
| Creature Isle #3 | Rejection bubbles show exact reason ("OUT OF RANGE" etc.) |
| Breach telegraph rings | All enemy attacks: 0.8s ring wind-up before impact |
| G1 | Core = 3 HP, Agents = 3 HP. No one-shot kills. |
| Creature Isle #7 | 2s slow-mo + breathing room before win overlay |
| G6/C6 | BGM is 64s loop, layers added per wave unlock |
| LP8 | All per-frame values × dt in update loop |
| T1 | Zero Object.assign() on Three.js objects |
| T2 | All game-critical vars at module scope |
| B2 | Terminal state set BEFORE setTimeout on win/lose |
| B5 | Audio sustain never 0 (70% of peak) |
| G9 | Agent iframe check FIRST in damage function |
| T6 | importmap in index.html + bare specifiers in game.js |
| T8 | No duplicate id attributes |
| T9 | EffectComposer in try/catch with fallback |

## Scope
4 agent types, 7 waves, 1 map, ~10 min per run. One night.

---
*Pixel 🎮 via Forge 🔨 | 2026-03-14*
