// ─── STRAY SIGNAL — game.js ───────────────────────────────────────────────
// T2: All game-critical variables at module scope — no helper-function declarations
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── MODULE-SCOPE STATE (T2) ──────────────────────────────────────────────
let scene, camera, renderer, composer;
let animId;
let clock;

// Grid
const GRID_W = 22;
const GRID_H = 16;
const TILE = 2.4;
const WALL_H = 2.2;

// Player
let player;
let playerPos = { x: 2, y: 2 };        // grid coords
let playerHP = 3;                        // G1: HP buffer
let playerShards = 0;
let playerMoving = false;
let playerMoveTimer = 0;
const MOVE_SPEED = 0.12;                 // seconds per tile

// Input
const keys = {};

// Drifters (3 total) — G8: difficulty from count, not timers
let drifters = [];
// trust: 'trust'|'wary'|'hostile'
// each: { mesh, pos, targetPos, trust, id, labelEl, moving, moveTimer, pathTimer, isBetrayDecoy }

// Shards — G4: randomized positions
let shards = [];                         // { mesh, pos, collected }
let exitNode = null;                     // { mesh, pos, locked }
let exitActive = false;

// Game state
let gameState = 'start';                 // 'start'|'playing'|'win'|'lose'
let timeLeft = 90;
let invincibleTimer = 0;                 // G9: invincibility frames actually work

// Interaction
let nearDrifter = null;
let menuOpen = false;
let menuDrifter = null;

// Audio
let audioCtx = null;
let bgGainNode = null;
let bgStarted = false;

// World map — 0=floor, 1=wall, 2=locked-wall (opens when Trust Drifter shares)
let worldMap = [];
let lockedZones = [];  // indices of locked walls that can be opened

// Drifter labels (DOM)
let drifterLabels = [];

// Three.js meshes cache
let gridMeshes = [];

// ─── WORLD GENERATION ─────────────────────────────────────────────────────
function generateMap() {
  // Initialize with walls around border
  worldMap = [];
  for (let y = 0; y < GRID_H; y++) {
    worldMap[y] = [];
    for (let x = 0; x < GRID_W; x++) {
      if (x === 0 || x === GRID_W-1 || y === 0 || y === GRID_H-1) {
        worldMap[y][x] = 1;
      } else {
        worldMap[y][x] = 0;
      }
    }
  }

  // Add interior walls — creates corridors and zones
  const walls = [
    // Horizontal walls with gaps
    {x1:4,y:4,x2:9,gapX:6},{x1:12,y:4,x2:17,gapX:15},
    {x1:4,y:8,x2:8,gapX:7},{x1:13,y:8,x2:18,gapX:16},
    {x1:4,y:12,x2:10,gapX:7},{x1:13,y:12,x2:18,gapX:15},
    // Vertical walls with gaps
    {vert:true,x:6,y1:4,y2:8,gapY:6},{vert:true,x:10,y1:4,y2:12,gapY:8},
    {vert:true,x:15,y1:4,y2:8,gapY:6},{vert:true,x:18,y1:4,y2:12,gapY:8},
  ];

  walls.forEach(w => {
    if (w.vert) {
      for (let y = w.y1; y <= w.y2; y++) {
        if (y !== w.gapY) worldMap[y][w.x] = 1;
      }
    } else {
      for (let x = w.x1; x <= w.x2; x++) {
        if (x !== w.gapX) worldMap[w.y][x] = 1;
      }
    }
  });

  // Add 2 locked walls (type 2) — can be opened by Trust interaction
  lockedZones = [
    {x:10,y:6},
    {x:15,y:10},
  ];
  lockedZones.forEach(lz => {
    worldMap[lz.y][lz.x] = 2;
  });
}

function isWalkable(x, y) {
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return false;
  return worldMap[y][x] === 0;
}

// ─── THREE.JS SETUP ───────────────────────────────────────────────────────
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000509);
  scene.fog = new THREE.FogExp2(0x000509, 0.04);

  camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 200);
  camera.position.set(GRID_W*TILE/2, 22, GRID_H*TILE/2 + 10);
  camera.lookAt(GRID_W*TILE/2, 0, GRID_H*TILE/2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0x001122, 1.2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x00ffff, 0.4);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Bloom post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    1.6, 0.6, 0.2
  );
  composer.addPass(bloom);

  clock = new THREE.Clock();
}

