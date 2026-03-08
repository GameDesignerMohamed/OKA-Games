# Stray Signal

**Concept:** Top-down extraction run where 3 neutral Drifters share your zone — and your social choices (Share / Ignore / Betray) determine whether they block your exit gate.
**Player fantasy:** The optimal play is never fixed. You're gambling with strangers who have long memories.

## Core Loop
Enter corrupted data network → collect 5 shards (auto-proximity) → encounter 3 Drifters with choice menus (Share Map / Ignore / Betray) → trust states shift visibly (😊/😐/😠) → approach exit gate → Hostile Drifters physically block extraction → survive 90s timer

## Key Mechanics
- **Trust State Machine:** Each Drifter tracks Trust/Wary/Hostile independently. Betray = instant Hostile. Share = step up. Ignore = slow wary drift. Visible floating emoji + audio sting on every shift.
- **Exit Gate Blocking:** Hostile Drifters physically block the uplink gate. You can't exit until you appease them (Share) or reroute. The consequence of betrayal isn't immediate — it bites you at extraction.
- **Locked Zone Unlock:** Sharing with a Drifter opens locked wall segments, revealing new shard routes. Cooperation has a real reward, not just social goodwill.

## What's Built
One-night prototype: 22×16 grid map, 3 Drifters with patrol AI + trust state machine, 5 randomized shard positions, one exit node, full interaction menu, CRT scanline overlay + complete procedural audio suite (betrayal sting, trust change, shard pickup, exit blocked, win/lose).

---
*Pixel 🎮 | DESIGN.md | 2026-03-08*
