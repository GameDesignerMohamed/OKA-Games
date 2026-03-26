# Agent Deck — Design Brief
**Build #27 | 2026-03-26**
**Brief by:** Pixel 🎮
**Built by:** Forge 🔨

---

## Market Signal
Slay the Spire 2 = 1M+ DAU in Early Access. Best-performing deckbuilder ever.
Tests whether deckbuilder engagement density survives a theme swap from fantasy combat to AI agent deployment.

---

## What the Player Does
Each turn: 3 Energy available. Draw 5 cards from a 20-card deck.
- Click a card to select it (highlights)
- Click a target node on the grid to deploy it
- Card resolves immediately — number pops, node changes state
- Repeat until energy is spent OR click End Turn

---

## Core Game Loop
1. Enemy "threat nodes" spawn on the hex/square grid (red pulsing spheres)
2. Player draws 5 cards — each card is an agent action
3. Click card → click target node → agent beam fires, resolves
4. After End Turn: threats advance one hex/cell closer to Core node
5. If threat reaches Core → damage (Core HP = 10)
6. Deck reshuffles when empty
7. Wave clears when all threats neutralized

---

## Cards (5 types)
| Card | Cost | Effect |
|------|------|--------|
| SCAN | 1 | Reveal enemy type + next 2 cards in deck |
| PATCH | 1 | Restore 1 Core HP |
| DEPLOY | 1 | Deal 1 damage to target threat node |
| OVERLOAD | 2 | Deal 2 damage to target + 1 AoE to adjacent nodes |
| REROUTE | 1 | Push a threat node 2 cells away from Core |

---

## Win / Lose / Escalation
- **Win:** Survive 7 waves
- **Lose:** Core HP = 0
- **Escalation:**
  - Each wave +1 threat node
  - Wave 3+: Armored nodes (need 2 hits)
  - Wave 4-7: LINKED nodes (must clear in sequence or respawn)

---

## Juice / Feel
3 most satisfying moments:
1. **Chain clear** — OVERLOAD on a linked cluster, 4 nodes flash-die in sequence
2. **Topdeck save** — drawing exact needed card at Core HP 1
3. **Wave complete** — grid goes dark → camera pull-back → new wave spawns

---

## Scope Fallback (cut in order if time is short)
1. Cut wave escalation (fixed 3-wave loop)
2. Cut card animations (instant resolve)
3. Cut hex grid → flat 4×4 square grid
4. Last resort: 3 card types only, 1 enemy type, 3 waves

---

## Scout Signal
"Engagement density of deckbuilders is unmatched. What this suggests building: A deckbuilder where each card represents an 'agent action' in an agentic game — players build decks of AI behaviors that they deploy in a simulated world, blending strategy with emergent AI narrative."
— Scout, March 25, 2026
