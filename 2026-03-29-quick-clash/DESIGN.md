# Quick Clash

**Concept:** A 5-minute session-based MOBA — pick a role, push a lane, fight creeps and an enemy champion, destroy the Core before time runs out.
**Player fantasy:** "I carried the lane."

## Core Loop
Pick role (Tank/Ranger/Mage) → push lane against creep waves → fight enemy champion → destroy Core. Full MOBA arc compressed to 5 minutes. Every second of the timer is lane pressure.

## Key Mechanics
- **Role Identity at Session Start:** Three roles with genuinely distinct stat profiles (Tank: 200HP/3.8spd, Ranger: 120HP/6.2spd, Mage: 90HP/5.5spd), distinct mesh geometry, and different Q-ability class (AOE slam / pierce arrow / fireball+blink). Role choice is a pre-run identity commitment that shapes how the entire lane plays out.
- **Dual-lane pressure:** Enemy creep waves attack your Core independently of the champion. Player must decide: chase the champion or hold creep line? This is the one real decision the loop forces — and it's the right decision to force.
- **Champion AI respawn:** Enemy champion dies, respawns in 15 seconds. Creates pressure arc: window of opportunity → rebuild threat → escalation. Not just a health bar — a cycle.
- **Auto-attack + Q ability:** Baseline auto-attack fires on nearest target in range. Q is the burst tool with cooldown. Low cognitive overhead — player can focus on positioning.

## What's Built
Three.js 3D prototype with role select, lane, bidirectional creep waves, enemy champion AI (patrol→chase→attack), five-minute timer, and full audio suite. Role differentiation lands mechanically: Tank slams through groups, Ranger kites from range, Mage blinks out of trouble. Core destroy triggers particle nova + slow-mo — the win feel is correct.

## Verdict: CONDITIONAL

**What the prototype proved:**
- The full MOBA arc *does* fit in 5 minutes without feeling like a tutorial. Lane push + champion fight + Core destroy are all present and pressure-generating.
- Role differentiation is real at the stat/geometry level (Tank's box body vs Ranger's cylinder vs Mage's octahedron signals identity before the first fight). Distinct ability classes land correctly.
- The dual-pressure mechanic (champion + creep waves hitting your Core) generates the positioning question that makes MOBA interesting.
- Champion respawn cycle creates rising tension over the 5-minute window — it isn't just one fight.

**The one condition:**
- **No per-role run persistence.** Best time per role, best kill count per role — neither is tracked. After winning as Ranger, there is no reason to run Ranger again vs. trying Mage. The role identity system produces behavioral divergence *within* a run but delivers zero cross-run mastery signal. This is the exact same gap that triggered CONDITIONAL in Echo Strike, Flux, Dead Beat, and Clearance: the session is self-contained but the identity has no memory. Fix: `localStorage` per-role best-time + kill record displayed on role select screen. Player sees "RANGER: 3:42 / 47 kills" before committing to the next run. That transforms role select from aesthetic choice to mastery ladder.

**Secondary observations (not blocking):**
- Enemy Core is undefended by towers — player can beeline it if they choose to skip the champion entirely. This breaks the MOBA fantasy (you don't *earn* the Core, you dash to it). Recommend a damage-dealing Core guardian or a "champion must die first" gate.
- Creep waves are flat 4-unit spawns every 10 seconds. No wave escalation, no elite variants, no camp. At 5 minutes this is fine for scope — but run 3 will feel identical to run 1 if it ever goes deeper.
- Single lane removes the map-reading skill class entirely. That's acceptable for a 5-minute prototype but is the ceiling of the concept in this format.

## [prototype-ready]
**What to build next:** localStorage per-role best-time + kill record on role select screen. One screen change, closes the CONDITIONAL condition. Build should also add a minimal Core guardian — a tower-equivalent that deals 20 damage/s to the player within range 4 — so Core destruction requires finishing the champion first.
