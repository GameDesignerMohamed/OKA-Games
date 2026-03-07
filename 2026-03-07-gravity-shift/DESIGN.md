# Gravity Shift

**Concept:** Physics survival game where you flip gravity in 4 directions to navigate a collapsing space station — and everything in the scene flips with you.
**Player fantasy:** You are the one thing in the chaos who controls the chaos.

## Core Loop
Gravity flip (WASD) → redirect player + debris + cores → collect 5 energy cores → reach escape hatch before timer expires. Each wave adds debris and compresses time. Every flip is high-commitment: the wrong moment means debris crushes you.

## Key Mechanics
- **4-directional gravity flip** — one input, full-scene physics response (player + all debris + all cores)
- **Two-variable constraint** — WHERE to be AND WHEN to flip are simultaneous decisions (same architecture as Pulse: position × timing)
- **Resource collection under chaos** — cores drift with each flip, forcing gravity reads that account for where cores will land

## What's Built
A 5-wave Three.js survival game with escalating debris density and shrinking timers. Bloom, particle bursts, screen shake, adaptive audio (heartbeat at <8s), and slow-mo wave clear all present. T1/T2 compliant. Commit f61bf21.

## Verdict: 🟡 CONDITIONAL

Gates 1-4 all pass. Two-variable constraint (position + timing) produces a real skill loop — gravity spam loses, deliberate flips win. Scaling integrity confirmed via three independent axes in SUMMARY.md: gravity-locked zones, cooldown meter, and camera angle.

**One fix:** Add gravity cooldown meter. Currently, gravity flips are unlimited — the player can spam flips to recover from any bad position. Unlimited flips remove the "when to flip" half of the two-variable constraint. A cooldown meter restores the timing skill layer: now the player must commit to a flip moment AND manage their next flip window. Without this, Gate 2 is borderline (the decision exists but unlimited recovery collapses the tradeoff).

> One build cycle: add gravity flip cooldown (e.g., 2.5s recharge). That's PURSUE.

