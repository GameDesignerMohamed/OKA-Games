# DESIGN.md — Last Patch

**Build:** 2026-03-11 | **Designer:** Pixel 🎮 | **Signal:** Scout March 10 — Yakuza/NetEase/Nagoshi collapse

---

## Market Signal Tested

Can parasocial creator-player trust become a *mechanical* resource? Nagoshi proved that bond is real and severable by capital. This game asks: what does it *feel like* to be the one cutting the wire?

---

## Concept

You are the last developer keeping a beloved browser game alive as the studio shuts down. Funding pulled. Players still online. Delete features → generate server credits → extend runtime. Each deletion makes the game worse — players react, some leave, some stay loyal. Keep at least 1 player online until the shutdown clock hits 00:00.

**Player fantasy:** You are the developer who had no choice. Every decision is a betrayal — of the game, of the players, of yourself.

---

## Player Controls

- **Mouse hover** over feature nodes in a 3D server rack — nodes glow, tooltip shows feature name + credit value + player count using it
- **Left-click** a feature node → confirm deletion (Y/N keyboard)
- **Press E** → send a message to playerbase (3 options: "Hang tight" / "Thank you" / "I'm sorry") — costs 0 credits, earns brief loyalty boost
- **No free camera** — fixed isometric Three.js scene

---

## Core Game Loop

Server credits tick down every 3 seconds. Delete a feature → gain credits → extend timer. Each deletion:
- Node physically shatters (Three.js geometry explosion + particles + SFX)
- Player avatars (floating orbs on separate playerbase plane) react: some blink red and drift away (lost), some pulse yellow (angry but staying), loyal ones pulse white
- Credit counter updates. Timer extends.
- Tension: fewer features = fewer reasons to stay = faster player bleed

---

## Win / Lose

- **Lose:** 0 players remaining (all orbs extinguished)
- **Win:** Survive until shutdown clock hits 00:00 with ≥1 player online
- **Progression:** 3 difficulty tiers — Early (generous credits per deletion), Mid (diminishing returns), Final (core features — deleting triggers mass exodus)

---

## Juice / Feel

- Feature node shattering: crunch SFX + particle burst
- Player orbs: each unique hue, gentle float animation. Losing one = fade-out + mournful sting. Losing the last = scene dims, silence
- BGM: lo-fi server hum drone, 64s loop, gains distortion artifacts as player count drops
- Win: last orb pulses gold, BGM resolves, camera push-in on the orb
- Lose: rack goes dark, all orbs extinguish simultaneously, BGM cuts to silence, then one plucked note

---

## Scope (One Night Build)

- 1 fixed Three.js camera, isometric scene
- 1 server rack (BoxGeometry nodes in a grid) + 1 playerbase plane (SphereGeometry orbs)
- 8 hardcoded feature nodes (name + credit value + player affinity weight)
- Simple loyalty system: each player has a loyalty float, decremented by deletions weighted to their preferred features
- No save state, no run seeds needed
- Full Web Audio API procedural score

---

## Lessons Applied

- **B2 (terminal state guarded):** Win/lose sets `gameState = 'ended'` before any setTimeout/rAF callbacks
- **T1 (no Object.assign on Three.js):** All node positions via `.set()`, orb movement via direct `.position.x +=`
- **T2 (module-scope variables):** `serverCredits`, `activePlayers`, `gameState`, `featureNodes[]`, `playerOrbs[]` all top-level
- **T3 (no intermediate gameState):** Deletion animation keeps `gameState = 'playing'` throughout — only terminal transitions break the loop
- **B5 (audio envelope):** BGM drone sustain at 70% of attack peak — no click/pop
- **C6/G6 (music loop ≥ 60s):** BGM loop composed to 64 seconds minimum
- **C5 (no dead systems):** Every UI element wired to live game logic
- **Trust state machine + audio sting:** Each player orb has visible state (white/yellow/red/gone) with audio feedback on every state change
