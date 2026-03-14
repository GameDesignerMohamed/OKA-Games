import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ─── MODULE SCOPE VARIABLES ──────────────────────────────────────────────────
let scene, camera, renderer, composer, useComposer = false;
let raycaster, mouse;
let clock, dt, timeScale = 1;

// Game state
let gameState = "start"; // start | build | wave | win | lose
let currentWave = 0;
let waveTimer = 0;
let buildTimer = 0;
const BUILD_PHASE_DURATION = 5;
const WAVE_AUTO_START = 3;

// Entities
let agents = [];
let enemies = [];
let bullets = [];
let particles = [];
let telegraphs = [];
let selectionRing = null;
let selectedAgent = null;
let groundPlane = null;
let coreObject = null;
let coreHP = 3;
const CORE_MAX_HP = 3;

// Camera shake
let cameraShake = 0;

// HUD elements (cached)
let elWaveNum, elPhase, elCoreHpVal, elSelectionInfo, elAbilityPanel;
let elUnlockFlash, elOverlay, elOverlayTitle, elOverlaySub;
let elStartOverlay, elStartBtn, elStartPrompt;
let hpFills = [];
let agentCards = [];

// Audio
let audioCtx = null;
let bgmNodes = [];
let bgmTimeout = null;
let bgmWave3Playing = false;
let bgmWave5Playing = false;

// Wave definitions
const WAVE_DEFS = [
  { grunts: 4, rushers: 0, tanks: 0, unlock: "SCOUT: Fog Reveal (passive)" },
  { grunts: 6, rushers: 0, tanks: 0, unlock: "BUILDER: Reinforce Wall" },
  { grunts: 6, rushers: 2, tanks: 0, unlock: "FIGHTER: Taunt Enemies" },
  { grunts: 4, rushers: 4, tanks: 0, unlock: "MEDIC: AoE Heal Pulse" },
  { grunts: 6, rushers: 4, tanks: 1, unlock: null },
  { grunts: 4, rushers: 6, tanks: 2, unlock: null },
  { grunts: 4, rushers: 8, tanks: 3, unlock: null }
];

// Agent definitions
const AGENT_DEFS = [
  { name: "SCOUT",   color: 0x00ffff, speed: 4.0, hp: 3, dmgType: "ranged", dmg: 1, cdMax: 1.5, range: 3.0, idx: 0, startPos: [-3, 0, -3] },
  { name: "BUILDER", color: 0xffcc00, speed: 2.0, hp: 3, dmgType: "melee",  dmg: 1, cdMax: 2.0, range: 0.8, idx: 1, startPos: [3, 0, -3] },
  { name: "FIGHTER", color: 0xff4400, speed: 2.5, hp: 3, dmgType: "melee",  dmg: 2, cdMax: 1.0, range: 0.8, idx: 2, startPos: [-3, 0, 3] },
  { name: "MEDIC",   color: 0x00ff88, speed: 1.8, hp: 3, dmgType: "heal",   dmg: 0, cdMax: 2.0, range: 2.0, idx: 3, startPos: [3, 0, 3] }
];

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.04);
  scene.background = new THREE.Color(0x050510);

  // Camera (orthographic top-down)
  const aspect = window.innerWidth / window.innerHeight;
  const zoom = 18;
  camera = new THREE.OrthographicCamera(
    -zoom * aspect, zoom * aspect, zoom, -zoom, 0.1, 200
  );
  camera.position.set(0, 20, 8);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Postprocessing
  try {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85
    );
    composer.addPass(bloom);
    useComposer = true;
  } catch (e) {
    console.warn("Bloom failed, using direct render:", e);
    useComposer = false;
  }

  // Lighting
  const ambient = new THREE.AmbientLight(0x334455, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Clock
  clock = new THREE.Clock();

  // Ground plane (invisible, for raycasting)
  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x0a0a18, transparent: true, opacity: 0.8 });
  groundPlane = new THREE.Mesh(groundGeo, groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.05;
  groundPlane.receiveShadow = true;
  groundPlane.userData.isGround = true;
  scene.add(groundPlane);

  // Grid
  const grid = new THREE.GridHelper(24, 24, 0x112233, 0x0a1020);
  grid.position.y = -0.04;
  scene.add(grid);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 600; i++) {
    starVerts.push(
      (Math.random() - 0.5) * 40,
      Math.random() * 8 + 0.5,
      (Math.random() - 0.5) * 40
    );
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 }));
  scene.add(stars);

  // Boundary walls (visual)
  buildMap();

  // Core
  buildCore();

  // Selection ring
  const ringGeo = new THREE.RingGeometry(0.55, 0.7, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff44, side: THREE.DoubleSide });
  selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.02;
  selectionRing.visible = false;
  scene.add(selectionRing);

  // HUD refs
  elWaveNum = document.getElementById("wave-num");
  elPhase = document.getElementById("phase-display");
  elCoreHpVal = document.getElementById("core-hp-val");
  elSelectionInfo = document.getElementById("selection-info");
  elAbilityPanel = document.getElementById("ability-panel");
  elUnlockFlash = document.getElementById("unlock-flash");
  elOverlay = document.getElementById("overlay");
  elOverlayTitle = document.getElementById("overlay-title");
  elOverlaySub = document.getElementById("overlay-sub");
  elStartOverlay = document.getElementById("start-overlay");
  elStartBtn = document.getElementById("start-btn");
  elStartPrompt = document.getElementById("start-prompt");
  for (let i = 0; i < 4; i++) {
    hpFills.push(document.getElementById("hp-fill-" + i));
    agentCards.push(document.getElementById("card-" + i));
  }

  // Events
  elStartBtn.addEventListener("click", startGame);
  document.getElementById("overlay-btn").addEventListener("click", restartGame);
  renderer.domElement.addEventListener("click", onCanvasClick);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  animate();
}

