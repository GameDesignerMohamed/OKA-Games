# DESIGN.md — Flux
*Pixel 🎮 | March 12, 2026*

## Market Signal Tested
Clash Royale's $4.9B comeback (evolving familiar tools) × Minit's TikTok-for-games (sub-60s, no tutorial, shareable score).
Hypothesis: does player mastery compound when the instrument mutates each run?

## Controls
WASD — move. Mouse aim — continuous. Click — fire. No tutorial. Weapon behavior is legible from the first projectile.

## Core Loop
Spawn → weapon auto-announces its form (1s glow burst) → survive 45s against escalating enemy waves → die or survive → score tallied → next run cycles to next weapon form. Score visible in top-right at all times (white, large).

## Win / Lose / Progression
No win state. Survive 45s = run complete, score locked. Die early = partial score.
Weapon form cycles deterministically: Boomerang → Scatter → Gravity Well → Chain Lightning → repeat.
Mastery compounds — same arena, same escalation curve, different instrument every run.

## 4 Weapon Forms

| Form | Behavior | Visual Identity |
|------|----------|-----------------
| 🪃 Boomerang | Single projectile arcs out, returns to player, damages on both passes | Cyan crescent, trailing arc ribbon |
| 🔱 Scatter | 5-shot cone on click, tight spread, short range, rapid fire | Orange pellets, muzzle fan flash |
| 🌑 Gravity Well | Click places a pull-zone for 2s; enemies drag inward, then detonation | Purple sphere, particle infall spiral, shockwave ring |
| ⚡ Chain Lightning | Bolt fires at nearest enemy, jumps to 2 additional targets | White-to-yellow chain, branching arc geometry |

## Juice / Feel
- Camera shake scaled to hit source
- Enemy death: burst of colored shards matching weapon color
- Score counter ticks up on each kill (+10 per enemy, +50 bonus surviving full 45s)
- Weapon-switch transition: 0.5s arena flash + audio sting
- HP buffer: 3 lives, 1.5s iframes on hit

## Lessons Applied
- **T4** — WebGPURenderer with WebGL fallback; import from `three/webgpu`. Mandatory.
- **T1** — No `Object.assign()` on Three.js objects; all transforms via `.set()` or axis assignment.
- **T2** — All game-critical variables (score, hp, gameState, weapon index) declared at module scope.
- **T3** — `gameState` never set to an intermediate value mid-resolve; timeout callbacks own the transition.
- **G1** — 3-HP buffer + 1.5s iframes. Physics-emergent hazards can't one-shot the player.
- **G4/S4** — Enemy spawn positions seeded per run; no memorizable patterns.
- **B2** — Terminal state guarded: `gameState = 'ended'` set before async callbacks.
- **B5** — Audio envelopes: sustain ≠ 0 on drone/ambient. Attack → sustain (70%) → release.
- **S6** — Music events distributed across full loop at irregular intervals.
- **LP8** — All per-frame physics values multiplied by `dt`.
- **Telegraph rings** — enemies pulse red 0.4s before contact; death always legible.
- **Camera shake** — `cameraShake(0.1)` enemy kill, `cameraShake(0.3)` player hit, 0.85x/frame decay.

## Scope
Single `index.html` + `game.js`. Three.js via CDN importmap. One arena, 4 weapon forms, one enemy type (scales in speed + count). One-night Forge build.
