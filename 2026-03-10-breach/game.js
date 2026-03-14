// Breach — Action Roguelike | Forge 🔨 | 2026-03-10
// Three.js via importmap CDN — no bundler

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── MODULE-SCOPE VARS (T2: all critical vars at top level) ─────────────────
let scene, camera, renderer, composer;
let animId = null;
let clock;

// Game state
let gameState = 'start'; // start | loadout | playing | upgrade | roomclear | dead | win
let currentRoom = 0;
const MAX_ROOMS = 6;

// Player
let player = null;
let playerHP = 3;
let playerMaxHP = 3;
let playerSpeed = 5.5;
let playerDamage = 1;
let dodgeCooldown = 0;
let dodgeMaxCooldown = 1.0;
let dodgeDuration = 0;
let dodgeDir = new THREE.Vector3();
let isRolling = false;
let invincibleTimer = 0;
const IFRAME_DURATION = 0.5; // G9: iframes must actually work
let rollCooldownReduction = 1.0; // multiplier from upgrades
let damageMultiplier = 1.0;
let overchargeActive = false;

// Loadout
let loadoutIdx = 0;
const LOADOUTS = [
  { name: 'VANGUARD', fireRate: 0.18, bulletSpeed: 18, range: 7, bulletSize: 0.18, rollCooldown: 0.75, moveSpeed: 5.5 },
  { name: 'PHANTOM',  fireRate: 0.28, bulletSpeed: 22, range: 12, bulletSize: 0.12, rollCooldown: 1.0,  moveSpeed: 6.2, burst: 3 },
  { name: 'BREAKER',  fireRate: 0.55, bulletSpeed: 14, range: 9,  bulletSize: 0.22, rollCooldown: 1.4,  moveSpeed: 4.5, scatter: 5 },
];
let loadout = LOADOUTS[0];
let fireTimer = 0;
let burstCount = 0;
let burstTimer = 0;

// Input
const keys = {};
let mousePos = new THREE.Vector2();
let mouseWorldPos = new THREE.Vector3();
let mouseDown = false;
let rightMouseDown = false;

// Room geometry
let roomMeshes = [];
let walls = []; // {min, max} AABB boxes for collision
let roomObjects = []; // temporary room visual objects

// Enemies
let enemies = [];
let bullets = [];
let enemyBullets = [];

// Particles
let particles = [];

// Camera
let camTarget = new THREE.Vector3();

// Raycaster
const raycaster = new THREE.Raycaster();

// Upgrades
let upgradesSelected = [];

// Audio
let audioCtx = null;
let musicGain = null;
let masterGain = null;
let musicNodes = [];

// ─── ROOM CONFIGS ───────────────────────────────────────────────────────────
const ROOM_CONFIGS = [
  { enemies: ['grunt', 'grunt', 'grunt'], obstacles: 2 },
  { enemies: ['grunt', 'grunt', 'shielder'], obstacles: 3 },
  { enemies: ['grunt', 'sniper', 'shielder'], obstacles: 3 },
  { enemies: ['grunt', 'grunt', 'sniper', 'exploder'], obstacles: 4 },
  { enemies: ['shielder', 'sniper', 'exploder', 'grunt'], obstacles: 4 },
  { enemies: ['boss'], obstacles: 0 }, // boss room
];

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  clock = new THREE.Clock();

  // Renderer
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050510, 0.06);
  scene.background = new THREE.Color(0x050510);

  // Camera (top-down orthographic-ish perspective)
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 18, 8);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0x0a0a1a, 1.2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x8888ff, 1.5);
  dirLight.position.set(5, 15, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xff4444, 0.3);
  fillLight.position.set(-5, 10, -5);
  scene.add(fillLight);

  // Postprocessing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4, 0.5, 0.1
  );
  composer.addPass(bloom);

  // Starfield (background atmosphere)
  buildStarfield();

  // Events
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', e => {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) rightMouseDown = true;
    resumeAudio();
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) rightMouseDown = false;
  });
  window.addEventListener('contextmenu', e => e.preventDefault());

  // UI events
  document.getElementById('overlay-btn').addEventListener('click', () => {
    resumeAudio();
    showLoadout();
  });
  document.querySelectorAll('.loadout-card').forEach(card => {
    card.addEventListener('click', () => {
      loadoutIdx = parseInt(card.dataset.idx);
      loadout = LOADOUTS[loadoutIdx];
      document.getElementById('loadout-screen').classList.add('hidden');
      document.getElementById('weapon-name').textContent = loadout.name;
      dodgeMaxCooldown = loadout.rollCooldown;
      playerSpeed = loadout.moveSpeed;
      startRun();
    });
  });
  document.querySelectorAll('.upgrade-card').forEach(card => {
    card.addEventListener('click', () => applyUpgrade(card.dataset.upg));
  });

  // Show start overlay
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay-title').textContent = 'BREACH';
  document.getElementById('overlay-sub').textContent = 'INFILTRATE. READ. ELIMINATE.';
  document.getElementById('overlay-btn').textContent = 'INITIATE RUN';

  buildHpBar();
  loop();
}