function buildMap() {
  // Boundary walls (visual only, not collision)
  const wallPositions = [
    [-5, 0.5, -5], [5, 0.5, -5], [-5, 0.5, 5], [5, 0.5, 5]
  ];
  wallPositions.forEach(pos => {
    const wallGeo = new THREE.BoxGeometry(0.4, 1, 4);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(pos[0], pos[1], pos[2]);
    wall.castShadow = true;
    wall.userData.isWall = true;
    scene.add(wall);
  });
  // Arena boundary (visual)
  const edges = [
    { pos: [0, 0.3, -12], rot: [0, 0, 0], size: [24, 0.6, 0.3] },
    { pos: [0, 0.3, 12], rot: [0, 0, 0], size: [24, 0.6, 0.3] },
    { pos: [-12, 0.3, 0], rot: [0, 0, 0], size: [0.3, 0.6, 24] },
    { pos: [12, 0.3, 0], rot: [0, 0, 0], size: [0.3, 0.6, 24] }
  ];
  edges.forEach(e => {
    const geo = new THREE.BoxGeometry(e.size[0], e.size[1], e.size[2]);
    const mat = new THREE.MeshLambertMaterial({ color: 0x113355, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(e.pos[0], e.pos[1], e.pos[2]);
    scene.add(mesh);
  });
}

function buildCore() {
  const geo = new THREE.BoxGeometry(2, 0.8, 2);
  const mat = new THREE.MeshLambertMaterial({ color: 0x2244bb, emissive: 0x112266, emissiveIntensity: 0.5 });
  coreObject = new THREE.Mesh(geo, mat);
  coreObject.position.set(0, 0.4, 0);
  coreObject.castShadow = true;
  coreObject.userData.isCore = true;
  coreHP = CORE_MAX_HP;
  scene.add(coreObject);
  // Core glow
  const coreLight = new THREE.PointLight(0x2244ff, 1.5, 4);
  coreLight.position.set(0, 1, 0);
  coreObject.add(coreLight);
}

function spawnAgents() {
  // Remove old agents
  agents.forEach(a => {
    if (a.mesh) scene.remove(a.mesh);
    if (a.hpBarBg) scene.remove(a.hpBarBg);
    if (a.hpBarFill) scene.remove(a.hpBarFill);
  });
  agents = [];

  AGENT_DEFS.forEach(def => {
    let geo;
    if (def.idx === 0) geo = new THREE.CapsuleGeometry(0.22, 0.55, 4, 8);
    else if (def.idx === 1) geo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    else if (def.idx === 2) geo = new THREE.OctahedronGeometry(0.4);
    else geo = new THREE.ConeGeometry(0.3, 0.7, 6);

    const mat = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.startPos[0], 0.5, def.startPos[2]);
    mesh.castShadow = true;
    mesh.userData.agentIdx = def.idx;
    scene.add(mesh);

    // HP bar background
    const hpBgGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    scene.add(hpBg);

    // HP bar fill
    const hpFillGeo = new THREE.PlaneGeometry(1.0, 0.10);
    const hpFillMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, side: THREE.DoubleSide });
    const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
    scene.add(hpFill);

    // Point light on agent
    const light = new THREE.PointLight(def.color, 0.8, 2.5);
    mesh.add(light);
    light.position.set(0, 0, 0);

    agents.push({
      def, mesh, hpBarBg: hpBg, hpBarFill: hpFill,
      hp: def.hp, maxHp: def.hp,
      goal: null, // { type: "move"|"attack"|"support", target }
      attackCd: 0,
      abilityCd: 0,
      invincibleTimer: 0,
      tauntTimer: 0, // active taunt duration
      alive: true,
      dead: false,
      deadTimer: 0,
      speed: def.speed,
      vx: 0, vz: 0
    });
  });
}

// ─── WAVE MANAGEMENT ─────────────────────────────────────────────────────────
function startGame() {
  elStartOverlay.style.display = "none";
  initAudio();
  spawnAgents();
  gameState = "build";
  currentWave = 0;
  coreHP = CORE_MAX_HP;
  updateHUD();
  playBGM();
}

function restartGame() {
  elOverlay.classList.remove("show");
  // Clean up enemies
  enemies.forEach(e => { if (e.mesh) scene.remove(e.mesh); if (e.telegraph) scene.remove(e.telegraph); });
  enemies = [];
  bullets.forEach(b => { if (b.mesh) scene.remove(b.mesh); });
  bullets = [];
  particles.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
  particles = [];
  telegraphs.forEach(t => { if (t.mesh) scene.remove(t.mesh); });
  telegraphs = [];
  selectedAgent = null;
  selectionRing.visible = false;
  timeScale = 1;
  currentWave = 0;
  coreHP = CORE_MAX_HP;
  gameState = "build";
  spawnAgents();
  updateHUD();
}

function startNextWave() {
  if (gameState !== "build") return;
  if (currentWave >= 7) return;
  gameState = "wave";
  waveTimer = 0;
  elPhase.textContent = "WAVE ACTIVE";
  const wDef = WAVE_DEFS[currentWave];
  spawnWave(wDef);
  // Show unlock flash
  if (wDef.unlock) {
    showUnlockFlash(wDef.unlock);
    playAbilityUnlock();
  }
  // Add BGM layer
  if (currentWave >= 2 && !bgmWave3Playing) { addBGMLayer3(); bgmWave3Playing = true; }
  if (currentWave >= 4 && !bgmWave5Playing) { addBGMLayer5(); bgmWave5Playing = true; }
  updateHUD();
}

