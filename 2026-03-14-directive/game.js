import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const ARENA_RADIUS = 28;
const CORE_POS = new THREE.Vector3(0, 0, 0);
const CORE_MAX_HP = 10;
const AGENT_SPEED = 6;
const AGENT_ATTACK_RANGE = 5;
const AGENT_ATTACK_COOLDOWN = 1.2;
const ENEMY_SPEED_BASE = 2.8;
const ENEMY_ATTACK_RANGE = 2.0;
const ENEMY_ATTACK_COOLDOWN = 1.5;
const TELEGRAPH_DURATION = 0.8;
const TURRET_RANGE = 9;
const TURRET_ATTACK_COOLDOWN = 1.8;
const MEDIC_HEAL_RANGE = 6;
const MEDIC_HEAL_COOLDOWN = 3.0;
const MEDIC_HEAL_AMT = 2;

// Wave config: [grunt count, rusher count, tank count]
const WAVE_CONFIG = [
  [3, 0, 0],
  [4, 1, 0],
  [5, 2, 0],
  [5, 2, 1],
  [6, 3, 1],
  [7, 3, 2],
  [8, 4, 2],
];

const ABILITY_UNLOCKS = {
  2: { name: 'SCOUT REVEAL', desc: 'Scout reveals all enemies for 8s' },
  3: { name: 'BUILDER TURRET', desc: 'Builder places an auto-turret' },
  5: { name: 'FIGHTER TAUNT', desc: 'Fighter taunts all enemies for 5s' },
  6: { name: 'MEDIC BURST', desc: 'Medic heals all agents instantly' },
};

const AGENT_COLORS = [0x00ffff, 0xffcc00, 0xff4400, 0x00ff88];
const AGENT_NAMES = ['SCOUT', 'BUILDER', 'FIGHTER', 'MEDIC'];

// ─── Module-scope state ───────────────────────────────────────────────────────
let renderer, scene, camera, composer;
let clock;
let raycaster, mouse;

let coreHp = CORE_MAX_HP;
let waveNum = 0;
let phase = 'start'; // start | build | combat | waveclear | gameover | win
let gameStarted = false;

let agents = [];
let enemies = [];
let turrets = [];
let particles = [];
let telegraphs = [];

let selectedAgentIdx = -1;
let abilityUnlocked = { 2: false, 3: false, 5: false, 6: false };
let abilityCooldown = { 2: 0, 3: 0, 5: 0, 6: 0 };
let abilityDuration = { 2: 0 }; // scout reveal timer

let coreGroup, coreMesh;
let groundMesh, arenaRingMesh;
let audioCtx;
let bgmNodes = [];
let bgmStarted = false;
let cameraShake = 0;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const waveNumEl = document.getElementById('wave-num');
const phaseEl = document.getElementById('phase-display');
const coreHpEl = document.getElementById('core-hp-val');
const selectionInfoEl = document.getElementById('selection-info');
const bubblesEl = document.getElementById('bubbles-container');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlay-title');
const overlaySubEl = document.getElementById('overlay-sub');
const overlayBtnEl = document.getElementById('overlay-btn');
const startOverlayEl = document.getElementById('start-overlay');
const startBtnEl = document.getElementById('start-btn');
const unlockFlashEl = document.getElementById('unlock-flash');
const abilityPanelEl = document.getElementById('ability-panel');
const startPromptEl = document.getElementById('start-prompt');

// ─── Geometry / Material cache ────────────────────────────────────────────────
const geoCache = {};
const matCache = {};

function getGeo(key, factory) {
  if (!geoCache[key]) geoCache[key] = factory();
  return geoCache[key];
}
function getMat(key, factory) {
  if (!matCache[key]) matCache[key] = factory();
  return matCache[key];
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020408);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020408, 0.022);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 36, 26);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0x111122, 0.8);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x8899cc, 1.2);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.camera.left = -35;
  dirLight.shadow.camera.right = 35;
  dirLight.shadow.camera.top = 35;
  dirLight.shadow.camera.bottom = -35;
  scene.add(dirLight);

  const coreLight = new THREE.PointLight(0x4488ff, 2.5, 18);
  coreLight.position.set(0, 3, 0);
  scene.add(coreLight);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 600; i++) {
    starVerts.push(
      (Math.random() - 0.5) * 200,
      20 + Math.random() * 80,
      (Math.random() - 0.5) * 200
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xaaaacc, size: 0.3 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Ground
  const groundGeo = new THREE.CircleGeometry(ARENA_RADIUS, 64);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x050a10 });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.name = 'ground';
  scene.add(groundMesh);

  // Arena ring
  const ringGeo = new THREE.TorusGeometry(ARENA_RADIUS, 0.25, 8, 80);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x1a2a44 });
  arenaRingMesh = new THREE.Mesh(ringGeo, ringMat);
  arenaRingMesh.rotation.x = -Math.PI / 2;
  scene.add(arenaRingMesh);

  // Grid lines
  const gridHelper = new THREE.GridHelper(ARENA_RADIUS * 2, 20, 0x0a1520, 0x0a1520);
  scene.add(gridHelper);

  // Core
  buildCore();

  // EffectComposer
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.1, 0.5, 0.75
    );
    composer.addPass(bloom);
  } catch (e) {
    composer = null;
    console.warn('Bloom unavailable:', e);
  }

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Build agents
  buildAgents();

  // Events
  window.addEventListener('resize', onResize);
  window.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);

  startBtnEl.addEventListener('click', startGame);
  overlayBtnEl.addEventListener('click', restartGame);

  // Build ability panel
  buildAbilityPanel();

  loop();
}

