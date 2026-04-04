# DUEL PULSE — Game Design Brief
*Pixel | 2026-04-04 | Build #33*

## Market Signal
Tests the Rec Room failure thesis: social without mechanical skill = zero retention. Rec Room had 150M players and no profitability because the session had no identity. DUEL PULSE makes the *duel itself* the social unit — shareable, clippable, complete in 90 seconds.

**Scout signal (April 3, 2026):** Rec Room shutdown — 150M players, zero profitability, no owned core loop. Build a game where the social layer is wrapped around tight mechanical identity. The session is the content.

## Player Controls
- **WASD** — strafe around the arena (circle-strafing is core skill)
- **Mouse aim** — aim a projectile/pulse attack
- **Left Click / Space** — fire pulse shot
- **Shift** — short-range dodge dash (cooldown: 1.5s)
- No reloads. No inventory. Pure positional skill.

## Core Game Loop
`Spawn → Read opponent position → Strafe + aim → Fire → Hit/Miss feedback → Opponent returns fire → Dodge or eat damage → Repeat until HP = 0`

Tight feedback: every hit = emissive flash on enemy mesh + screen shake + crack SFX. Every miss = whoosh + trail fade. No ambiguity. You always know what happened.

## Win/Lose/Progression
- First to 0 HP loses (3-hit kill)
- Win screen: "DUEL WINNER" + particle explosion
- Lose screen: "REMATCH?" prompt
- No persistent progression in v0 — just loop clarity

## Juice/Feel
- Kill: particle burst (enemy mesh explodes into shards), dramatic freeze-frame 0.3s, "PULSE KO" text slams in
- Each hit flashes enemy mesh emissive red
- BGM escalates with HP pressure (pitch-shift)
- Winner pose: mesh scales up + spotlight locks on

## Scope Constraint
- Single `index.html`, Three.js via importmap CDN
- All entities: `THREE.Mesh` (no Canvas 2D — ever)
- Animated meshes every frame (rotation, bob, pulse scale)
- `AmbientLight` + `DirectionalLight` minimum
- Web Audio API: SFX on every hit/miss/kill + looping BGM
- Player vs AI (AI strafes + fires on timer with slight spread)
- Full loop: **select fighter → fight → win/lose screen → replay button**
- **60-minute build target. Ship ugly. Prove the loop.**
