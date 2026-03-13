# Clearance

**Idea:** Top-down wave survival where your Clearance Level (0→10) gates which mechanics are available — start with just move + pistol, earn Dash, Grenade, Rifle, and Shield through 10 waves of escalating combat.
**Status:** Working prototype
**Date:** 2026-03-13

## How to Run
cd ~/Projects/OKA-Games/2026-03-13-clearance && python3 -m http.server 8080
Then open: http://localhost:8080

## What Was Built
A fully playable Three.js wave survival game testing ARC Raiders' "earned access" thesis. 10 waves, 5 ability unlocks at CL2/CL4/CL6/CL8/CL10, escalating enemy density and speed. Each CL unlock fires with a full-screen ring pulse, chromatic aberration flash, and escalating audio sting. Extraction zone spawns at CL10 at a randomized position. Personal best tracks via localStorage.

## Key Takeaway
Earning a mid-run ability unlock feels genuinely different from having it upfront — the Dash at CL2 after surviving 2 waves with only a pistol hits harder than starting with it would. This validates the earned-access hypothesis at prototype scale.

## What I'd Change Next
- Per-ability upgrade paths (e.g., Dash can be upgraded to triple-dash mid-run)
- Enemy variety: add Shielder (must flank) and Sniper (telegraphs long-range shot)
- Run history screen showing which abilities were unlocked and at which wave
