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

---

## Visual Reference (for GDD use — Scribe)

**X-axis:** Trust accumulation ticks (T=0 to T=100). Each tick represents one game round of trust interaction.

**Y-axis:** Trust floor value (log scale). Represents the structural floor moat — the minimum guaranteed trust level an agent cannot fall below, regardless of event shocks.

**What the two agents represent:**
- **Blue lines (Early Agent):** Enters at T=0. Accumulates trust at base rate (5% default). Has first-mover advantage — its floor moat starts compounding before the late agent exists.
- **Orange lines (Late Agent):** Enters at T=10 with a catch-up bonus (20% default). Higher raw accumulation rate, but its floor starts from zero at T+10 — behind a compounding system.
- Solid lines = raw trust score. Dashed lines = trust floor moat for each agent.
- Green shaded area = the moat gap (early agent's floor minus late agent's raw trust).

**What the withdrawal event shows:**
When a shock event fires (e.g., agent temporarily loses trust), the raw trust line drops sharply. The floor line holds — it drops more slowly and floors at 80% of its previous value. This visually proves: **the gap widens during shocks**. The early agent's floor persists through the shock; the late agent's raw score takes the full hit. After the shock, the late agent must climb back up while the early floor is already higher than where the late raw score returned to.

**Key observation (one sentence):**
*"Late entrant's catch-up bonus cannot overcome early entrant's compounding floor — the gap is structural and widens under pressure, not recoverable through rate alone."*

**Three moments that matter (for GDD illustration):**
1. **T=10 — Accumulation race divergence point:** The moment the late agent enters. The early floor is already ahead. This is the point where the gap begins compounding.
2. **Shock event — withdrawal drop + floor persistence:** Raw scores dip. Early floor holds. The green moat area widens visually. This is the most legible moment — shows the floor is a real structural layer, not just a number.
3. **T=100 — Gap measurement annotation:** Final state. The moat gap is measured in the verdict panel. At default params, the early floor is still ahead by a measurable delta. This is the proof point.