// ─── WORLD BUILDING ───────────────────────────────────────────────────────
function buildWorld() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(GRID_W*TILE, GRID_H*TILE);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x001018,
    roughness: 0.95,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(GRID_W*TILE/2 - TILE/2, 0, GRID_H*TILE/2 - TILE/2);
  scene.add(floor);

  // Grid lines on floor — circuit board aesthetic
  for (let x = 0; x <= GRID_W; x++) {
    const lineGeo = new THREE.BoxGeometry(0.03, 0.01, GRID_H*TILE);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x004040 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(x*TILE - TILE/2, 0.01, GRID_H*TILE/2 - TILE/2);
    scene.add(line);
  }
  for (let y = 0; y <= GRID_H; y++) {
    const lineGeo = new THREE.BoxGeometry(GRID_W*TILE, 0.01, 0.03);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x004040 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(GRID_W*TILE/2 - TILE/2, 0.01, y*TILE - TILE/2);
    scene.add(line);
  }

  // Walls
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const tile = worldMap[y][x];
      if (tile === 1 || tile === 2) {
        const isLocked = tile === 2;
        const wallGeo = new THREE.BoxGeometry(TILE*0.95, WALL_H, TILE*0.95);
        const wallMat = new THREE.MeshStandardMaterial({
          color: isLocked ? 0x220044 : 0x012030,
          emissive: isLocked ? 0x440088 : 0x001520,
          emissiveIntensity: isLocked ? 0.8 : 0.3,
          roughness: 0.8,
          metalness: 0.3,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x*TILE, WALL_H/2, y*TILE);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData = { gridX: x, gridY: y, isLocked };
        scene.add(wall);
        gridMeshes.push(wall);
      }
    }
  }
}

// ─── PLAYER ───────────────────────────────────────────────────────────────
function createPlayer() {
  const geo = new THREE.OctahedronGeometry(0.55, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00aaaa,
    emissiveIntensity: 1.2,
    roughness: 0.3,
    metalness: 0.7,
  });
  player = new THREE.Mesh(geo, mat);
  player.position.set(playerPos.x*TILE, 0.7, playerPos.y*TILE);
  player.castShadow = true;
  scene.add(player);

  const light = new THREE.PointLight(0x00ffff, 2.5, 8);
  player.add(light);
}

// ─── SHARDS ───────────────────────────────────────────────────────────────
function placeShardsRandomly() {
  // G4: randomize positions each run
  const candidates = [];
  for (let y = 1; y < GRID_H-1; y++) {
    for (let x = 1; x < GRID_W-1; x++) {
      if (isWalkable(x, y) && !(x === playerPos.x && y === playerPos.y)) {
        candidates.push({x,y});
      }
    }
  }
  // Shuffle
  for (let i = candidates.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  shards = [];
  for (let i = 0; i < 5; i++) {
    const pos = candidates[i];
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff6600,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x*TILE, 0.7, pos.y*TILE);
    scene.add(mesh);

    const light = new THREE.PointLight(0xffaa00, 1.5, 4);
    mesh.add(light);

    shards.push({ mesh, pos: {...pos}, collected: false });
  }
}

// ─── EXIT NODE ────────────────────────────────────────────────────────────
function placeExit() {
  // Top area — far from player start
  const exitPos = { x: GRID_W-3, y: 2 };
  worldMap[exitPos.y][exitPos.x] = 0; // ensure walkable

  const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x004400,
    emissive: 0x004400,
    emissiveIntensity: 0.4,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(exitPos.x*TILE, 0.08, exitPos.y*TILE);
  scene.add(mesh);

  // Locked indicator ring
  const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 16);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x440066,
    emissive: 0x440066,
    emissiveIntensity: 1.2,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2;
  ring.position.set(0, 0.2, 0);
  mesh.add(ring);
  mesh.userData.ring = ring;

  const light = new THREE.PointLight(0x004400, 1.2, 5);
  mesh.add(light);

  exitNode = { mesh, pos: exitPos, locked: true, blockedBy: [] };
}

// ─── DRIFTERS ─────────────────────────────────────────────────────────────
const DRIFTER_COLORS = [0xff44aa, 0x44ff88, 0xffcc00];
const DRIFTER_EMISSIVE = [0xaa2266, 0x228844, 0xaa6600];
const DRIFTER_NAMES = ['DRIFTER-A', 'DRIFTER-B', 'DRIFTER-C'];
const DRIFTER_START_POSITIONS = [
  { x: GRID_W-3, y: GRID_H-3 },
  { x: 2, y: GRID_H-3 },
  { x: GRID_W-3, y: GRID_H/2 | 0 },
];