function spawnWave(wDef) {
  const corners = [[-11, 0, -11], [11, 0, -11], [-11, 0, 11], [11, 0, 11]];
  let spawnList = [];
  for (let i = 0; i < wDef.grunts; i++) spawnList.push("grunt");
  for (let i = 0; i < wDef.rushers; i++) spawnList.push("rusher");
  for (let i = 0; i < wDef.tanks; i++) spawnList.push("tank");

  spawnList.forEach((type, i) => {
    const corner = corners[i % 4];
    const offset = [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
    spawnEnemy(type, corner[0] + offset[0], corner[2] + offset[2]);
  });
}

function spawnEnemy(type, x, z) {
  let geo, color, hp, speed, dmg, radius;
  if (type === "grunt") {
    geo = new THREE.SphereGeometry(0.32, 8, 6);
    color = 0xff2222; hp = 2; speed = 1.5; dmg = 1; radius = 0.32;
  } else if (type === "rusher") {
    geo = new THREE.TetrahedronGeometry(0.4);
    color = 0xff8800; hp = 1; speed = 3.0; dmg = 1; radius = 0.4;
  } else {
    geo = new THREE.IcosahedronGeometry(0.5, 0);
    color = 0x880000; hp = 5; speed = 0.8; dmg = 2; radius = 0.5;
  }
  const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.15 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, radius, z);
  mesh.castShadow = true;
  scene.add(mesh);

  // HP bar
  const hpBgGeo = new THREE.PlaneGeometry(0.8, 0.1);
  const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide }));
  scene.add(hpBg);
  const hpFillGeo = new THREE.PlaneGeometry(0.8, 0.08);
  const hpFill = new THREE.Mesh(hpFillGeo, new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide }));
  scene.add(hpFill);

  // Telegraph ring
  const telegraphGeo = new THREE.RingGeometry(0, radius + 0.3, 16);
  const telegraphMat = new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide, transparent: true, opacity: 0 });
  const telegraphMesh = new THREE.Mesh(telegraphGeo, telegraphMat);
  telegraphMesh.rotation.x = -Math.PI / 2;
  telegraphMesh.position.y = 0.01;
  scene.add(telegraphMesh);

  enemies.push({
    type, mesh, hpBarBg: hpBg, hpBarFill: hpFill,
    telegraph: telegraphMesh,
    hp, maxHp: hp, speed, dmg, radius,
    attackCd: 0.8 + Math.random() * 0.5,
    telegraphTimer: 0,
    telegraphActive: false,
    alive: true,
    dead: false,
    deadTimer: 0,
    tauntTarget: null
  });
}

function onWaveClear() {
  currentWave++;
  if (currentWave >= 7) {
    // WIN — set state BEFORE setTimeout (B2 rule)
    gameState = "win";
    timeScale = 0.2;
    setTimeout(() => triggerWin(), 2000);
    return;
  }
  gameState = "build";
  buildTimer = BUILD_PHASE_DURATION;
  elPhase.textContent = "BUILD PHASE — Reposition agents";
  elWaveNum.textContent = currentWave + 1;
  playSFX("wave-clear");
  updateHUD();
}

function triggerWin() {
  gameState = "win";
  timeScale = 1;
  elOverlayTitle.textContent = "DIRECTIVE COMPLETE";
  elOverlaySub.textContent = "7 WAVES SURVIVED";
  elOverlay.classList.add("show");
  playSFX("win");
}

function triggerLose() {
  gameState = "lose";
  cameraShake = 0.5;
  elOverlayTitle.textContent = "CORE DESTROYED";
  elOverlaySub.textContent = "WAVE " + (currentWave + 1) + " / 7";
  elOverlay.classList.add("show");
  playSFX("lose");
}

// ─── INPUT HANDLING ───────────────────────────────────────────────────────────
function onKeyDown(e) {
  if (gameState === "start") return;
  if (e.code === "Space" && gameState === "build") {
    e.preventDefault();
    startNextWave();
  }
  if (e.key === "1") selectAgentByIdx(0);
  if (e.key === "2") selectAgentByIdx(1);
  if (e.key === "3") selectAgentByIdx(2);
  if (e.key === "4") selectAgentByIdx(3);
}

function selectAgentByIdx(idx) {
  if (!agents[idx] || !agents[idx].alive) return;
  selectedAgent = agents[idx];
  updateSelectionRing();
  updateSelectionInfo();
  playSFX("select");
}

function onCanvasClick(e) {
  if (gameState === "start" || gameState === "win" || gameState === "lose") return;
  initAudio();

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check agent clicks
  const agentMeshes = agents.filter(a => a.alive).map(a => a.mesh);
  const agentHits = raycaster.intersectObjects(agentMeshes);
  if (agentHits.length > 0) {
    const idx = agentHits[0].object.userData.agentIdx;
    if (selectedAgent && selectedAgent !== agents[idx]) {
      // Support action: assign goal to go to this ally
      assignGoalSupport(selectedAgent, agents[idx], e.clientX, e.clientY);
    } else {
      selectAgentByIdx(idx);
    }
    return;
  }

  // Check enemy clicks
  if (selectedAgent && selectedAgent.alive) {
    const enemyMeshes = enemies.filter(en => en.alive).map(en => en.mesh);
    const enemyHits = raycaster.intersectObjects(enemyMeshes);
    if (enemyHits.length > 0) {
      const hitEnemy = enemies.find(en => en.mesh === enemyHits[0].object);
      if (hitEnemy) {
        assignGoalAttack(selectedAgent, hitEnemy, e.clientX, e.clientY);
        return;
      }
    }

    // Check ground click → move
    const groundHits = raycaster.intersectObject(groundPlane);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      // Clamp to arena
      const clampedX = Math.max(-11, Math.min(11, pt.x));
      const clampedZ = Math.max(-11, Math.min(11, pt.z));
      assignGoalMove(selectedAgent, clampedX, clampedZ, e.clientX, e.clientY);
    }
  } else {
    // Deselect
    selectedAgent = null;
    selectionRing.visible = false;
    updateSelectionInfo();
  }
}

