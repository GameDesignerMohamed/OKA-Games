# Alchemix

**Concept:** A cozy click-to-combine alchemy discovery game — click two element orbs on a warm apothecary table, watch them fly into a cauldron, and discover what they make.
**Player fantasy:** "I am the alchemist. My knowledge grows with every combination."

## Core Loop
Select an orb → select another orb → both animate into the cauldron → particle burst → new element crystallizes (or a gentle fail puff). No lose state. Pure curiosity engine. "What does THIS make?" is the only question that matters.

## Key Mechanics
- **Click-click-combine:** Two-step selection is as frictionless as tap on mobile; no drag required
- **Discovery counter:** "4 / 20 Discovered" — completion pull without pressure
- **No fail state:** Invalid combos return to grid with a soft puff; player is always experimenting, never punished
- **Hardcoded recipe tree:** 20-element chain (Fire/Water/Earth/Air → 16 derived elements) with one terminal synthesis (Phoenix + Shadow = Eternity)

## What's Built
Prototype demonstrates that click-click-combine fires a recognizable curiosity loop in under 10 seconds with zero tutorial — the "what does THIS make?" hook is self-evident. Warm apothecary interior (candlelight, amber tones, wooden table) fills the first cozy-loop gap in the OKA-Games portfolio.

## Verdict: CONDITIONAL

**What the prototype proved:**
- Click-click-combine is as readable as predicted — first combo fires in <15 seconds with no instruction
- Cozy no-pressure loop is genuinely distinct from all 19 prior OKA builds (first no-fail-state game in catalog)
- Warm apothecary aesthetic lands — candlelight flicker + bloom at 0.4 stays below visual noise threshold

**Primary gap:** No cross-session persistence. Discoveries vanish on page refresh — the "I remember discovering Eternity" moment never compounds. Without localStorage, every session is a fresh slate and the collection fantasy collapses.

**Three conditions for PURSUE:**
1. **localStorage persistence** — discovered elements survive refresh (collection ownership is the core retention hook)
2. **Tier-visual differentiation** — tier 3+ elements should use OctahedronGeometry or TetrahedronGeometry; uniform IcosahedronGeometry flattens the sense of progression
3. **Orb dissolve polish** — extend vanish phase to 0.3s scale-down at cauldron (Forge flagged this; it's a trust signal — abrupt disappearance breaks the magic moment)

**[prototype-ready]:** localStorage persistence + tier geometry swap. Single-session test: does "I left and my discoveries were still there" convert a one-time player into a returner?