function createDrifters() {
  drifters = [];
  drifterLabels.forEach(el => el.remove());
  drifterLabels = [];

  DRIFTER_START_POSITIONS.forEach((startPos, i) => {
    // Ensure walkable
    const spawnX = Math.min(startPos.x, GRID_W-2);
    const spawnY = Math.min(startPos.y, GRID_H-2);
    const actualPos = findNearestWalkable(spawnX, spawnY);

    const geo = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: DRIFTER_COLORS[i],
      emissive: DRIFTER_EMISSIVE[i],
      emissiveIntensity: 0.8,
      roughness: 0.5,
      metalness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(actualPos.x*TILE, 0.7, actualPos.y*TILE);
    scene.add(mesh);

    const dLight = new THREE.PointLight(DRIFTER_COLORS[i], 1.2, 4);
    mesh.add(dLight);

    // DOM label (G3-adjacent — trust visible without menu)
    const labelEl = document.createElement('div');
    labelEl.className = 'drifter-label';
    labelEl.innerHTML = `😐<br><span class="trust-indicator trust-wary">${DRIFTER_NAMES[i]}</span>`;
    document.body.appendChild(labelEl);
    drifterLabels.push(labelEl);

    drifters.push({
      mesh,
      pos: { ...actualPos },
      targetPos: null,
      trust: 'wary',         // 'trust'|'wary'|'hostile'
      id: i,
      name: DRIFTER_NAMES[i],
      labelEl,
      moving: false,
      moveTimer: 0,
      pathTimer: 1.5 + Math.random()*2,
      interacted: false,
      stealShard: false,     // whether they collected a shard
    });
  });
}

function findNearestWalkable(x, y) {
  if (isWalkable(x, y)) return {x, y};
  for (let r = 1; r < 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (isWalkable(x+dx, y+dy)) return {x:x+dx, y:y+dy};
      }
    }
  }
  return { x: 2, y: 2 };
}

// ─── AUDIO ────────────────────────────────────────────────────────────────
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startBackground();
}

function startBackground() {
  if (!audioCtx || bgStarted) return;
  bgStarted = true;

  bgGainNode = audioCtx.createGain();
  bgGainNode.gain.value = 0.18;
  bgGainNode.connect(audioCtx.destination);

  // G6: looping ambient — glitch/drone loop >60s
  function makeLoop() {
    const now = audioCtx.currentTime;

    // Sub-bass drone
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 55;
    bassGain.gain.value = 0.5;
    bassOsc.connect(bassGain);
    bassGain.connect(bgGainNode);
    bassOsc.start(now);
    bassOsc.stop(now + 65);

    // High pulse oscillator
    const pulseOsc = audioCtx.createOscillator();
    const pulseGain = audioCtx.createGain();
    pulseOsc.type = 'square';
    pulseOsc.frequency.value = 220;
    pulseGain.gain.value = 0;
    pulseOsc.connect(pulseGain);
    pulseGain.connect(bgGainNode);
    pulseOsc.start(now);
    pulseOsc.stop(now + 65);

    // LFO on pulse gain — creates glitch rhythm
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 2.3;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(pulseGain.gain);
    lfo.start(now);
    lfo.stop(now + 65);

    // Tension pad
    const padOsc = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    padOsc.type = 'sawtooth';
    padOsc.frequency.value = 110;
    padGain.gain.value = 0;
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.08, now + 4);
    padGain.gain.setValueAtTime(0.08, now + 60);
    padGain.gain.linearRampToValueAtTime(0, now + 65);
    padOsc.connect(padGain);
    padGain.connect(bgGainNode);
    padOsc.start(now);
    padOsc.stop(now + 65);

    // Arpeggio notes — glitchy sequence
    const notes = [110, 138.6, 164.8, 220, 164.8, 138.6, 110, 82.4];
    notes.forEach((freq, idx) => {
      const arpOsc = audioCtx.createOscillator();
      const arpGain = audioCtx.createGain();
      arpOsc.type = 'square';
      arpOsc.frequency.value = freq;
      const t = now + 6 + idx * 0.4;
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.04, t + 0.02);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      arpOsc.connect(arpGain);
      arpGain.connect(bgGainNode);
      arpOsc.start(t);
      arpOsc.stop(t + 0.4);
    });

    // Schedule next loop before this one ends
    setTimeout(makeLoop, 62000);
  }
  makeLoop();
}

function playShardPickup() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.25;
  g.connect(audioCtx.destination);
  [440, 554, 659, 880].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const t = now + i*0.08;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.25);
    o.connect(g);
    o.start(t);
    o.stop(t+0.3);
  });
}