function assignGoalMove(agent, x, z, screenX, screenY) {
  // Check valid position
  const dist = Math.sqrt(x * x + z * z);
  if (dist > 13) {
    showRejection("OUT OF RANGE", screenX, screenY);
    return;
  }
  agent.goal = { type: "move", tx: x, tz: z };
  playSFX("goal-set");
  updateSelectionInfo();
}

function assignGoalAttack(agent, enemy, screenX, screenY) {
  if (agent.def.dmgType === "heal") {
    showRejection("MEDIC CANNOT ATTACK", screenX, screenY);
    playSFX("goal-reject");
    return;
  }
  agent.goal = { type: "attack", enemy };
  playSFX("goal-set");
  updateSelectionInfo();
}

function assignGoalSupport(agent, ally, screenX, screenY) {
  if (agent.def.idx === 3) {
    // Medic: heal target
    agent.goal = { type: "heal", ally };
    playSFX("goal-set");
    updateSelectionInfo();
  } else if (agent.def.idx === 2) {
    // Fighter: taunt (affects nearby enemies)
    if (agent.tauntTimer > 0) {
      showRejection("TAUNT ACTIVE", screenX, screenY);
      return;
    }
    if (currentWave < 2) {
      showRejection("ABILITY LOCKED", screenX, screenY);
      return;
    }
    agent.tauntTimer = 3;
    agent.goal = null;
    playSFX("taunt");
    // Redirect all enemies within 5 units to target this fighter
    enemies.filter(en => en.alive).forEach(en => {
      const dx = en.mesh.position.x - agent.mesh.position.x;
      const dz = en.mesh.position.z - agent.mesh.position.z;
      if (Math.sqrt(dx*dx + dz*dz) < 6) {
        en.tauntTarget = agent;
      }
    });
  } else if (agent.def.idx === 1) {
    // Builder: reinforce ally position
    agent.goal = { type: "move", tx: ally.mesh.position.x + 0.5, tz: ally.mesh.position.z };
    playSFX("goal-set");
  } else {
    // Scout: support move
    agent.goal = { type: "move", tx: ally.mesh.position.x - 0.5, tz: ally.mesh.position.z };
    playSFX("goal-set");
  }
  updateSelectionInfo();
}

// ─── UPDATE LOOP ──────────────────────────────────────────────────────────────
function update(rawDt) {
  dt = rawDt * timeScale;
  if (dt > 0.1) dt = 0.1; // clamp

  if (gameState === "build") {
    if (buildTimer > 0) {
      buildTimer -= dt;
      if (buildTimer <= 0) {
        // Auto-start wave after build phase timer if it's not the first wave
        if (currentWave > 0) {
          elPhase.textContent = "SPACE to start wave";
        }
      }
    }
    updateAgents();
    updateParticles();
    updateBullets();
    updateSelectionRing();
    updateHPBars();
    return;
  }

  if (gameState !== "wave") return;

  waveTimer += dt;
  updateAgents();
  updateEnemies();
  updateBullets();
  updateParticles();
  updateTelegraphs();
  updateSelectionRing();
  updateHPBars();
  updateCore();

  // Check wave clear
  if (enemies.every(en => !en.alive) && enemies.length > 0) {
    onWaveClear();
  }
}

function updateAgents() {
  agents.forEach((agent, ai) => {
    if (!agent.alive) {
      if (agent.deadTimer > 0) {
        agent.deadTimer -= dt;
        if (agent.deadTimer <= 0) {
          scene.remove(agent.mesh);
          scene.remove(agent.hpBarBg);
          scene.remove(agent.hpBarFill);
          agent.dead = true;
        }
      }
      return;
    }

    // Invincibility timer
    if (agent.invincibleTimer > 0) agent.invincibleTimer -= dt;

    // Taunt timer
    if (agent.tauntTimer > 0) agent.tauntTimer -= dt;

    // Attack cooldown
    if (agent.attackCd > 0) agent.attackCd -= dt;

    // Idle animation
    agent.mesh.rotation.y += dt * 0.8;

    // Pursue goal
    let moved = false;
    if (agent.goal) {
      if (agent.goal.type === "move") {
        const dx = agent.goal.tx - agent.mesh.position.x;
        const dz = agent.goal.tz - agent.mesh.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist > 0.2) {
          const step = agent.speed * dt;
          agent.mesh.position.x += (dx / dist) * step;
          agent.mesh.position.z += (dz / dist) * step;
          moved = true;
        } else {
          agent.goal = null;
        }
      } else if (agent.goal.type === "attack") {
        const enemy = agent.goal.enemy;
        if (!enemy || !enemy.alive) { agent.goal = null; return; }
        const dx = enemy.mesh.position.x - agent.mesh.position.x;
        const dz = enemy.mesh.position.z - agent.mesh.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist > agent.def.range + 0.1) {
          const step = agent.speed * dt;
          agent.mesh.position.x += (dx / dist) * step;
          agent.mesh.position.z += (dz / dist) * step;
          moved = true;
        } else if (agent.attackCd <= 0) {
          attackEnemy(agent, enemy);
          agent.attackCd = agent.def.cdMax;
        }
      } else if (agent.goal.type === "heal") {
        const ally = agent.goal.ally;
        if (!ally || !ally.alive) { agent.goal = null; return; }
        const dx = ally.mesh.position.x - agent.mesh.position.x;
        const dz = ally.mesh.position.z - agent.mesh.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist > 1.5) {
          const step = agent.speed * dt;
          agent.mesh.position.x += (dx / dist) * step;
          agent.mesh.position.z += (dz / dist) * step;
          moved = true;
        } else if (agent.attackCd <= 0) {
          healAlly(agent, ally);
          agent.attackCd = agent.def.cdMax;
        }
      }
    }

    // Auto-attack nearest enemy if idle and in range
    if (!agent.goal && agent.attackCd <= 0 && agent.def.dmgType !== "heal") {
      const inRange = enemies.filter(en => en.alive).find(en => {
        const dx = en.mesh.position.x - agent.mesh.position.x;
        const dz = en.mesh.position.z - agent.mesh.position.z;
        return Math.sqrt(dx*dx + dz*dz) <= agent.def.range;
      });
      if (inRange) {
        attackEnemy(agent, inRange);
        agent.attackCd = agent.def.cdMax;
      }
    }

    // Medic passive heal
    if (agent.def.idx === 3 && agent.alive && agent.attackCd <= 0) {
      const nearestAlly = agents.filter(a => a.alive && a !== agent).sort((a, b) => {
        const da = Math.hypot(a.mesh.position.x - agent.mesh.position.x, a.mesh.position.z - agent.mesh.position.z);
        const db = Math.hypot(b.mesh.position.x - agent.mesh.position.x, b.mesh.position.z - agent.mesh.position.z);
        return da - db;
      })[0];
      if (nearestAlly) {
        const d = Math.hypot(nearestAlly.mesh.position.x - agent.mesh.position.x, nearestAlly.mesh.position.z - agent.mesh.position.z);
        if (d <= 2 && nearestAlly.hp < nearestAlly.maxHp) {
          healAlly(agent, nearestAlly);
          agent.attackCd = agent.def.cdMax;
        }
      }
    }

    // Clamp to arena
    agent.mesh.position.x = Math.max(-11, Math.min(11, agent.mesh.position.x));
    agent.mesh.position.z = Math.max(-11, Math.min(11, agent.mesh.position.z));

    // Update HUD card
    if (hpFills[ai]) {
      hpFills[ai].style.width = (agent.hp / agent.maxHp * 100) + "%";
    }
    if (agentCards[ai]) {
      agentCards[ai].classList.toggle("selected", selectedAgent === agent);
      agentCards[ai].classList.toggle("dead", !agent.alive);
    }
  });
}

