# DESIGN.md — Clearance
**Build #15 | 2026-03-13 | Pixel 🎮**

## Market Signal Tested
ARC Raiders hit 6M WAU with $40 premium pricing — the thesis is that EARNED ACCESS creates higher retention than free access. Gates must feel like rewards, not locks.

Hypothesis: players who EARN access to mechanics mid-run feel greater investment than players given them upfront.

## Player Controls
- WASD: move (8-directional)
- Mouse aim + click: shoot
- SPACE: activate unlocked ability (context-sensitive — dash, grenade, shield)
- No abilities until Clearance Level earned

## Core Game Loop
Waves spawn. Player survives with stripped loadout. Every wave clear fills a Clearance Meter. At thresholds (CL2, CL4, CL6, CL8, CL10), one ability unlocks *immediately* mid-run with a dramatic screen flash + audio sting. Enemy HP and count scale with each CL gain. The unlock IS the feedback — it hits like leveling up in an RPG.

**Unlock order:**
- CL2 → Dash
- CL4 → Grenade (3 charges)
- CL6 → Assault Rifle
- CL8 → Shield (parry window)
- CL10 → Extract

## Win / Lose / Progression
- **Win:** Survive to CL10, reach extraction zone (randomized spawn per run — Rule G4)
- **Lose:** HP reaches 0. 3 HP max with 1.5s iframes on hit (Rule G1)
- **Meta-score:** CL personal best displayed on start screen. No meta unlocks. The run IS the loop.

## Juice / Feel
- CL unlock = full-screen ring pulse + chromatic aberration flash + audio unlock sting (builds per tier)
- Camera shake scaled by damage source: 0.1 on enemy hit, 0.3 on player hit
- Telegraph rings before every enemy attack — death always readable
- Wave clear: 0.5s slow-mo freeze + brief "WAVE CLEAR" overlay before next spawns
- HP bar pulses red below 1 HP — triple-channel urgency

## Scope Constraint
Single HTML file. 1 enemy type (Grunt) × 3 speed tiers. 10 waves, 5 unlock thresholds. No cutscenes, no meta. Replayable loop only.

## Lessons Applied

| Rule | Application |
|------|-------------|
| T4 (WebGPU) | WebGPURenderer + WebGL fallback; import from `three/webgpu` |
| T1 (no Object.assign) | All position/rotation via `.set()` |
| T2 (module scope) | `gameState`, `clearanceLevel`, `playerHP`, `abilities[]` at module scope |
| T3 (no intermediate gameState) | Wave resolve keeps `gameState = 'wave'` through full slow-mo |
| B2 (terminal state guarded) | `gameState = 'gameover'` set before any setTimeout on player death |
| B4 (per-run seed) | `runSeed = Math.floor(Math.random() * 10000)` — extraction zone seeded per run |
| B5 (audio envelope) | All stings use attack→sustain(0.7)→release |
| G1 (HP buffer) | 3 HP + 1.5s iframes |
| G4/S4 (randomize goal) | Extraction zone position randomized per run |
| G5 (collision radius) | `dist < playerRadius + enemyRadius` |
| G7/G8 (camera tracking) | Smooth lerp 0.06 factor; difficulty from enemy density not timers |
| LP1 (economy calibration) | 5 unlock moments in 10 waves = 1 per 2 waves |
| LP2 (passive entropy) | Enemy aggression baseline increases each wave regardless of CL |
| LP8 (dt multiplication) | All velocities × dt |
| C6/G6 (music loop) | BGM ≥ 60s; intensity layer added at each CL unlock |
| Breach telegraph | Every enemy attack: 0.4s red ring wind-up |
| Wave breathing room | 0.5s slow-mo on wave clear before next wave |
