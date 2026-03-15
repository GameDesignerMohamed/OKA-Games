# Dead Beat

**Concept:** A top-down rhythm brawler where beat-timing is simultaneously your offense and your defense — punch and dodge must both land on the beat to count.
**Player fantasy:** I am in the zone. Every hit lands exactly when the music says it should.

## Core Loop
Watch the shrinking ring pulse toward your character — when it snaps, attack or dodge. On-beat punch = 3× damage + enemy stagger + freeze-frame. Off-beat punch = 1× scratch + combo reset. On-beat dodge = full invincibility frames. Off-beat dodge = movement only, no protection. Three arenas at escalating BPM (100→120→140). Clear all waves + boss = arena clear.

## Key Mechanics
- **Shrinking beat ring** — visual anticipation cue: ring pulses from radius 4 → 1 over each beat; "snap" = on-beat window (±18% of beat duration). Creates anticipation over reaction — player reads the ring, not a flash
- **Unified attack/defense timing** — same beat clock governs punch damage AND dodge iframes; rhythm skill is never optional because evasion requires it too (distinct from Pulse, where timing was offense-only)
- **On-beat/off-beat feedback polarity** — maximum sensory contrast: freeze-frame + chromatic aberration + THWACK vs grey puff + clunk; the system communicates quality of timing, not just success/fail
- **BPM escalation as difficulty** — 100→120→140 BPM across 3 arenas tightens the on-beat window in absolute milliseconds without changing the visual ring or rules; mastery = same read, faster execution

## What's Built
Three.js top-down prototype. WASD move, left-click punch, Space dodge. 3 arenas with 3 waves + boss each. 2 enemy types: Grunts (small/purple/1-beat telegraph) and Heavies (large/red/2-beat telegraph). Combo multiplier ×1–×5. All enemy attack timers dt-based (no setTimeout). Beat click + BGM synthesis via Web Audio API. UnrealBloom post-processing with T9 try/catch fallback.

## Systems Design Notes
**Mechanic class:** Distinct from Pulse (Build #8). Pulse = bullet-hell, where timing governs bullet-gap exploitation (position × timing). Dead Beat = brawler, where timing governs melee range damage and survivability (timing × timing — same clock, two outputs). Two-Variable Constraint collapses into one axis with dual effect.

**Depth layer:** The dodge-offense coupling is where the real skill ceiling lives. A player who optimizes purely for on-beat punching will over-commit and eat Heavy 2-beat attacks. The mastery floor is "time your punches"; the mastery ceiling is "read enemy telegraph → time your dodge to the same beat → immediately punch back on the follow beat." The two-beat Heavy is the design instrument that creates this.

**Verdict: CONDITIONAL**

The on-beat/off-beat distinction is real and lands. The shrinking ring is the right anticipation model — it rewards reading over reacting. The offense/defense unification makes timing universally high-stakes.

**Primary gap:** No cross-run mastery loop. Score exists but no per-arena personal best display. The player who improves has no legible proof they improved. The metric is available in code (perfectHits, maxCombo, score) but not persisted or surfaced on a meaningful leaderboard or personal best screen.

**Conditions for PURSUE:**
1. Per-arena localStorage high score (personal best on "Perfect Hits %" + "Max Combo" — persisted, shown on win screen)
2. Boss "power beat" pattern: every 4th beat fires a double-damage attack the player must dodge on-beat (creates deliberate rhythm-within-rhythm layer for boss difficulty)
3. Mid-arena BPM ramp: each wave within an arena increases BPM by ~5 (tighten pressure as wave count climbs without needing a new arena)

**Prototype-ready extension:** "Anti-beat" enemy type — attacks on the OFF-beat window. Forces player to deliberately suppress their conditioned response (don't punch when the ring snaps). Tests whether players can unlearn the core habit, which is the hardest skill ceiling. No new art needed: new color + inverted attack timer offset.

---
*Pixel 🎮 | March 15, 2026 | Build #17*
