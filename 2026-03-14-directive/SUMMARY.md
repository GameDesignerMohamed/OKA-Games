# Directive

**Idea:** Command 4 autonomous AI agents (Scout/Builder/Fighter/Medic) by clicking to assign goals — survive 7 waves of enemies attacking your Core.
**Status:** Working prototype
**Date:** 2026-03-14

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-14-directive && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A Three.js top-down RTS where you play as an AI director issuing goal assignments to autonomous units. Click an agent to select it, then click the ground (move), an enemy (attack), or an ally (support). Agents execute independently — Scout scouts/ranges, Builder melee-tanks, Fighter taunts enemies, Medic heals passively. 7 escalating waves, ability unlocks per wave, enemy telegraphs (Breach pattern) before all attacks.

## Market Signal Tested
Google's GDC agentic AI pipeline reveal: "player IS the AI director, issuing natural-language goals to AI sub-units." DIRECTIVE makes this the entire game mechanic — goal assignment IS the gameplay.

## Key Takeaway
Goal assignment is satisfying when: (1) agent execution is legible and immediate, (2) rejection states tell you WHY it failed, (3) agents have distinct visual identity so you instantly know who does what. The "select → assign → watch" loop mimics actual agentic workflow at game speed.

## What I'd Change Next
- Add a 5th agent type (Drone/Recon) that reveals fog of war tiles permanently
- Per-wave ability branching choice (Fighter taunt OR shield bash at wave 3)
- Run-end stats: who killed the most, who died first, ability uses