function buildStarfield() {
  const geo = new THREE.BufferGeometry();
  const count = 600;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = Math.random() * 40 + 5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x8888bb, size: 0.12 });
  scene.add(new THREE.Points(geo, mat));
}

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function resumeAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(masterGain);
    startMusic();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startMusic() {
  // 64-second looping combat track (G6: 60+ sec loops)
  const bpm = 140;
  const beatLen = 60 / bpm;
  const loopLen = 64;

  function scheduleLoop() {
    if (!audioCtx || gameState === 'dead') return;

    const now = audioCtx.currentTime;

    // Bass drone — slow pulsing sub
    for (let i = 0; i < Math.floor(loopLen / (beatLen * 4)); i++) {
      const t = now + i * beatLen * 4;
      playTone(55, 'sawtooth', 0.28, t, beatLen * 3.8, musicGain, [0.1, 0, 0.18, 0.15]);
    }

    // Kick pattern
    for (let i = 0; i < Math.floor(loopLen / beatLen); i++) {
      if (i % 4 === 0 || i % 4 === 2) {
        const t = now + i * beatLen;
        playTone(60, 'sine', 0.25, t, 0.12, musicGain, [0.8, 0, 0.1, 0.0]);
      }
    }

    // Hi-hat pattern (irregular spread — S6: spread musical events)
    const hatBeats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 5.5, 6.5, 7, 7.5, 8, 9, 10, 10.5, 11, 12, 13, 14, 15];
    for (let cycle = 0; cycle < Math.floor(loopLen / (beatLen * 16)); cycle++) {
      for (const beat of hatBeats) {
        const t = now + (cycle * 16 + beat) * beatLen;
        if (t < now + loopLen) {
          playTone(8000, 'square', 0.035, t, 0.04, musicGain, [1, 0, 0.01, 0.0]);
        }
      }
    }

    // Arp melody (spread across loop — S6 rule)
    const arpNotes = [220, 261, 293, 220, 349, 293, 261, 329, 246, 293, 220, 261, 329, 220, 293, 349];
    const arpTimes = [2, 4, 6, 8, 10, 12, 16, 18, 20, 24, 28, 32, 36, 40, 44, 52];
    for (let j = 0; j < arpNotes.length && j < arpTimes.length; j++) {
      const t = now + arpTimes[j] * beatLen;
      if (t < now + loopLen) {
        playTone(arpNotes[j], 'sawtooth', 0.12, t, beatLen * 0.8, musicGain, [0.1, 0, 0.4, 0.05]);
      }
    }

    // Glitch texture hits (spread, irregular)
    const glitchTimes = [5, 11, 17, 23, 31, 37, 43, 51, 57, 63];
    for (const gt of glitchTimes) {
      const t = now + gt * beatLen;
      if (t < now + loopLen) {
        playTone(880 + Math.random() * 440, 'square', 0.06, t, 0.03, musicGain, [1, 0, 0.02, 0]);
      }
    }

    setTimeout(scheduleLoop, (loopLen - 0.5) * 1000);
  }

  scheduleLoop();
}