function playTrustChange(isPositive) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.2;
  g.connect(audioCtx.destination);
  const o = audioCtx.createOscillator();
  o.type = isPositive ? 'sine' : 'sawtooth';
  o.frequency.setValueAtTime(isPositive ? 660 : 180, now);
  o.frequency.exponentialRampToValueAtTime(isPositive ? 880 : 80, now + 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.45);
}

function playBetrayal() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.3;
  g.connect(audioCtx.destination);
  [100,95,90,85,80].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const t = now + i*0.07;
    const og = audioCtx.createGain();
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t+0.15);
    o.connect(og);
    og.connect(audioCtx.destination);
    o.start(t);
    o.stop(t+0.2);
  });
}

function playHit() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.35;
  g.connect(audioCtx.destination);
  const o = audioCtx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, now);
  o.frequency.exponentialRampToValueAtTime(50, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.5);
}

function playExitBlocked() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.25;
  g.connect(audioCtx.destination);
  [300, 250, 300].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const t = now + i * 0.12;
    const og = audioCtx.createGain();
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og);
    og.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.15);
  });
}

function playWin() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [440, 554, 659, 880, 1109].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    const t = now + i * 0.12;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.7);
  });
}

function playLose() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [200, 160, 120, 90, 60].forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const t = now + i * 0.2;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.5);
  });
}

// ─── GAME INIT ─────────────────────────────────────────────────────────────
function initGame() {
  // Reset state
  playerPos = { x: 2, y: 2 };
  playerHP = 3;
  playerShards = 0;
  playerMoving = false;
  playerMoveTimer = 0;
  timeLeft = 90;
  invincibleTimer = 0;
  exitActive = false;
  menuOpen = false;
  nearDrifter = null;
  menuDrifter = null;
  gameState = 'playing';

  // Clear scene
  if (scene) {
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    gridMeshes = [];
  } else {
    initThree();
  }

  generateMap();
  buildWorld();
  createPlayer();
  placeShardsRandomly();
  placeExit();
  createDrifters();
  updateHUD();
  updateExitVisual();

  // Hide/show UI
  document.getElementById('endscreen').classList.remove('visible');
  document.getElementById('startscreen').classList.add('hidden');
  document.getElementById('interact-menu').classList.remove('visible');
}

// ─── UPDATE LOOP ──────────────────────────────────────────────────────────
function update(dt) {
  if (gameState !== 'playing') return;

  // Timer
  timeLeft -= dt;
  if (timeLeft <= 0) { endGame('timeout'); return; }

  // Invincibility frames (G9)
  if (invincibleTimer > 0) invincibleTimer -= dt;

  // Player movement
  updatePlayerMovement(dt);

  // Drifter AI
  drifters.forEach(d => updateDrifter(d, dt));

  // Shard auto-collection (G3)
  checkShardCollection();

  // Check exit
  checkExit();

  // Near drifter detection for prompt
  checkNearDrifter();

  // Animate meshes
  const t = clock.getElapsedTime();
  // Player rotation
  player.rotation.y = t * 1.5;

  // Shard float + rotate
  shards.forEach((s, i) => {
    if (!s.collected) {
      s.mesh.position.y = 0.7 + Math.sin(t * 2 + i * 1.3) * 0.18;
      s.mesh.rotation.y = t * 2;
    }
  });

  // Exit node pulse
  if (exitNode) {
    const ring = exitNode.mesh.userData.ring;
    const scale = exitActive ? 1 + Math.sin(t*4)*0.08 : 1;
    ring.scale.set(scale, scale, scale);
  }

  // Drifter hover
  drifters.forEach((d, i) => {
    d.mesh.position.y = 0.7 + Math.sin(t * 1.8 + i * 2.1) * 0.12;
    d.mesh.rotation.y = t * 0.9 + i;
  });

  // Camera follow player (G7)
  const targetCamX = player.position.x;
  const targetCamZ = player.position.z + 14;
  camera.position.x += (targetCamX - camera.position.x) * 0.06;
  camera.position.z += (targetCamZ - camera.position.z) * 0.06;
  camera.lookAt(player.position.x, 0, player.position.z);

  // Update drifter DOM labels
  updateDrifterLabels();

  updateHUD();
}

