# Cipher

**Idea:** A puzzle game where you deduce the AI scanner's hidden ruleset by probing it with test packages, then smuggle contraband through the gap you discovered.
**Status:** Working prototype
**Date:** 2026-03-09

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-09-cipher && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A top-down Three.js game where packages travel along a conveyor belt into an AI scanner. The scanner has a hidden rule (one of 12 possible — e.g. "flags RED items", "flags METAL and LARGE items"). Players submit harmless probe packages to observe what gets flagged vs. cleared, deduce the rule, then slip their actual contraband through the gap. 5 levels, each with a new rule drawn randomly. HP costs only on flagged contraband (not probes). Level clear reveals the rule with an "aha moment" screen.

## Key Mechanic
Each package has 3 visible properties: COLOR (red/blue/green/yellow) · SIZE (small/medium/large) · MATERIAL (metal/wood/fabric). The hidden rule operates on these properties. Probing is free — only smuggling costs HP. The inference loop is: observe, hypothesize, test, commit.

## What This Proves
Scout's signal validated: players CAN be rewarded for systematic thinking over reflexes. The "probe without HP cost" design makes inference feel like skilled investigation rather than guessing. The rule reveal at level end provides the "aha" dopamine hit that makes each deduction feel earned.

## Three.js Notes
- BoxGeometry/CylinderGeometry/SphereGeometry per material type
- UnrealBloomPass (strength 1.2) for scanner glow
- Three.js PointLight per package for colored glow
- TorusGeometry scanner arch + PlaneGeometry scan beam sweep
- EffectComposer + ambient particles (THREE.Points)
- Camera lerps toward scanner during scan (G7)

## What I'd Change Next
- Add a deduction helper UI: a matrix showing probe results so players don't need to memorize log
- Compound rules could telegraph their complexity (e.g. visual indicator that the rule has 2 conditions)
- Contraband items that DO trigger the rule as "decoys" — adds a risk/reward layer for experienced players