function playTone(freq, type, vol, startTime, duration, gainNode, envelope) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(envelope[0] * vol, startTime + 0.01);
  gain.gain.setValueAtTime(envelope[1] * vol, startTime + duration * 0.1);
  gain.gain.linearRampToValueAtTime(envelope[2] * vol, startTime + duration * 0.8);
  gain.gain.linearRampToValueAtTime(envelope[3] * vol, startTime + duration);
  osc.connect(gain);
  gain.connect(gainNode || masterGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function sfx(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.4;
  sfxGain.connect(masterGain);
  switch (type) {
    case 'shoot':
      playTone(800, 'square', 0.5, now, 0.06, sfxGain, [1, 0.3, 0.1, 0]);
      break;
    case 'enemy_hit':
      playTone(300, 'sawtooth', 0.5, now, 0.08, sfxGain, [1, 0.4, 0.1, 0]);
      break;
    case 'enemy_death':
      playTone(200, 'sine', 0.5, now, 0.12, sfxGain, [1, 0.5, 0.2, 0]);
      playTone(300, 'square', 0.3, now + 0.05, 0.08, sfxGain, [0.5, 0.3, 0, 0]);
      break;
    case 'player_hit':
      playTone(150, 'sawtooth', 0.6, now, 0.2, sfxGain, [1, 0.5, 0.2, 0]);
      playTone(100, 'sine', 0.4, now, 0.25, sfxGain, [0.8, 0.3, 0, 0]);
      break;
    case 'dodge':
      playTone(600, 'sine', 0.3, now, 0.1, sfxGain, [0.5, 0.8, 0.2, 0]);
      playTone(900, 'sine', 0.2, now + 0.05, 0.08, sfxGain, [0.8, 0.3, 0, 0]);
      break;
    case 'room_clear':
      [440, 550, 660, 880].forEach((f, i) => {
        playTone(f, 'sine', 0.4, now + i * 0.08, 0.3, sfxGain, [0.8, 0.5, 0.3, 0]);
      });
      break;
    case 'boss_die':
      [220, 330, 440, 550, 660].forEach((f, i) => {
        playTone(f, 'sine', 0.5, now + i * 0.1, 0.5, sfxGain, [1, 0.6, 0.3, 0]);
      });
      break;
    case 'pickup':
      playTone(880, 'sine', 0.3, now, 0.08, sfxGain, [0.8, 0.5, 0, 0]);
      break;
  }
}

// ─── ROOM BUILDER ────────────────────────────────────────────────────────────
const ROOM_W = 20;
const ROOM_D = 20;
const WALL_H = 3;

function clearRoom() {
  for (const m of roomObjects) scene.remove(m);
  roomObjects = [];
  enemies = [];
  bullets = [];
  enemyBullets = [];
  walls = [];
  particles = [];
}

function buildRoom(roomIdx) {
  clearRoom();

  // Floor
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 10, 10);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.9, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  roomObjects.push(floor);

  // Grid lines on floor
  const grid = new THREE.GridHelper(ROOM_W, 20, 0x1a1a2e, 0x1a1a2e);
  grid.position.y = 0.01;
  scene.add(grid);
  roomObjects.push(grid);

  // Outer walls (4 sides)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, metalness: 0.3, emissive: 0x050510 });
  const hw = ROOM_W / 2, hd = ROOM_D / 2;

  function addWall(w, h, d, px, py, pz) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    roomObjects.push(mesh);
    // AABB for collision
    walls.push({
      minX: px - w / 2, maxX: px + w / 2,
      minZ: pz - d / 2, maxZ: pz + d / 2
    });
  }

  addWall(ROOM_W + 2, WALL_H, 1, 0, WALL_H / 2, -hd - 0.5);
  addWall(ROOM_W + 2, WALL_H, 1, 0, WALL_H / 2, hd + 0.5);
  addWall(1, WALL_H, ROOM_D + 2, -hw - 0.5, WALL_H / 2, 0);
  addWall(1, WALL_H, ROOM_D + 2, hw + 0.5, WALL_H / 2, 0);

  // Cyan edge glow strips
  const edgeGeo = new THREE.BoxGeometry(ROOM_W, 0.1, 0.1);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x004455, emissive: 0x004455 });
  [-hd, hd].forEach(z => {
    const e = new THREE.Mesh(edgeGeo, edgeMat);
    e.position.set(0, 0.05, z);
    scene.add(e);
    roomObjects.push(e);
  });
  const edgeGeo2 = new THREE.BoxGeometry(0.1, 0.1, ROOM_D);
  [-hw, hw].forEach(x => {
    const e = new THREE.Mesh(edgeGeo2, edgeMat);
    e.position.set(x, 0.05, 0);
    scene.add(e);
    roomObjects.push(e);
  });

  // Seeded random obstacles (G4: randomize per room)
  const seed = roomIdx * 137 + 42;
  const rng = seededRng(seed);
  const config = ROOM_CONFIGS[Math.min(roomIdx, ROOM_CONFIGS.length - 1)];

  for (let i = 0; i < config.obstacles; i++) {
    let ox, oz;
    // Keep re-rolling until obstacle doesn't overlap player spawn (0, 3)
    do {
      ox = (rng() - 0.5) * (ROOM_W - 6);
      oz = (rng() - 0.5) * (ROOM_D - 6);
    } while (Math.abs(ox) < 3 && Math.abs(oz - 3) < 3);
    const ow = 1.5 + rng() * 1.5;
    const od = 1.5 + rng() * 1.5;
    addWall(ow, 2.5, od, ox, 1.25, oz);
    // Tint obstacle
    const lastWallMesh = roomObjects[roomObjects.length - 1];
    lastWallMesh.material = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.7, metalness: 0.5, emissive: 0x050a10 });
  }

  // Exit door marker (G4: random wall side per room)
  const sides = ['N', 'S', 'E', 'W'];
  const exitSide = sides[Math.floor(rng() * 4)];
  spawnExitMarker(exitSide);

  // Spawn player
  spawnPlayer();

  // Spawn enemies
  spawnEnemies(config.enemies, rng);

  updateHpBar();
  updateRoomLabel();
}

function spawnExitMarker(side) {
  // Not interactive in v1 — exit triggers automatically on room clear
}

function seededRng(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─── PLAYER ──────────────────────────────────────────────────────────────────
function spawnPlayer() {
  if (player) scene.remove(player);

  const geo = new THREE.OctahedronGeometry(0.4, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x44ffff, emissive: 0x22aaaa, roughness: 0.3 });
  player = new THREE.Mesh(geo, mat);
  player.position.set(0, 0.4, 3);
  // Safety: if spawn overlaps an obstacle, nudge to a clear spot
  if (collidesWithWall(player.position, 0.5)) {
    const offsets = [[0,5],[0,7],[3,3],[-3,3],[3,5],[-3,5],[0,0]];
    for (const [dx, dz] of offsets) {
      const test = new THREE.Vector3(dx, 0.4, dz);
      if (isInsideRoom(test) && !collidesWithWall(test, 0.5)) {
        player.position.copy(test);
        break;
      }
    }
  }
  player.castShadow = true;
  scene.add(player);
  roomObjects.push(player);

  // Player point light
  const pLight = new THREE.PointLight(0x44ffff, 2, 4);
  player.add(pLight);
}