// ─── PLAYER MOVEMENT ──────────────────────────────────────────────────────
function updatePlayerMovement(dt) {
  if (menuOpen) return;
  if (playerMoving) {
    playerMoveTimer -= dt;
    if (playerMoveTimer <= 0) {
      playerMoving = false;
      // Snap to grid
      player.position.x = playerPos.x * TILE;
      player.position.z = playerPos.y * TILE;
    } else {
      // Lerp visual toward target
      const progress = 1 - (playerMoveTimer / MOVE_SPEED);
      // already animating
    }
    return;
  }

  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
  else if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
  else if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
  else if (keys['KeyD'] || keys['ArrowRight']) dx = 1;

  if (dx !== 0 || dy !== 0) {
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (isWalkable(nx, ny)) {
      playerPos.x = nx;
      playerPos.y = ny;
      playerMoving = true;
      playerMoveTimer = MOVE_SPEED;
      // Animate via lerp in render
      const startX = player.position.x;
      const startZ = player.position.z;
      const endX = nx * TILE;
      const endZ = ny * TILE;
      // Store for lerp in render
      player.userData.startX = startX;
      player.userData.startZ = startZ;
      player.userData.endX = endX;
      player.userData.endZ = endZ;
    }
  }

  // Apply lerp if moving
  if (playerMoving && player.userData.endX !== undefined) {
    const progress = 1 - (playerMoveTimer / MOVE_SPEED);
    player.position.x = player.userData.startX + (player.userData.endX - player.userData.startX) * Math.min(progress,1);
    player.position.z = player.userData.startZ + (player.userData.endZ - player.userData.startZ) * Math.min(progress,1);
  }
}

// ─── DRIFTER AI ───────────────────────────────────────────────────────────
function updateDrifter(d, dt) {
  // Hostile drifters move toward player
  // Trust drifters wander freely
  // Wary drifters wander but avoid player

  d.pathTimer -= dt;

  if (!d.moving) {
    if (d.pathTimer <= 0) {
      d.pathTimer = 1.2 + Math.random() * 2;
      const newTarget = getDrifterMoveTarget(d);
      if (newTarget) {
        d.targetPos = newTarget;
        d.moving = true;
        d.moveTimer = 0.18 + Math.random() * 0.06;
        // Store lerp
        d.mesh.userData.startX = d.mesh.position.x;
        d.mesh.userData.startZ = d.mesh.position.z;
        d.mesh.userData.endX = newTarget.x * TILE;
        d.mesh.userData.endZ = newTarget.y * TILE;
      }
    }
  } else {
    d.moveTimer -= dt;
    if (d.moveTimer <= 0) {
      d.moving = false;
      if (d.targetPos) {
        d.pos.x = d.targetPos.x;
        d.pos.y = d.targetPos.y;
        d.mesh.position.x = d.pos.x * TILE;
        d.mesh.position.z = d.pos.y * TILE;
      }
    } else {
      const progress = 1 - (d.moveTimer / 0.18);
      if (d.mesh.userData.startX !== undefined) {
        d.mesh.position.x = d.mesh.userData.startX + (d.mesh.userData.endX - d.mesh.userData.startX) * Math.min(progress,1);
        d.mesh.position.z = d.mesh.userData.startZ + (d.mesh.userData.endZ - d.mesh.userData.startZ) * Math.min(progress,1);
      }
    }
  }

  // Hostile drifter attacks player on contact (G1: HP buffer)
  if (d.trust === 'hostile') {
    const distX = Math.abs(d.pos.x - playerPos.x);
    const distY = Math.abs(d.pos.y - playerPos.y);
    if (distX <= 1 && distY <= 1 && invincibleTimer <= 0) {
      playerHP -= 1;
      invincibleTimer = 2.5; // G9: actually works
      flashScreen('#ff2200', 0.5);
      playHit();
      updateHPDisplay();
      if (playerHP <= 0) {
        endGame('killed');
      }
    }
  }
}

function getDrifterMoveTarget(d) {
  const px = playerPos.x, py = playerPos.y;
  const dx = d.pos.x, dy = d.pos.y;

  const neighbors = [
    {x:dx+1,y:dy},{x:dx-1,y:dy},{x:dx,y:dy+1},{x:dx,y:dy-1}
  ].filter(p => isWalkable(p.x, p.y));

  if (neighbors.length === 0) return null;

  if (d.trust === 'hostile') {
    // Move toward player
    neighbors.sort((a,b) => {
      const da = Math.abs(a.x-px) + Math.abs(a.y-py);
      const db = Math.abs(b.x-px) + Math.abs(b.y-py);
      return da - db;
    });
    return neighbors[0];
  } else if (d.trust === 'wary') {
    // Avoid player — pick furthest from player
    neighbors.sort((a,b) => {
      const da = Math.abs(a.x-px) + Math.abs(a.y-py);
      const db = Math.abs(b.x-px) + Math.abs(b.y-py);
      return db - da;
    });
    // 70% avoid, 30% random
    if (Math.random() < 0.7) return neighbors[0];
    return neighbors[Math.floor(Math.random()*neighbors.length)];
  } else {
    // Trust — random wander
    return neighbors[Math.floor(Math.random()*neighbors.length)];
  }
}

