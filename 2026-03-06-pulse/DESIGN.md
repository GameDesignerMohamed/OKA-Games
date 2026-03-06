# Pulse

**Concept:** Rhythm bullet-hell where the world pulses to a 100 BPM beat — dodge expanding ring obstacles through gap openings, and shoot on-beat for amplified damage.

**Player fantasy:** You become the beat. Surviving isn't about reaction time — it's about *locking in* to the rhythm until evasion and shooting feel like playing an instrument.

## Core Loop
Position player to align with the ring's gap before each beat fires. Shoot enemies on-beat for 2× cyan pulse damage; off-beat shots fizzle with explicit feedback. Survive 5 escalating waves + a tempo-jumping boss.

## Key Mechanics
- **Beat-sync ring collision** — rings expand outward every beat; a randomized gap arc is the only safe passage. Player must be at the gap *when the beat hits* — spatial navigation becomes a rhythm challenge.
- **On-beat / off-beat shooting** — on-beat: cyan shockwave + 2× damage + SFX reward. Off-beat: fizzle + "OFF BEAT" screen text. Converts combat into active rhythmic participation, not spam.
- **Combo audio layer** — 5× kill streak unlocks a synth layer on top of the procedural music. Mastery has a sound. Losing the combo is audible.
- **Boss tempo jumps** — Boss mid-fight randomly shifts BPM ±10, forcing re-sync under pressure. Tests whether rhythm internalization holds under disruption.
- **Wave BPM escalation** — 100 → 105 → 110 → 115 → 120 → 130 BPM boss. Each wave tightens the beat window, compressing the margin for error.

## What's Built
Prototype proves the core thesis: beat-sync collision + on/off-beat shooting creates a genuinely different feel from standard bullet-hells. The rhythm layer is load-bearing — the game is harder and more satisfying when you're locked in, and punishes you when you're not. The combo synth unlock is the standout moment.