// ─── ENEMY SPAWNER ────────────────────────────────────────────────────────────
function spawnEnemies(types, rng) {
  for (const type of types) {
    let x, z;
    // Ensure enemies don't spawn on top of player
    do {
      x = (rng() - 0.5) * (ROOM_W - 4);
      z = (rng() - 0.5) * (ROOM_D - 4) - 4;
    } while (Math.abs(x) < 3 && Math.abs(z) < 5);

    spawnEnemy(type, x, z);
  }
}

function spawnEnemy(type, x, z) {
  const configs = {
    grunt: { color: 0xff4444, emissive: 0x441111, hp: 3, speed: 3.2, damage: 1, geo: 'box', scale: 0.55, shootRange: 0, chargeRange: 5.0 },
    shielder: { color: 0xff8800, emissive: 0x441100, hp: 5, speed: 2.0, damage: 1, geo: 'cylinder', scale: 0.6, shootRange: 0, chargeRange: 6.0, shielded: true },
    sniper: { color: 0xaa00ff, emissive: 0x220022, hp: 2, speed: 1.5, damage: 1, geo: 'cone', scale: 0.55, shootRange: 14, fireRate: 2.5 },
    exploder: { color: 0xff4400, emissive: 0x441100, hp: 4, speed: 2.8, damage: 2, geo: 'sphere', scale: 0.7, chargeRange: 3.5, explodeRange: 2.5 },
    boss: { color: 0xff0055, emissive: 0x440011, hp: 30, speed: 2.2, damage: 1, geo: 'icosahedron', scale: 1.4, shootRange: 16, fireRate: 1.2, chargeRange: 8.0, isBoss: true },
  };
  const cfg = configs[type];
  if (!cfg) return;

  let geo;
  if (cfg.geo === 'box') geo = new THREE.BoxGeometry(cfg.scale * 2, cfg.scale * 2, cfg.scale * 2);
  else if (cfg.geo === 'cylinder') geo = new THREE.CylinderGeometry(cfg.scale, cfg.scale, cfg.scale * 2, 6);
  else if (cfg.geo === 'cone') geo = new THREE.ConeGeometry(cfg.scale, cfg.scale * 2.5, 5);
  else if (cfg.geo === 'sphere') geo = new THREE.SphereGeometry(cfg.scale, 8, 6);
  else if (cfg.geo === 'icosahedron') geo = new THREE.IcosahedronGeometry(cfg.scale, 0);
  else geo = new THREE.BoxGeometry(cfg.scale, cfg.scale, cfg.scale);

  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.emissive, roughness: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, cfg.scale, z);
  mesh.castShadow = true;
  scene.add(mesh);
  roomObjects.push(mesh);

  // Enemy point light
  const eLit = new THREE.PointLight(cfg.color, 1.5, 3.5);
  mesh.add(eLit);

  // Telegraph indicator (visible wind-up — shows intent)
  const telegraphGeo = new THREE.RingGeometry(0.6, 0.8, 24);
  const telegraphMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0 });
  const telegraph = new THREE.Mesh(telegraphGeo, telegraphMat);
  telegraph.rotation.x = -Math.PI / 2;
  telegraph.position.y = 0.02;
  mesh.add(telegraph);

  // Shield visual for shielder
  let shieldMesh = null;
  if (cfg.shielded) {
    const shGeo = new THREE.SphereGeometry(0.85, 8, 6);
    const shMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0x442200, transparent: true, opacity: 0.4, roughness: 0.2 });
    shieldMesh = new THREE.Mesh(shGeo, shMat);
    mesh.add(shieldMesh);
  }

  const enemy = {
    mesh, type, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed,
    damage: cfg.damage, cfg,
    state: 'idle', // idle | telegraph | attacking | cooldown
    stateTimer: 0.5 + Math.random() * 1.0,
    fireTimer: 1.0 + Math.random() * 2.0,
    telegraph, telegraphAlpha: 0,
    shieldMesh, shielded: cfg.shielded || false,
    isBoss: cfg.isBoss || false,
    attackPhase: 0, // boss phase tracker
    vel: new THREE.Vector3(),
    dead: false,
  };

  enemies.push(enemy);
}

// ─── UPDATE LOOP ─────────────────────────────────────────────────────────────
function loop() {
  animId = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing') {
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateHUD(dt);
    checkRoomClear();
  } else if (gameState === 'roomclear') {
    updateCamera(dt);
    updateParticles(dt);
  }

  composer.render();
}

