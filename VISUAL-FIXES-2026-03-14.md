# OKA-Games Visual Bug Fixes — 2026-03-14

## Stray Signal
- **Render loop never started** — `render()` was defined but never called at bootstrap. The 3D canvas was always a black screen. Added `render()` call after `initThree()`.
- Brightened ambient/directional lights, removed fog, reduced bloom, brightened floor and wall material colors.

## Cipher
- Scene was extremely dark — ambient light was `0x101018` at intensity 1.0, fog density 0.06.
- Increased ambient light to `0x334466` at intensity 3.0, directional light from 1.5 to 4.0, added second directional light.
- Reduced fog density from 0.06 to 0.025, lightened background color.
- Reduced bloom strength from 1.2 to 0.6 to stop washing out colors.

## Last Patch
- **Feature nodes invisible** — dark material colors + heavy bloom made all 8 feature boxes look like dark grey blobs. Couldn't read names like "Core Engine" or "Guild Halls".
- Changed node layout from 4x2 grid (back row hidden by camera angle) to 8x1 single row so all features are visible.
- Removed the large enclosing "rack frame" box that was covering the individual feature nodes.
- Added floating label sprites above each box with icons and feature names (sprites always face camera).
- Increased node emissive intensity so boxes glow with their tier color (green/blue/red).
- Reduced bloom from 1.2 to 0.4.
- Widened camera FOV and pulled back to fit all 8 nodes.
- **Replaced static BGM** — old background music used sawtooth oscillators at 60-80Hz which produced harsh buzzing/static noise. Replaced with sine-wave ambient pads and gentle melodic plucks.

## Breach
- **Player spawned inside obstacles** — random obstacle placement could land directly on the player spawn point (0, 3), trapping the player inside a wall with no way to move.
- Added spawn exclusion zone: obstacles now skip positions within 3 units of player spawn.
- Added fallback nudge: if player still spawns inside a wall, tries alternative positions.

## Clearance (fixed in earlier session)
- **Missing importmap** — Three.js addon modules use bare specifier `import from 'three'` which browsers can't resolve without an importmap. Game never loaded.
- **Black screen with HUD** — `document.getElementById('best-score')` returned null because the HTML element had duplicate id attributes (`id="overlay-score" id="best-score"`). Only the first id is recognized. This crashed `init()` before the render loop started.
- Added try/catch fallback for bloom postprocessing.
