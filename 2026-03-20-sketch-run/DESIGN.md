# Sketch Run

**Concept:** A 5-room action platformer where every pixel is a pencil line on graph paper — the "hand-drawn by one human" aesthetic is the mechanic.
**Player fantasy:** You are a stick figure who fights back against the blank page — fragile, scribbled, but still standing.

## Core Loop
Enter a notebook room → fight pencil-sketch enemies with a pencil-slash attack → clear the room → door opens → next room. Five rooms, no upgrades. Pure execution loop where the visual language (wobble, cross-hatch death, eraser-smudge damage) reinforces the "drawn artifact" identity of the world.

## Key Mechanics
- Pencil slash attack with line-arc + impact particle burst (THREE.Line geometry throughout — no Mesh)
- Vertex jitter on all geometry for hand-drawn wobble (structural, not cosmetic)
- 3 HP + invincibility frames + blink feedback (legible combat rhythm)
- Two enemy types: Sketcher (patrol) + Scratcher (chase)
- Web Audio: paper rustle ambient + pencil scratch SFX (audio reinforces the metaphor)

## What's Built
A complete 5-room action loop that tests whether the "unmistakably human-made" aesthetic creates a different emotional register than polished geometry. The prototype is the full signal test — if someone looks at this and their first reaction is "someone drew this for me," the hypothesis fires.
