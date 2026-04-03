# NEXUS RAID — Game Design Brief
*Pixel | Game Systems & Web3 Specialist*
*Date: 2026-04-03*

---

## Market Signal Tested
Sonic Rumble: 10M sign-ups, $1.6M revenue — identity was cosmetic, not mechanical. NEXUS RAID tests the inverse: pick a Core and the *rules of physics change for you*. Same arena, three fundamentally different games depending on your choice.

---

## Player Controls
- **WASD** — move in 3D arena (top-down isometric camera)
- **Mouse** — aim direction indicator
- **Left Click / Hold** — Core action (varies per Core — see below)
- **Right Click** — dash/dodge (universal, 2s cooldown)
- **Spacebar** — activate Core Ultimate (once per round, charges via action)

---

## Core Game Loop
Enter arena → enemies spawn in waves → use Core mechanics to survive and clear → Boss spawns at wave 5 → defeat Boss = round win → new arena, harder wave set. Each kill charges the Ultimate meter (top of screen). Feedback: screen-edge flash on damage, kill burst particles, Ultimate meter pulses when full.

---

## Win / Lose / Progression
- **Win:** Clear 5 waves + Boss
- **Lose:** HP reaches 0 — no respawn, round restarts
- **Progression:** Each round survived unlocks a Core Upgrade (passive modifier, chosen from 2 options — no RNG padding)

---

## Juice / Feel
Shield reflects with metallic *clang* + slow-mo flash. Blade hits with screen shake + red vignette. Flux release fires with bass-pulse + shockwave ring. Ultimate triggers camera zoom-out + dramatic freeze-frame (0.3s) before explosion.

---

## Three Nexus Cores (Genuinely Different Mechanics)

### 🛡 Shield Core
Hold LMB to raise a parabolic deflector panel in front of player. Enemy projectiles that hit the panel are *redirected* back at their source — direction depends on the angle you're facing when they hit. Deflecting 3 projectiles in 2 seconds triggers a ricochet burst (Ultimate). Melee enemies stagger on contact with raised shield. *You never fire offensively — you redirect enemy force.*

### ⚔️ Blade Core
LMB charges a lunge — hold to extend range (max 4 tiles), release to dash-strike in aim direction, dealing damage to all enemies in a line. Hitting an enemy mid-lunge resets dash cooldown instantly. Chaining 3 lunges without touching ground = "Air Juggle" bonus damage. Risk: lunge overshoots walls and stuns you 1s if you miss. *Pure aggression — high ceiling, punishing floor.*

### ⚡ Flux Core
Hold LMB to draw energy from surroundings — charge orb grows visibly on player. Release to fire. Short charge = fast narrow bolt. Full charge (3s) = wide AoE plasma burst that damages everything in a 5-tile radius, including you if enemies are close. Bounces off walls once. Ultimate: overcharge (hold 5s) fires a beam that splits on every enemy hit. *Timing and positioning over reaction speed.*

---

## Scope Constraint
One night. Single `index.html`. Three.js r168 via CDN importmap. Static serve only. Three enemies types (drone/tank/boss), one arena, three selectable Cores at start screen. WebGL renderer — no bundler.

---

*Build note from Pixel: Core selection screen first. Lock physics rules per Core before adding enemies.*