// ─── PLAYER UPDATE ────────────────────────────────────────────────────────────
function updatePlayer(dt) {
  if (!player) return;

  // Invincibility countdown (G9: must actually work)
  if (invincibleTimer > 0) {
    invincibleTimer -= dt;
    player.material.emissive.setHex(Math.sin(invincibleTimer * 30) > 0 ? 0x22aaaa : 0x550000);
  } else {
    player.material.emissive.setHex(0x22aaaa);
  }

  // Dodge roll update
  if (dodgeCooldown > 0) dodgeCooldown -= dt;

  if (isRolling) {
    dodgeDuration -= dt;
    const rollSpeed = 12;
    const moveVec = dodgeDir.clone().multiplyScalar(rollSpeed * dt);
    const np = player.position.clone().add(moveVec);
    if (isInsideRoom(np)) player.position.copy(np);
    if (dodgeDuration <= 0) {
      isRolling = false;
      invincibleTimer = 0;
    }
    return;
  }

  // Movement
  const moveDir = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;

  if (moveDir.length() > 0) {
    moveDir.normalize();
    const newPos = player.position.clone().add(moveDir.clone().multiplyScalar(playerSpeed * dt));
    if (isInsideRoom(newPos) && !collidesWithWall(newPos, 0.5)) {
      player.position.copy(newPos);
    } else {
      // Try X only
      const nx = player.position.clone();
      nx.x += moveDir.x * playerSpeed * dt;
      if (isInsideRoom(nx) && !collidesWithWall(nx, 0.5)) player.position.x = nx.x;
      // Try Z only
      const nz = player.position.clone();
      nz.z += moveDir.z * playerSpeed * dt;
      if (isInsideRoom(nz) && !collidesWithWall(nz, 0.5)) player.position.z = nz.z;
    }
  }

  // Face mouse
  updateMouseWorld();
  const dx = mouseWorldPos.x - player.position.x;
  const dz = mouseWorldPos.z - player.position.z;
  if (Math.abs(dx) + Math.abs(dz) > 0.1) {
    player.rotation.y = Math.atan2(dx, dz);
  }

  // Rotate player mesh a bit for juice
  player.rotation.x += dt * 0.8;

  // Dodge initiation (right click or shift)
  if ((rightMouseDown || keys['ShiftLeft'] || keys['ShiftRight']) && dodgeCooldown <= 0 && !isRolling) {
    startDodge(moveDir.length() > 0 ? moveDir : new THREE.Vector3(0, 0, -1));
  }

  // Shoot
  fireTimer -= dt;
  if (loadout.burst) {
    // Burst: handle burst-fire
    if (burstTimer > 0) {
      burstTimer -= dt;
    } else if (burstCount > 0) {
      fireBullet();
      burstCount--;
      burstTimer = 0.08;
    }
    if (mouseDown && fireTimer <= 0 && burstCount === 0) {
      fireTimer = loadout.fireRate;
      burstCount = loadout.burst - 1;
      fireBullet();
    }
  } else {
    if (mouseDown && fireTimer <= 0) {
      fireTimer = loadout.fireRate;
      if (loadout.scatter) {
        // Scatter shot
        for (let s = 0; s < loadout.scatter; s++) {
          const spread = (s - Math.floor(loadout.scatter / 2)) * 0.12;
          fireBullet(spread);
        }
      } else {
        fireBullet(0);
      }
    }
  }

  // Auto-collect XP orbs/pickups (G3: auto-collect when hands occupied)
  collectPickups();
}

function startDodge(dir) {
  isRolling = true;
  dodgeDuration = 0.22;
  dodgeCooldown = dodgeMaxCooldown * rollCooldownReduction;
  dodgeDir.copy(dir);
  invincibleTimer = IFRAME_DURATION; // G9: real iframes
  sfx('dodge');
}

function fireBullet(spreadOffset = 0) {
  if (!player) return;
  sfx('shoot');

  const dir = new THREE.Vector3();
  dir.x = mouseWorldPos.x - player.position.x;
  dir.z = mouseWorldPos.z - player.position.z;
  dir.normalize();

  // Apply spread
  if (spreadOffset !== 0) {
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(spreadOffset);
    dir.add(perp).normalize();
  }

  const bGeo = new THREE.SphereGeometry(loadout.bulletSize, 6, 4);
  const bMat = new THREE.MeshStandardMaterial({ color: 0x44ffff, emissive: 0x22aaaa });
  const bMesh = new THREE.Mesh(bGeo, bMat);
  bMesh.position.copy(player.position);
  bMesh.position.y = 0.5;

  const bLight = new THREE.PointLight(0x44ffff, 1.5, 2.5);
  bMesh.add(bLight);
  scene.add(bMesh);
  roomObjects.push(bMesh);

  const dmg = playerDamage * damageMultiplier * (overchargeActive ? 1.25 : 1.0);
  if (overchargeActive) overchargeActive = false;

  bullets.push({
    mesh: bMesh, vel: dir.clone().multiplyScalar(loadout.bulletSpeed),
    dist: 0, maxDist: loadout.range, damage: dmg
  });
}

