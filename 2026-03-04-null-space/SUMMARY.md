# Null Space

**Idea:** Top-down stealth survival — you're a rogue AI fragment navigating a dark maze, hunted by an adaptive Sentinel that learns your movement routes. Collect 5 data shards, reach the exit portal, survive.
**Status:** Working prototype
**Date:** 2026-03-04

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-04-null-space
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A fully playable browser stealth game in Three.js. The world is a dark 19×15 tile maze rendered with instanced wall geometry and point lights. The player is a glowing cyan cylinder with a personal light bubble — the only real light in the scene. The Sentinel (red octahedron) patrols your previous routes using a heatmap system: every tile you walk on without creeping gets heat-mapped, and the Sentinel preferentially patrols high-heat tiles. Five green data shards scattered across the maze must be collected before the exit portal activates.

**Three.js features used:**
- Instanced mesh for walls (performance) and floor tiles
- UnrealBloomPass post-processing — cyan player and shard glow, red sentinel glow
- PointLight per player, per shard, per sentinel — creates visibility bubbles
- Fan geometry for sentinel vision cone (flat triangulated mesh)
- Particle system for shard collection bursts and death/win effects
- OrthographicCamera top-down view
- FogExp2 for atmosphere
- Screen shake via camera position offset

**Audio (Web Audio API):**
- Looping ambient drone (sawtooth bass + LFO tremolo + bandpass static noise)
- Adaptive heartbeat — rate increases with proximity/alert level
- Sound effects: shard collect (ascending square chime), caught (sawtooth alarm burst), win (triangle arpeggio), portal activate (sine sweep), footstep (sub bass pulse)

**Sentinel AI:**
- Heatmap-based patrol: trails your path, patrols highest-heat tiles 70% of the time
- Chase mode activates when player enters vision cone (fan FOV check)
- Alert level system: 0→1 ramps up on cone overlap, decays when not visible
- Vision cone geometry + color change communicates alert state visually

**Controls:**
- WASD / Arrow keys — move
- Shift — silent creep (slower, no heat trail)
- E — collect shard when in range

## Key Takeaway
The heatmap patrol mechanic creates genuine tension without complex pathfinding — the Sentinel isn't omniscient but it's predictable in a learnable way. Players who repeat the same path die; players who vary routes and use creep mode survive. The "stealth/horror" genre had never been attempted in OKA-Games.

## What I'd Change Next
- Add wall collision detection for Sentinel (currently it CAN clip through thin walls on diagonal movement)
- Add more maze complexity — dead ends, one-way passages, alarm tiles
- Add Sentinel hearing (footstep sounds trigger local alert radius)
- Multiple Sentinel enemies in later difficulty modes
- Sound cue distance falloff (louder heartbeat = Sentinel is nearer)