// ─── Core ─────────────────────────────────────────────────────────────────────
function buildCore() {
  coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const geo = new THREE.OctahedronGeometry(1.6, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2244aa,
    emissive: 0x112244,
    emissiveIntensity: 0.6,
    metalness: 0.6,
    roughness: 0.3,
  });
  coreMesh = new THREE.Mesh(geo, mat);
  coreMesh.castShadow = true;
  coreMesh.position.y = 1.6;
  coreMesh.name = 'core';
  coreGroup.add(coreMesh);

  // Ring base
  const baseGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.2, 32);
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x112233 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.1;
  coreGroup.add(base);

  // Orbit ring
  const orbitGeo = new THREE.TorusGeometry(2.2, 0.06, 8, 48);
  const orbitMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
  const orbit = new THREE.Mesh(orbitGeo, orbitMat);
  orbit.rotation.x = Math.PI / 2;
  orbit.position.y = 1.6;
  orbit.name = 'coreOrbit';
  coreGroup.add(orbit);

  updateCoreHpDisplay();
}

function updateCoreHpDisplay() {
  let html = '';
  for (let i = 0; i < CORE_MAX_HP; i++) {
    html += `<span class="pip${i < coreHp ? '' : ' empty'}"></span>`;
  }
  coreHpEl.innerHTML = html;

  // Color based on hp
  const ratio = coreHp / CORE_MAX_HP;
  if (coreMesh) {
    if (ratio > 0.6) coreMesh.material.color.setHex(0x2244aa);
    else if (ratio > 0.3) coreMesh.material.color.setHex(0xaa6600);
    else coreMesh.material.color.setHex(0xaa2222);
  }
}

// ─── Agents ───────────────────────────────────────────────────────────────────
function buildAgents() {
  const positions = [
    new THREE.Vector3(-6, 0, 6),
    new THREE.Vector3(6, 0, 6),
    new THREE.Vector3(-6, 0, -6),
    new THREE.Vector3(6, 0, -6),
  ];

  const geometries = [
    () => new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),       // Scout
    () => new THREE.BoxGeometry(0.8, 0.8, 0.8),              // Builder
    () => new THREE.OctahedronGeometry(0.55, 0),             // Fighter
    () => new THREE.ConeGeometry(0.45, 1.0, 8),              // Medic
  ];

  const maxHps = [6, 8, 10, 7];

  agents = [];

  for (let i = 0; i < 4; i++) {
    const geo = geometries[i]();
    const mat = new THREE.MeshStandardMaterial({
      color: AGENT_COLORS[i],
      emissive: AGENT_COLORS[i],
      emissiveIntensity: 0.25,
      metalness: 0.3,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.copy(positions[i]);
    mesh.position.y = 0.5;
    mesh.name = 'agent_' + i;
    scene.add(mesh);

    // Selection ring (hidden by default)
    const selRingGeo = new THREE.RingGeometry(0.7, 0.85, 24);
    const selRingMat = new THREE.MeshBasicMaterial({ color: 0xffff44, side: THREE.DoubleSide });
    const selRing = new THREE.Mesh(selRingGeo, selRingMat);
    selRing.rotation.x = -Math.PI / 2;
    selRing.position.y = 0.05;
    selRing.visible = false;
    mesh.add(selRing);

    const agent = {
      idx: i,
      mesh,
      selRing,
      hp: maxHps[i],
      maxHp: maxHps[i],
      pos: positions[i].clone(),
      target: null,         // THREE.Vector3 move target
      attackTarget: null,   // enemy ref
      supportTarget: null,  // agent ref
      state: 'idle',        // idle | moving | attacking | supporting | dead
      attackTimer: 0,
      healTimer: 0,
      type: AGENT_NAMES[i].toLowerCase(),
      revealed: false,      // Scout reveal
    };
    agents.push(agent);

    updateAgentCard(i);
  }
}

function updateAgentCard(i) {
  const agent = agents[i];
  const card = document.getElementById('card-' + i);
  const fill = document.getElementById('hp-fill-' + i);
  if (!card || !fill) return;

  card.classList.toggle('selected', i === selectedAgentIdx);
  card.classList.toggle('dead', agent.state === 'dead');
  fill.style.width = Math.max(0, (agent.hp / agent.maxHp) * 100) + '%';
}

// ─── Enemies ──────────────────────────────────────────────────────────────────
function spawnEnemies() {
  const [grunts, rushers, tanks] = WAVE_CONFIG[waveNum - 1] || [3, 0, 0];
  const waveSpeed = ENEMY_SPEED_BASE + (waveNum - 1) * 0.25;

  const configs = [
    { count: grunts, type: 'grunt', hp: 4, maxHp: 4, speed: waveSpeed, dmg: 1, color: 0xff2244, geo: () => new THREE.ConeGeometry(0.4, 0.9, 6), y: 0.45 },
    { count: rushers, type: 'rusher', hp: 2, maxHp: 2, speed: waveSpeed * 1.6, dmg: 1, color: 0xff6600, geo: () => new THREE.TetrahedronGeometry(0.45), y: 0.45 },
    { count: tanks, type: 'tank', hp: 12, maxHp: 12, speed: waveSpeed * 0.55, dmg: 2, color: 0x880022, geo: () => new THREE.BoxGeometry(0.9, 0.9, 0.9), y: 0.45 },
  ];

  for (const cfg of configs) {
    for (let n = 0; n < cfg.count; n++) {
      const angle = Math.random() * Math.PI * 2;
      const spawnR = ARENA_RADIUS - 1.0;
      const spawnPos = new THREE.Vector3(
        Math.cos(angle) * spawnR,
        cfg.y,
        Math.sin(angle) * spawnR
      );

      const geo = cfg.geo();
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(spawnPos);
      mesh.castShadow = true;
      mesh.name = 'enemy';
      scene.add(mesh);

      // HP bar
      const hpBarGeo = new THREE.PlaneGeometry(1.0, 0.12);
      const hpBarBgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
      const hpBarBg = new THREE.Mesh(hpBarGeo, hpBarBgMat);
      hpBarBg.position.y = 1.4;
      hpBarBg.rotation.x = -Math.PI / 6;
      mesh.add(hpBarBg);

      const hpBarFillMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide });
      const hpBarFill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.12), hpBarFillMat);
      hpBarFill.position.y = 1.4;
      hpBarFill.position.z = 0.01;
      hpBarFill.rotation.x = -Math.PI / 6;
      mesh.add(hpBarFill);

      const enemy = {
        mesh,
        hpBarFill,
        hp: cfg.hp,
        maxHp: cfg.maxHp,
        speed: cfg.speed,
        dmg: cfg.dmg,
        type: cfg.type,
        pos: spawnPos.clone(),
        state: 'moving', // moving | attacking | telegraphing | dead
        attackTimer: Math.random() * ENEMY_ATTACK_COOLDOWN,
        telegraphTimer: 0,
        taunted: false,
        tauntTimer: 0,
        telegraph: null,
      };
      enemies.push(enemy);
    }
  }
}
// ─── Turrets ──────────────────────────────────────────────────────────────────
function placeTurret(pos) {
  const geo = new THREE.CylinderGeometry(0.3, 0.45, 0.8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffcc00, emissive: 0x553300, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.4
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y = 0.4;
  mesh.castShadow = true;
  scene.add(mesh);

  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
  const barrelMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.25, 0.4);
  mesh.add(barrel);

  const turret = {
    mesh,
    pos: pos.clone(),
    attackTimer: TURRET_ATTACK_COOLDOWN,
    state: 'active',
  };
  turrets.push(turret);
  spawnParticleBurst(pos, 0xffcc00, 12);
  playSound('place');
}

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnParticleBurst(pos, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.5;
    scene.add(mesh);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 6
    );
    particles.push({ mesh, vel, life: 0.6 + Math.random() * 0.4 });
  }
}

