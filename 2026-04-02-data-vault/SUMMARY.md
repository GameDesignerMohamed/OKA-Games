# Data Vault

**Idea:** Top-down stealth heist — infiltrate Google's server room, steal back your behavioral data blocks, carry the growing chain to the exit alive.
**Status:** Working prototype
**Date:** 2026-04-02
**Build:** #31

## How to Run
```
cd ~/Projects/OKA-Games/2026-04-02-data-vault
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A top-down orthographic stealth game in Three.js where the player (green cylinder) navigates a procedural server room grid. Data blocks (spinning blue cubes) are scattered across the level — each labeled with a real behavioral data type ("SESSION #4: replayed lvl2 × 7", "LOCATION: Cairo, 02:04"). The player grabs blocks with E, building a visible neon chain that physically trails behind them. Guards (red cylinders) patrol with spotlight cones and audio detection; sprinting triggers wider alert radius. Reach the glowing orange EXIT with 5+ blocks to win. Chain shatters on capture — "Data returned to Google." Procedural level generation scales difficulty per level, with more walls and guards. Bloom postprocessing + looping BGM + SFX on every key event.

## Key Takeaway
The ownership signal works as a game mechanic. The labeled data blocks make the player feel genuine stakes — losing the chain reads as "my data is gone again." The sprint mechanic creates meaningful tension: faster but noisier, which maps perfectly to the signal (speed = convenience at cost of privacy). The death screen "DATA RETURNED TO GOOGLE" is the single strongest line in the game.

## What I'd Change Next
- Minimap showing guard positions (reduces frustration of blind guard spawns)
- On-chain display at win screen rendered as a visual ledger, not just badges
- Sound design refinement: guard detection should have a distinct "awareness building" tone before full alert
- Boss vault room at Level 3 with concentrated guards and a "master data block" (your full behavioral profile)
