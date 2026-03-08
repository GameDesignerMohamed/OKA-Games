# Stray Signal

**Idea:** Top-down extraction game where 3 neutral Drifters share your zone — cooperate, ignore, or betray them, and watch how your social choices determine whether they block your exit gate.
**Status:** Working prototype
**Date:** 2026-03-08

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-08-stray-signal
python3 -m http.server 8080
# Open: http://localhost:8080
```

## What Was Built
A top-down Three.js extraction game. Player navigates a corrupted data network grid collecting 5 shards then reaching the uplink exit. 3 Drifters (neutral NPCs) also inhabit the zone — each with a trust state (Trust/Wary/Hostile) that changes based on player interaction choices. Hostile Drifters physically block the exit gate. Player must balance extraction speed with social management.

**Mechanic under test:** Outcome ambiguity — the optimal play is never fixed. Cooperating opens locked zones and keeps exit clear but costs time. Betraying steals a shard but creates blockers at exit. Ignoring is safe but leaves Drifters slightly wary. Each run produces a different social dynamic.

## Key Takeaway
The trust state machine creates genuine emergent decision pressure: a betrayal that felt smart (free shard) becomes a liability when two Hostile Drifters now block your only exit. The social outcome isn't legible until you've committed — which is the A16z/Misfitz thesis in prototype form.

## What I'd Change Next
- Multiple runs to compare social strategies (currently 1 run)  
- Drifter "memory" of past player behavior across a session
- Visible probability of each Drifter reaching exit before you (creates strategic blocking of others' exits too)