// ─── Telegraph rings ──────────────────────────────────────────────────────────
function spawnTelegraph(pos, radius, color = 0xff2244) {
  const geo = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 32);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y = 0.08;
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
  const t = { mesh, timer: TELEGRAPH_DURATION };
  telegraphs.push(t);
  return t;
}

// ─── Rejection bubble ─────────────────────────────────────────────────────────
function showRejectionBubble(worldPos, text) {
  const projected = worldPos.clone().project(camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = 'rejection-bubble';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  bubblesEl.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ─── Selection / Input ────────────────────────────────────────────────────────
function selectAgent(idx) {
  selectedAgentIdx = idx;
  agents.forEach((a, i) => {
    a.selRing.visible = i === idx && a.state !== 'dead';
    updateAgentCard(i);
  });
  if (idx >= 0) {
    selectionInfoEl.textContent = `${AGENT_NAMES[idx]} selected · Click ground to move · Click enemy to attack`;
  } else {
    selectionInfoEl.textContent = 'Click an agent to select · SPACE to start wave';
  }
}

function onClick(e) {
  if (!gameStarted || phase === 'gameover' || phase === 'win') return;
  // Don't intercept clicks on UI buttons
  if (e.target.tagName === 'BUTTON') return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const allObjects = [];

  // Collect agent meshes
  agents.forEach((a) => { if (a.state !== 'dead') allObjects.push(a.mesh); });
  // Collect enemy meshes
  enemies.forEach((en) => { if (en.state !== 'dead') allObjects.push(en.mesh); });
  // Ground
  allObjects.push(groundMesh);

  const hits = raycaster.intersectObjects(allObjects, false);
  if (hits.length === 0) return;

  const hit = hits[0];
  const obj = hit.object;

  // Check if clicked an agent
  const agentHit = agents.findIndex(a => a.mesh === obj);
  if (agentHit >= 0) {
    if (agents[agentHit].state === 'dead') {
      showRejectionBubble(agents[agentHit].pos.clone().setY(1.5), 'AGENT DOWN');
      return;
    }
    selectAgent(agentHit);
    return;
  }

  // Check if clicked an enemy (when an agent is selected)
  const enemyHit = enemies.findIndex(en => en.mesh === obj);
  if (enemyHit >= 0 && selectedAgentIdx >= 0) {
    const agent = agents[selectedAgentIdx];
    if (agent.state === 'dead') {
      showRejectionBubble(agent.pos.clone().setY(1.5), 'AGENT DOWN');
      return;
    }
    // Only Fighter and Scout can attack; Builder/Medic reject
    if (agent.type === 'builder') {
      showRejectionBubble(agent.pos.clone().setY(1.5), 'NOT MY JOB');
      playSound('reject');
      return;
    }
    if (agent.type === 'medic') {
      showRejectionBubble(agent.pos.clone().setY(1.5), 'HEAL ONLY');
      playSound('reject');
      return;
    }
    agent.attackTarget = enemies[enemyHit];
    agent.target = null;
    agent.state = 'moving';
    return;
  }

  // Clicked ground
  if (obj === groundMesh && selectedAgentIdx >= 0) {
    const agent = agents[selectedAgentIdx];
    if (agent.state === 'dead') return;

    const clickPos = hit.point.clone();

    // Builder: if in build phase and near edge, place turret
    if (agent.type === 'builder' && phase === 'build') {
      const distFromCore = clickPos.length();
      if (distFromCore < 3) {
        showRejectionBubble(agent.pos.clone().setY(1.5), 'TOO CLOSE');
        playSound('reject');
        return;
      }
      if (distFromCore > ARENA_RADIUS - 2) {
        showRejectionBubble(agent.pos.clone().setY(1.5), 'OUT OF BOUNDS');
        playSound('reject');
        return;
      }
      if (!abilityUnlocked[3]) {
        showRejectionBubble(agent.pos.clone().setY(1.5), 'UNLOCK FIRST');
        playSound('reject');
        return;
      }
      if (abilityCooldown[3] > 0) {
        showRejectionBubble(agent.pos.clone().setY(1.5), 'RECHARGING');
        playSound('reject');
        return;
      }
      // Move builder to location then place turret
      agent.target = clickPos.clone();
      agent.target.y = 0.5;
      agent.attackTarget = null;
      agent.state = 'moving';
      agent._pendingTurret = clickPos.clone();
      abilityCooldown[3] = 30;
      updateAbilityPanel();
      return;
    }

    // Move agent to clicked position
    const target = clickPos.clone();
    target.y = 0.5;
    agent.target = target;
    agent.attackTarget = null;
    agent.state = 'moving';
    agent._pendingTurret = null;
  }
}

function onKeyDown(e) {
  if (!gameStarted) return;
  const k = e.key;
  if (k === '1') selectAgent(0);
  else if (k === '2') selectAgent(1);
  else if (k === '3') selectAgent(2);
  else if (k === '4') selectAgent(3);
  else if (k === ' ') {
    e.preventDefault();
    if (phase === 'build') startCombat();
    else if (phase === 'waveclear') nextWave();
  }
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function startGame() {
  startOverlayEl.style.display = 'none';
  gameStarted = true;
  phase = 'build';
  waveNum = 1;
  updateHud();
  startBGM();
  phaseEl.textContent = 'BUILD PHASE — SPACE to start wave';
}

function restartGame() {
  // Clean up scene
  enemies.forEach(en => scene.remove(en.mesh));
  turrets.forEach(t => scene.remove(t.mesh));
  particles.forEach(p => scene.remove(p.mesh));
  telegraphs.forEach(t => scene.remove(t.mesh));
  agents.forEach(a => scene.remove(a.mesh));
  scene.remove(coreGroup);

  enemies = [];
  turrets = [];
  particles = [];
  telegraphs = [];
  agents = [];

  coreHp = CORE_MAX_HP;
  waveNum = 1;
  phase = 'build';
  selectedAgentIdx = -1;
  abilityUnlocked = { 2: false, 3: false, 5: false, 6: false };
  abilityCooldown = { 2: 0, 3: 0, 5: 0, 6: 0 };

  overlayEl.classList.remove('show');
  buildCore();
  buildAgents();
  buildAbilityPanel();
  updateHud();
  phaseEl.textContent = 'BUILD PHASE — SPACE to start wave';
}

function startCombat() {
  if (phase !== 'build') return;
  phase = 'combat';
  phaseEl.textContent = 'WAVE ' + waveNum + ' — DEFEND THE CORE';
  waveNumEl.textContent = waveNum;
  spawnEnemies();
  playSound('waveStart');
}

function endWave() {
  if (waveNum >= 7) {
    phase = 'win';
    triggerWin();
    return;
  }
  phase = 'waveclear';
  phaseEl.textContent = 'WAVE ' + waveNum + ' CLEAR — SPACE for next wave';
  playSound('waveClear');
  checkAbilityUnlocks();
}

function nextWave() {
  if (phase !== 'waveclear') return;
  waveNum++;
  phase = 'build';
  updateHud();
  phaseEl.textContent = 'BUILD PHASE — SPACE to start wave';
}

function triggerWin() {
  overlayTitleEl.textContent = 'DIRECTIVE COMPLETE';
  overlaySubEl.textContent = 'All 7 waves defeated. The Core stands.';
  overlayEl.classList.add('show');
  playSound('win');
}

function triggerLose() {
  phase = 'gameover';
  overlayTitleEl.textContent = 'CORE LOST';
  overlaySubEl.textContent = 'The core was destroyed. Wave ' + waveNum + ' of 7.';
  overlayEl.classList.add('show');
  playSound('lose');
}

function updateHud() {
  waveNumEl.textContent = waveNum;
  updateCoreHpDisplay();
}

// ─── Ability unlocks ──────────────────────────────────────────────────────────
function checkAbilityUnlocks() {
  const wave = waveNum;
  for (const w of [2, 3, 5, 6]) {
    if (wave >= w && !abilityUnlocked[w]) {
      abilityUnlocked[w] = true;
      showUnlockFlash(ABILITY_UNLOCKS[w].name + ' UNLOCKED');
      updateAbilityPanel();
    }
  }
}

function showUnlockFlash(text) {
  unlockFlashEl.textContent = text;
  unlockFlashEl.style.display = 'block';
  unlockFlashEl.style.animation = 'none';
  void unlockFlashEl.offsetWidth;
  unlockFlashEl.style.animation = 'unlockFlash 2s ease-out forwards';
  setTimeout(() => { unlockFlashEl.style.display = 'none'; }, 2000);
  playSound('unlock');
}

function buildAbilityPanel() {
  abilityPanelEl.innerHTML = '';
  for (const w of [2, 3, 5, 6]) {
    const btn = document.createElement('button');
    btn.className = 'ability-btn' + (!abilityUnlocked[w] ? ' locked' : '');
    btn.id = 'ability-btn-' + w;
    btn.dataset.wave = w;
    const info = ABILITY_UNLOCKS[w];
    btn.textContent = (abilityUnlocked[w] ? '' : '[W' + w + '] ') + info.name;
    btn.title = info.desc;
    btn.addEventListener('click', () => useAbility(w));
    abilityPanelEl.appendChild(btn);
  }
}

function updateAbilityPanel() {
  for (const w of [2, 3, 5, 6]) {
    const btn = document.getElementById('ability-btn-' + w);
    if (!btn) continue;
    const info = ABILITY_UNLOCKS[w];
    if (!abilityUnlocked[w]) {
      btn.className = 'ability-btn locked';
      btn.textContent = '[W' + w + '] ' + info.name;
    } else if (abilityCooldown[w] > 0) {
      btn.className = 'ability-btn on-cooldown';
      btn.textContent = info.name + ' (' + Math.ceil(abilityCooldown[w]) + 's)';
    } else {
      btn.className = 'ability-btn';
      btn.textContent = info.name;
    }
  }
}

function useAbility(w) {
  if (!abilityUnlocked[w] || abilityCooldown[w] > 0) return;

  if (w === 2) {
    // Scout reveal — mark all enemies visible
    abilityDuration[2] = 8;
    enemies.forEach(en => { en.revealed = true; });
    abilityCooldown[2] = 20;
    showUnlockFlash('SCOUT REVEAL ACTIVE');
  } else if (w === 3) {
    // Builder turret — handled on ground click
    showRejectionBubble(agents[1].pos.clone().setY(1.5), 'SELECT LOCATION');
    selectAgent(1);
  } else if (w === 5) {
    // Fighter taunt
    agents[2].type = 'fighter';
    enemies.forEach(en => {
      en.taunted = true;
      en.tauntTimer = 5;
    });
    abilityCooldown[5] = 25;
    showUnlockFlash('TAUNT ACTIVE: Enemies drawn to Fighter');
    spawnParticleBurst(agents[2].pos.clone(), 0xff4400, 20);
  } else if (w === 6) {
    // Medic burst — heal all agents
    agents.forEach(a => {
      if (a.state !== 'dead') {
        a.hp = Math.min(a.maxHp, a.hp + MEDIC_HEAL_AMT * 2);
        updateAgentCard(a.idx);
        spawnParticleBurst(a.pos.clone(), 0x00ff88, 10);
      }
    });
    abilityCooldown[6] = 30;
    showUnlockFlash('MEDIC BURST: All agents healed');
  }

  updateAbilityPanel();
}

// ─── Main update loop ─────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!gameStarted || phase === 'gameover' || phase === 'win') {
    if (composer) composer.render();
    else renderer.render(scene, camera);
    return;
  }

  updateCore(dt);
  updateAgents(dt);
  if (phase === 'combat') updateEnemies(dt);
  updateTurrets(dt);
  updateParticles(dt);
  updateTelegraphs(dt);
  updateAbilityCooldowns(dt);
  updateCameraShake(dt);
  checkWinCondition();

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

// ─── Core update ──────────────────────────────────────────────────────────────
function updateCore(dt) {
  if (!coreMesh) return;
  coreMesh.rotation.y += dt * 0.5;
  const orbit = coreGroup.getObjectByName('coreOrbit');
  if (orbit) orbit.rotation.z += dt * 1.2;
}

// ─── Agent update ─────────────────────────────────────────────────────────────
function updateAgents(dt) {
  for (const agent of agents) {
    if (agent.state === 'dead') continue;

    // Autonomous behaviours when idle during combat
    if (phase === 'combat' && agent.state === 'idle' && !agent.attackTarget) {
      if (agent.type === 'fighter' || agent.type === 'scout') {
        // Auto-target nearest enemy
        const nearest = nearestEnemy(agent.pos);
        if (nearest && agent.pos.distanceTo(nearest.pos) < AGENT_ATTACK_RANGE * 2.5) {
          agent.attackTarget = nearest;
          agent.state = 'moving';
        }
      } else if (agent.type === 'medic') {
        // Auto-heal lowest HP ally
        const needsHeal = agents
          .filter(a => a !== agent && a.state !== 'dead' && a.hp < a.maxHp)
          .sort((a, b) => a.hp - b.hp)[0];
        if (needsHeal) {
          agent.supportTarget = needsHeal;
          agent.state = 'moving';
        }
      }
    }

    // Move toward target
    if (agent.target && agent.state === 'moving' && !agent.attackTarget) {
      const dir = agent.target.clone().sub(agent.pos);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.3) {
        agent.pos.copy(agent.target);
        agent.mesh.position.copy(agent.pos);
        agent.state = 'idle';
        agent.target = null;
        // Place turret if pending
        if (agent._pendingTurret) {
          placeTurret(agent._pendingTurret);
          agent._pendingTurret = null;
        }
      } else {
        dir.normalize().multiplyScalar(AGENT_SPEED * dt);
        agent.pos.add(dir);
        agent.mesh.position.copy(agent.pos);
        agent.mesh.position.y = 0.5;
        // Face movement direction
        if (dir.length() > 0.001) {
          agent.mesh.lookAt(agent.pos.clone().add(new THREE.Vector3(dir.x, 0, dir.z)));
        }
      }
    }

    // Move toward attack target
    if (agent.attackTarget && agent.state === 'moving') {
      if (agent.attackTarget.state === 'dead') {
        agent.attackTarget = null;
        agent.state = 'idle';
        continue;
      }
      const dir = agent.attackTarget.pos.clone().sub(agent.pos);
      dir.y = 0;
      const dist = dir.length();
      if (dist < AGENT_ATTACK_RANGE) {
        agent.state = 'attacking';
      } else {
        dir.normalize().multiplyScalar(AGENT_SPEED * dt);
        agent.pos.add(dir);
        agent.mesh.position.copy(agent.pos);
        agent.mesh.position.y = 0.5;
        if (dir.length() > 0.001) {
          agent.mesh.lookAt(agent.pos.clone().add(new THREE.Vector3(dir.x, 0, dir.z)));
        }
      }
    }

    // Attack
    if (agent.state === 'attacking' && agent.attackTarget) {
      if (agent.attackTarget.state === 'dead') {
        agent.attackTarget = null;
        agent.state = 'idle';
        continue;
      }
      const dist = agent.pos.distanceTo(agent.attackTarget.pos);
      if (dist > AGENT_ATTACK_RANGE + 0.5) {
        agent.state = 'moving';
        continue;
      }

      agent.attackTimer -= dt;
      if (agent.attackTimer <= 0) {
        agent.attackTimer = AGENT_ATTACK_COOLDOWN;
        const dmg = agent.type === 'fighter' ? 3 : 2;
        damageEnemy(agent.attackTarget, dmg, agent.pos.clone());
        spawnProjectile(agent.pos.clone(), agent.attackTarget.pos.clone(), AGENT_COLORS[agent.idx]);
      }
    }

    // Support (Medic heal)
    if (agent.type === 'medic' && agent.supportTarget) {
      if (agent.supportTarget.state === 'dead') {
        agent.supportTarget = null;
        agent.state = 'idle';
        continue;
      }
      const dist = agent.pos.distanceTo(agent.supportTarget.pos);
      if (agent.state === 'moving') {
        const dir = agent.supportTarget.pos.clone().sub(agent.pos);
        dir.y = 0;
        if (dir.length() < MEDIC_HEAL_RANGE) {
          agent.state = 'supporting';
        } else {
          dir.normalize().multiplyScalar(AGENT_SPEED * dt);
          agent.pos.add(dir);
          agent.mesh.position.copy(agent.pos);
          agent.mesh.position.y = 0.5;
        }
      }
      if (agent.state === 'supporting') {
        if (dist > MEDIC_HEAL_RANGE + 0.5) {
          agent.state = 'moving';
          continue;
        }
        agent.healTimer -= dt;
        if (agent.healTimer <= 0) {
          agent.healTimer = MEDIC_HEAL_COOLDOWN;
          agent.supportTarget.hp = Math.min(agent.supportTarget.maxHp, agent.supportTarget.hp + MEDIC_HEAL_AMT);
          updateAgentCard(agent.supportTarget.idx);
          spawnParticleBurst(agent.supportTarget.pos.clone(), 0x00ff88, 6);
          if (agent.supportTarget.hp >= agent.supportTarget.maxHp) {
            agent.supportTarget = null;
            agent.state = 'idle';
          }
        }
      }
    }

    updateAgentCard(agent.idx);
  }
}

function nearestEnemy(pos) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const en of enemies) {
    if (en.state === 'dead') continue;
    const d = pos.distanceTo(en.pos);
    if (d < nearestDist) { nearestDist = d; nearest = en; }
  }
  return nearest;
}