function attackEnemy(agent, enemy) {
  if (agent.def.dmgType === "ranged") {
    // Spawn bullet
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: agent.def.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(agent.mesh.position.x, 0.5, agent.mesh.position.z);
    scene.add(mesh);
    bullets.push({
      mesh, target: enemy, speed: 10, dmg: agent.def.dmg,
      owner: "agent", lifetime: 2
    });
  } else {
    // Melee: instant
    damageEnemy(enemy, agent.def.dmg);
  }
  playSFX("agent-attack");
}

function healAlly(agent, ally) {
  if (ally.hp < ally.maxHp) {
    ally.hp = Math.min(ally.maxHp, ally.hp + 1);
    spawnHealParticles(ally.mesh.position);
    playSFX("heal");
  }
}

function damageAgent(agent, dmg) {
  // Invincibility check FIRST
  if (agent.invincibleTimer > 0) return;
  agent.hp -= dmg;
  agent.invincibleTimer = 1.5;
  // Flash emissive
  agent.mesh.material.emissiveIntensity = 1.5;
  setTimeout(() => { if (agent.mesh.material) agent.mesh.material.emissiveIntensity = 0.2; }, 150);
  if (agent.hp <= 0) {
    agent.hp = 0;
    agent.alive = false;
    agent.deadTimer = 2;
    agent.mesh.material.color.set(0x333333);
    agent.mesh.material.emissive.set(0x000000);
    spawnDeathParticles(agent.mesh.position, agent.def.color);
    // Clear selection
    if (selectedAgent === agent) {
      selectedAgent = null;
      selectionRing.visible = false;
      updateSelectionInfo();
    }
  }
}

function damageEnemy(enemy, dmg) {
  enemy.hp -= dmg;
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    enemy.dead = true;
    enemy.deadTimer = 0.5;
    spawnDeathParticles(enemy.mesh.position, 0xff4422);
    playSFX("enemy-death");
    scene.remove(enemy.telegraph);
  }
}

function updateEnemies() {
  enemies.forEach(enemy => {
    if (!enemy.alive) {
      if (enemy.deadTimer > 0) {
        enemy.deadTimer -= dt;
        if (enemy.deadTimer <= 0 && !enemy.removed) {
          enemy.removed = true;
          scene.remove(enemy.mesh);
          scene.remove(enemy.hpBarBg);
          scene.remove(enemy.hpBarFill);
        }
      }
      return;
    }

    // Spin
    enemy.mesh.rotation.y += dt * (enemy.type === "rusher" ? 3 : 1);

    // Determine target
    let target = null;
    if (enemy.tauntTarget && enemy.tauntTarget.alive && enemy.tauntTarget.tauntTimer > 0) {
      target = { isAgent: true, agent: enemy.tauntTarget };
    } else {
      enemy.tauntTarget = null;
      // Target nearest agent or core
      let nearestDist = Infinity;
      agents.filter(a => a.alive).forEach(a => {
        const d = Math.hypot(a.mesh.position.x - enemy.mesh.position.x, a.mesh.position.z - enemy.mesh.position.z);
        if (d < nearestDist) { nearestDist = d; target = { isAgent: true, agent: a, pos: a.mesh.position }; }
      });
      // Core position
      const coreDist = Math.hypot(enemy.mesh.position.x, enemy.mesh.position.z);
      if (coreDist < nearestDist - 1) {
        target = { isCore: true, pos: { x: 0, z: 0 } };
        nearestDist = coreDist;
      }
    }

    if (!target) target = { isCore: true, pos: { x: 0, z: 0 } };

    let targetPos;
    if (enemy.tauntTarget && enemy.tauntTarget.alive && enemy.tauntTarget.tauntTimer > 0) {
      targetPos = enemy.tauntTarget.mesh.position;
    } else if (target && target.isAgent) {
      targetPos = target.agent.mesh.position;
    } else {
      targetPos = { x: 0, z: 0 };
    }
    const dx = targetPos.x - enemy.mesh.position.x;
    const dz = (targetPos.z !== undefined ? targetPos.z : 0) - enemy.mesh.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const attackRange = enemy.radius + (target && target.isCore ? 1.2 : 0.5);

    if (dist > attackRange) {
      // Move toward target
      const step = enemy.speed * dt;
      enemy.mesh.position.x += (dx / dist) * step;
      enemy.mesh.position.z += (dz / dist) * step;
      enemy.telegraphActive = false;
      enemy.telegraph.material.opacity = 0;
    } else {
      // Telegraph attack
      enemy.telegraphTimer += dt;
      if (!enemy.telegraphActive) {
        enemy.telegraphActive = true;
        enemy.telegraphTimer = 0;
      }
      const progress = Math.min(enemy.telegraphTimer / 0.8, 1);
      enemy.telegraph.material.opacity = progress * 0.6;
      enemy.telegraph.scale.setScalar(1 + progress * 0.5);

      if (enemy.telegraphTimer >= 0.8 && enemy.attackCd <= 0) {
        // Attack whatever is in range
        if (enemy.tauntTarget && enemy.tauntTarget.alive && enemy.tauntTarget.tauntTimer > 0) {
          damageAgent(enemy.tauntTarget, enemy.dmg);
        } else if (target && target.isAgent && target.agent && target.agent.alive) {
          damageAgent(target.agent, enemy.dmg);
        } else {
          const coreD = Math.hypot(enemy.mesh.position.x, enemy.mesh.position.z);
          if (coreD <= attackRange) damageCore(enemy.dmg);
        }
        enemy.attackCd = 1.2 + Math.random() * 0.4;
        enemy.telegraphActive = false;
        enemy.telegraphTimer = 0;
        enemy.telegraph.material.opacity = 0;
      }
    }

    // Update attack cooldown
    if (enemy.attackCd > 0) enemy.attackCd -= dt;

    // Position telegraph
    enemy.telegraph.position.set(enemy.mesh.position.x, 0.01, enemy.mesh.position.z);
  });
}

