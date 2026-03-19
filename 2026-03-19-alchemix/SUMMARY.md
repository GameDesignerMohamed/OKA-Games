# Alchemix

**Idea:** Cozy alchemy discovery game — combine elements to discover all 60, no fail state, pure curiosity engine.
**Status:** Working prototype
**Date:** 2026-03-19

## Market Signal
Scout March 18, 2026 — Google Play Game Trials (trial cliff design) + Playables.ai (mechanic IS the pitch).
Hypothesis: Discovery curiosity loops are the perfect trial cliff mechanic — hook in 30 seconds, sustain for 10+ minutes.

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-19-alchemix
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A Three.js alchemy game with 60 elements across 5 discovery tiers. Click any two elements in the right panel to combine them; new discoveries crystallize from the cauldron with particle bursts and audio feedback. A warm woodland apothecary setting with candle lighting, glowing crystal orbs on a wooden table, and acoustic marimba BGM. Progress saves to localStorage.

## Design Highlights
- **No fail state** — first time in OKA portfolio (cozy loop genre)
- **New visual world** — warm amber/brown woodland (not dark sci-fi)
- **New audio direction** — acoustic marimba, not synth
- **60 elements, 5 tiers** — real depth in a single index.html
- **Trial cliff design** — first combination takes 2 seconds, first surprise in 20 seconds

## Key Takeaway
The discovery curiosity loop IS the mechanic — it validates Scout's signal that "trial window = new demo." The question "what does THIS make?" is an infinite curiosity engine that costs nothing to teach.

## What I'd Change Next
- Add element hover tooltips showing possible combinations ("Hint: combines with 3 known elements")
- Add a "mystery element" shadow in codex showing elements that exist but aren't yet found
- Background particle ambiance (floating motes, dust)
- More tactile cauldron interaction (drag-and-drop instead of click-to-select)