function damageAgent(agent, dmg) {
  agent.hp -= dmg;
  cameraShake = Math.max(cameraShake, 0.2);
  updateAgentCard(agent.idx);
  if (agent.hp <= 0) {
    agent.hp = 0;
    agent.state = 'dead';
    agent.mesh.visible = false;
    agent.selRing.visible = false;
    spawnParticleBurst(agent.pos.clone(), AGENT_COLORS[agent.idx], 18);
    if (selectedAgentIdx === agent.idx) selectAgent(-1);
    playSound('agentDie');
  }
}

// ─── Enemy update ─────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  let allDead = true;

  for (const en of enemies) {
    if (en.state === 'dead') continue;
    allDead = false;

    // Taunt timer
    if (en.taunted) {
      en.tauntTimer -= dt;
      if (en.tauntTimer <= 0) en.taunted = false;
    }

    // Telegraph countdown
    if (en.state === 'telegraphing') {
      en.telegraphTimer -= dt;
      if (en.telegraphTimer <= 0) {
        en.state = 'attacking';
        if (en.telegraph) {
          scene.remove(en.telegraph.mesh);
          telegraphs = telegraphs.filter(t => t !== en.telegraph);
          en.telegraph = null;
        }
      }
      continue;
    }

    // Choose movement target
    let target;
    if (en.taunted) {
      const fighter = agents.find(a => a.type === 'fighter' && a.state !== 'dead');
      target = fighter ? fighter.pos : CORE_POS;
    } else {
      target = CORE_POS;
    }

    const dir = target.clone().sub(en.pos);
    dir.y = 0;
    const dist = dir.length();

    // Attack range
    const attackRange = en.type === 'tank' ? 2.8 : ENEMY_ATTACK_RANGE;
    const coreRange = 2.5;

    if (en.state === 'moving') {
      if (dist < coreRange) {
        en.state = 'telegraphing';
        en.telegraphTimer = TELEGRAPH_DURATION;
        en.telegraph = spawnTelegraph(CORE_POS.clone(), coreRange, 0xff2244);
        playSound('telegraph');
      } else {
        dir.normalize().multiplyScalar(en.speed * dt);
        en.pos.add(dir);
        en.mesh.position.copy(en.pos);
        en.mesh.position.y = en.type === 'rusher' ? 0.35 : (en.type === 'tank' ? 0.55 : 0.45);
        en.mesh.lookAt(en.pos.clone().add(new THREE.Vector3(dir.x, en.mesh.position.y, dir.z)));

        // Check if taunted and nearby fighter
        if (en.taunted) {
          const fighter = agents.find(a => a.type === 'fighter' && a.state !== 'dead');
          if (fighter && en.pos.distanceTo(fighter.pos) < attackRange) {
            triggerEnemyAttack(en, fighter, 'agent');
          }
        }

        // Check if near any agent
        for (const ag of agents) {
          if (ag.state === 'dead') continue;
          if (en.pos.distanceTo(ag.pos) < attackRange) {
            triggerEnemyAttack(en, ag, 'agent');
            break;
          }
        }
      }
    }

    if (en.state === 'attacking') {
      // Deal damage to core
      en.attackTimer -= dt;
      if (en.attackTimer <= 0) {
        en.attackTimer = ENEMY_ATTACK_COOLDOWN;
        coreHp -= en.dmg;
        cameraShake = Math.max(cameraShake, 0.35);
        updateCoreHpDisplay();
        spawnParticleBurst(CORE_POS.clone(), 0x4488ff, 8);
        playSound('coreHit');
        if (coreHp <= 0) {
          coreHp = 0;
          triggerLose();
          return;
        }
        en.state = 'moving';
      }
    }

    // Update HP bar
    if (en.hpBarFill) {
      const ratio = en.hp / en.maxHp;
      en.hpBarFill.scale.x = Math.max(0.001, ratio);
      en.hpBarFill.position.x = -(1 - ratio) * 0.5;
    }
  }

  if (allDead && phase === 'combat') {
    endWave();
  }
}

