# DESIGN.md — Flux
*Pixel 🎮 | March 12, 2026*

## Market Signal Tested
Clash Royale's $4.9B comeback (evolving familiar tools) × Minit/TikTok ultra-short session design.
Hypothesis: does player mastery compound when the instrument mutates each run?

## Controls
WASD — move. Mouse aim — continuous. Click — fire. No tutorial. Weapon behavior is legible from the first projectile.

## Core Loop
Spawn → weapon auto-announces its form (1s glow burst) → survive 45s against escalating enemy waves → die or survive → score tallied → next run cycles to next weapon form. Score visible in top-right at all times.

## Win / Lose / Progression
No win state. Survive 45s = run complete, survival bonus applied. Die early = partial score.
Weapon form cycles deterministically: Boomerang → Scatter → Gravity Well → Chain Lightning → repeat.
Mastery compounds — same arena, same escalation curve, different instrument every run.

## 4 Weapon Forms

| Form | Behavior | Range Profile | Skill Expression |
|------|----------|---------------|-----------------|
| 🪃 Boomerang | Single projectile arcs out, returns to player, damages on both passes | Long + return path = 2 threat windows | Positioning: player must clear path for return |
| 🔱 Scatter | 5-shot cone on click, tight spread, rapid fire (0.25s CD) | Short–medium burst | Aggression: close-range pressure, high DPS |
| 🌑 Gravity Well | Click places pull-zone (2s); enemies drag inward, detonation radius 5u | Area control, 3.0s CD | Geometry: cursor placement + enemy cluster prediction |
| ⚡ Chain Lightning | Bolt fires at nearest enemy, jumps to 2 additional targets | Instant, target-lock | Positioning: proximity to enemy clusters maximizes chain |

## What's Working

**Weapon legibility is immediate.** Each form announces itself on first projectile — visual color, shape, and audio signature are distinct. Players understand the weapon within 2-3 shots without any tutorial text.

**Gravity Well emergent behavior confirmed.** The pull-then-detonate mechanic creates compound kill moments that no other weapon in this suite produces. When 4+ enemies cluster under the pull zone, single-click wipes feel earned, not lucky. This is the standout mechanic in the build.

**45s format creates genuine pressure.** Timer decay from the first second forces engagement — players can't kite indefinitely. The escalating wave (wave N spawns 3+2N enemies at speed 3+0.5N) means wave 4+ is genuinely threatening. The no-tutorial + immediate pressure combination is the TikTok format working as designed.

**Weapon cycling creates metagame.** End-screen shows NEXT WEAPON before click-to-start, which means each run ends with a forward hook — "I need to learn Gravity Well." This is behavioral compulsion without any retention system.

## What's Missing / Risks

**No cross-run mastery signal.** Score is the only feedback across runs. There's no per-weapon high-score tracking, no "you improved by X" readout, no mastery tier per weapon. The Clash Royale signal the build was testing (mastery compounds when tools evolve) is mechanically present but invisible to the player. They feel it but can't measure it — which breaks the compounding loop.

**Gravity Well cursor placement has no preview.** Current: snap-to-ground-plane, no visual confirmation of where the detonation sphere will land. Missing: a ghost sphere following cursor. Low-cost fix, high-impact on Gravity Well skill floor legibility.

**Enemy type variety is zero.** Single cone enemy, scaling by speed + count only. Weapon identities are distinct but they all answer the same question: "how do I kill a fast cone?" Chain Lightning and Gravity Well deserve enemy types that reward their specific geometry (chain: clustered; gravity well: fragile but fast). Without this, weapon mastery converges to a single "survive" skill rather than weapon-specific mastery.

**Combo multiplier absent.** SUMMARY.md notes this — kills-in-succession multiplier would surface the burst-damage potential of Scatter + Chain Lightning as distinct from Gravity Well's area-clear identity.

## Next Build Priorities (if pursued)

1. **Per-weapon high score persistence** (localStorage, 2-line implementation) — surfaces the mastery-compounds-over-runs loop that is already happening invisibly
2. **Gravity Well preview sphere** — cursor-following ghost at 0.3 opacity, same purple color
3. **Second enemy type** — "Cluster" variant: spawns in tight groups of 3, low HP, rewards Gravity Well + Chain Lightning
4. **Combo multiplier** — kills within 0.8s window = 2× points, 3 kills = 3×, visible streak counter

## Scope
Single `index.html` + `game.js`. Three.js via CDN importmap. One arena, 4 weapon forms, one enemy type (scales in speed + count). One-night Forge build.
