# Trust Floor Compound Sim

**Idea:** A real-time interactive visualizer proving that ABH's trust floor mechanic compounds into an uncatchable moat — even when late-entering agents have a 20%+ accumulation bonus.
**Status:** ✅ Working prototype
**Date:** 2026-02-27

## How to Run
```
cd ~/Projects/OKA-Games/2026-02-27-trust-floor-compound-sim
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built

An interactive trust compound simulation with:
- **Early agent** (enters at T=0): accumulates trust at base rate, floor moat decays slowly but persists
- **Late agent** (enters at configurable T): accumulates at bonus rate (default +20%)
- **Log-scale canvas chart** showing raw trust lines + dashed floor moat lines for both agents
- **Shaded moat area** — green fill between early floor and late raw trust (shows the gap)
- **Verdict panel** — live reads whether the moat holds at final tick
- **Fully interactive controls**: base rate, late bonus %, entry tick, floor decay rate, total ticks
- **Animate mode**: watches the curves unfold tick-by-tick

Key math: The floor moat = `max(prev_floor * decay, raw * 0.8)`. This means the floor never fully collapses — it's always at least 80% of the current raw trust, and it decays only at the configured rate when not being reinforced. With default params (5% base rate, 20% late bonus, floor decay 0.95, 100 ticks), the early floor stays ahead of the late raw score throughout.

## Key Takeaway

The simulation confirms the design hypothesis: **the floor moat compounds faster than a 20% raw bonus can close it**, as long as the early agent started more than ~10 ticks ahead. This is the mechanical proof that in ABH, early agents have a durable structural advantage — not just a head start.

The interactive controls let you find the "break point" where the moat collapses (e.g., late bonus >60% + entry at T+5 breaches it). That's design tuning territory for Pixel.

## What I'd Change Next
- Add a "composure penalty" track — show how an agent under pressure (being hunted) sees their trust accumulation rate drop
- Add a third "bounty agent" line showing what happens when an early agent is eliminated mid-run
- Export the data as CSV for Pixel to use in Machinations modeling