function triggerEnemyAttack(en, agentTarget, targetType) {
  if (en.attackTimer > 0) return;
  en.attackTimer = ENEMY_ATTACK_COOLDOWN;
  en.state = 'telegraphing';
  en.telegraphTimer = TELEGRAPH_DURATION;
  const pos = agentTarget.pos.clone();
  en.telegraph = spawnTelegraph(pos, 1.2, 0xff6600);
  playSound('telegraph');

  // Schedule actual damage after telegraph
  const capturedAgent = agentTarget;
  const capturedEn = en;
  setTimeout(() => {
    if (capturedEn.state === 'dead') return;
    if (capturedAgent.state === 'dead') return;
    damageAgent(capturedAgent, capturedEn.dmg);
    capturedEn.state = 'moving';
  }, TELEGRAPH_DURATION * 1000);
}

function damageEnemy(en, dmg, fromPos) {
  if (en.state === 'dead') return;
  en.hp -= dmg;
  if (en.hp <= 0) {
    en.hp = 0;
    en.state = 'dead';
    scene.remove(en.mesh);
    spawnParticleBurst(en.pos.clone(), 0xff2244, 12);
    playSound('enemyDie');
  }
}

// ─── Turret update ────────────────────────────────────────────────────────────
function updateTurrets(dt) {
  for (const t of turrets) {
    if (t.state !== 'active') continue;
    t.attackTimer -= dt;
    if (t.attackTimer <= 0) {
      // Find nearest enemy in range
      let nearest = null;
      let nearestDist = TURRET_RANGE;
      for (const en of enemies) {
        if (en.state === 'dead') continue;
        const d = t.pos.distanceTo(en.pos);
        if (d < nearestDist) { nearestDist = d; nearest = en; }
      }
      if (nearest) {
        t.attackTimer = TURRET_ATTACK_COOLDOWN;
        damageEnemy(nearest, 2, t.pos.clone());
        spawnProjectile(t.pos.clone(), nearest.pos.clone(), 0xffcc00);
      } else {
        t.attackTimer = 0.3;
      }
    }
    // Rotate turret toward nearest enemy
    const nearest = nearestEnemy(t.pos);
    if (nearest) t.mesh.lookAt(nearest.pos.x, t.mesh.position.y, nearest.pos.z);
  }
}

