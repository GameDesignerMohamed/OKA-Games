# Rogue Protocol

**Idea:** Turn-based roguelike deckbuilder — you're an AI agent fighting through a corrupted 3-floor network using cards to attack, block, and draw.
**Status:** ✅ Working prototype
**Date:** 2026-03-01

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-01-rogue-protocol
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
A fully playable turn-based deckbuilder. Player has 3 energy/turn and a 13-card deck (STRIKE, HEAVY STRIKE, SHIELD, OVERCLOCK, DATA BURST). Fights through 9 rooms across 3 floors: Brutes, Scramblers (escalating ATK), Sentinels (random block), ending in a CORE NODE boss. Enemy intent shown each turn — telegraphed attacks/blocks. Win screen with score, lose screen with retry.

## Controls
- Click a card once to **select** it
- Click again to **play** it (costs energy)
- Click **[ END TURN ]** to let the enemy act
- Enemy intent badge shows what they'll do next turn

## Key Takeaway
The deckbuilder format proved the Scout signal: high-retention, infinite-replayability with minimal friction. The intent telegraph (seeing enemy's next move) creates real decision-making under pressure — exactly what makes Slay the Spire feel skill-based.

## What I'd Change Next
- Add card rewards after room clears (proper roguelike progression)
- Add more enemy variety and floor-unique encounters
- Persistent run score + leaderboard via localStorage
- Sound: card play whoosh, hit crunch, level-up chime
