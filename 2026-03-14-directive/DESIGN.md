# Directive

**Concept:** Agentic RTS where you're the AI director — you assign goals to 4 autonomous sub-agents (Scout/Builder/Fighter/Medic), they execute autonomously, and you read their failures to reassign.

**Player fantasy:** You're the commander in an agentic pipeline. You don't fight — you think. Your agents are capable but bounded; the game is about reading the situation and routing intent, not reflexes.

## Core Loop
Select agent → click goal (move/attack/support) → watch execution → read failure signals (rejection bubbles, death) → reassign. Agent types auto-behave when idle (Scout auto-engages, Medic auto-heals lowest HP ally), so the player's job is *course correction*, not micromanagement. Wave pressure forces increasingly fast triage across 7 escalating enemy compositions.

## Key Mechanics
- **Click-to-assign goal system** — select agent, click target; agents execute autonomously between commands
- **Role specialization with hard rejection** — Builder can't attack ("NOT MY JOB"), Medic can't attack ("HEAL ONLY"), invalid placements return context-appropriate rejections ("TOO CLOSE", "OUT OF BOUNDS")
- **Autonomous idle behavior** — Scout/Fighter auto-engage nearby enemies, Medic auto-heals lowest HP ally; player isn't babysitting, just redirecting
- **Telegraph rings** — 0.8s visual warning before every enemy attack; readable skill floor, no cheap deaths
- **Wave-gated ability unlocks** — Scout Reveal (W2), Builder Turret (W3), Fighter Taunt (W5), Medic Burst (W6); each ability answers the problem introduced by the prior wave composition

## What's Built
Prototype proves the core loop works: select-assign-watch *does* feel like direction, not delayed mouse control, because agents act intelligently in the gaps. Rejection bubbles are the highlight — they're the clearest expression of agent specialization in any OKA-Games build to date.

## What's Next (if pursued)
- Per-agent "situation report" HUD — what is each agent autonomously doing right now? This is the missing information layer that would sharpen the director fantasy
- Builder wall/barrier placement (not just turrets) — opens positional strategy layer
- Enemy type that specifically counters one agent role (a "Jammer" that disables Scout auto-attack) — forces reactive role-routing under pressure
- Run-end stat screen: goals assigned per agent, rejections fired, autonomous actions taken — reveals the player's own decision fingerprint
