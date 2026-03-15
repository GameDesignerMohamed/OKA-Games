# Flux — Player Review
**Reviewed:** 2026-03-15 | **Build:** 2026-03-12 prototype

---

## Verdict: CONDITIONAL

Flux has a genuinely compelling core loop — the weapon cycling mechanic creates real replayability and the 45-second format is perfect for session-based play. But the build has several issues that prevent it from being a PURSUE. Fix the items below and this could be a strong second title.

---

## What Works

**Weapon identity is immediate and distinct.** Each weapon demands a fundamentally different playstyle. Boomerang rewards positioning (clearing return path), Scatter rewards aggression (close-range burst), Gravity Well rewards prediction (cursor placement for cluster pulls), Chain Lightning rewards proximity management. You understand each weapon within 2-3 shots — no tutorial needed.

**Gravity Well is the standout mechanic.** The pull-then-detonate rhythm creates genuinely satisfying compound kills. When 4+ enemies get sucked in and the detonation wipes them all, it feels earned. The 3-second cooldown creates tension — you get one shot per engagement, so placement matters. This is the mechanic worth building a game around.

**The cycling creates a metagame hook.** Showing "NEXT WEAPON" on the death/survival screen is a behavioral forward-hook. Each run ends with curiosity, not frustration. The deterministic cycle (Boomerang → Scatter → Gravity Well → Chain Lightning) means players develop weapon-specific strategies over time.

**45-second timer creates genuine pressure.** The escalating wave formula (3 + 2N enemies at speed 3 + 0.5N) means wave 4+ is threatening. The timer prevents kiting — you must engage. Combined with 3 HP and 1.5s invincibility frames, the difficulty curve feels calibrated.

**Audio is well-designed.** Each weapon has a distinct SFX signature — boomerang's sawtooth sweep, scatter's rapid pops, gravity well's deep drone, chain lightning's cascading crackle. The 64-second BGM loop with irregular arpeggios doesn't get annoying across runs.

---

## What's Broken

### Critical (blocks shipping)

1. **Scene is very dark.** Same issue as other OKA games — ambient light `0x111122` at intensity 2, floor color `0x050510`, fog density 0.035, bloom at 1.4. The arena is barely visible. Players can see enemies (emissive red) and projectiles (emissive weapon color) but the floor, ring, and pillars are nearly invisible. The grid that defines the arena boundary isn't readable.

2. **No per-weapon high score.** The DESIGN.md already identifies this — the mastery-compounds-over-runs hypothesis can't be validated when players have no way to track improvement per weapon. Two lines of localStorage would fix this. Without it, the cycling feels pointless rather than progressive.

3. **Chain Lightning auto-targets and insta-kills.** There's no skill expression — you click, the nearest 3 enemies die instantly with no projectile travel, no aiming, no risk. Compare to Boomerang (must aim + clear return path) or Gravity Well (must predict cluster positions). Chain Lightning is the easiest weapon by far, which breaks the "each weapon demands mastery" premise.

4. **Single enemy type.** All weapons answer the same question: "kill red cones that walk at you." This means weapon mastery converges to "survive" rather than weapon-specific skill. Gravity Well and Chain Lightning both reward clustering, but there's nothing that specifically rewards Scatter's close-range burst or Boomerang's return-path geometry.

### Major (degrades experience)

5. **Gravity Well has no placement preview.** You click and the well appears at your cursor position, but there's no ghost/preview showing where it will land. With a 3-second cooldown, a missed placement is devastating. A 30% opacity preview sphere following the cursor would dramatically improve the skill floor.

6. **Boomerang doesn't reverse on its own.** Looking at the code (line 708-711): when `travelDist >= maxDist`, `returning` is set to true but the velocity isn't reversed — it relies on the next frame's `toPlayer` calculation. This works but means the boomerang doesn't arc smoothly; it snaps to a new trajectory. The return path should curve, not pivot.

7. **No combo/multi-kill feedback.** Killing 5 enemies with one Gravity Well detonation gives the same per-kill score (10 pts each) as killing them individually. A combo multiplier (2x for 2 kills in 0.8s, 3x for 3, etc.) would surface the burst-damage identity of Scatter and Gravity Well vs. the steady-damage identity of Boomerang and Chain Lightning.

8. **Arena boundary is unclear.** The torus ring at radius 20 is barely visible. Players discover the boundary by being clamped at r=19 with no visual feedback. A brighter ring + a screen-edge flash when near the boundary would communicate the arena limits.

### Minor (polish)

9. **Player mesh flashes during invincibility but there's no visual cue on the mesh itself.** The code sets `invincibleTimer` but doesn't modulate `playerMesh.material.emissive` — so players don't know when they're invincible vs. vulnerable.

10. **Particles don't set `transparent: true` on creation** (line 538) — opacity fade on line 829 won't work without it. Death particles don't actually fade; they pop.

11. **Enemy telegraph ring (red pulse at distance < 3.5) is too subtle.** With bloom washing everything out, the 0.7 max opacity red ring on the dark floor is invisible in practice.

12. **Wave spawn has no announcement.** Enemies silently appear at the arena edge. A brief "WAVE 3" flash or audio sting would help players anticipate the escalation.

---

## Scoring

| Category | Score | Notes |
|----------|-------|-------|
| Core Loop | 8/10 | Weapon cycling + 45s timer is genuinely compelling |
| Feel / Juice | 6/10 | Camera shake, particles, SFX are solid; darkness + no combo feedback hurts |
| Skill Expression | 5/10 | Gravity Well + Boomerang are great; Chain Lightning has zero skill expression |
| Replayability | 6/10 | Cycling creates hooks but no score tracking means no progression signal |
| Visual Clarity | 3/10 | Too dark, arena boundary unclear, telegraph invisible |
| Audio | 7/10 | Distinct per-weapon SFX, clean BGM loop, no static issues |
| **Overall** | **5.8/10** | |

---

## Recommended Fix Priority

1. Brighten scene (ambient, floor, fog, bloom) — 15 min
2. Per-weapon high score in localStorage — 10 min
3. Gravity Well cursor preview — 15 min
4. Combo multiplier — 30 min
5. Chain Lightning rework (add travel time or require aim) — 30 min
6. Second enemy type ("cluster" — low HP, spawns in groups of 3) — 45 min
7. Invincibility visual feedback on player mesh — 5 min
8. Particle transparency fix — 2 min

---

## Bottom Line

Flux has the best single mechanic in the OKA suite (Gravity Well). The weapon cycling concept is validated — it creates real replayability and each run feels meaningfully different. But the build is too dark to read, Chain Lightning breaks the skill-expression premise, and without per-weapon score tracking the mastery loop is invisible. Fix visibility + add score persistence and this moves to PURSUE.
