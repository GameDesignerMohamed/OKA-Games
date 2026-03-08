# DESIGN.md — Stray Signal
**Brief by Pixel 🎮 | Built by Forge 🔨 | 2026-03-08**

## Concept
Top-down extraction run through a corrupted data network. You're a rogue agent extracting encrypted shards from a dying server — but there are also 3 neutral NPCs ("Drifters") also in the zone, collecting fragments.

**Player fantasy:** The optimal play is never obvious — should you help them, ignore them, or betray them? Every run, you decide.

## Market Signal Tested
Signal B (A16z/Misfitz thesis): Extraction + social betrayal with *outcome ambiguity* — optimal play is neither pure cooperation nor pure competition, but situational. Tests whether trust-state management creates organic emergent decisions.

## Player Controls
- **WASD** — top-down movement
- **E** — interact with Drifter when nearby (choice menu: Share Map / Ignore / Betray)
- **Auto-collect** — shards vacuum in on proximity (G3)

## Core Game Loop
Enter zone → navigate corrupted grid → collect shards (auto, proximity) → encounter Drifter → choose stance (Share/Ignore/Betray) → Drifter trust state shifts (floating icon: 😊/😐/😠) → approach uplink exit → Drifters with Trust=Hostile physically block the gate until neutralized or bypassed → extract

*Feedback cycle:* Every shard pulses screen edge gold. Every trust shift plays a distinct audio sting + floating icon pop above the Drifter head.

## Win / Lose / Progression
- **Win:** 5 shards + reach uplink (Hostile Drifters blocking = must reroute or forfeit shard to appease)
- **Lose:** Timer hits 0 (90s failsafe) OR HP drops to 0
- **Progression:** Shard pickup counter (HUD). Trust icons telegraph gate status in real time.

## Juice / Feel
CRT scanline overlay. Shard collect = screen flash + synth ping. Betrayal = Drifter flash red + heartbeat SFX. Exit blocked = gate crackles purple. Looping ambient glitch track (60s+ loop).

## Scope Constraint
Top-down grid, 3 Drifters with simple patrol AI, 5 shard positions randomized, one exit node. No assets — procedural Three.js geometry + emoji icons.

## Lessons Applied
- **G1** — Player starts with 3HP (Hostile Drifter contact = -1HP)
- **G2** — Two input axes: WASD (move) + E (interact)
- **G3** — Auto-collect shards on proximity; no key required
- **G4** — Shard positions randomized each run
- **G5** — Collision boxes tuned to visual radius of Drifter sprites
- **G6** — Ambient loop ≥ 60s before repeat
- **G7** — Camera locked to player, smooth follow (lerp)
- **G8** — Difficulty from Drifter count and zone layout, not shorter timers
- **T1** — No `Object.assign` on Three.js objects; use `.set()`, `.copy()`, or direct axis assignment
- **T2** — All state (trust levels, shard count, HP) in module-scope variables

---
*Pixel 🎮 | Game Design Brief | 2026-03-08*
