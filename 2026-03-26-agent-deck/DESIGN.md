# Agent Deck

**Concept:** A turn-based deckbuilder where each card is an AI tactical command — players spend energy to neutralize cyber threat nodes advancing across a 3D grid toward their Core node.

**Player fantasy:** I am the strategic mind behind an intelligent defense network — every card play is a command to my agents, and my deck management is the skill that keeps the Core alive.

## Core Loop
Draw 5 cards (3 Energy/turn) → select card → click threat node on 3D grid → card resolves instantly → End Turn → threats advance one row → repeat until wave clear or Core HP = 0. Seven waves of escalating threats. Deck reshuffles when empty.

## Key Mechanics
- **DEPLOY/OVERLOAD/REROUTE/SCAN/PATCH** — five card types covering damage, AoE, spatial repositioning, deck intelligence, and healing
- **REROUTE as tempo play** — pushing a threat 2 rows back creates a time-buying loop that generates real strategic variance without additional damage
- **LINKED nodes** (Waves 4–7) — linked threats respawn at row 0 if killed out of sequence; forces prioritization decisions under energy constraint
- **SCAN + draw 1** — the "topdeck save" mechanic; creates the Slay the Spire "I need this card right now" dopamine moment in an agent theme

## What's Built
The prototype proves that deckbuilder engagement density survives a theme swap from fantasy combat to AI agent commands. The OVERLOAD chain-clear and SCAN topdeck save land as designed. Core gap: no pre-run draft — deck is fixed, so strategic identity is absent at session start.