function updateMouseWorld() {
  raycaster.setFromCamera(mousePos, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  raycaster.ray.intersectPlane(plane, mouseWorldPos);
}

function isInsideRoom(pos) {
  const hw = ROOM_W / 2 - 0.6;
  const hd = ROOM_D / 2 - 0.6;
  return pos.x > -hw && pos.x < hw && pos.z > -hd && pos.z < hd;
}

function collidesWithWall(pos, radius) {
  for (const w of walls) {
    if (w.minX > -ROOM_W && // skip outer walls in fine collision
        pos.x + radius > w.minX && pos.x - radius < w.maxX &&
        pos.z + radius > w.minZ && pos.z - radius < w.maxZ) {
      return true;
    }
  }
  return false;
}

// ─── ENEMY UPDATE ─────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dead) continue;

    // Spin/float animation
    e.mesh.rotation.y += dt * (e.isBoss ? 1.5 : 0.8);
    e.mesh.position.y = (e.isBoss ? 1.4 : e.cfg.scale) + Math.sin(Date.now() * 0.002 + e.mesh.id) * 0.1;

    // State machine
    e.stateTimer -= dt;

    const toPlayer = player ? player.position.clone().sub(e.mesh.position) : new THREE.Vector3();
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    if (e.type === 'sniper' || e.type === 'boss') {
      // Ranged enemy: telegraph then shoot
      if (e.state === 'idle') {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.state = 'telegraph';
          e.stateTimer = 1.2; // wind-up time visible to player
          e.telegraph.material.opacity = 0.0;
        }
        // Strafe sideways when player is in range
        if (distToPlayer < e.cfg.shootRange && player) {
          const strafe = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
          const strafePos = e.mesh.position.clone().add(strafe.multiplyScalar(e.speed * 0.5 * dt));
          if (isInsideRoom(strafePos)) e.mesh.position.copy(strafePos);
        }
      } else if (e.state === 'telegraph') {
        // Flash warning ring — visible player telegraph
        const t = 1.0 - (e.stateTimer / 1.2);
        e.telegraph.material.opacity = t * 0.9;
        e.telegraph.scale.setScalar(1.0 + t * 0.5);
        if (e.stateTimer <= 0) {
          e.state = 'attacking';
          e.stateTimer = 0.3;
          e.telegraph.material.opacity = 0;
          // Fire at player
          fireEnemyBullet(e, e.isBoss ? 3 : 1);
        }
      } else if (e.state === 'attacking') {
        if (e.stateTimer <= 0) {
          e.state = 'idle';
          e.fireTimer = (e.cfg.fireRate || 2.0) + Math.random() * 1.0;
        }
      }
    } else {
      // Melee/charge enemy: chase player
      if (e.state === 'idle' && player) {
        if (distToPlayer < (e.cfg.chargeRange || 5)) {
          e.state = 'telegraph';
          e.stateTimer = 0.7; // brief wind-up before charge
        }
      } else if (e.state === 'telegraph') {
        e.telegraph.material.opacity = (1.0 - e.stateTimer / 0.7) * 0.8;
        if (e.stateTimer <= 0) {
          e.state = 'attacking';
          e.stateTimer = 0;
          e.telegraph.material.opacity = 0;
        }
      } else if (e.state === 'attacking' && player) {
        // Chase player (S5: enemies exert real pressure)
        if (distToPlayer > 0.6) {
          const dir = toPlayer.normalize().multiplyScalar(e.speed * dt);
          const newEPos = e.mesh.position.clone().add(dir);
          if (isInsideRoom(newEPos)) {
            e.mesh.position.x = newEPos.x;
            e.mesh.position.z = newEPos.z;
          }
        }
        // Melee hit
        if (distToPlayer < 1.0) {
          hitPlayer(e.damage);
          e.state = 'cooldown';
          e.stateTimer = 0.8;
        }
        // Exploder: explode when very close
        if (e.type === 'exploder' && distToPlayer < (e.cfg.explodeRange || 2)) {
          explodeEnemy(e);
        }
      } else if (e.state === 'cooldown') {
        if (e.stateTimer <= 0) {
          e.state = 'idle';
          e.stateTimer = 0.3;
        }
      }

      // Shielder: shield absorbs first hit from front
      // Shield handled in bullet collision
    }

    // Boss: add extra attack patterns
    if (e.isBoss && e.hp < e.maxHp * 0.5 && e.attackPhase === 0) {
      e.attackPhase = 1;
      e.speed *= 1.4;
      // Visual indicator: color shift
      e.mesh.material.color.setHex(0xff0088);
    }

    // Face player
    if (player && toPlayer.length() > 0.1) {
      e.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }
  }

  // Remove dead enemies
  enemies = enemies.filter(e => !e.dead);
}

function fireEnemyBullet(enemy, count = 1) {
  if (!player) return;
  for (let i = 0; i < count; i++) {
    const dir = player.position.clone().sub(enemy.mesh.position);
    dir.y = 0;
    dir.normalize();

    // Slight spread for multi-shot
    if (count > 1) {
      const spread = (i - Math.floor(count / 2)) * 0.15;
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(spread);
      dir.add(perp).normalize();
    }

    const bGeo = new THREE.SphereGeometry(0.14, 6, 4);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x441111 });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.copy(enemy.mesh.position);
    bMesh.position.y = 0.5;
    scene.add(bMesh);
    roomObjects.push(bMesh);

    const bLight = new THREE.PointLight(0xff4444, 1.5, 2);
    bMesh.add(bLight);

    enemyBullets.push({ mesh: bMesh, vel: dir.multiplyScalar(9), dist: 0, maxDist: 16 });
  }
}