// ─── SHARD COLLECTION (G3: auto-collect on proximity) ─────────────────────
function checkShardCollection() {
  shards.forEach(s => {
    if (s.collected) return;
    const distX = Math.abs(s.pos.x - playerPos.x);
    const distY = Math.abs(s.pos.y - playerPos.y);
    if (distX <= 1 && distY <= 1) {
      // Auto-collect
      s.collected = true;
      s.mesh.visible = false;
      playerShards += 1;
      playShardPickup();
      shardFlash();
      updateHUD();

      if (playerShards >= 5) {
        activateExit();
      }
    }
  });
}

function shardFlash() {
  const el = document.getElementById('shard-flash');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 300);
}

// ─── EXIT ─────────────────────────────────────────────────────────────────
function activateExit() {
  exitActive = true;
  updateExitVisual();
  document.getElementById('objective').textContent = '⚡ UPLINK ACTIVE — REACH EXIT (TOP-RIGHT)';

  // Check if blocked by hostile drifters
  exitNode.blockedBy = drifters.filter(d => d.trust === 'hostile').map(d => d.id);
}

function updateExitVisual() {
  if (!exitNode) return;
  const mat = exitNode.mesh.material;
  const ring = exitNode.mesh.userData.ring;
  if (exitActive) {
    mat.color.setHex(0x00ff44);
    mat.emissive.setHex(0x00aa22);
    mat.emissiveIntensity = 1.5;
    ring.material.color.setHex(0x00ff44);
    ring.material.emissive.setHex(0x00ff44);
    ring.material.emissiveIntensity = 2.0;
    // Update exit light
    exitNode.mesh.children.forEach(c => {
      if (c.isLight) { c.color.setHex(0x00ff44); c.intensity = 2.5; }
    });
  } else {
    mat.color.setHex(0x004400);
    mat.emissive.setHex(0x004400);
    mat.emissiveIntensity = 0.4;
    ring.material.color.setHex(0x440066);
    ring.material.emissive.setHex(0x440066);
    ring.material.emissiveIntensity = 1.2;
  }
}

function checkExit() {
  if (!exitActive || !exitNode) return;
  const distX = Math.abs(exitNode.pos.x - playerPos.x);
  const distY = Math.abs(exitNode.pos.y - playerPos.y);
  if (distX <= 1 && distY <= 1) {
    // Check blocked
    const blockingDrifters = drifters.filter(d => d.trust === 'hostile');
    if (blockingDrifters.length > 0) {
      // Can't exit — blocked
      playExitBlocked();
      flashScreen('#aa00ff', 0.4);
      document.getElementById('objective').textContent =
        `⚠ BLOCKED BY ${blockingDrifters.length} HOSTILE DRIFTER${blockingDrifters.length>1?'S':''} — APPEASE OR REROUTE`;
      return;
    }
    endGame('win');
  }
}

// ─── NEAR DRIFTER DETECTION ───────────────────────────────────────────────
function checkNearDrifter() {
  if (menuOpen) return;
  nearDrifter = null;
  for (const d of drifters) {
    const distX = Math.abs(d.pos.x - playerPos.x);
    const distY = Math.abs(d.pos.y - playerPos.y);
    if (distX <= 1 && distY <= 1) {
      nearDrifter = d;
      break;
    }
  }
  const prompt = document.getElementById('interact-prompt');
  if (nearDrifter) {
    prompt.classList.add('visible');
    prompt.textContent = `[ E ] INTERACT WITH ${nearDrifter.name} (${nearDrifter.trust.toUpperCase()})`;
  } else {
    prompt.classList.remove('visible');
  }
}

// ─── INTERACTION MENU ─────────────────────────────────────────────────────
function openInteractMenu(d) {
  menuOpen = true;
  menuDrifter = d;

  const menu = document.getElementById('interact-menu');
  document.getElementById('interact-title').textContent =
    `${d.name} — ${getTrustEmoji(d.trust)} ${d.trust.toUpperCase()}`;
  document.getElementById('interact-status').textContent =
    d.trust === 'hostile' ? '⚠ This Drifter BLOCKS your exit gate.'
    : d.trust === 'wary' ? 'Cautious. Will become hostile if betrayed again.'
    : '✓ This Drifter will NOT block your exit.';
  menu.classList.add('visible');
}

