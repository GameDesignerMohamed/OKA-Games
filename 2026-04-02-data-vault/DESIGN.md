# Data Vault — Game Design Brief
**Pixel | 2026-04-02 | Build #31**

## Genre
Top-down stealth/action heist | Three.js WebGL | Single index.html

---

## 1. Market Signal Tested
Google's "Level Up" locks player behavioral data in Google's infrastructure. This tests: *does showing a player their OWN data chain — visually, physically — create an ownership moment strong enough to drive gameplay motivation?* Win condition = sovereignty. Lose condition = your data stays theirs.

---

## 2. Player Controls
- **WASD** — move player through server room grid
- **Mouse** — aim flashlight cone (stealth detection mechanic)
- **E** — grab a data block when adjacent
- **Shift** — sprint (noise risk, guard alert radius grows)
- **Space** — drop chain segment as decoy (last resort)

---

## 3. Core Game Loop
Infiltrate a procedural server room → locate glowing data blocks (each labeled: "Session #4 — You clicked 'Skip Tutorial'") → grab blocks sequentially to build your chain → the chain trails behind you visually as a linked neon rope → guards patrol; flashlight cone reveals you → reach the exit with your chain intact. **Action → chain grows → tension rises → escape.**

---

## 4. Win / Lose / Progression
- **Win:** Exit with ≥5 data blocks. Chain displays on a mock "wallet" screen post-run.
- **Lose:** Guard catches you → chain shatters, data returns to vault.
- **Progression:** Each run adds one more guard + one more block type (location, purchase, playtime).

---

## 5. Juice / Feel
- Chain physically stretches and bounces behind you — tactile ownership
- Each block pickup: screen flashes your "own" decision text ("You replayed Level 2 — 7 times")
- Escape moment: chain locks into a glowing ring — *that's your ledger, on-chain, yours*
- Guard catch: slow-mo shatter SFX + "Data returned to Google" text

---

## Scope
One night. Single `index.html`. Three.js r168 via importmap. Procedural grid, ~3 guard types, 8 data block labels hardcoded. No backend. Pure client sovereignty fantasy.