function explodeEnemy(enemy) {
  enemy.dead = true;
  spawnParticleBurst(enemy.mesh.position.clone(), 0xff4400, 20);
  scene.remove(enemy.mesh);
  sfx('enemy_death');
  // Damage player in range
  if (player) {
    const dist = player.position.distanceTo(enemy.mesh.position);
    if (dist < 3.5) hitPlayer(enemy.damage);
  }
}

// ─── BULLETS ─────────────────────────────────────────────────────────────────
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.add(b.vel.clone().multiplyScalar(dt));
    b.dist += b.vel.length() * dt;

    // Wall collision
    if (!isInsideRoom(b.mesh.position) || collidesWithWall(b.mesh.position, 0.15)) {
      spawnParticleBurst(b.mesh.position.clone(), 0x44ffff, 4);
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }

    // Max range
    if (b.dist >= b.maxDist) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }

    // Enemy hit check
    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const dist = b.mesh.position.distanceTo(e.mesh.position);
      const hitRadius = e.isBoss ? 1.5 : 0.7;
      if (dist < hitRadius) {
        // Shielder: shield from front blocks shot
        if (e.shielded && e.shieldMesh) {
          const toEnemy = e.mesh.position.clone().sub(b.mesh.position).normalize();
          const facing = new THREE.Vector3(0, 0, -1).applyEuler(e.mesh.rotation);
          if (toEnemy.dot(facing) > 0.3) {
            // Blocked by shield
            spawnParticleBurst(b.mesh.position.clone(), 0xff8800, 5);
            hit = true;
          } else {
            damageEnemy(e, b.damage);
            hit = true;
          }
        } else {
          damageEnemy(e, b.damage);
          hit = true;
        }
        break;
      }
    }

    if (hit) {
      spawnParticleBurst(b.mesh.position.clone(), 0x44ffff, 6);
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.mesh.position.add(b.vel.clone().multiplyScalar(dt));
    b.dist += b.vel.length() * dt;

    if (!isInsideRoom(b.mesh.position) || collidesWithWall(b.mesh.position, 0.12) || b.dist >= b.maxDist) {
      scene.remove(b.mesh);
      enemyBullets.splice(i, 1);
      continue;
    }

    // Hit player (G9: invincibleTimer blocks damage)
    if (player && b.mesh.position.distanceTo(player.position) < 0.6) {
      scene.remove(b.mesh);
      enemyBullets.splice(i, 1);
      hitPlayer(1);
    }
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  sfx('enemy_hit');
  // Flash red
  e.mesh.material.emissive.setHex(0xff2222);
  setTimeout(() => {
    if (!e.dead && e.mesh.material) e.mesh.material.emissive.setHex(0);
  }, 80);

  // Micro screen shake
  cameraShake(0.1);

  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    spawnParticleBurst(e.mesh.position.clone(), e.cfg.color, 16);
    scene.remove(e.mesh);
    sfx(e.isBoss ? 'boss_die' : 'enemy_death');
    if (e.isBoss) {
      setTimeout(() => triggerWin(), 800);
    }
  }
}

function hitPlayer(dmg) {
  if (invincibleTimer > 0) return; // G9: iframes block damage
  playerHP -= dmg;
  invincibleTimer = IFRAME_DURATION;
  sfx('player_hit');
  cameraShake(0.3);
  if (player) {
    player.material.emissive.setHex(0xff0000);
    setTimeout(() => { if (player && player.material) player.material.emissive.setHex(0x22aaaa); }, 200);
  }
  updateHpBar();
  if (playerHP <= 0) triggerDeath();
}

let camShakeAmount = 0;
function cameraShake(amount) {
  camShakeAmount = Math.max(camShakeAmount, amount);
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnParticleBurst(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.07 + Math.random() * 0.08, 4, 4);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = 0.4;
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 8
    );

    particles.push({ mesh, vel, life: 0.4 + Math.random() * 0.3, maxLife: 0.4 + Math.random() * 0.3 });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= 12 * dt;
    p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
    p.mesh.material.opacity = p.life / p.maxLife;
    p.mesh.material.transparent = true;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ─── CAMERA ───────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  if (player) {
    camTarget.set(player.position.x, 0, player.position.z);
  }
  // G7: Smooth camera lerp
  camera.position.x += (camTarget.x - camera.position.x) * 6 * dt;
  camera.position.z += (camTarget.z + 8 - camera.position.z) * 6 * dt;
  camera.position.y = 18;
  camera.lookAt(camTarget);

  // Camera shake decay
  if (camShakeAmount > 0) {
    camera.position.x += (Math.random() - 0.5) * camShakeAmount;
    camera.position.z += (Math.random() - 0.5) * camShakeAmount;
    camShakeAmount *= 0.85;
    if (camShakeAmount < 0.01) camShakeAmount = 0;
  }
}

// ─── PICKUPS (auto-collect — G3) ──────────────────────────────────────────────
function collectPickups() {
  // Pickups drop from enemies — currently just HP orbs from boss (implemented inline)
}