function damageCore(dmg) {
  if (gameState !== "wave") return;
  coreHP = Math.max(0, coreHP - dmg);
  cameraShake = 0.3;
  // Flash core
  coreObject.material.emissiveIntensity = 2.0;
  setTimeout(() => { if (coreObject.material) coreObject.material.emissiveIntensity = 0.5; }, 200);
  playSFX("core-hit");
  updateHUD();
  if (coreHP <= 0) {
    gameState = "lose";
    setTimeout(() => triggerLose(), 500);
  }
}

function updateBullets() {
  bullets = bullets.filter(b => {
    if (!b.mesh) return false;
    b.lifetime -= dt;
    if (b.lifetime <= 0) { scene.remove(b.mesh); return false; }

    if (b.target && b.target.alive) {
      const dx = b.target.mesh.position.x - b.mesh.position.x;
      const dz = b.target.mesh.position.z - b.mesh.position.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 0.4) {
        damageEnemy(b.target, b.dmg);
        scene.remove(b.mesh);
        return false;
      }
      b.mesh.position.x += (dx / dist) * b.speed * dt;
      b.mesh.position.z += (dz / dist) * b.speed * dt;
    } else {
      scene.remove(b.mesh);
      return false;
    }
    return true;
  });
}

function updateTelegraphs() {
  // Telegraphs updated in updateEnemies
}

function updateCore() {
  // Pulse animation
  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
  coreObject.scale.set(pulse, 1, pulse);
}

function updateHPBars() {
  const cameraDir = new THREE.Vector3(0, 1, 0);

  // Agent HP bars
  agents.forEach(agent => {
    if (agent.dead) return;
    const pos = agent.mesh.position.clone();
    pos.y += 1.2;
    agent.hpBarBg.position.copy(pos);
    agent.hpBarBg.rotation.x = -Math.PI / 2;
    agent.hpBarFill.position.copy(pos);
    agent.hpBarFill.position.y += 0.01;
    agent.hpBarFill.rotation.x = -Math.PI / 2;
    const hpFrac = agent.alive ? (agent.hp / agent.maxHp) : 0;
    agent.hpBarFill.scale.x = hpFrac;
    agent.hpBarFill.position.x = pos.x - (1 - hpFrac) * 0.5;
    agent.hpBarBg.visible = agent.alive;
    agent.hpBarFill.visible = agent.alive;
  });

  // Enemy HP bars
  enemies.forEach(enemy => {
    if (!enemy.alive || enemy.removed) {
      enemy.hpBarBg.visible = false;
      enemy.hpBarFill.visible = false;
      return;
    }
    const pos = enemy.mesh.position.clone();
    pos.y += enemy.radius + 0.4;
    enemy.hpBarBg.position.copy(pos);
    enemy.hpBarBg.rotation.x = -Math.PI / 2;
    enemy.hpBarFill.position.copy(pos);
    enemy.hpBarFill.position.y += 0.01;
    enemy.hpBarFill.rotation.x = -Math.PI / 2;
    const hpFrac = enemy.hp / enemy.maxHp;
    enemy.hpBarFill.scale.x = hpFrac;
    enemy.hpBarFill.position.x = pos.x - (0.8 * (1 - hpFrac)) * 0.5;
    enemy.hpBarFill.scale.x = hpFrac;
  });
}

function updateSelectionRing() {
  if (selectedAgent && selectedAgent.alive) {
    selectionRing.visible = true;
    selectionRing.position.set(selectedAgent.mesh.position.x, 0.02, selectedAgent.mesh.position.z);
    selectionRing.rotation.z += dt * 1.5;
  } else {
    selectionRing.visible = false;
  }
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnDeathParticles(pos, color) {
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.TetrahedronGeometry(0.12);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
    const speed = 2 + Math.random() * 2;
    particles.push({
      mesh, vx: Math.cos(angle) * speed, vy: 2 + Math.random() * 2, vz: Math.sin(angle) * speed,
      life: 0.5, maxLife: 0.5
    });
  }
}