// ─── Projectile ───────────────────────────────────────────────────────────────
function spawnProjectile(from, to, color) {
  const geo = new THREE.SphereGeometry(0.12, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from);
  mesh.position.y = 0.8;
  scene.add(mesh);
  const vel = to.clone().sub(from);
  vel.y = 0;
  vel.normalize().multiplyScalar(18);
  const maxLife = from.distanceTo(to) / 18;
  particles.push({ mesh, vel, life: maxLife + 0.1, isProjectile: true });
}

// ─── Particle update ──────────────────────────────────────────────────────────
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    if (p.isProjectile) {
      p.mesh.position.addScaledVector(p.vel, dt);
    } else {
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
    }
    p.mesh.material.opacity = Math.min(1, p.life * 3);
    if (!p.mesh.material.transparent) p.mesh.material.transparent = true;
  }
}

// ─── Telegraph update ─────────────────────────────────────────────────────────
function updateTelegraphs(dt) {
  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const t = telegraphs[i];
    t.timer -= dt;
    if (t.timer <= 0) {
      scene.remove(t.mesh);
      telegraphs.splice(i, 1);
      continue;
    }
    const pulse = 0.5 + 0.5 * Math.sin((TELEGRAPH_DURATION - t.timer) * Math.PI * 8 / TELEGRAPH_DURATION);
    t.mesh.material.opacity = 0.4 + 0.5 * pulse;
  }
}

