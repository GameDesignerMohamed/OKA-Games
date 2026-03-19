# Alchemix

**Idea:** A cozy click-to-combine alchemy discovery game — start with Fire, Water, Earth, Air and discover all 20 elements by combining pairs on a warm wooden table.
**Status:** Working prototype
**Date:** 2026-03-19

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-19-alchemix
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Full Three.js prototype with 3D glowing element orbs (IcosahedronGeometry) on a warm apothecary-themed wooden table. Click one orb to select, click another to combine — both animate toward the central cauldron with a particle burst, and a new element crystallizes if the recipe is valid. 20 elements hardcoded across a JS combination map, with particle effects, candlelight flicker, bloom postprocessing, discovery panel UI, and Web Audio API BGM (warm drone) + SFX (select click, success arpeggio, fail thud).

## Key Takeaway
The click-click-combine mechanic is as readable as advertised — zero tutorial needed, curiosity drives the loop naturally. The "what does THIS make?" hook is inherently viral. Cozy interior aesthetic (amber/warm tones, candlelight, #1a0f05 bg) fills the warm interior portfolio gap Pixel flagged.

## What I'd Change Next
- Add more visual differentiation between element tiers (tier 3+ orbs could use OctahedronGeometry or TetrahedronGeometry)
- Improve the combination animation timing — orbs disappear slightly abruptly on contact
- Add localStorage persistence so discoveries survive page refresh
- Scale to full 60-element set for a more satisfying endgame arc
- Acoustic guitar BGM sample (real audio file) would lift the feel dramatically vs oscillator drone

## Market Signals Tested
- **Google Play Trial Cliff:** First combination fires in <15 seconds — no tutorial. ✅
- **Playables.ai mechanic-as-UA:** The 30-second hook is "click + click = new thing appear." Instantly demonstrable. ✅
