# Creature Isle

**Concept:** Place terrain, food, and shelter on a floating island to attract and settle wandering creatures who evaluate their environment in real time — each archetype has distinct needs players must decode and fulfill.
**Player fantasy:** Building a home for others, not yourself — a habitat designer whose success is measured by who chooses to stay.

## Core Loop
Observe wandering creature emoji indicators → read their needs (terrain + food + shelter combination) → place tiles to match → creature evaluates for 20 seconds → settles or drifts away → iterate until 10 settled creatures unlock win state.

## Key Mechanics
- **Emoji need broadcast:** Floating icons above each wanderer (💧🐟🕳️ / 🌲🍄🏠 / 🌿🫐🪹) communicate archetype requirements with zero tutorial text. Players decode through observation, not instruction — the game teaches via play.
- **No-punish iteration:** Creatures drift away gently when needs aren't met. No lose state, no timer pressure. The feedback is informational, not punitive — invites experimentation over anxiety.
- **Creature state machine:** Three archetypes (Riverpaw / Spinekin / Featherling) each require a specific terrain + food + shelter combination. Cross-archetype needs don't overlap, so players must manage spatial priority across the 8×8 grid.
- **Music layering:** 4-layer ambient soundtrack unlocks progressively at 0/2/5/8 settled creatures — audio mirrors the island coming alive, giving the player emotional confirmation of progress without UI noise.

## What's Built
Browser prototype (Three.js). 8×8 floating island grid, 3 creature archetypes with distinct 3-part needs, floating emoji needs indicators, no-punish drift mechanic, 4-layer progressive ambient music + 6 SFX events, UnrealBloomPass atmospheric glow, particle burst win state. Core settlement loop is functional — emoji teaching mechanic works in playtest.

## What's Next
- Tile budget per type (limited terrain blocks) — introduces resource decision layer without adding complexity
- Creature personality animations (Riverpaws swim, Featherlings perch) — makes archetypes read differently in motion, not just in needs icons
- Seasons system — different creature cohorts appear across time, extends replayability without new mechanics
