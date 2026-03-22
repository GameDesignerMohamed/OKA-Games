# IP Draft (Build #23)

**Concept:** Pre-run IP portfolio selection — draft 3 cards from 6, then fight 3 waves using those IPs as one-shot abilities.
**Player fantasy:** "I built this loadout. This loss is on me. Let me pick again."

## Core Loop
Draft phase → choose 3 of 6 IP cards (no timer, deliberate) → 3 escalating combat waves using those cards as 1-use activations → lose = return to DRAFT (not retry combat) → rethink and re-pick.

## Key Mechanics
- Draft selection with staggered audio cues + snap-to-tray feedback; unchosen cards dim ("they know")
- 1-use IP activations per wave, reset between waves — +25% score bonus for using 2+ IPs same wave
- Denied synergy pair: Retro Lords + Shadow IP (freeze + ghost-repeat = dominant DPS, forces sacrifice decision)
- Lose state returns to DRAFT: attribution of failure routes back to the pre-run decision

## What's Built
Draft UI fully functional (hover scale, pitch-per-card, triumph chord on 3rd pick). 6 cards with distinct mechanical identities. Combat is a standard arena shooter on Build #22 base. The denied synergy pair creates a real pre-run tension.

## Verdict
**CONDITIONAL**

The draft moment works — selection feels intentional, the unchosen-card-dim creates genuine regret feedback, and the Retro Lords + Shadow IP sacrifice decision lands. The core thesis (pre-run selection creates ownership of outcomes) is proved at the prototype level.

**Primary gap:** No post-run IP stat readout. The end screen shows which IPs were deployed vs. denied but not which IP caused the most kills. Without that readout, players can't close the feedback loop on *whether their draft decision was correct* — which is the entire retention mechanic. The ownership feeling dies at the end screen.

**The one thing:** Per-IP kill counter on the end screen (e.g., "Retro Lords: 8 kills, Dungeon Lord: 4 kills") closes the draft → combat → verdict loop and makes the DRAFT decision feel consequential across runs.

**Secondary gap:** 6-card pool is too narrow. C(6,3) = 20 possible hands — players find the dominant picks fast. 9-card pool (C(9,3) = 84 hands) extends the discovery arc across sessions. This is the cross-run mastery loop OKA-Games has been missing since Build #5.
