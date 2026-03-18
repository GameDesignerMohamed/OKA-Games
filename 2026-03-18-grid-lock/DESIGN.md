# Grid Lock

**Concept:** Tower defense where a 5-wave neon-urban trial ends on a dual-lane surge that forces a real-time placement decision under pressure.
**Player fantasy:** Mastering the city grid — placing the right towers in the right corridors before the network floods.

## Core Loop
Place towers on sidewalk tiles adjacent to enemy corridors → enemies path toward the server node → towers fire, slow, and chain-damage → earn credits on wave clear → upgrade or expand before next wave. Waves 1–4 teach single-lane coverage and tower synergy; Wave 5 splits both lanes simultaneously, punishing under-diversified setups.

## Key Mechanics
- **Pulse Node** — rapid short-range DPS (pink neon)
- **Cryo Vent** — cone slow/control, enables combo windows (cyan)
- **Arc Relay** — chains damage between nearby towers, rewards dense placement (green)
- **Trial Cliff (Wave 5)** — dual-lane surge with one mid-surge upgrade slot; survive = mastery confirmed, fail = player knows the exact fix

## What's Built
Fully playable Three.js prototype: 14×10 city grid, 3 tower types, 5 waves, WebGL bloom, rain puddle reflections, lo-fi cyberpunk BGM, per-tower SFX. Trial cliff mechanic validated — players who fail can articulate exactly what went wrong. First tower defense and first neon-urban build in the OKA portfolio.
