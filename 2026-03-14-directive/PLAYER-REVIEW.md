# Directive — Player Review
**Reviewed:** 2026-03-15 | **Build:** 2026-03-14 prototype

---

## Verdict: CONDITIONAL

Directive has the strongest conceptual identity in the OKA suite — you're directing agents, not playing as one. The rejection bubble system is genuinely funny and mechanically informative. But the build has critical visibility issues (same dark scene pattern), the agent autonomy that defines the concept is undercooked, and the wave pacing leaves dead time that kills momentum.

---

## What Works

**The rejection bubble system is the best single UX idea across all OKA games.** "NOT MY JOB" from the Builder when you click an enemy, "HEAL ONLY" from the Medic, "TOO CLOSE" / "OUT OF BOUNDS" for invalid turret placement — these aren't just error messages, they're character. Each rejection teaches the player what an agent *can* do by showing what it *won't* do. The 3D-projected screen-space positioning (worldPos → camera.project → CSS) means they float where the agent is, not in a generic toast. This is the mechanic worth protecting.

**Four agent types with genuinely distinct identities.** Scout (capsule, cyan, HP:6, auto-attacks), Builder (cube, gold, HP:8, places turrets), Fighter (octahedron, red, HP:10, taunts), Medic (cone, green, HP:7, auto-heals lowest HP ally). Each geometry is immediately readable at the top-down camera angle. The type → behavior → geometry mapping is clean — you learn the system visually within one wave.

**Telegraph rings create a readable skill floor.** 0.8s warning before every enemy attack, with pulsing opacity (`0.4 + 0.5 * sin(...)`), means deaths feel avoidable. The telegraph → damage pipeline uses `setTimeout(TELEGRAPH_DURATION * 1000)` which is crude but effective — you can pull an agent out of the ring before damage lands.

**Wave-gated ability unlocks are well-paced.** Scout Reveal (W2) answers "where are they?", Builder Turret (W3) answers "how do I hold ground?", Fighter Taunt (W5) answers "how do I protect the core?", Medic Burst (W6) answers "how do I survive the endgame?". Each unlock arrives just as the wave composition creates the problem it solves. This is smart gating.

**Three enemy types create meaningful tactical variety.** Grunt (HP:4, normal speed, 1 dmg) is the baseline. Rusher (HP:2, 1.6x speed, 1 dmg) punishes players who ignore flanks. Tank (HP:12, 0.55x speed, 2 dmg) demands focused fire. The escalating compositions from `[3,0,0]` to `[8,4,2]` create real pressure curves.

**Click interaction model is well-designed.** Click agent to select (or press 1-4), click ground to move, click enemy to attack, click ally (as Medic) to support. The raycaster collects agents → enemies → ground in priority order, so you naturally select before commanding. Builder turret placement requires being in build phase + ability unlocked + not on cooldown + within bounds — each invalid state has a specific rejection bubble. The interaction tree is complete.

---

## What's Broken

### Critical (blocks shipping)

1. **Scene is very dark.** Ambient light `0x111122` at intensity 0.8, ground color `0x050a10`, fog `0x020408` at density 0.022, bloom at 1.1 strength. The arena is barely visible — you can see agents (emissive colors) and enemies (emissive red/orange) but the ground, grid, arena ring, and Core base are nearly invisible. Same systematic darkness as other OKA builds.

2. **Agents don't feel autonomous.** The DESIGN.md promises "agents execute autonomously between commands" but the auto-behavior is minimal: Scout/Fighter auto-target the nearest enemy within `AGENT_ATTACK_RANGE * 2.5` (12.5 units) when idle during combat, Medic auto-heals lowest HP ally. In practice, agents idle constantly because they only auto-engage when already close to enemies. The fantasy is "I'm a director" but the reality is "I'm a micromanager clicking each agent to each target." Builder has zero autonomous behavior — it just stands there unless you click.

3. **No agent status HUD.** You have no way to know what each agent is currently doing without visually finding them in the scene. The DESIGN.md identifies "per-agent situation report" as the #1 next step. Without it, the "read agent state → reassign" loop that defines the core mechanic is broken — you can't read state you can't see.

4. **Build phase has no purpose without turrets.** Waves 1-2 have no turret ability unlocked, so the "BUILD PHASE — SPACE to start wave" screen is just "press SPACE to continue." There's nothing to build. The build phase only becomes meaningful at Wave 3+. Before that, it's dead air that kills pacing.

### Major (degrades experience)

5. **Enemy AI is core-only.** Enemies always path to `CORE_POS (0,0,0)` unless taunted by the Fighter. They don't target agents, don't react to turrets, don't flank. This means optimal play is always "put Fighter near core, put turrets near core, have everything defend core." There's no positional strategy because enemies don't create positional problems.

