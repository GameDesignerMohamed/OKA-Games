# Agent Deck

**Idea:** A deckbuilder where each card is an AI tactical command (DEPLOY, OVERLOAD, REROUTE, SCAN, PATCH) — players select and play cards each turn to neutralize cyber threat nodes advancing on their Core across a Three.js 3D grid.

**Status:** Working prototype ✅

**Date:** 2026-03-26

**Build:** #27

---

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-26-agent-deck
python3 -m http.server 8080
```
Open: http://localhost:8080

---

## What Was Built

A turn-based deckbuilder with Three.js 3D grid. Each turn:
- Player draws 5 cards from a 16-card deck (3 Energy/turn)
- DEPLOY (1 mana, 1 dmg), OVERLOAD (2 mana, 2 dmg + AoE), REROUTE (1 mana, push 2 rows back), SCAN (1 mana, peek deck + draw 1), PATCH (1 mana, +1 Core HP)
- Enemy threats are IcosahedronGeometry/DodecahedronGeometry meshes advancing 1 row per End Turn
- Wave 3+: Armored threats (2 HP, DodecahedronGeometry)
- Wave 4+: Linked threats (kill one = partner respawns at row 0)
- Score: survive 7 waves
- Lose: Core HP reaches 0

Visual: Three.js WebGL, animated threat meshes, beam effects on card play, particle bursts on kills, UnrealBloomPass, FogExp2 atmosphere, starfield.
Audio: BGM (triangle oscillator minor arpeggio at 420ms intervals), per-card SFX, wave clear fanfare, damage thuds.

---

## Key Takeaway
Deckbuilder engagement density survives the theme swap from fantasy to AI agent commands. The "which card do I need?" tension maps cleanly to a grid threat game. SCAN + draw creates the satisfying topdeck moment. OVERLOAD chain-clears are the chain-clear equivalent of Slay the Spire's AOE power cards.

---

## What I'd Change Next
- Per-run card drafting (choose 12 from 25-card pool before game starts)
- Card upgrade path (DEPLOY → DEPLOY+ = 2 dmg at cost 1 after 5 uses)
- localStorage best wave per deck configuration
