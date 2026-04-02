# Data Vault (Build #31)

**Idea:** Top-down stealth heist where you infiltrate server rooms to steal back your own behavioral data blocks and carry the growing chain out alive.
**Status:** Working prototype
**Date:** 2026-04-02

## How to Run
```
cd ~/Projects/OKA-Games/2026-04-02-data-vault
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Top-down stealth game on a procedural server grid. Player uses WASD to move, mouse to aim flashlight, E to grab data blocks. Each block shows a real-sounding behavioral label ("You clicked 'Skip Tutorial'"). Collected blocks trail behind the player as a neon chain. Guards patrol with sight cones; sprinting increases noise detection. Drop decoys (Space) to distract guards. Reach the exit with 5+ blocks to win.

**The ownership moment:** Win screen displays "YOUR DATA CHAIN — ON-CHAIN" with every block and its decision label. Loss screen shows "DATA RETURNED TO GOOGLE" with the blocks you lost. The loss state is visceral.

**5 Guard types used:** patrol sweep, wide arc, stationary, all with sight-cone detection.

## Stack
Three.js r169 CDN, UnrealBloomPass, Web Audio API (SFX + ambient BGM), single index.html, static files only.

## Key Takeaway
Data ownership is most emotionally charged when you've physically fought to earn it — then watch it shatter. The chain visual makes the "you own this" feeling tangible. The "Data returned to Google" loss state lands harder than expected.

## What I'd Change Next
- Add actual walls/obstacles that force routing decisions
- Per-block reveal timing (chain assembles with a typewriter delay)
- A "share your chain" export feature for the win screen
