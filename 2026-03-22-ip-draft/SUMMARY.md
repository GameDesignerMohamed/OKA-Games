# IP Draft

**Idea:** Can IP portfolio SELECTION before a run create its own anticipation loop, independent of in-run card activation?
**Status:** Working prototype
**Date:** 2026-03-22
**Build:** #23

## How to Run
```
cd ~/Projects/OKA-Games/2026-03-22-ip-draft
python3 -m http.server 8080
```
Then open: http://localhost:8080

## What Was Built

A fully playable Three.js arena shooter with a 5-card draft phase. Players browse 6 IP cards (Arcade Dynasty, Dungeon Lord, Neon Syndicate, Media Mogul, Retro Lords, Shadow IP) and select exactly 3 before wave 1 begins. Each selection plays a distinct audio sting; on the 3rd selection, a triumph chord fires and the unchosen cards dim ("you denied them — they know"). Then combat: 3 escalating waves, 1-use IP card activations per wave via [1][2][3] keys, wave clear screens, combo bonus for 2+ IPs in one wave.

**IP Cards in the pool:**
- Arcade Dynasty: 3-way shot spread
- Dungeon Lord: 40% time slow
- Neon Syndicate: enemies home toward each other
- Media Mogul: 2 enemies switch sides
- Retro Lords: enemies freeze, 3× damage window
- Shadow IP: ghost-fires last 3 shot directions

**Denied synergy pair:** Retro Lords + Shadow IP (obvious DPS combo — forces a sacrifice decision)

## Key Takeaway

The draft UI delivers the core thesis: **selection feels intentional, not mechanical.** Cards arrive with staggered "thunk" audio, hover triggers scale + audio sting, selection snaps to tray, unchosen cards dim out. The 3-selection triumph chord is satisfying. The Balatro parallel holds — you leave the draft feeling you've made a build decision, not picked powerups.

What's uncertain until play-tested: whether the wave structure (no preview) creates appropriate gut-feel tension or just random frustration.

## What I'd Change Next
1. Wave preview (light/medium/heavy indicator) before draft — lets players theorize about the right card combo
2. Card synergy hints: tooltip showing which card pairs well with which
3. Post-run stats showing which IP card caused the most kills
4. 9-card pool for richer draft decisions (current 6-pick-3 has limited decision trees)
