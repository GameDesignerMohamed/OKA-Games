# Rule Breaker — DESIGN.md

**Build #30 | 2026-03-30 | Pixel**

## Signal
Does pre-round rule voting create player ownership ("I chose this chaos") strong enough to generate organic sharing — without a single-use card? Proves the Neon Syndicate principle at *session structure* level.

**Source signals:**
- Scout March 29 — Unity/IronSource collapse: UA cost pressure → viral/social loops baked into core loop
- Scout March 29 — Verse8 ($5M, 3.5M MAU): player-authored parameters as core mechanic

## Controls
- WASD — move player sphere around arena
- Mouse aim — auto-turret tracks cursor direction
- Click — shoot projectile
- Survive until timer hits 0

## Core Loop
Vote Screen → Round starts → Dodge enemies + shoot → Timer ends → Score flash → Repeat (3 rounds total)

Hit = screen shake + emissive flash on player. Kill = particle burst on enemy. Round end = score tally overlay.

## Voting Mechanic
Triggers between rounds (after round 1 and round 2). HTML overlay on top of Three.js canvas. Three clickable cards, each showing modifier name + one-line consequence.

**Modifier pool (3 random from 5 presented each vote):**
1. **Gravity Flip** — enemies spawn from above, not sides. Requires repositioning skill, not dodging skill.
2. **Tiny You** — player sphere shrinks 60%. Hitbox tiny, but projectiles also shrink. Requires precision aim.
3. **Slow World** — everything moves at 40% speed. Requires patience/timing skill, not reaction skill.
4. **Mirror Mode** — WASD controls are inverted. Requires rewiring muscle memory.
5. **Turret Only** — player can't move. Auto-aim fires constantly. Requires positioning prediction skill.

## Win/Lose
- Survive all 3 rounds = win
- Health bar = 3 hits
- Die mid-round = lose
- Death screen shows which modifier the player voted for ("You voted for this 💀")

## Juice/Feel
Hero moment: death screen replays which modifier the player voted for — shareable caption writes itself.
BGM: punchy lo-fi loop. SFX: click on vote, whoosh on round start, crunch on hit.

## Scope
Single index.html. Three.js CDN via importmap. AmbientLight + DirectionalLight. Starfield background. All entities THREE.Mesh, animated every frame.