// ─── Ability cooldowns ────────────────────────────────────────────────────────
function updateAbilityCooldowns(dt) {
  let changed = false;
  for (const w of [2, 3, 5, 6]) {
    if (abilityCooldown[w] > 0) {
      abilityCooldown[w] = Math.max(0, abilityCooldown[w] - dt);
      changed = true;
    }
  }
  if (abilityDuration[2] > 0) {
    abilityDuration[2] -= dt;
    if (abilityDuration[2] <= 0) {
      enemies.forEach(en => { en.revealed = false; });
    }
  }
  if (changed) updateAbilityPanel();
}

// ─── Camera shake ─────────────────────────────────────────────────────────────
function updateCameraShake(dt) {
  if (cameraShake <= 0) return;
  const s = cameraShake;
  camera.position.set(
    0 + (Math.random() - 0.5) * s * 0.8,
    36 + (Math.random() - 0.5) * s * 0.4,
    26 + (Math.random() - 0.5) * s * 0.6
  );
  camera.lookAt(0, 0, 0);
  cameraShake -= dt * 3;
  if (cameraShake < 0) cameraShake = 0;
}

// ─── Win check ────────────────────────────────────────────────────────────────
function checkWinCondition() {
  if (phase === 'win' || phase === 'gameover') return;
  if (coreHp <= 0) { triggerLose(); return; }
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, duration, vol, delay = 0) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function startBGM() {
  const ctx = getAudio();
  if (!ctx || bgmStarted) return;
  bgmStarted = true;

  // Sub-bass drone
  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.connect(droneGain);
  droneGain.connect(ctx.destination);
  drone.type = 'sine';
  drone.frequency.value = 60;
  droneGain.gain.setValueAtTime(0.18, ctx.currentTime);
  drone.start();
  bgmNodes.push(drone, droneGain);

  // Tension arpeggio
  const arpFreqs = [220, 277, 330, 440, 370, 294, 247, 185];
  let arpIdx = 0;
  function arpTick() {
    if (!gameStarted) return;
    playTone(arpFreqs[arpIdx % arpFreqs.length], 'sawtooth', 0.3, 0.04);
    arpIdx++;
    setTimeout(arpTick, 600 + Math.random() * 400);
  }
  setTimeout(arpTick, 800);

  // Kick pattern
  const kickTimes = [0, 0.5, 1.0, 1.5, 2.2, 2.5, 3.0, 3.8, 4.0, 4.5, 5.0, 5.5];
  function kickPattern() {
    if (!gameStarted) return;
    kickTimes.forEach(offset => {
      setTimeout(() => {
        if (!gameStarted) return;
        playTone(80, 'sine', 0.15, 0.22);
      }, offset * 1000);
    });
    setTimeout(kickPattern, 6000);
  }
  setTimeout(kickPattern, 1200);
}

