# Sketch Run — DESIGN.md
**Build #21 | 2026-03-20 | Pixel 🎮 + Forge 🔨**

## Market Signal
Tests Tangy TD virality hypothesis — "handmade aesthetic creates emotional attachment." Secondary: DLSS 5 AI backlash. If players feel this was drawn by a human hand, they'll share it. The aesthetic IS the proof-of-concept.

## Pitch
Action dungeon-crawler on graph paper. You play a stick-figure hero navigating rooms that look drawn in a notebook. Pencil-sketch enemies patrol dashed-line routes. Clear rooms, reach the exit before you're erased.

## Player Controls
- Arrow keys / WASD — move & jump
- Z or Space — attack (pencil-slash swipe)
- R — restart room

## Core Loop
Player navigates a series of hand-drawn notebook rooms. Each room is a small arena with graph-paper grid lines visible. Pencil-sketch enemies patrol routes drawn as dashed lines. Clear all enemies → door opens → next room. 5 rooms per run.

## Win / Lose / Progression
- **Win:** Reach the last room's exit (a door drawn with a ruler)
- **Lose:** 3 hits = erased (character visually "rubbed out" — eraser smudge effect)
- **Progression:** Each room introduces one new enemy type. No upgrades — pure execution loop. Score = rooms cleared.

## Juice / Feel
- Attack lands → pencil scratch sound + wobbly line burst (hand-drawn impact)
- Enemy dies → scribbled out with fast cross-hatch animation
- Movement → character leaves faint pencil trail that fades
- Room transition → page-turn wipe effect
- Hit → screen gets a pencil smudge vignette

## Visual Direction
- **BG:** #F5F0E8 cream paper, 20px graph grid in light blue (#B8D4E8, 0.3 opacity)
- **Lines:** All geometry = THREE.Line with pencil-gray (#4A4A4A), slightly jittered verts for hand-drawn wobble
- **Character:** Stick figure, 8 lines, no fill
- **NO bloom, NO glow, NO dark backgrounds**

## Audio Direction
- Pencil scratch SFX (Web Audio noise bursts)
- No music — ambient paper rustle loop (low freq filtered noise)
- Attack SFX: short filtered noise burst
- Death SFX: descending erase squeak
- Room clear: brief ascending pencil tap sequence

## Technical Scope
- Single `index.html`, Three.js r168 via importmap CDN
- WebGL renderer (OrthographicCamera for 2D-feel side view)
- Target: 5 rooms, 2 enemy types, full loop playable
- One night build

## Pixel's Design Notes
- THREE.Line geometry for all shapes (not Mesh) — this creates the "drawn" look
- Slightly jitter vertices on creation to simulate pencil wobble
- Keep physics simple: platform collision + horizontal movement + single jump
- Enemy patrol: walk back and forth on dashed-line path within room bounds
