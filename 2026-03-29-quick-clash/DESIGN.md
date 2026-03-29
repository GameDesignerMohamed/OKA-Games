# Quick Clash — Game Design Brief
**Date:** 2026-03-29
**Pixel Design Brief**

## Market Signal
Savvy Games Group's $6B acquisition of Moonton signals MOBA genre consolidation at the top — but no one owns the *lightweight, session-based* MOBA format. MENA + South Asia players want MOBA dopamine without a 30-min commitment. Quick Clash tests: can we deliver the full MOBA arc (lanes → creep clear → champion fight → core destroy) in under 5 minutes?

## Player Controls
- **WASD** — move champion (Three.js camera follows)
- **Left Click** — basic attack (target nearest enemy)
- **Q / W / E** — ability slots (role-specific)
- **Role Select Screen** — Tank / Ranger / Mage on load

Role feel:
- 🛡️ **Tank** — slow, large mesh, Q = ground slam AOE, feels HEAVY
- 🏹 **Ranger** — fast, Q = piercing arrow, ranged auto-attacks
- 🔮 **Mage** — fragile, Q = fireball with particle burst, W = blink

## Core Game Loop
1. Spawn in lane → auto-wave of creeps advances every 15s
2. Kill creeps → gold particles pop, tower HP bar drains
3. Enemy champion AI patrols mid-lane — player must fight through
4. Destroy the Core → win screen

Feedback cycle: kill → flash + coin burst particles → tower cracks visually → intensity ramps

## Win / Lose / Progression
- **Win:** Destroy enemy Core before 5:00 timer
- **Lose:** Your Core destroyed OR timer expires
- **Progression:** Post-match: "Kills / Tower Damage / Time" score card

## Juice / Feel
- Point lights on champion abilities (blue for Mage, orange for Ranger)
- Creep death = small particle explosion + screen shake
- Core destruction = full particle nova + slow-mo + win fanfare
- HP bars float above meshes in 3D space

## Scope Constraint (45–60 min build)
- Single `index.html` + Three.js via importmap CDN
- 1 lane (straight path), box-mesh creeps, cylinder champion
- Enemy champion = simple patrol AI (move toward player, attack on range)
- No backend — pure static, `python3 -m http.server` to run
- Timer HUD overlay (CSS), role picker on load screen
- Cut: no towers on enemy side — just the Core glowing mesh
