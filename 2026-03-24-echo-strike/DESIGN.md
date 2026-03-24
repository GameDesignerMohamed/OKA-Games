# Echo Strike

**Concept:** A wave arena shooter where a pre-run Combat Memory choice (Frantic / Methodical / Reckless) shapes enemy behavior — your identity IS the narrative, no cutscenes required.

**Player fantasy:** "The way I fight tells the story."

## Core Loop
Pick a Memory → shoot enemies whose behavior mirrors your chosen style → survive 10 waves → end screen attributes the outcome to your Memory ("The FRANTIC memory was correct").

## Key Mechanics
- **Identity-reactive enemies**: Frantic spawns erratic scatter swarms; Methodical forms slow advancing grids with telegraphed shots; Reckless sends 2-3 elite heavy chargers with 1.2s windup telegraphs
- **Memory-adaptive BGM**: tempo + notes change per identity (Frantic 160bpm vs Reckless 100bpm) — subliminal identity reinforcement
- **Authored end-screen**: no text during play, but the end screen attributes the run to your Memory, creating narrative closure from pure mechanics

## What's Built
Three-identity combat system in a single index.html (1,122 lines, Three.js r169). Proves that pre-run identity selection can create genuinely distinct skill demands — not cosmetic variation. Verdict: **CONDITIONAL** — one fix needed: localStorage per-Memory persistence so the identity-comparison thesis can close across runs.
