# Block Slide

**Concept:** Spatial puzzle game — slide colored blocks across a grid into matching target slots before the timer runs out.
**Player fantasy:** "I'm the smartest person in the room" — solving a clean, elegant puzzle through spatial reasoning, not reflex.

## Core Loop
Select a block, slide it (it glides until it hits a wall or another block), route all blocks to their color-matched targets. Order of operations matters because blocks block each other — the 4th move often requires the 1st move to have set up a clear path.

## Key Mechanics
- **Slide-until-stopped** — simple control, deep consequences; blocks are both tools and obstacles
- **Time pressure with dual scoring** — speed bonus + efficiency bonus rewards mastery, not just completion
- **Grid scaling** — 3×3 (2 blocks) → 6×6 (8 blocks) across 10 levels, complexity grows from the grid itself

## What's Built
10 handcrafted levels with escalating grid size and block count. Click-to-select + arrow-key-slide controls. Smooth animations, Web Audio feedback (ding on match, wall thud, level fanfare), localStorage high score.
