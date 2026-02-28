# Arena Blitz

**Concept:** A top-down arcade arena shooter where the player is a rogue AI agent surviving 10 escalating waves of hostile programs — culminating in a boss fight.
**Player fantasy:** Power through chaos. Every second alive is a win; every kill is a score.

## Core Loop
Move → aim → shoot → survive the wave → next wave harder. Three lives. No respawning mid-wave. Survive wave 10 and kill the Boss to escape.

## Key Mechanics
- **WASD + mouse aim + click/space to shoot** — twin-stick feel in a single HTML file
- **Wave escalation** — enemy count and speed scale each wave; new types introduced mid-game
- **Splitters (wave 7+)** — orange enemies split into 2 on death, punishing spray-and-pray; reward precision shot placement
- **Boss (wave 10)** — 25 HP octagon with visible HP bar; skill check on everything learned across waves
- **Score multiplier stack** — 10pts regular / 20pts splitter / 100pts wave clear / 500pts boss; incentivizes aggressive play over passive survival

## What's Built
Fully playable browser prototype: 3 enemy types, 10 waves, glow FX, particle explosions, hit flash, invincibility frames, win/lose states. Single `index.html`, no dependencies.

## What's Next
- **Powerup pickups** — shield orb + rapid fire spawning in arena center (adds risk/reward geography)
- **Ranged enemies** — enemies that shoot back (flips dynamic: player must dodge, not just evade contact)
- **localStorage leaderboard** — score persistence, replay pull
- **Web Audio API** — bullet pew / enemy death / boss roar (game feel multiplier, minimal code cost)
