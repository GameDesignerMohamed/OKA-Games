# Block Slide

**Idea:** Spatial puzzle game — slide colored blocks across a grid into matching target slots, race the clock across 10 escalating levels.
**Status:** Working prototype
**Date:** 2026-03-02

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-02-block-slide
python3 -m http.server 8080
```
Then open: http://localhost:8080

## How to Play
- **Click a block** to select it (white ring appears)
- **Arrow keys** to slide it (glides until it hits a wall or another block)
- **Goal:** Get each block (A, B, C...) onto its matching color target slot
- Timer counts down per level — faster = more score
- 10 levels: 3×3 grid (2 blocks) → 6×6 grid (8 blocks)

## Scoring
- Base: 500 pts per level
- Speed bonus: time_remaining × 10
- Efficiency bonus: under par moves × 50
- High score saved to localStorage

## What Was Built
- 10 handcrafted puzzle levels with escalating grid size and block count
- Smooth ease-out slide animation (120-130ms)
- Ring pulse animation on correct slot match
- Screen shake on wall hit
- Web Audio tones (ding on match, wall thud, level clear fanfare, timer warning)
- Flash overlay on level clear / timeout
- Timer per level (60s → 30s)
- Win/lose states, retry on timeout, game complete screen
- High score persistence via localStorage
- Responsive canvas (fits any screen)

## Key Takeaway
The click-to-select + arrow-key-slide control scheme is natural and satisfying. The "block slides until stopped" mechanic creates emergent puzzle complexity — blocks block each other's paths, requiring order-of-operations thinking. Levels 5-7 (4-block swaps on 4×4/5×5) hit the sweet spot of challenge.

## What I'd Change Next
- Add wall/obstacle tiles within the grid for harder puzzles
- Move counter with par display (par is shown but move count needs color coding)
- Touch/swipe support for mobile
- More levels (20+) with saved progress
- Sound toggle button
