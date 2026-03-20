# Sketch Run

**Idea:** An action platformer where everything looks hand-drawn on graph paper — the "made by one human" aesthetic IS the mechanic.
**Status:** Working prototype ✅
**Date:** 2026-03-20
**Build:** #21

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-20-sketch-run
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A 5-room action platformer rendered entirely with THREE.Line geometry on a cream/graph-paper background. The player is a stick figure (8 lines), enemies are triangle outlines (Sketchers) and octagon outlines (Scratchers). All geometry has slight vertex jitter to simulate a pencil-drawn feel.

- **Controls:** WASD/arrows to move + jump, Z/X to attack
- **Enemies:** Sketchers patrol platforms, Scratchers chase the player
- **5 rooms** with escalating enemy mix
- **3 HP** system with invincibility frames + visual blink
- **Pencil slash attack** with line arc + impact particle bursts
- **Web Audio:** Paper rustle ambient, pencil scratch SFX, tonal feedback

## Key Aesthetic Decisions
- Background: #F5F0E8 (cream paper) with light-blue graph grid at 0.28 opacity
- NO bloom, NO emissive, NO dark backgrounds — complete break from 20-build dark sci-fi streak
- THREE.Line geometry with jittered vertices throughout
- Stick-figure player with movement trail
- Death: enemy replaced by X cross-hatch, fades out
- Hit feedback: player blinks during invincibility, background briefly smudges

## Market Signal Tested
Scout March 19 — Tangy TD: "handmade and irregular progress states create higher emotional attachment." Does a game that visually communicates "a human made this" create a different emotional response than polished AAA aesthetics?

## Known Limitations
- Camera horizontal tracking can feel slightly loose on fast movement
- Room transition is instant (no page-turn animation — scoped out for time)
- No persistent score/localStorage
- Scratcher chase AI is simple (direct line, no jumping over obstacles)

## What I'd Change Next
1. Add page-turn room transition animation (THREE.Group rotation tween)
2. Pen-ink progression visual: as player clears rooms, completed rooms get a checkmark sketched in
3. Add a "despair meter" mechanic — the creator's motivation that ticks down (theme-strengthens the signal test)
4. localStorage persistence for run scores
5. More enemy variety: eraser enemy that heals others, pencil-drop obstacle

## Stack
- Three.js r169 via importmap CDN
- THREE.Line + THREE.LineBasicMaterial throughout (no Mesh)
- OrthographicCamera (2D feel)
- Web Audio API (ambient + SFX)
- Single index.html, static only