// ─── ROOM CLEAR ──────────────────────────────────────────────────────────────
function checkRoomClear() {
  if (enemies.length === 0 && gameState === 'playing') {
    gameState = 'roomclear';
    sfx('room_clear');

    // Room stamp
    const stamp = document.getElementById('room-stamp');
    const isBossRoom = currentRoom === MAX_ROOMS - 1;
    stamp.textContent = isBossRoom ? 'VAULT BREACHED' : 'BREACH CLEAR';
    stamp.style.opacity = '1';

    setTimeout(() => {
      stamp.style.opacity = '0';
      if (isBossRoom) {
        triggerWin();
      } else {
        currentRoom++;
        if (currentRoom < MAX_ROOMS - 1) {
          showUpgradeScreen();
        } else {
          // Boss room — no upgrade
          loadNextRoom();
        }
      }
    }, 1200);
  }
}

function loadNextRoom() {
  gameState = 'playing';
  buildRoom(currentRoom);
}

function showUpgradeScreen() {
  gameState = 'upgrade';
  document.getElementById('upgrade-screen').classList.remove('hidden');
}

function applyUpgrade(type) {
  document.getElementById('upgrade-screen').classList.add('hidden');

  if (type === 'hp') {
    if (playerHP < playerMaxHP) {
      playerHP = Math.min(playerMaxHP, playerHP + 1);
    } else {
      playerMaxHP++;
      playerHP++;
    }
    updateHpBar();
  } else if (type === 'dmg') {
    overchargeActive = true;
    damageMultiplier += 0.1;
  } else if (type === 'roll') {
    rollCooldownReduction *= 0.8;
  }

  sfx('pickup');
  loadNextRoom();
}

// ─── WIN / DEATH ─────────────────────────────────────────────────────────────
function triggerDeath() {
  gameState = 'dead';
  showOverlay('ELIMINATED', `Cleared ${currentRoom} of ${MAX_ROOMS} rooms`, 'TRY AGAIN');
  spawnParticleBurst(player ? player.position.clone() : new THREE.Vector3(), 0xff0000, 30);
}

function triggerWin() {
  gameState = 'win';
  showOverlay('VAULT BREACHED', 'System compromised. Run complete.', 'RUN AGAIN');
  spawnParticleBurst(player ? player.position.clone() : new THREE.Vector3(), 0x44ffff, 40);
}

function showOverlay(title, sub, btnText) {
  const ov = document.getElementById('overlay');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent = sub;
  document.getElementById('overlay-btn').textContent = btnText;
  ov.classList.remove('hidden');
}

// ─── RUN START ────────────────────────────────────────────────────────────────
function startRun() {
  // Reset run state
  currentRoom = 0;
  playerHP = 3;
  playerMaxHP = 3;
  dodgeCooldown = 0;
  invincibleTimer = 0;
  isRolling = false;
  fireTimer = 0;
  burstCount = 0;
  damageMultiplier = 1.0;
  overchargeActive = false;
  rollCooldownReduction = 1.0;
  dodgeMaxCooldown = loadout.rollCooldown;
  playerSpeed = loadout.moveSpeed;
  upgradesSelected = [];

  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('upgrade-screen').classList.add('hidden');

  buildRoom(currentRoom);
  updateHpBar();
  updateRoomLabel();
  gameState = 'playing';
}

function showLoadout() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('loadout-screen').classList.remove('hidden');
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function buildHpBar() {
  const bar = document.getElementById('hp-bar');
  bar.innerHTML = '';
  for (let i = 0; i < playerMaxHP; i++) {
    const pip = document.createElement('div');
    pip.className = 'hp-pip' + (i < playerHP ? '' : ' empty');
    bar.appendChild(pip);
  }
}

function updateHpBar() {
  const bar = document.getElementById('hp-bar');
  bar.innerHTML = '';
  for (let i = 0; i < playerMaxHP; i++) {
    const pip = document.createElement('div');
    pip.className = 'hp-pip' + (i < playerHP ? '' : ' empty');
    bar.appendChild(pip);
  }
}

function updateRoomLabel() {
  const isBoss = currentRoom === MAX_ROOMS - 1;
  document.getElementById('room-label').textContent = isBoss ? 'VAULT CORE' : `ROOM ${currentRoom + 1} / ${MAX_ROOMS}`;
}

function updateHUD(dt) {
  // Dodge bar (G9 feedback for roll cooldown)
  const fillPct = dodgeCooldown <= 0 ? 100 : (1 - dodgeCooldown / dodgeMaxCooldown) * 100;
  document.getElementById('dodge-bar-fill').style.width = fillPct + '%';
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function onMouseMove(e) {
  mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
  mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ─── OVERLAY btn: reset on click ─────────────────────────────────────────────
document.getElementById('overlay-btn').addEventListener('click', () => {
  resumeAudio();
  if (gameState === 'dead' || gameState === 'win') {
    showLoadout();
  } else {
    showLoadout();
  }
});

// ─── GO ──────────────────────────────────────────────────────────────────────
init();
