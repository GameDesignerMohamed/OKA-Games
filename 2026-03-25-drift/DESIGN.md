# Drift

**Concept:** A top-down arena shooter where your AI partner has genuine behavioral agency — its own HP, stress states, independent pathfinding, and a death that costs you.
**Player fantasy:** You and Drift are co-pilots under siege. Keeping Drift alive makes you feel like you're protecting someone, not just managing a resource.

## Core Loop
Survive escalating enemy waves in a bounded arena. Enemies split targeting between you and Drift (40/60 split). Drift's stress level (0–100) shapes its behavior in real time: aggressive flanker at low stress, erratic defender at mid stress, retreating survivor at high stress. Score = waves survived × Drift HP remaining — protecting Drift is the win condition, not just your own survival.

## Key Mechanics
- **Stress state machine** — three distinct behavioral modes (calm/tense/panic) driven by enemy proximity + HP loss; player mode commands (AGGRESSIVE/DEFENSIVE/RETREAT) shift the stress bias
- **Split targeting** — 40% of enemies track Drift specifically; you cannot just kite and ignore it
- **Partner death penalty** — Drift death desaturates the scene, drops score multiplier, and triggers a distinctive SFX sequence; you feel the loss, not just see a number change

## What's Built
Three.js top-down arena shooter, single `index.html` + `game.js`, CDN importmap, no bundler. Drift has full stress state machine with per-state movement speed, pathfinding targets, shoot rate, and visual feedback (scale pulse, ring rotation speed, light color shift). 10 waves, enemy aggression escalates from wave 4 (shooting enemies added). Score formula is correctly weighted — the Drift HP multiplier creates genuine tension on every wave clear.

## Systems Analysis

### Does the AI companion feel like a partner or a tool?
**Partner — confirmed.** The combination of three elements makes this land:
1. Drift has a *name* (nameplate always visible) and its own light color (distinct pink vs player cyan)
2. Drift targets independently — it's making decisions you didn't make
3. Drift can die — and the scene desaturation communicates loss atmospherically, not just numerically

A tool doesn't have a panic state. Drift's stress wobble + light color shift to red when critical creates genuine "it's scared" reading without any dialogue.

### Does the stress system create meaningful behavioral variance?
**Yes, with one structural gap.** The three-state behavioral outputs are genuinely distinct:
- **Calm (0–40):** Drift flanks the nearest enemy from a perpendicular angle — it's doing positioning work the player isn't doing
- **Tense (40–70):** Erratic orbit around player, shoot rate drops to 0.9s intervals — it's covering the player, not hunting
- **Panic (70–100):** Retreats behind player toward centroid away from enemies, shoot rate drops to 2.5s, wobble fires — it's surviving, not fighting

The *gap*: the stress calculation weights HP loss at `(1 - hpFrac) * 55` — so a Drift at 50% HP has base stress of 27.5 before any enemy proximity. In practice this means Drift rarely fully recovers to calm state after mid-game. The stress bar is visible to the player, but the *reason* for stress level isn't — player can't distinguish "Drift stressed because enemies are close" from "Drift stressed because it's damaged." This matters for command strategy.

### Does the score weighting correctly incentivize protection?
**Yes — the incentive is correctly shaped.** Score = waves × Drift HP creates a compound incentive (later waves are worth more when Drift is healthy). Critically, *losing Drift doesn't end the game* — it creates a different game state. The desat visual + score penalty + acoustic shift make this feel like a real consequence without forcing a restart. This is the right design call: Drift death = penalty state, not game over.

### What's working
- The behavioral state transitions are visually legible — you can read Drift's stress from the ring rotation speed and light color without checking the HUD
- 40% enemy targeting split creates genuine "split attention" pressure — late waves require real decision-making about mode commands
- The AGGRESSIVE/DEFENSIVE/RETREAT command affecting stress bias is elegant — it's not direct control, it's influence, which preserves the "partner" feeling

### What's missing (the one gap)
**Drift needs one word of status communication.** The prototype has a `driftStatus` HUD element already wired — it shows "ONLINE / TENSE / PANIC / OFFLINE." But Drift has no *in-world* voice. A floating status readout above the nameplate (1-2 word, situational — "FLANKING", "COVERING", "CRITICAL") would close the gap between Drift's behavior and the player's ability to coordinate. Right now you can *see* what Drift is doing but can't anticipate it. One word of intent — "FLANKING" when calm and targeting an enemy — turns observation into coordination.

## Verdict
**CONDITIONAL**

The core thesis — that an AI with genuine behavioral agency creates an "playing with someone" emotional texture — is proved. The stress state machine does real design work: Drift panicking and retreating is visually, acoustically, and behaviorally distinct from Drift flanking aggressively, and the split targeting means you're actually tracking two entities with competing needs. The score weighting correctly compounds the protection incentive. The one structural gap: Drift has no situational voice — it behaves differently across states but can't signal intent, so player commands feel reactive rather than coordinative.

**The one thing that would make it sing:** Add 1-2 word floating status text above Drift's nameplate (`"FLANKING"` / `"COVERING"` / `"RETREATING"` / `"CRITICAL"`) tied to current behavior state. This transforms Drift from an entity you watch into an entity you can *talk to strategy with* — the difference between a partner and a silent ally.