function playSound(type) {
  switch (type) {
    case 'waveStart': playTone(440, 'square', 0.3, 0.15); playTone(660, 'square', 0.25, 0.12, 0.15); break;
    case 'waveClear': [330, 440, 550, 660].forEach((f, i) => playTone(f, 'sine', 0.3, 0.14, i * 0.1)); break;
    case 'unlock': [440, 550, 660, 880].forEach((f, i) => playTone(f, 'sine', 0.35, 0.15, i * 0.08)); break;
    case 'enemyDie': playTone(200, 'sawtooth', 0.12, 0.12); break;
    case 'agentDie': [300, 200, 150].forEach((f, i) => playTone(f, 'square', 0.2, 0.14, i * 0.1)); break;
    case 'coreHit': playTone(120, 'square', 0.2, 0.25); break;
    case 'telegraph': playTone(880, 'sine', 0.15, 0.08); break;
    case 'place': [440, 550].forEach((f, i) => playTone(f, 'sine', 0.2, 0.12, i * 0.07)); break;
    case 'reject': playTone(200, 'sawtooth', 0.1, 0.12); break;
    case 'win': [330, 440, 550, 660, 880, 1100].forEach((f, i) => playTone(f, 'sine', 0.5, 0.15, i * 0.12)); break;
    case 'lose': [300, 250, 200, 150, 100].forEach((f, i) => playTone(f, 'sawtooth', 0.4, 0.15, i * 0.15)); break;
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