function closeInteractMenu() {
  menuOpen = false;
  menuDrifter = null;
  document.getElementById('interact-menu').classList.remove('visible');
}

function handleShare() {
  if (!menuDrifter) return;
  const d = menuDrifter;
  // Trust improves
  const prev = d.trust;
  if (d.trust === 'hostile') d.trust = 'wary';
  else d.trust = 'trust';
  playTrustChange(true);
  flashScreen('#00ff44', 0.3);
  updateDrifterVisual(d);

  // Share map data — open nearest locked zone if any remain
  const locked = lockedZones.find(lz => worldMap[lz.y][lz.x] === 2);
  if (locked) {
    worldMap[locked.y][locked.x] = 0;
    // Remove locked wall mesh
    const wallMesh = gridMeshes.find(m =>
      m.userData.gridX === locked.x && m.userData.gridY === locked.y && m.userData.isLocked
    );
    if (wallMesh) {
      scene.remove(wallMesh);
      gridMeshes.splice(gridMeshes.indexOf(wallMesh), 1);
    }
    document.getElementById('objective').textContent =
      playerShards >= 5
        ? '⚡ UPLINK ACTIVE — REACH EXIT'
        : `LOCKED ZONE OPENED ✓ | SHARDS: ${playerShards}/5`;
  }

  updateDrifterLabel(d);
  closeInteractMenu();
}

function handleIgnore() {
  if (!menuDrifter) return;
  const d = menuDrifter;
  // Slight wary push if already trust
  if (d.trust === 'trust') d.trust = 'wary';
  playTrustChange(false);
  updateDrifterVisual(d);
  updateDrifterLabel(d);
  closeInteractMenu();
}

function handleBetray() {
  if (!menuDrifter) return;
  const d = menuDrifter;
  // Trust becomes hostile regardless
  d.trust = 'hostile';
  d.stealShard = true;
  playBetrayal();
  flashScreen('#ff2200', 0.6);
  updateDrifterVisual(d);
  updateDrifterLabel(d);

  // Betrayal gives bonus shard if Drifter had one
  // (narrative: we faked a route and took their fragment)
  if (!d.interacted && playerShards < 5) {
    playerShards += 1;
    shardFlash();
    updateHUD();
    if (playerShards >= 5) activateExit();
  }
  d.interacted = true;

  // Recalculate blocked
  if (exitActive) {
    exitNode.blockedBy = drifters.filter(d2 => d2.trust === 'hostile').map(d2 => d2.id);
    if (exitNode.blockedBy.length > 0) {
      document.getElementById('objective').textContent =
        `⚠ GATE BLOCKED BY ${exitNode.blockedBy.length} HOSTILE DRIFTER${exitNode.blockedBy.length>1?'S':''}`;
    }
  }

  closeInteractMenu();
}

function getTrustEmoji(trust) {
  if (trust === 'trust') return '😊';
  if (trust === 'wary') return '😐';
  return '😠';
}

function updateDrifterVisual(d) {
  const colors = { trust: 0x44ff88, wary: DRIFTER_COLORS[d.id], hostile: 0xff2200 };
  const emissive = { trust: 0x228844, wary: DRIFTER_EMISSIVE[d.id], hostile: 0xaa0000 };
  d.mesh.material.color.setHex(colors[d.trust]);
  d.mesh.material.emissive.setHex(emissive[d.trust]);
  d.mesh.material.emissiveIntensity = d.trust === 'hostile' ? 1.5 : 0.8;
  // Update drifter point light
  d.mesh.children.forEach(c => {
    if (c.isLight) c.color.setHex(colors[d.trust]);
  });
}

function updateDrifterLabel(d) {
  const el = d.labelEl;
  el.innerHTML = `${getTrustEmoji(d.trust)}<br><span class="trust-indicator trust-${d.trust}">${d.name}</span>`;
}

function updateDrifterLabels() {
  drifters.forEach(d => {
    const el = d.labelEl;
    // Project 3D position to 2D screen
    const vec = new THREE.Vector3();
    vec.setFromMatrixPosition(d.mesh.matrixWorld);
    vec.y += 1.5;
    vec.project(camera);
    const x = (vec.x * 0.5 + 0.5) * innerWidth;
    const y = (-vec.y * 0.5 + 0.5) * innerHeight;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.opacity = vec.z < 1 ? '1' : '0';
  });
}

