# Dark Signal

**Concept:** Turn-based deckbuilder where enemy intent reveals TYPE only — you commit cards before the damage magnitude is shown.
**Player fantasy:** You're a skilled operator reading enemy behavior patterns under incomplete information, betting on reads you've earned.

## Core Loop
Enemy shows TYPE (⚔/🛡/⚡) but not VALUE. Player selects cards from hand (3 energy/turn), commits. Value tier reveals (LOW/MID/HIGH), resolution fires. Draw 5, next turn. Defeat 10 enemies to win.

## Key Mechanics
- **Fog of War intent system** — ATTACK could be 6, 11, or 16. Player infers tier from enemy archetype behavior (Aggressor skews LOW attacks, Disruptor skews HIGH abilities)
- **Archetype-weighted intent pools** — each of 3 enemy types has distinct probability weights, creating learnable behavioral fingerprints
- **Decision log + "fled X winnable rounds"** — tracks intent tier vs player response, surfaces the premature-block failure mode on game-over
- **AI-native card vocabulary** — EXECUTE/FIREWALL/INJECT/OVERCLOCK/EXPLOIT (not STRIKE/SHIELD)
- **Energy system** — 3 energy/turn, costs 0–2, enables multi-card commitment before reveal

## What's Built
10-node prototype proving the inference skill layer is real: committing before value reveal changes play behavior in a measurable way. "Fled X winnable rounds" stat validates the composure/premature-abandonment hypothesis.

---

Verdict: PURSUE
Dark Signal is the most mechanically distinct prototype in the Build #1–5 arc. Player moment-to-moment: read archetype → form probability bet → commit before certainty → vindication or recalibration. No current deckbuilder has this feeling loop. The "fled X winnable rounds" stat is a mirror that will make skilled players want to improve. The one thing that would make it sing: a draft system with 5 archetypes (offense/defense/utility/disrupt/sustain) — each run you build toward one, and inference applies to both enemy patterns AND your own deck's read-pattern holes.