6. **`setTimeout` for telegraph damage is fragile.** `triggerEnemyAttack` schedules damage via `setTimeout(fn, TELEGRAPH_DURATION * 1000)`. This doesn't respect game pause, game over, or time scaling. If the game ends during a telegraph, the setTimeout still fires. The captured references (`capturedEn`, `capturedAgent`) have dead-state checks, but this is still a timing bug waiting to happen.

7. **No score or performance tracking.** No score counter, no kill count, no "goals assigned" stat, no end-of-run summary. The win screen says "All 7 waves defeated. The Core stands." and that's it. The DESIGN.md proposes "run-end stat screen: goals assigned per agent, rejections fired, autonomous actions taken" — this would be powerful because it reveals the player's own command patterns. Without it, there's no feedback on how well you directed.

8. **Camera is static and too high.** Camera at `y=36, z=26` looking at origin. No pan, no zoom, no rotation. The arena is radius 28 — enemies spawning at the far edge are tiny dots. Combined with the dark scene, enemies at spawn are invisible until they're halfway to the core. At minimum, a zoom level or follow-camera would help.

### Minor (polish)

9. **Particles don't initialize with `transparent: true`.** Line 448: `new THREE.MeshBasicMaterial({ color })` — no `transparent: true`. The opacity fade on line 1214 (`p.mesh.material.opacity = Math.min(1, p.life * 3)`) won't render correctly. Line 1215 patches this retroactively (`if (!p.mesh.material.transparent) p.mesh.material.transparent = true`) but the first frame still renders at full opacity.

10. **BGM uses sawtooth arpeggio.** Line 1327: `playTone(arpFreqs[...], 'sawtooth', 0.3, 0.04)` — sawtooth at low volume is fine, but combined with the 60Hz sine drone and kick pattern, the BGM has a buzzy, industrial quality that doesn't match the "commander directing agents" fantasy. A cleaner synth pad would fit the tactical mood better.

11. **Turrets persist between waves but there's no turret limit.** A patient player can place a turret every wave from W3 onward. By W7, you could have 5 turrets with 30s cooldown each. The turret auto-targets nearest enemy within range 9 and deals 2 damage every 1.8s — this trivializes late waves. No turret HP, no turret cap, no turret decay.

12. **Core HP pips in HUD don't update color.** `updateCoreHpDisplay` changes `coreMesh.material.color` based on HP ratio (blue → orange → red) but the HTML pips are always the same CSS color. The 3D core changes color but the HUD doesn't reflect urgency.

---

## Scoring

| Category | Score | Notes |
|----------|-------|-------|
| Core Loop | 7/10 | Select-assign-watch is a genuine direction fantasy; rejection bubbles are excellent |
| Feel / Juice | 5/10 | Camera shake, telegraphs, particles work; darkness + no status HUD + static camera hurts |
| Skill Expression | 5/10 | Good interaction tree but no positional strategy; enemy AI too simple |
| Replayability | 4/10 | 7 waves is a fixed arc; no score, no run variation, no stats |
| Visual Clarity | 3/10 | Too dark, agents hard to distinguish at distance, arena boundary invisible |
| Audio | 5/10 | SFX per action type is solid; BGM is buzzy sawtooth, doesn't match tone |
| **Overall** | **4.8/10** | |

---

## Recommended Fix Priority

1. Brighten scene (ambient, ground, fog, bloom) — 15 min
2. Agent status HUD (4-panel showing current state + target per agent) — 45 min
3. Score/stats tracking with end-of-run summary — 30 min
4. Improve agent autonomy (larger auto-engage range, Builder auto-repairs core) — 30 min
5. Skip build phase when no build abilities unlocked (W1-W2) — 5 min
6. Replace `setTimeout` telegraph damage with delta-time countdown — 20 min
7. Add turret limit (max 3) or turret HP decay — 10 min
8. Camera zoom controls (scroll wheel) — 15 min
9. Replace BGM sawtooth arpeggio with sine/triangle — 10 min
10. Particle transparency fix (add `transparent: true` at creation) — 2 min

---

## Bottom Line

Directive's rejection bubble system is the best UX innovation in the OKA suite — it makes agent specialization tangible, funny, and instructive simultaneously. The four-agent composition with distinct geometries and behaviors creates a readable tactical space. But the "autonomous agent direction" fantasy promised by the concept isn't delivered yet — agents are too passive, there's no status visibility, and the enemy AI doesn't create enough positional complexity to make directing feel different from micromanaging. Fix scene visibility, add agent status HUD, and improve auto-behaviors, and the concept proves out. The foundation is strong; the autonomy layer needs depth.