function spawnHealParticles(pos) {
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.SphereGeometry(0.07, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({
      mesh, vx: (Math.random() - 0.5) * 1, vy: 2 + Math.random(), vz: (Math.random() - 0.5) * 1,
      life: 0.6, maxLife: 0.6
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.mesh); return false; }
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 6 * dt; // gravity
    const t = p.life / p.maxLife;
    p.mesh.material.opacity = t;
    p.mesh.material.transparent = true;
    const s = t * 0.8 + 0.2;
    p.mesh.scale.setScalar(s);
    return true;
  });
}

// ─── HUD UPDATES ──────────────────────────────────────────────────────────────
function updateHUD() {
  if (elWaveNum) elWaveNum.textContent = Math.min(currentWave + 1, 7);
  // Core HP pips
  if (elCoreHpVal) {
    let pips = "";
    for (let i = 0; i < CORE_MAX_HP; i++) {
      pips += i < coreHP ? "●" : "○";
    }
    elCoreHpVal.textContent = pips;
    elCoreHpVal.style.color = coreHP <= 1 ? "#ff4444" : "#44aaff";
  }
  // Phase
  if (elPhase) {
    if (gameState === "wave") elPhase.textContent = "WAVE ACTIVE";
    else if (gameState === "build") elPhase.textContent = currentWave === 0 ? "BUILD PHASE — SPACE to begin" : "BUILD PHASE — SPACE to start wave";
  }
  if (elStartPrompt) {
    elStartPrompt.style.display = gameState === "build" ? "block" : "none";
  }
}

function updateSelectionInfo() {
  if (!elSelectionInfo) return;
  if (!selectedAgent || !selectedAgent.alive) {
    elSelectionInfo.textContent = "Click an agent to select · SPACE to start wave";
  } else {
    const names = ["SCOUT", "BUILDER", "FIGHTER", "MEDIC"];
    elSelectionInfo.textContent = names[selectedAgent.def.idx] + " selected — click ground/enemy/ally to assign goal";
  }
  updateAbilityPanel();
}

function updateAbilityPanel() {
  if (!elAbilityPanel) return;
  elAbilityPanel.innerHTML = "";
  if (!selectedAgent || !selectedAgent.alive) return;

  const idx = selectedAgent.def.idx;
  const waveReached = currentWave;

  if (idx === 0 && waveReached >= 0) {
    // Scout: fog reveal (passive, show as info)
    const btn = document.createElement("div");
    btn.className = "ability-btn";
    btn.textContent = "FOG REVEAL (passive)";
    elAbilityPanel.appendChild(btn);
  } else if (idx === 1 && waveReached >= 1) {
    // Builder: reinforce
    const btn = document.createElement("button");
    btn.className = "ability-btn";
    btn.textContent = "REINFORCE WALL";
    btn.addEventListener("click", () => {
      // Move to nearest wall position
      const wallPositions = [[-5, -5], [5, -5], [-5, 5], [5, 5]];
      let nearest = wallPositions[0];
      let nearestDist = Infinity;
      wallPositions.forEach(wp => {
        const d = Math.hypot(wp[0] - selectedAgent.mesh.position.x, wp[1] - selectedAgent.mesh.position.z);
        if (d < nearestDist) { nearestDist = d; nearest = wp; }
      });
      selectedAgent.goal = { type: "move", tx: nearest[0], tz: nearest[1] };
      playSFX("goal-set");
    });
    elAbilityPanel.appendChild(btn);
  } else if (idx === 2 && waveReached >= 2) {
    // Fighter: taunt
    const btn = document.createElement("button");
    btn.className = "ability-btn" + (selectedAgent.tauntTimer > 0 ? " on-cooldown" : "");
    btn.textContent = selectedAgent.tauntTimer > 0 ? "TAUNT (active)" : "TAUNT ENEMIES";
    btn.addEventListener("click", () => {
      if (selectedAgent.tauntTimer > 0) return;
      selectedAgent.tauntTimer = 3;
      enemies.filter(en => en.alive).forEach(en => {
        const d = Math.hypot(en.mesh.position.x - selectedAgent.mesh.position.x, en.mesh.position.z - selectedAgent.mesh.position.z);
        if (d < 6) en.tauntTarget = selectedAgent;
      });
      playSFX("taunt");
      updateAbilityPanel();
    });
    elAbilityPanel.appendChild(btn);
  } else if (idx === 3 && waveReached >= 3) {
    // Medic: AoE heal
    const btn = document.createElement("button");
    btn.className = "ability-btn";
    btn.textContent = "AoE HEAL PULSE";
    btn.addEventListener("click", () => {
      agents.filter(a => a.alive && a !== selectedAgent).forEach(a => {
        const d = Math.hypot(a.mesh.position.x - selectedAgent.mesh.position.x, a.mesh.position.z - selectedAgent.mesh.position.z);
        if (d <= 3) {
          a.hp = Math.min(a.maxHp, a.hp + 1);
          spawnHealParticles(a.mesh.position);
        }
      });
      playSFX("heal");
    });
    elAbilityPanel.appendChild(btn);
  } else if (waveReached < [0, 1, 2, 3][idx]) {
    const btn = document.createElement("div");
    btn.className = "ability-btn locked";
    const unlockWaves = ["WAVE 1", "WAVE 2", "WAVE 3", "WAVE 4"];
    btn.textContent = "ABILITY — unlocks " + unlockWaves[idx];
    elAbilityPanel.appendChild(btn);
  }
}

// ─── REJECTION BUBBLES ────────────────────────────────────────────────────────
function showRejection(text, screenX, screenY) {
  const container = document.getElementById("bubbles-container");
  const el = document.createElement("div");
  el.className = "rejection-bubble";
  el.textContent = text;
  el.style.left = screenX + "px";
  el.style.top = screenY + "px";
  container.appendChild(el);
  playSFX("goal-reject");
  setTimeout(() => container.removeChild(el), 1600);
}

