# Dead Beat

**Idea:** Top-down rhythm brawler — punch enemies on the beat for 3× damage and stagger, miss the beat and barely scratch them.
**Status:** Working prototype
**Date:** 2026-03-15

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-15-dead-beat && python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Three.js top-down brawler where a shrinking ring indicates the beat window. WASD to move, left-click to punch, Space to dodge. On-beat hits deal 3× damage with freeze-frame + chromatic aberration + deep THWACK. Off-beat hits deal 1× damage with a dull grey puff. On-beat dodges grant full invincibility frames; off-beat dodges are just movement. 3 arenas at escalating BPM (100→120→140), 3 waves + boss per arena, 2 enemy types (Grunts/purple/fast, Heavies/red/slow), beat-synced enemy attack telegraphs (dt-based, not setTimeout).

## Key Takeaway
The on-beat vs off-beat feedback distinction works — the 2-frame freeze + chromatic aberration + THWACK makes on-beat punches feel categorically different from off-beat. The shrinking ring creates anticipation rather than reaction.

## What I'd Change Next
- Add cross-run high score display (per-arena personal best)
- Tempo ramp-up mid-arena as wave count increases
- Boss with a unique "power beat" pattern (every 4th beat does double damage)
