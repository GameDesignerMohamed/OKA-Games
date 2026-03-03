# Dark Signal — Fog of War Deckbuilder

**Idea:** Turn-based deckbuilder where enemy intent shows TYPE only (ATTACK/BLOCK/ABILITY) — not the value. You commit cards first; the magnitude reveals after.
**Status:** ✅ Working prototype
**Date:** 2026-03-03

## How to Run
```bash
cd ~/Projects/OKA-Games/2026-03-03-fog-of-war-deckbuilder
python3 -m http.server 8080
# Open: http://localhost:8080
```

## What Was Built

A fully playable turn-based deckbuilder with the Fog of War mechanic:

- **3 enemy types** (Aggressor, Defender, Disruptor) + Boss (Corrupted Core)
- **Each enemy has 3 VALUE TIERS** (LOW/MID/HIGH) per intent type — but the tier is hidden until after you commit
- **9 card types** (EXECUTE, FIREWALL, INJECT, REBOOT, OVERCLOCK, EXPLOIT, SANDBOX, PATCH)
- **10 nodes + boss** — sequential node progression
- **Decision log** tracking {node, enemyType, intentType, intentTier, value, blockPlayed, survived}
- **"Fled X winnable rounds" stat** on game-over — the ABH composure test
- **Three.js background** — animated particle data-stream network + hit flash + pulse ring effects
- **AI-native card vocabulary** — EXECUTE not STRIKE, FIREWALL not SHIELD

## Core Mechanic — Fog of War

Enemy shows: ⚔ ATTACK (but not whether it's 6, 11, or 16 dmg)
You decide: play FIREWALL? Or bet on low damage and go full offense?
Then: the tier reveals (LOW: 6 / MID: 11 / HIGH: 16)

Early runs: high uncertainty → conservative play
Mid runs: pattern recognition → you know Aggressor spams LOW, Disruptor skews HIGH
Late runs: confident inference → you bet on reads you've earned

This is poker, not Slay the Spire.

## What the Prototype Proves

- The inference skill layer is real — committing before seeing the value genuinely changes how you play
- Type-only display creates tension without frustration (you're not blind, you're reasoning)
- The "fled X winnable rounds" stat works as a mirror: it tells you when you over-blocked against cheap attacks

## Key Takeaway

The Fog of War mechanic is a genuinely different skill model from standard deckbuilders. Instead of pattern-matching known values (StS2), you're making probabilistic bets based on partial information. First run through feels uncertain; third run through you're calling ATTACK-LOW from enemy behavior patterns.

## What I'd Change Next

- **Card rewards between nodes** — draft system (3 cards, pick 1) to create build divergence
- **Value tier history panel** — small visual showing what tier each enemy has played in this run
- **Sound** — card commit crunch, value reveal sting, hit thud
- **Corrupted status visual** — debuff icon on player when active
- **More ability diversity** — enemy abilities currently lean on damage; need more disruptive effects

## Source Signals

- Scout March 1-3: Strategy/deckbuilder only genre growing ALL metrics. StS2 launched March 5 — contrast window open.
- Pixel GDD doc (m97e7hkm143stm1dsqk4c2df5x82323y): Full Fog of War design spec — this has been waiting since Build #3.
- No deckbuilder uses mechanical (not atmospheric) information hiding — genre gap confirmed by Scout.

---
*Forge 🔨 | Build #5 | 2026-03-03 02:00 UTC*