// ─── UNLOCK FLASH ─────────────────────────────────────────────────────────────
function showUnlockFlash(text) {
  elUnlockFlash.textContent = "ABILITY UNLOCKED\n" + text;
  elUnlockFlash.style.display = "block";
  // Reset animation
  elUnlockFlash.style.animation = "none";
  elUnlockFlash.offsetHeight; // reflow
  elUnlockFlash.style.animation = "unlockFlash 2s ease-out forwards";
  setTimeout(() => { elUnlockFlash.style.display = "none"; }, 2100);
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, type, duration, gain, sustain, startDelay = 0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime + startDelay;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  // B5 rule: sustain never 0
  const sustainVal = Math.max(gain * 0.7, sustain || gain * 0.7);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
  gainNode.gain.setValueAtTime(sustainVal, now + duration * 0.1);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playBGM() {
  if (!audioCtx) return;
  const loopDuration = 64;

  // Sub-bass drone
  const bass = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  bass.connect(bassGain);
  bassGain.connect(audioCtx.destination);
  bass.type = "sawtooth";
  bass.frequency.value = 55;
  bassGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  bassGain.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.1); // sustain ~70%
  bass.start();
  bgmNodes.push(bass, bassGain);

  // Tension arpeggio at 8 irregular times
  const arpTimes = [4, 10, 17, 23, 31, 38, 46, 55];
  const arpFreqs = [220, 277, 330, 392];
  arpTimes.forEach((t, i) => {
    setTimeout(() => {
      if (!audioCtx) return;
      playTone(arpFreqs[i % arpFreqs.length], "square", 0.3, 0.06, 0.05);
    }, t * 1000);
  });

  // Glitch hits at 6 irregular times
  const glitchTimes = [8, 19, 29, 41, 52, 60];
  glitchTimes.forEach(t => {
    setTimeout(() => {
      if (!audioCtx) return;
      playTone(800, "sawtooth", 0.08, 0.04, 0.03);
    }, t * 1000);
  });

  // Percussion at 12 spread beats
  const percTimes = [2, 6, 12, 18, 24, 28, 34, 40, 44, 50, 56, 62];
  percTimes.forEach(t => {
    setTimeout(() => {
      if (!audioCtx) return;
      playTone(80, "triangle", 0.15, 0.08, 0.06);
    }, t * 1000);
  });

  // Schedule next loop 100ms before end (S6 rule — never silent)
  bgmTimeout = setTimeout(playBGM, (loopDuration - 0.1) * 1000);
}

function addBGMLayer3() {
  // Hi-hat layer (wave 3+)
  const hatTimes = [1, 5, 9, 13, 17, 21, 25, 29];
  hatTimes.forEach(t => {
    setTimeout(() => {
      if (!audioCtx) return;
      playTone(1200, "square", 0.05, 0.03, 0.02);
    }, t * 500);
  });
}

function addBGMLayer5() {
  // Bass pulse (wave 5+)
  const pulseTimes = [0, 4, 8, 12];
  pulseTimes.forEach(t => {
    setTimeout(() => {
      if (!audioCtx) return;
      playTone(40, "sine", 0.5, 0.1, 0.08);
    }, t * 1000);
  });
}

function playSFX(type) {
  if (!audioCtx) return;
  switch (type) {
    case "select":
      playTone(880, "sine", 0.1, 0.08, 0.07); break;
    case "goal-set":
      playTone(660, "sine", 0.08, 0.07, 0.06);
      setTimeout(() => playTone(880, "sine", 0.08, 0.07, 0.06), 80); break;
    case "goal-reject":
      playTone(440, "sawtooth", 0.1, 0.07, 0.06);
      setTimeout(() => playTone(220, "sawtooth", 0.1, 0.07, 0.06), 100); break;
    case "enemy-death":
      playTone(440, "sine", 0.12, 0.06, 0.05); break;
    case "agent-attack":
      playTone(660, "square", 0.05, 0.04, 0.03); break;
    case "core-hit":
      playTone(55, "sawtooth", 0.35, 0.15, 0.12); break;
    case "wave-clear":
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.25, 0.1, 0.08), i * 120)); break;
    case "win":
      [523, 659, 784, 880, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.3, 0.12, 0.1), i * 150)); break;
    case "lose":
      [523, 440, 370, 294].forEach((f, i) => setTimeout(() => playTone(f, "sawtooth", 0.3, 0.1, 0.08), i * 140)); break;
    case "ability-unlock":
      [330, 440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.2, 0.1, 0.08), i * 100)); break;
    case "heal":
      playTone(880, "triangle", 0.12, 0.06, 0.05); break;
    case "taunt":
      playTone(660, "square", 0.2, 0.08, 0.07); break;
  }
}

function playAbilityUnlock() {
  playSFX("ability-unlock");
}

// ─── CAMERA SHAKE ─────────────────────────────────────────────────────────────
const camBasePos = new THREE.Vector3(0, 20, 8);
function applyCameraShake() {
  if (cameraShake > 0) {
    camera.position.set(
      camBasePos.x + (Math.random() - 0.5) * cameraShake,
      camBasePos.y + (Math.random() - 0.5) * cameraShake * 0.3,
      camBasePos.z + (Math.random() - 0.5) * cameraShake * 0.5
    );
    cameraShake *= 0.85;
    if (cameraShake < 0.01) {
      cameraShake = 0;
      camera.position.copy(camBasePos);
    }
  }
}

// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.1);
  if (gameState !== "start" && gameState !== "win" && gameState !== "lose") {
    update(rawDt);
  }
  applyCameraShake();
  if (useComposer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = w / h;
  const zoom = 18;
  camera.left = -zoom * aspect;
  camera.right = zoom * aspect;
  camera.top = zoom;
  camera.bottom = -zoom;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (useComposer) composer.setSize(w, h);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
init();
