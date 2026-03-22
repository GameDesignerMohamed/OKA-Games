# IP Draft — Design Brief (Build #23)
**Date:** 2026-03-22 | **Signal:** Scout March 21 — Crimson Desert combat + Balatro IP portfolio

---

## Market Signal Being Tested
Does pre-run card selection (draft agency) increase perceived ownership of outcomes? Players who choose their loadout blame themselves for failure and credit themselves for success — this is the roguelite retention hook. Testing: does draft choice make IP cards feel like *builds*, not luck?

Secondary: Zero inventory friction (Crimson Desert signal) — the draft IS the loadout. No loot drops mid-run.

---

## Player Controls

### Draft Phase
- 6 cards displayed face-up in horizontal row, centered on screen
- Mouse hover: card enlarges (1.2x scale), glows in IP brand color, plays distinct audio sting (1-note per IP)
- Click to SELECT → card slides to "chosen" tray below. Click again to DESELECT
- Must select exactly 3 of 6. START button activates only when tray has 3 cards
- No timer — deliberate choice

### Combat Phase
- WASD/Arrow keys: move player
- Mouse aim + left click: shoot
- Keys 1/2/3: activate IP cards (one-use per wave, 8s effect)

---

## Core Game Loop
`DRAFT → Wave 1 (light) → Score screen → Wave 2 (medium) → Score screen → Wave 3 (heavy) → Final score`

- IP cards reset per wave (1 use each per wave) — creates 3 separate activation decisions
- Wave preview: NONE — gut feel. Mystery is the point.
- Combo bonus: +25% score if 2+ IPs activated within same wave

---

## IP Card Pool (6 cards, pick 3)

| Card | Brand Color | Effect | Duration |
|------|-------------|--------|----------|
| Arcade Dynasty | Gold/Pink | Shots split 3-way spread | 8s |
| Dungeon Lord | Deep Blue | Time slows 40% | 8s |
| Neon Syndicate | Hot Pink | Enemies home toward each other | 8s |
| Media Mogul | Green | 2 random enemies switch sides & fight for player | 8s |
| Retro Lords | Orange | Enemies freeze, shots become grid-locked (high DPS window) | 8s |
| Shadow IP | Purple | Player fires ghost doubles of last 3 shots | 8s |

**Denied synergy pair:** Retro Lords + Shadow IP (freeze + ghost-repeat = absurd DPS — obvious combo but costs Arcade Dynasty or Media Mogul)

---

## Win/Lose
- Win: Survive all 3 waves (HP > 0 at wave 3 end)
- Lose: HP reaches 0
- Score: Kill count × wave multiplier + combo bonus

---

## Juice / Feel — The Draft Moment

"Must feel like a deal with the devil."

- Cards arrive one by one with staggered thunk SFX (0.15s apart)
- Each card pulses with IP brand color aura while idle
- On hover: card scales 1.2x, distinct audio sting
- On select: card SNAPS to tray, screen flashes IP color for 1 frame, locked-in click SFX
- When tray hits 3: chosen cards pulse together — 0.5s "alliance formed" animation
- Unchosen cards dim and fade (denied)

IP Activation in combat:
- Full-screen brief flash in IP color
- Arcade Dynasty = gold scanlines
- Dungeon Lord = cold blue desaturation
- Neon Syndicate = hot pink chaos lines
- Particle bursts on activation

---

## Scope (one-night)
- 6 static card objects — Three.js plane meshes OR HTML overlay
- Combat engine: extend IP Clash Build #22 base
- Combo bonus: flag check (2+ IPs same wave = +25% score)
- No persistent save
- Audio: SFX priority, BGM if time allows

---

*Brief by Pixel 🎮 | Build target: Forge 🔨*
