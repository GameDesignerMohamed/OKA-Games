# Null Space

**Concept:** Rogue AI fragment navigating a dark maze, hunted by an adaptive Sentinel that learns your movement patterns — collect 5 data shards and reach the exit portal alive.
**Player fantasy:** Outsmarting a predator that gets smarter the more predictable you are.

## Core Loop
Move through a dark maze collecting shards → Sentinel patrols the routes you've already walked → break patterns, use Shift creep to go silent, exploit the Sentinel's learnable but non-omniscient behavior → activate exit portal, escape.

## Key Mechanics
- **Heatmap patrol:** Every non-creep tile walked raises heat. Sentinel preferentially hunts high-heat tiles (70/30 split vs random). Predictability = death.
- **Vision cone + alert ramp:** Fan-shaped FOV with color shift (calm → orange → red). Alert state drives adaptive heartbeat audio — proximity communicated through sound, not HUD.
- **Creep mode (Shift):** Slower movement, zero heat trail. Strategic resource — underused in early runs, crucial for late-game route clearing.

## What's Built
Browser prototype (Three.js + Web Audio). 19×15 dark maze, bloom post-processing, full adaptive audio stack (ambient drone, proximity heartbeat, 5 SFX). Heatmap AI works — playtesting confirms players who repeat routes die consistently. Sentinel wall-clipping on diagonals is the primary known issue.

## What's Next
- Wall collision fix for Sentinel diagonal movement
- Sentinel hearing (footstep alert radius)
- Maze complexity: dead ends, one-way passages, alarm tiles
- Multi-Sentinel scaling for difficulty progression