// ─── HUD UPDATE ───────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('shard-val').textContent = playerShards;
  const secs = Math.max(0, Math.ceil(timeLeft));
  const timerEl = document.getElementById('timer-val');
  timerEl.textContent = secs + 's';
  timerEl.classList.toggle('urgent', timeLeft < 20);
  updateHPDisplay();
}

function updateHPDisplay() {
  for (let i = 1; i <= 3; i++) {
    const pip = document.getElementById('hp' + i);
    if (pip) pip.classList.toggle('empty', i > playerHP);
  }
}

// ─── FLASH EFFECTS ────────────────────────────────────────────────────────
function flashScreen(color, opacity) {
  const el = document.getElementById('flash');
  el.style.background = color;
  el.style.opacity = opacity;
  setTimeout(() => { el.style.opacity = 0; }, 120);
}

// ─── LOCKED WALLS ─────────────────────────────────────────────────────────
// (isWalkable already handles this — locked walls are type 2, not walkable)

// ─── END GAME ─────────────────────────────────────────────────────────────
function endGame(reason) {
  gameState = 'over';
  closeInteractMenu();

  const endEl = document.getElementById('endscreen');
  const titleEl = document.getElementById('end-title');
  const subEl = document.getElementById('end-subtitle');
  const statsEl = document.getElementById('end-stats');

  const timeUsed = (90 - timeLeft).toFixed(0);
  const trustCount = drifters.filter(d => d.trust === 'trust').length;
  const hostileCount = drifters.filter(d => d.trust === 'hostile').length;

  if (reason === 'win') {
    playWin();
    titleEl.textContent = 'EXTRACTED';
    titleEl.className = 'win';
    subEl.textContent = 'SIGNAL RECEIVED. YOU MADE IT OUT.';
    const verdict = hostileCount === 0 ? 'Clean extraction — zero enemies made.' :
                    trustCount > 0 ? 'Mixed signals — some allies, some enemies.' :
                    'Aggressive extraction — you burned everyone.';
    statsEl.innerHTML = `Shards: ${playerShards}/5<br>Time: ${timeUsed}s<br>Hostile drifters: ${hostileCount}/3<br><br>${verdict}`;
    flashScreen('#00ff44', 0.4);
  } else if (reason === 'killed') {
    playLose();
    titleEl.textContent = 'TERMINATED';
    titleEl.className = 'lose';
    subEl.textContent = 'A HOSTILE DRIFTER ENDED YOUR RUN.';
    statsEl.innerHTML = `Shards: ${playerShards}/5<br>Time: ${timeUsed}s<br>Hostile drifters: ${hostileCount}/3<br><br>Tip: Betray fewer Drifters.`;
    flashScreen('#ff2200', 0.7);
  } else {
    playLose();
    titleEl.textContent = 'LOST SIGNAL';
    titleEl.className = 'lose';
    subEl.textContent = 'FAILSAFE TRIGGERED. NETWORK COLLAPSED.';
    statsEl.innerHTML = `Shards: ${playerShards}/5<br>Hostile drifters: ${hostileCount}/3<br><br>Tip: Collect shards faster. Social choices waste time.`;
    flashScreen('#ff8800', 0.5);
  }

  endEl.classList.add('visible');
}

// ─── RENDER LOOP ──────────────────────────────────────────────────────────
function render() {
  animId = requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.1);
  update(dt);
  composer.render();
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (gameState !== 'playing') return;

  if (e.code === 'KeyE') {
    if (menuOpen) {
      closeInteractMenu();
    } else if (nearDrifter) {
      if (!audioCtx) initAudio();
      openInteractMenu(nearDrifter);
    }
  }
  if (e.code === 'Escape') {
    closeInteractMenu();
  }
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Button listeners
document.getElementById('btn-share').addEventListener('click', () => {
  if (!audioCtx) initAudio();
  handleShare();
});
document.getElementById('btn-ignore').addEventListener('click', () => {
  if (!audioCtx) initAudio();
  handleIgnore();
});
document.getElementById('btn-betray').addEventListener('click', () => {
  if (!audioCtx) initAudio();
  handleBetray();
});
document.getElementById('restart-btn').addEventListener('click', () => {
  if (!audioCtx) initAudio();
  bgStarted = false;
  bgGainNode = null;
  initGame();
  startBackground();
});
document.getElementById('start-btn').addEventListener('click', () => {
  if (!audioCtx) initAudio();
  initGame();
  startBackground();
});

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────
initThree();
// Start screen shows — game initialized on click
