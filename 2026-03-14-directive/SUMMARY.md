# Directive

**Idea:** Agentic RTS where you issue goals to 4 autonomous AI sub-agents (Scout/Builder/Fighter/Medic) to defend a central Core across 7 waves of enemies.
**Status:** Working prototype
**Date:** 2026-03-14

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-14-directive && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Top-down Three.js RTS with click-to-assign goal system. Player selects an agent by clicking it (or pressing 1-4), then clicks the ground to move, clicks an enemy to attack, or clicks an ally to support. Each agent type has unique behavior: Scout auto-attacks, Builder places turrets, Fighter taunts enemies, Medic heals allies. Agents act autonomously when idle — Scout/Fighter auto-engage nearby enemies, Medic auto-heals lowest HP ally. Telegraph rings show 0.8s before all enemy attacks. 4 ability unlocks across 7 waves (W2: Scout Reveal, W3: Builder Turret, W5: Fighter Taunt, W6: Medic Burst). Rejection bubbles fire when player tries to give an invalid goal (Builder attacking, Medic attacking, out-of-bounds turret placement).

## Key Takeaway
The click-to-assign goal system proves the agentic pipeline metaphor — you're the director issuing intent, not the executor micromanaging actions. The rejection feedback (bubbles saying "NOT MY JOB" or "HEAL ONLY") makes agent specialization tangible and funny.

## What I'd Change Next
- Add voice line audio cues per agent type on goal assignment
- Upgrade Builder to construct walls/barriers, not just auto-turrets
- Add a "situation report" HUD showing what each agent is currently doing autonomously
- Scout's reveal ability should show enemy HP and type in a mini-map
