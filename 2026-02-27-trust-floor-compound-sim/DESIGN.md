# Trust Floor Compound Sim

**Concept:** An interactive simulator proving that ABH's trust floor mechanic creates a compounding structural moat — early agents build an advantage late entrants cannot close with raw accumulation bonuses alone.

**Player fantasy:** You entered early. The gap is real. Watch it become uncatchable.

## Core Loop

Two agents accumulate trust over time. The early agent's floor — a persistent structural minimum — compounds separately from raw trust score. The late agent, despite bonus rates, chases a target that keeps moving. The simulation visualizes this gap in real-time with full parameter control.

## Key Mechanics

- **Trust floor persistence**: floor = max(floor × decay, raw × 0.8) — never fully collapses, always anchored to current trajectory
- **Moat visualization**: shaded green gap between early floor and late raw score — the gap ABH's design claims exists
- **Break-point discovery**: user-adjustable parameters expose when the moat collapses (>60% bonus + T+5 entry) — defines tuning ceiling for GDD
- **Animate mode**: tick-by-tick playback shows compounding dynamics, not just final state

## What's Built

Interactive Three.js browser visualizer. Runs locally at `http://localhost:8080`. Confirms the core design hypothesis: with default ABH parameters (5% base rate, 20% late bonus, 0.95 floor decay, T+10 entry), the trust moat holds for all 100 ticks. Break-point is at >60% bonus + T+5 entry. The design has a real tuning ceiling.

## What's Next

Three extensions worth building:
1. Composure penalty track — show how being hunted degrades trust accumulation rate
2. Bounty agent elimination line — what happens when an early agent is taken out mid-run
3. CSV export — feed into Machinations for full economy model validation
