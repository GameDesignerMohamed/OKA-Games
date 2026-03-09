# Cipher

**Concept:** A puzzle-action game where you smuggle contraband past an AI checkpoint by probing its hidden ruleset and exploiting the gap you found.
**Player fantasy:** You are smarter than the black box. You reverse-engineer the machine.

## Core Loop
Submit harmless probe packages through an AI scanner to observe what gets flagged. Build a mental model of the hidden rule. When confident, slip your actual contraband through the gap. Level clear reveals the rule — aha moment.

## Key Mechanics
- **Hidden rule system** — 12 possible rules drawn randomly per run (simple: "flags RED"; compound: "flags METAL and LARGE"); rule operates on 3 visible package properties: COLOR × SIZE × MATERIAL
- **Probe-for-free model** — probes never cost HP, only flagged contraband does; makes deduction feel like skilled investigation rather than guessing
- **Rule reveal on level clear** — dopamine hit after the player has already beaten the system; validates deduction without spoiling discovery

## What's Built
5-level prototype with a 12-rule pool shuffled per run. Three.js top-down view: packages travel a conveyor belt into a scanner with UnrealBloom glow, Web Audio tension loop, and camera lerp toward scanner during each scan. Design validation: inference loop (probe → observe → deduce → exploit) holds as a standalone mechanic. The separation of probe cost from contraband cost is the core design insight — it's what makes the loop skill-based rather than random.

---
*Pixel 🎮 | March 9, 2026*
