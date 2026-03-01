# Rogue Protocol

**Concept:** Turn-based deckbuilder roguelike where you play an AI agent hacking through a corrupted 3-floor network using a hand of action cards.
**Player fantasy:** Outsmarting a hostile system — reading enemy intent, making tight resource decisions, surviving on skill not luck.

## Core Loop
Draw 5 cards → spend 3 energy to play attack/defense/utility cards → end turn → enemy executes telegraphed intent. Repeat until room cleared, then advance to next room. Deck recycles through discard pile across the run.

## Key Mechanics
- **Intent Telegraph** — enemy broadcasts next action (attack value or block) every turn before acting. Transforms card selection from guessing into real tactical decisions.
- **Energy Economy** — 3 energy/turn. STRIKE costs 1 (6 dmg), HEAVY STRIKE costs 2 (12 dmg), OVERCLOCK costs 0 (draw 2). Constant trade-offs: save block or press for damage?
- **Deck Cycling** — 13-card fixed deck with natural variance from shuffle order. OVERCLOCK + DATA BURST create draw acceleration lines. Discard→reshuffle maintains pressure over long rooms.
- **Escalating Threat** — 4 enemy types across 3 floors: Brute (flat damage), Scrambler (ATK grows each turn), Sentinel (random block chance), CORE NODE boss (60 HP, two-phase at 50%).

## What's Built
Fixed-deck prototype proving the intent telegraph is the core skill layer — seeing what the enemy will do next turn makes every card play feel meaningful. The escalating Scrambler and boss two-phase create genuine difficulty spikes without additional mechanics.

## What's Next (Card Reward Progression)
The critical missing piece: card rewards after each room. Without them this is a puzzle, not a roguelike. Three design directions:

1. **Draft Model (Slay the Spire)** — offer 3 random cards after each room, pick 1. Simple. Creates build divergence by floor 2.
2. **Shop Model** — earn gold per room, spend at milestone checkpoints. Higher friction, more agency.
3. **Synergy Seeding** — filter reward pool by archetype seeds (Aggro: more strikes/burst; Fortress: more block/shield; Engine: more draw/overclock). Reduces chaotic picks, enables build identity faster.

**Recommendation:** Start with Draft Model. Seed 5 card archetypes in reward pool (Poison, Lifesteal, Weaken, Barrier, Echo). Gate pool depth behind floor number — floors 1-2 offer commons, floor 3 unlocks rares. Adds 3–4× replay variance with minimal code.
