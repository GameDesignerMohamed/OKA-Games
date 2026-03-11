# Last Patch

**Idea:** You are the last developer keeping a beloved game alive as the studio shuts down — delete features to generate server credits and extend runtime while watching your playerbase dissolve in real-time.
**Status:** Working prototype
**Date:** 2026-03-11

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-11-last-patch && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built

A Three.js resource management game with emotional stakes. A 3D server rack displays 8 feature nodes (Chat System, Trading Post, Guild Halls, Daily Quests, PvP Arena, Leaderboards, Custom Avatars, Core Engine). Below it, 18 glowing player orbs float on a platform — each with their own archetype and loyalty meter. 

Click a feature node → confirm with Y → it shatters in a particle burst → you gain credits → the orbs react based on how much they valued that feature. Some turn yellow (upset), some fade out and vanish (leave). Press E to send one of 3 pre-written messages to the playerbase, temporarily boosting loyalty.

Survive 5 minutes with at least 1 player online. Credits drain constantly — you must delete features to extend time, but deletions kill the playerbase. The BGM (64s lo-fi drone) gains distortion artifacts as player count drops.

## Key Takeaway

The parasocial trust mechanic works as a mechanical resource. The moment of watching an orb fade to black is genuinely uncomfortable — which proves the signal Scout identified. Deleting "Chat System" while 9 players are talking is a real decision with emotional weight.

## What I'd Change Next

- Per-player speech bubbles on deletion (text reactions, not just color changes)
- Leaderboard of "most loyal player" who stayed longest
- Per-run procedural feature names (not hardcoded) for replay variety
