# Flux

**Idea:** 45-second arena survival where your weapon mutates into a completely different form every run — tests whether player mastery compounds when the instrument changes.
**Status:** Working prototype
**Date:** 2026-03-12

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-12-flux
python3 -m http.server 8080
# Open: http://localhost:8080
```

## What Was Built

A fully playable Three.js arena survival game. You survive 45-second rounds against homing enemies using one of four weapons that cycle between runs:

- **BOOMERANG** — arc projectile travels out ~9 units, returns, damages both ways
- **SCATTER** — 5-shot cone burst, short range, rapid fire
- **GRAVITY WELL** — click to place a 2-second pull zone that sucks enemies in, then detonates
- **CHAIN LIGHTNING** — bolt hits nearest enemy and chains to 2 more

Each weapon is mechanically distinct — not stat variants. The player carries learned instincts (arena positioning, threat reading) while adapting to a new fire pattern. Score is prominent and displayed continuously. After every run the weapon advances, forcing this adaptation.

## Key Takeaway
The "mastery with mutation" thesis holds at prototype level — the 45-second constraint is tight enough for the TikTok-format signal (immediate hook, shareable result) and the weapon cycling creates the Clash Royale-style "familiar but different" feel. Gravity Well in particular produces emergent behavior as enemies cluster.

## What I'd Change Next
- Add visual cooldown indicator for Gravity Well (3s is long, needs a meter)
- Boss enemy at 30-second mark for escalating tension
- Persistent high-score display between runs (shareable via URL parameter)
