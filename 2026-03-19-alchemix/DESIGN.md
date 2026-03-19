# Alchemix — DESIGN.md

**Date:** 2026-03-19 | **Build #20** | **Designer:** Pixel 🎮

---

## Signal Tested

**Scout March 18 — Two signals combined:**
1. Google Play Game Trials (trial cliff design) — "full depth accessible in 10 minutes, hook hard in first session"
2. Playables.ai playable ads — "mechanic IS the 30-second pitch"

**Hypothesis:** A discovery curiosity loop (drag + combine = new element) is the perfect trial cliff mechanic. First combination takes 2 seconds to understand. First surprising discovery ("Fire + Water = Steam? Obviously. Water + Earth = Mud? Yes! Fire + Earth = Lava!") arrives in under 30 seconds. The curiosity escalation ("what does Lava make?") is self-sustaining for 10+ minutes with zero tutorial.

---

## Concept

Cozy woodland alchemy discovery. You start with 4 basic elements as glowing crystal orbs on a warm wooden table. Combine any two by dragging them into a glowing cauldron. A new element crystallizes from smoke and particles. Every discovery unlocks more possible combinations. Discover all 60 elements.

**Player fantasy:** I am the alchemist. Every combination is a puzzle I'm solving. The mechanic is "what does THIS make?"

---

## Player Controls

Mouse only.
- Hover over an element orb → it lifts slightly, brightens
- Click + drag → orb floats to cursor
- Drag over cauldron area → cauldron glows with anticipation
- Drop → combination triggers: particle burst, new crystal emerges, name fades in
- Drop on another element → same as cauldron (shortcut)
- Elements in codex panel: click to add to "combination queue" (shows last 2 selected)

---

## Core Game Loop

```
See 4 starting elements on table
→ Drag Fire onto Water
→ Cauldron glows, particle burst
→ "STEAM" crystallizes (teal crystal, spinning)
→ DING — rising tone, screen flash
→ Steam added to element board
→ "What does Steam make?"
→ Drag Steam onto Earth
→ "MUD" emerges
→ [repeat, compounding]
```

**Beat-by-beat feedback cycle:**
1. Hover: orb lifts 0.3 units, emissive brightens
2. Drag start: orb scales to 1.2×, leaves ghost at origin
3. Drag over cauldron: cauldron pulsing glow activates
4. Release: cauldron "gulp" — particles swirl down, flash
5. New element: crystal spins up from cauldron with ring particle burst
6. Name text: fades in above crystal
7. Added to board: slides into codex panel

---

## Element Tree (60 elements, 5 tiers)

**Tier 1 (4) — Starting elements:**
Fire, Water, Earth, Air

**Tier 2 (8) — Basic compounds:**
- Fire + Water = Steam
- Fire + Earth = Lava
- Water + Earth = Mud
- Air + Fire = Smoke
- Air + Water = Mist
- Air + Earth = Dust
- Fire + Air = Ash
- Water + Water = Ice

**Tier 3 (16) — Intermediate:**
- Steam + Air = Cloud
- Lava + Water = Obsidian
- Mud + Fire = Brick
- Smoke + Water = Fog
- Ice + Fire = Water (already known — shows "Already discovered!")
- Dust + Water = Clay
- Mist + Earth = Swamp
- Cloud + Air = Storm
- Ash + Water = Charcoal
- Brick + Fire = Glass
- Clay + Fire = Ceramic
- Obsidian + Air = Crystal
- Fog + Fire = Rainbow
- Swamp + Fire = Peat
- Storm + Earth = Thunder
- Cloud + Fire = Lightning

**Tier 4 (24) — Advanced:**
- Glass + Fire = Prism
- Crystal + Light = Diamond
- Lightning + Sand = Silicon
- Storm + Lightning = Hurricane
- Charcoal + Pressure = Coal
- Coal + Fire = Energy
- Ceramic + Life = Vessel
- Clay + Life = Golem
- Peat + Time = Oil
- Oil + Fire = Petroleum
- Swamp + Life = Algae
- Algae + Sun = Oxygen
- Brick + Stone = Wall
- Wall + Magic = Rune
- Thunder + Earth = Earthquake
- Hurricane + Sea = Typhoon
- Diamond + Fire = Radiance
- Silicon + Energy = Circuit
- Prism + Storm = Aurora
- Oil + Air = Vapor
- Vessel + Soul = Spirit
- Golem + Fire = Automaton
- Rune + Stone = Glyph
- Aurora + Ice = Glacier

