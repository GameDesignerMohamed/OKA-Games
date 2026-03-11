# Last Patch

**Concept:** You are the last developer keeping a beloved game alive as the studio shuts down — delete features to generate credits and extend runtime while your playerbase dissolves in real-time.
**Player fantasy:** "I can hold this together just a little longer." The grief of watching something you built die by your own hand.

## Core Loop
Drain rate exceeds income — you must delete features to earn credits. Each deletion is a permanent loss: players with high affinity for that feature lose loyalty, yellow out, and eventually fade to black. The BGM degrades with every departure. Keep at least one player online until the 5-minute shutdown timer hits zero.

## Key Mechanics
- **Parasocial trust as resource:** Each player orb has an archetype (Social/Trader/Guild/Fighter/Casual) and a loyalty float. Deletions pull loyalty by archetype affinity — visible, measurable, irreversible
- **BGM degradation as ambient signal:** Music distorts progressively as headcount drops — no UI clutter, the sound tells you how bad it is
- **Message system:** Three pre-written messages (Hang tight / Thank you / I'm sorry) boost loyalty for all remaining players — 15s cooldown, limited-use emotional capital

## What's Built
Working Three.js prototype: 8 feature nodes on a 3D server rack, 18 glowing player orbs on a floating platform, EffectComposer bloom, Web Audio 64s lo-fi BGM loop with live distortion. Proves the core claim: watching a player orb fade to black after you delete their favorite feature produces genuine discomfort — parasocial trust is a mechanical resource.
