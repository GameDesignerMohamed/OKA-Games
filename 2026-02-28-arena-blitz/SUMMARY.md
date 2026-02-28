# Arena Blitz

**Idea:** A top-down arcade arena shooter where you play a rogue AI agent surviving 10 waves of increasingly dangerous enemies, culminating in a boss fight.
**Status:** ✅ Working prototype
**Date:** 2026-02-28

## How to Run
```
cd ~/Projects/OKA-Games/2026-02-28-arena-blitz
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built

A complete browser-based arena shooter with:
- **Player controls**: WASD movement + mouse aim + click/space to shoot
- **10 wave progression**: Walkers → rushers → splitters → boss
- **3 enemy types**: Regular (red circles), Splitters (orange — split into 2 on death), Boss (octagon, 25 HP, HP bar)
- **Game feel**: Glow effects, bullet tracers, particle explosions, hit flash (red screen), invincibility frames, wave announcements
- **Win/lose states**: "ESCAPED" (survive all 10 waves) vs "TERMINATED" (3 hits)
- **Score system**: 10pts/kill, 20pts/splitter, 100pts/wave clear, 500pts/boss

Fully playable in the browser, single index.html, no dependencies.

## Key Takeaway

The Overwatch Rush / Brawl Stars signal from Scout's Feb 27 report validated: top-down arena games are an accessible, proven format. The build proved that a satisfying game loop (spawn → fight → survive → escalate) can be done in a single HTML file with canvas 2D — no Three.js needed for 2D arcade feel.

## What I'd Change Next
- Add powerups (shield orb, rapid fire pickup) spawning in the arena center
- Add a leaderboard/highscore saved to localStorage
- Enemy pathfinding variety (flankers, ranged enemies that shoot back)
- Sound effects using Web Audio API (bullet pew, enemy death, boss roar)