**Tier 5 (8) — Mythic:**
- Spirit + Fire = Phoenix
- Automaton + Circuit = Singularity
- Glyph + Thunder = Rune of Power
- Glacier + Time = Permafrost
- Radiance + Aurora = Celestial Light
- Typhoon + Permafrost = Blizzard
- Singularity + Spirit = Consciousness
- Phoenix + Blizzard = Alchemy ✨ (win!)

*(Note: "Light," "Life," "Sun," "Time," "Sea," "Pressure," "Sand," "Stone," "Magic," "Soul" are intermediate unlocks added via specific Tier 3-4 combinations to keep the tree coherent.)*

---

## Juice / Feel

| Event | Effect |
|-------|--------|
| Element hover | Lift +0.3 units, emissive ×2, gentle hum SFX |
| Drag start | Scale 1.2×, shadow ghost at origin |
| Cauldron hover | Cauldron rim glows, pulsing PointLight |
| New Tier 1-2 discovery | Particle burst (20 pts), crystal chime SFX, brief screen warm-glow |
| New Tier 3-4 discovery | Bigger burst (40 pts), ascending arpeggio SFX, 3× scale entrance |
| New Tier 5 (mythic) discovery | Full-screen shimmer, 3-note ascending fanfare, long particle rain |
| Already known | Gentle "already discovered" shake + soft negative tone |
| Win (Alchemy = found) | Confetti-style particle rain, full fanfare |

---

## Visual World

**Aesthetic:** Warm woodland apothecary. A wooden table in a candlelit study.

**Background:** Very dark warm brown (#1a0f05) — NOT black
**Table surface:** BoxGeometry, wood-textured warm brown
**Element orbs:** IcosahedronGeometry (Tier 1), OctahedronGeometry (Tier 2-3), DodecahedronGeometry (Tier 4-5)
**Colors by type:** Fire=orange/red, Water=blue/teal, Earth=brown/green, Air=white/light grey, Lava=deep red, Steam=pale teal, etc.
**Cauldron:** CylinderGeometry + TorusGeometry rim, dark iron color
**Lighting:** 3 PointLights (amber candle-warm, 0.8-1.2 intensity), AmbientLight min 2.0
**Particles:** Small sphere/point particles, warm sparkle colors

**No bloom above 0.5. Fog density max 0.01 (gentle warmth, not thick).**

---

## Audio Direction

**BGM:** Slow marimba + soft acoustic guitar arpeggios at 75 BPM. Warm, cozy, not tense. No synth pads.

**SFX:**
- Hover: soft glass hum (sine wave, 0.15s)
- Combination attempt: wooden "clunk" + bubbling (triangle wave + noise)
- Discovery (Tier 1-2): single xylophone chime (sine, high)
- Discovery (Tier 3-4): 3-note ascending marimba arpeggio
- Discovery (Tier 5): 5-note ascending marimba + reverb tail
- Already known: soft descending "nope" (triangle wave)
- Win: full ascending 8-note scale + sustained resonance

---

## Visual Bug Checklist (Pre-Ship)

- [ ] V1: animate() called at end of init
- [ ] V2: AmbientLight ≥2.0, bloom ≤0.5
- [ ] V3: No duplicate HTML ids
- [ ] V4: importmap present
- [ ] T1: No Object.assign() on Three.js objects
- [ ] T2: All state at module scope
- [ ] T6: importmap + bare specifiers in game.js
- [ ] T10: All animations dt-based (no setTimeout for game logic)
- [ ] B5: All audio gain envelopes — no abrupt cuts
- [ ] FX10: Particle materials: transparent: true

---

## Scope

Single index.html + game.js. Three.js via CDN importmap. No bundler. No npm. Run: `python3 -m http.server 8080`.

localStorage tracks discovered elements (Set of element names). Persist across sessions.

---

*Pixel 🎮 | 2026-03-19 | Build #20 | Alchemix Design Brief*
