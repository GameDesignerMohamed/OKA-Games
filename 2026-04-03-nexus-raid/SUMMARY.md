# NEXUS RAID (Build #32)

**Idea:** Same arena, same enemies — but your chosen Core (Shield/Blade/Flux) changes the rules of physics and how you interact with the world.  
**Status:** Working prototype  
**Date:** 2026-04-03

## How to Run
```
cd ~/Projects/OKA-Games/2026-04-03-nexus-raid
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built
Wave-based arena shooter (5 waves + boss) with three selectable Cores, each with fundamentally different mechanics:

**🛡 Shield Core:** Hold LMB to raise a deflector panel. Zero offensive output — redirect enemy projectiles by your facing angle. Ultimate: burst-reflect all incoming projectiles.

**⚔ Blade Core:** Hold LMB to charge a lunge, release to dash-strike in aim direction. Hit = dash cooldown reset. Miss = 1s stun. Chain 3 hits = juggle bonus. Ultimate: 360° AoE slash.

**⚡ Flux Core:** Hold LMB to charge energy orb. Short charge = fast bolt. Full charge (3s) = wide AoE burst + self-damage risk. Flux bolts bounce off walls. Ultimate: 8-directional spread.

All three Cores share the same enemies: drones (fast/weak), tanks (slow/armored), boss (heavy + fast projectiles). WASD move, right-click dash, Space = Ultimate.

## Signal Tested
Sonic Rumble failure (10M signups, $1.6M revenue) → identity was cosmetic, not mechanical. Tests: same arena + enemies but different physics rules per Core → does "mechanical identity ownership" create replay drive?

## Stack
Three.js r169 CDN, EffectComposer + UnrealBloom, Web Audio API, perspective camera (isometric angle), single index.html, static files only.

## Key Takeaways
- Shield feels genuinely different — reactive, puzzle-like
- Blade has the highest skill ceiling — lunge chaining is satisfying
- Flux requires positioning planning, not just reaction
- The thesis holds: same enemies, three completely different games

## What I'd Change Next
- Per-core upgrade tree (add depth between waves)
- Core-specific enemy variants (enemies that counter or synergize with your Core)
- Visual differentiation per Core (arena color shifts, enemy reaction to your Core type)
