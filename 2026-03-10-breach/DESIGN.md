# Breach

**Concept:** Top-down action roguelike where players breach procedurally-seeded vault rooms by reading enemy telegraphs and rolling through attacks to survive.
**Player fantasy:** I am a precise, lethal operative — every death was readable, every clear was earned.

## Core Loop
Choose a loadout → clear 6 rooms of enemies using dodge-roll iframes and aimed fire → pick one upgrade between rooms → survive a phase-transitioning boss. Permanent death. Each run is 10-15 minutes.

## Key Mechanics
- **Telegraph system**: every enemy attack is preceded by a visible ring wind-up — skill floor is readable, deaths feel fair
- **Dodge roll + iframes**: 0.5s invincibility window on roll; cooldown varies by loadout — timing mastery is the core skill axis
- **3 loadouts with distinct feel**: Vanguard (fast fire, short range), Phantom (burst + range), Breaker (scatter shotgun, slow roll)
- **4 enemy types + boss**: Grunt (melee chase), Shielder (front-shielded, must flank), Sniper (ranged), Exploder (proximity bomb) — each requires a different response pattern
- **Room upgrade picks**: +HP, +damage, +roll cooldown — lightweight meta-decisions that compound over a run

## What's Working
- **Telegraph = readable skill floor**: players can see why they died. This is the single most important design win — it separates Breach from action games where death feels arbitrary
- **Loadout identity is real**: Breaker feels different from Phantom at a mechanical level (scatter vs burst, different roll windows) — not just stat reskins
- **Shielder flanking requirement**: introduces positional problem-solving into a bullet-clearing loop — breaks monotony without adding UI complexity
- **Boss phase transition**: HP threshold at 50% with pattern shift creates a natural tension spike in a short-session run
- **iframes confirmed working**: dodge roll as risk/reward decision (not just movement) is the core high-skill expression

## What's Missing
1. **No meta-progression across runs** — loadouts are static, nothing unlocks. After 3 runs the loop is fully seen. This is the primary retention wall.
2. **Room assembly is seeded, not procedural** — obstacle placement is deterministic; veteran players will pattern-match rooms rather than read them fresh
3. **Boss needs a third pattern at 25% HP** — two patterns is enough for the prototype, not enough for a shipped game. The final-stand moment needs a distinct escalation.
4. **No run identity signal** — player can't look at their run state and feel "I'm a tank build" or "I'm a glass cannon." Upgrades accumulate but don't signal archetype.

## Next Build Priorities (if pursued)
1. **Cross-run unlock system**: meta-currency from runs → unlock 2-3 additional loadouts or starting modifiers. Gives a reason to run again after death.
2. **Procedural room tile assembly**: replace seeded obstacles with tile-based room generation — same enemy budget, different geometry each run.
3. **Boss third phase at 25% HP**: add one new attack pattern at low HP threshold — the "final push" feeling is currently absent.

## What's Built
The prototype proves the core design hypothesis: telegraph-based combat makes death legible in a browser action game. The skill floor is readable, the loadouts feel distinct, and a full 6-room run + boss is completable in 10-15 minutes. The format works.
