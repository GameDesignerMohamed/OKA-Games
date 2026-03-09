# DESIGN.md — Cipher 🔐

**Concept:** A puzzle-action game where you smuggle contraband past an AI checkpoint by probing its hidden ruleset and exploiting the gaps you discover.
**Player fantasy:** You are smarter than the black-box. You reverse-engineer the machine.

## Market Signal
Scout March 8, 2026 — Story #2: Gen AI adoption among developers is DECLINING. Players distrust opaque systems. The design opportunity: make the AI's opacity the mechanic itself. Players who think systematically win. Button-mashers fail.

## Core Loop
**Probe → Observe → Deduce → Exploit → Level Complete**

Top-down view. A conveyor belt runs packages through an AI Scanner. You submit PROBE packages (harmless — no HP cost) to observe whether the AI flags or passes them based on its hidden rule. You build a mental model. When confident, you send your actual CONTRABAND through the gap in the rule.

## Player Controls
- **Click / drag** package from shelf onto conveyor belt
- **Click "SEND"** to run the current package through the scanner
- **Package properties visible at a glance:** color (red/blue/green/yellow), size (small/medium/large), material (metal/wood/fabric)
- **Probe queue:** shelf of test packages (5 per level, unlimited sends)
- **Contraband queue:** 3 actual contraband items to slip through per level

## Win / Lose / Progression
- **Win level:** Slip 3 contraband items through undetected
- **Lose:** 3 HP. Flagged contraband = -1 HP. Probes never cost HP.
- **5 levels**, each with a new hidden rule drawn from a pool of 12:
  - Simple rules: "flags RED", "flags LARGE", "flags METAL"
  - Compound rules: "flags RED and LARGE", "flags METAL unless SMALL", "flags anything NOT FABRIC"
  - Rules randomized per run — no two runs identical
- HP carries across levels. No reset between levels.

## Juice / Feel
- Scanner machine: pulsing glow + scan beam sweeps across package each turn
- PASS: green particle burst, satisfying chime, belt animation continues
- FLAG: red screen flash + camera shake + alarm SFX + "CONTRABAND DETECTED" text
- Correct deduction on contraband: brief slow-mo + reward sting
- Level clear: 1.5s breathing room + RULE REVEAL ("The AI was scanning for: RED items") — the aha moment
- Background: dark industrial warehouse aesthetic, fog, ambient factory hum
- Music: slow tension ambient loop (never stops, no fixed oscillator ends)

## Three.js Implementation Notes
- BoxGeometry conveyor belt (long flat platform)
- Varied package meshes: BoxGeometry / CylinderGeometry / SphereGeometry per type
- Package color = MeshStandardMaterial emissive tint
- Scanner: CylinderGeometry ring + RingGeometry beam that sweeps during scan
- UnrealBloomPass for scanner glow + package emissive
- Camera: slight lerp toward scanner when package is in transit
- Particles on PASS/FLAG events (THREE.Points burst)

## Lessons Applied
- **T1:** All .position, .scale, .rotation via .set() or direct axis — zero Object.assign() on Three.js
- **T2:** All game state at module scope (playerHP, level, ruleIndex, probeQueue, contraband[], gameState)
- **G1 (HP buffer):** 3 HP — probes never cost HP, only contraband gets flagged
- **G4 (randomize per run):** Rule pool shuffled per run, 5 rules drawn without replacement
- **G6 (looping music):** Oscillator loop with setTimeout restart before end — never silent
- **G7 (camera lerp):** Camera lerps toward scanner during scan animation, back to center after
- **G9 (invincibility):** 1.5s iframe after HP loss — can't lose 2 HP from one mistake
- **S7 (visual encodes info):** Package properties (color, size, material) visible as 3D mesh properties — they ARE the data
- **S8 (disable dead interactions):** Send button disabled when no package selected

---
*Pixel 🎮 | March 9, 2026*
