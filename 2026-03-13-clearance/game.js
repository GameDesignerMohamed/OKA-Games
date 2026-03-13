// CLEARANCE — Build #15 | 2026-03-13 | Forge 🔨
// Signal: ARC Raiders premium retention — does EARNED ACCESS create the same uplift as premium buy-in?
// Three.js via CDN importmap

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── MODULE-SCOPE STATE (T2) ─────────────────────────────────────────────────
let gameState = 'menu'; // 'menu' | 'wave' | 'waveclear' | 'unlock' | 'gameover' | 'win'
let clearanceLevel = 0;
let clProgress = 0;          // 0-1 within current CL step (2 waves per CL)
let playerHP = 3;
let invincibleTimer = 0;
let waveNumber = 0;          // 1-indexed when displayed
let totalKills = 0;
let runSeed = 0;
let bestCL = 0;
let extractPos = new THREE.Vector3();

// Abilities
let abilities = { dash: false, grenade: false, rifle: false, shield: false };
let dashCooldown = 0;    // seconds remaining
let grenadeCooldown = 0;
let shieldCooldown = 0;
let dashActive = false;
let dashTimer = 0;
let dashDir = new THREE.Vector3();
let shieldActive = false;
let shieldTimer = 0;
let grenadeCharges = 0;
let rifleFireTimer = 0;

// Camera shake (T2)
let cameraShakeAmt = 0;

// Input (T2)
const keys = {};
let mouseX = 0, mouseY = 0;
let mouseWorld = new THREE.Vector3();

// Arrays (T2)
let enemies = [];
let bullets = [];
let particles = [];
let telegraphs = [];
let grenades = [];

// Scene objects (T2)
let scene, camera, renderer, composer;
let playerMesh, playerLight;
let floorMesh, extractMesh, extractRing;
let ambientLight, dirLight;
let starfield;
let bgm = null;
let audioCtx = null;

// Player speed & constants
const PLAYER_SPEED = 6;
const DASH_SPEED = 18;
const DASH_DURATION = 0.18;
const DASH_CD = 0.9;
const SHIELD_DURATION = 1.2;
const SHIELD_CD = 4;
const GRENADE_CHARGES_MAX = 3;
const GRENADE_CD = 5;
const BULLET_SPEED = 20;
const ENEMY_RADIUS = 0.55;
const PLAYER_RADIUS = 0.5;
const ARENA_SIZE = 24;

// CL unlock sequence
const CL_UNLOCKS = [
  null,   // CL0
  null,   // CL1
  'dash', // CL2
  null,   // CL3
  'grenade', // CL4
  null,   // CL5
  'rifle',  // CL6
  null,   // CL7
  'shield', // CL8
  null,   // CL9
  null,   // CL10 (extract appears)
];
const UNLOCK_NAMES = {
  dash: '⚡ DASH UNLOCKED',
  grenade: '💥 GRENADE UNLOCKED',
  rifle: '🔫 ASSAULT RIFLE UNLOCKED',
  shield: '🛡 SHIELD UNLOCKED',
};

// ─── SEEDED RNG ────────────────────────────────────────────────────────────
function seededRNG(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
let rng;

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020409);
  scene.fog = new THREE.FogExp2(0x020409, 0.025);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 20, 14);
  camera.lookAt(0, 0, 0);

  // Renderer — T4: WebGPU attempt, WebGL fallback
  try {
    if (navigator.gpu) {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } else {
      throw new Error('no WebGPU');
    }
  } catch(e) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Postprocessing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, 0.4, 0.2
  );
  composer.addPass(bloom);

  // Lights
  ambientLight = new THREE.AmbientLight(0x112233, 0.8);
  scene.add(ambientLight);
  dirLight = new THREE.DirectionalLight(0x4488ff, 1.2);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Floor grid
  const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2, 40, 40);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050a12,
    emissive: 0x020608,
    roughness: 1,
    metalness: 0,
    wireframe: false
  });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  const gridHelper = new THREE.GridHelper(ARENA_SIZE * 2, 40, 0x0a1a2a, 0x0a1a2a);
  scene.add(gridHelper);

  // Arena walls (visual only)
  buildArenaWalls();

  // Starfield
  buildStarfield();

  // Player
  buildPlayer();

  // Extract zone (hidden until CL10)
  buildExtractZone();

  // Window resize
  window.addEventListener('resize', onResize);

  // Input
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'wave') handleAbilityKey(e.code);
    // Audio context resume on first interaction
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateMouseWorld();
  });
  window.addEventListener('click', e => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (gameState === 'wave') tryShoot();
  });

  // Load best CL from localStorage
  bestCL = parseInt(localStorage.getItem('clearance_best') || '0');
  document.getElementById('best-score').textContent = `PERSONAL BEST: CL ${bestCL}`;

  // Start render loop
  let lastTime = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05); // LP8: dt cap
    lastTime = now;
    update(dt);
    cameraUpdate(dt);
    composer.render();
  }
  requestAnimationFrame(loop);

  // Init audio
  initAudio();
}

function buildArenaWalls() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a2040, emissive: 0x050f20 });
  const wallH = 3;
  const half = ARENA_SIZE;
  const positions = [
    [0, wallH/2, -half, half*2, wallH, 0.4],
    [0, wallH/2,  half, half*2, wallH, 0.4],
    [-half, wallH/2, 0, 0.4, wallH, half*2],
    [ half, wallH/2, 0, 0.4, wallH, half*2],
  ];
  for (const [x,y,z,w,h,d] of positions) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, wallMat);
    m.position.set(x, y, z);
    scene.add(m);
  }

  // Glowing corner pillars
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x001030, emissive: 0x004488, emissiveIntensity: 0.8 });
  const corners = [[-half,-half],[half,-half],[-half,half],[half,half]];
  for (const [cx,cz] of corners) {
    const geo = new THREE.CylinderGeometry(0.4, 0.6, 5, 6);
    const m = new THREE.Mesh(geo, pillarMat);
    m.position.set(cx, 2.5, cz);
    scene.add(m);
    const pl = new THREE.PointLight(0x004488, 2, 8);
    pl.position.set(cx, 3, cz);
    scene.add(pl);
  }
}

function buildStarfield() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 200;
    positions[i*3+1] = Math.random() * 80 + 20;
    positions[i*3+2] = (Math.random() - 0.5) * 200;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.15, transparent: true, opacity: 0.8 });
  starfield = new THREE.Points(geo, mat);
  scene.add(starfield);
}

function buildPlayer() {
  const geo = new THREE.OctahedronGeometry(0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004488, emissiveIntensity: 1 });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.position.set(0, 0.5, 0);
  scene.add(playerMesh);

  playerLight = new THREE.PointLight(0x00ffff, 3, 8);
  playerLight.position.set(0, 1.5, 0);
  scene.add(playerLight);
}

function buildExtractZone() {
  const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00aa55, emissiveIntensity: 0.8 });
  extractMesh = new THREE.Mesh(geo, mat);
  extractMesh.visible = false;
  scene.add(extractMesh);

  const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff44, emissiveIntensity: 2 });
  extractRing = new THREE.Mesh(ringGeo, ringMat);
  extractRing.rotation.x = Math.PI / 2;
  extractRing.visible = false;
  scene.add(extractRing);
}

// ─── MOUSE WORLD ────────────────────────────────────────────────────────────
function updateMouseWorld() {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (mouseX / window.innerWidth) * 2 - 1,
    -(mouseY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  raycaster.ray.intersectPlane(plane, mouseWorld);
}

// ─── AUDIO ──────────────────────────────────────────────────────────────────
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, type, duration, vol, delay = 0, attack = 0.01, sustain = 0.7, release = 0.15) {
  // B5: sustain never 0 on meaningful sounds
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  const t = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + attack);
  gain.gain.setValueAtTime(vol * sustain, t + attack + (duration * 0.5)); // B5
  gain.gain.linearRampToValueAtTime(0, t + duration + release);
  osc.start(t);
  osc.stop(t + duration + release + 0.05);
}

function playShoot() {
  playTone(880, 'square', 0.07, 0.15, 0, 0.005, 0.5, 0.05);
  playTone(440, 'sawtooth', 0.05, 0.08, 0.01, 0.005, 0.5, 0.03);
}

function playRifleShoot() {
  playTone(1200, 'square', 0.04, 0.1, 0, 0.002, 0.5, 0.02);
}

function playEnemyDeath() {
  playTone(300, 'sine', 0.12, 0.2, 0, 0.005, 0.7, 0.08);
  playTone(200, 'sine', 0.1, 0.15, 0.04, 0.005, 0.7, 0.06);
}

function playPlayerHit() {
  playTone(80, 'sawtooth', 0.25, 0.35, 0, 0.01, 0.8, 0.2);
  playTone(120, 'sawtooth', 0.2, 0.25, 0.05, 0.01, 0.8, 0.15);
}

function playDash() {
  playTone(600, 'sine', 0.15, 0.2, 0, 0.005, 0.6, 0.1);
  playTone(900, 'sine', 0.12, 0.15, 0.05, 0.005, 0.6, 0.08);
}

function playGrenade() {
  playTone(60, 'sawtooth', 0.35, 0.4, 0, 0.01, 0.8, 0.3);
  playTone(40, 'square', 0.3, 0.35, 0.05, 0.01, 0.8, 0.25);
  playTone(200, 'sine', 0.25, 0.3, 0.1, 0.01, 0.8, 0.2);
}

function playShieldActivate() {
  playTone(400, 'sine', 0.2, 0.25, 0, 0.01, 0.7, 0.15);
  playTone(600, 'sine', 0.18, 0.2, 0.08, 0.01, 0.7, 0.12);
}

function playCLUnlock(level) {
  // Epic escalating sting per CL level
  const baseFreq = 220 + level * 80;
  for (let i = 0; i < 5; i++) {
    playTone(baseFreq * Math.pow(1.25, i), 'sine', 0.3, 0.3 * (1 - i*0.05), i * 0.08, 0.01, 0.8, 0.2);
  }
  playTone(baseFreq * 4, 'sine', 0.6, 0.4, 0.4, 0.02, 0.9, 0.4);
}

function playWaveClear() {
  const notes = [262, 330, 392, 523];
  notes.forEach((f,i) => playTone(f, 'sine', 0.3, 0.25, i*0.1, 0.01, 0.8, 0.2));
}

function playWin() {
  const notes = [262, 330, 392, 523, 659, 784];
  notes.forEach((f,i) => playTone(f, 'sine', 0.5, 0.35, i*0.12, 0.02, 0.9, 0.3));
}

function playGameOver() {
  const notes = [392, 330, 262, 196];
  notes.forEach((f,i) => playTone(f, 'sawtooth', 0.4, 0.3, i*0.15, 0.02, 0.8, 0.3));
}

// ─── BGM ────────────────────────────────────────────────────────────────────
// 64-second looping BGM — sub-bass drone + tension arpeggio + glitch hits (S6 spread)
function startBGM() {
  if (bgm) return;
  bgm = true;
  scheduleBGMLoop(0);
}

function scheduleBGMLoop(startDelay) {
  if (!audioCtx) return;
  const loopLen = 64;
  const t = audioCtx.currentTime + startDelay;

  // Sub-bass drone (continuous)
  playDrone(55, loopLen, t, 0.18);
  playDrone(73.4, loopLen * 0.5, t, 0.1);

  // Tension arpeggio — irregular intervals (S6: spread across loop)
  const arpNotes = [110, 138.6, 146.8, 164.8, 220];
  const arpTimes = [0, 3.7, 8.2, 12.5, 19.1, 24.8, 31.3, 37.9, 43.2, 49.7, 55.1, 61.6];
  arpTimes.forEach(at => {
    const note = arpNotes[Math.floor(Math.random() * arpNotes.length)];
    playTone(note, 'triangle', 0.4, 0.08, t - audioCtx.currentTime + at, 0.02, 0.7, 0.25);
  });

  // Glitch hits — sparse & irregular (S6)
  const glitchTimes = [5.3, 13.7, 22.1, 35.6, 44.9, 58.3];
  glitchTimes.forEach(gt => {
    playTone(40, 'sawtooth', 0.06, 0.12, t - audioCtx.currentTime + gt, 0.005, 0.8, 0.04);
    playTone(80, 'square', 0.05, 0.1, t - audioCtx.currentTime + gt + 0.02, 0.005, 0.8, 0.03);
  });

  // Kick drum — on 4/4 but with gaps (S6)
  const kickTimes = [0, 2, 4, 8, 10, 12, 16, 18, 20, 24, 26, 28, 32, 36, 40, 42, 46, 48, 52, 56, 60, 62];
  kickTimes.forEach(kt => {
    playTone(60, 'sine', 0.12, 0.2, t - audioCtx.currentTime + kt, 0.005, 0.8, 0.1);
  });

  // Schedule next loop 100ms before end
  setTimeout(() => scheduleBGMLoop(0), (loopLen - 0.1) * 1000);
}

function playDrone(freq, duration, startTime, vol) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.5);
  gain.gain.setValueAtTime(vol * 0.8, startTime + duration - 0.5); // B5
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.1);
}

// ─── GAME START ──────────────────────────────────────────────────────────────
window.startGame = function() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  document.getElementById('overlay').classList.add('hidden');
  resetGame();
  startBGM();
};

function resetGame() {
  // Clear scene objects
  enemies.forEach(e => scene.remove(e.mesh, e.light, e.telegraph));
  enemies = [];
  bullets.forEach(b => scene.remove(b.mesh));
  bullets = [];
  particles.forEach(p => scene.remove(p.mesh));
  particles = [];
  telegraphs.forEach(t => scene.remove(t.mesh));
  telegraphs = [];
  grenades.forEach(g => scene.remove(g.mesh));
  grenades = [];

  // Reset state
  clearanceLevel = 0;
  clProgress = 0;
  playerHP = 3;
  invincibleTimer = 0;
  waveNumber = 0;
  totalKills = 0;
  dashCooldown = 0;
  grenadeCooldown = 0;
  shieldCooldown = 0;
  dashActive = false;
  dashTimer = 0;
  shieldActive = false;
  shieldTimer = 0;
  grenadeCharges = 0;
  cameraShakeAmt = 0;
  abilities = { dash: false, grenade: false, rifle: false, shield: false };

  // Run seed (B4)
  runSeed = Math.floor(Math.random() * 100000);
  rng = seededRNG(runSeed);

  // Player position
  playerMesh.position.set(0, 0.5, 0);
  playerLight.position.set(0, 1.5, 0);

  // Extract zone hidden
  extractMesh.visible = false;
  extractRing.visible = false;

  // Update HUD
  updateHUD();
  updateAbilityBar();

  // Start first wave
  gameState = 'wave';
  startWave();
}

function startWave() {
  waveNumber++;
  // Enemy count: 3 + 2 per wave, capped at 18
  const count = Math.min(3 + (waveNumber - 1) * 2, 18);
  spawnEnemies(count);
  updateHUD();
}

// ─── ENEMY SPAWNING ─────────────────────────────────────────────────────────
function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const angle = (rng() * Math.PI * 2);
    const dist = 16 + rng() * 6;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Speed tiers — G8: difficulty from content
    const tier = clearanceLevel < 4 ? 0 : clearanceLevel < 8 ? 1 : 2;
    const baseSpeed = [1.8, 2.6, 3.6][tier];
    const speed = baseSpeed + rng() * 0.6;

    // HP scales with CL
    const hp = 1 + Math.floor(clearanceLevel / 3);

    const geo = new THREE.ConeGeometry(ENEMY_RADIUS, 1.2, 6);
    const hue = 0xff2222;
    const mat = new THREE.MeshStandardMaterial({ color: hue, emissive: 0x440000, emissiveIntensity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    const light = new THREE.PointLight(0xff2200, 1.5, 5);
    light.position.set(x, 1.2, z);
    scene.add(light);

    // Telegraph ring
    const telGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    const telMat = new THREE.MeshBasicMaterial({ color: 0xff4400, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const telMesh = new THREE.Mesh(telGeo, telMat);
    telMesh.rotation.x = -Math.PI / 2;
    telMesh.position.set(x, 0.05, z);
    scene.add(telMesh);

    enemies.push({
      mesh, light,
      telegraph: telMesh,
      hp, maxHp: hp,
      speed,
      attackTimer: 1.5 + rng() * 1.5, // stagger attack timers
      telegraphTimer: 0,
      isTelegraphing: false,
      radius: ENEMY_RADIUS,
    });
  }
}

// ─── ABILITY HANDLING ────────────────────────────────────────────────────────
function handleAbilityKey(code) {
  if (code === 'Space' && abilities.dash && dashCooldown <= 0 && !dashActive) {
    activateDash();
  }
  if (code === 'KeyQ' && abilities.grenade && grenadeCharges > 0 && grenadeCooldown <= 0) {
    throwGrenade();
  }
  if (code === 'KeyE' && abilities.shield && shieldCooldown <= 0 && !shieldActive) {
    activateShield();
  }
}

function activateDash() {
  dashActive = true;
  dashTimer = DASH_DURATION;
  dashCooldown = DASH_CD;
  // Dash toward mouse world
  dashDir.set(mouseWorld.x - playerMesh.position.x, 0, mouseWorld.z - playerMesh.position.z).normalize();
  playDash();
}

function throwGrenade() {
  grenadeCharges--;
  if (grenadeCharges <= 0 && abilities.grenade) {
    grenadeCooldown = GRENADE_CD;
  }
  // Spawn grenade toward mouse
  const dir = new THREE.Vector3(
    mouseWorld.x - playerMesh.position.x, 0,
    mouseWorld.z - playerMesh.position.z
  ).normalize();

  const geo = new THREE.SphereGeometry(0.25, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(playerMesh.position);
  mesh.position.y = 0.5;
  scene.add(mesh);

  grenades.push({ mesh, dir: dir.clone(), speed: 12, timer: 1.0, fuse: 1.0 });
  playShoot();
}

function activateShield() {
  shieldActive = true;
  shieldTimer = SHIELD_DURATION;
  shieldCooldown = SHIELD_CD;
  playerMesh.material.emissive.setHex(0x8888ff);
  playerMesh.material.emissiveIntensity = 3;
  playerLight.color.setHex(0x8888ff);
  playShieldActivate();
}

function tryShoot() {
  // Auto-shoot toward mouse
  spawnBullet(false);
}

function spawnBullet(isRifle) {
  const from = playerMesh.position.clone();
  from.y = 0.5;
  const dir = new THREE.Vector3(
    mouseWorld.x - from.x, 0,
    mouseWorld.z - from.z
  ).normalize();

  const spread = isRifle ? (Math.random() - 0.5) * 0.05 : 0;
  dir.x += spread;
  dir.z += (Math.random() - 0.5) * 0.02;
  dir.normalize();
  const geo = new THREE.SphereGeometry(0.12, 6, 6);
  const color = isRifle ? 0xff8800 : 0x00ffff;
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from);
  scene.add(mesh);

  const pl = new THREE.PointLight(color, 2, 4);
  pl.position.copy(from);
  scene.add(pl);

  bullets.push({ mesh, light: pl, dir: dir.clone(), speed: BULLET_SPEED, life: 3, damage: isRifle ? 1 : 1 });

  if (isRifle) playRifleShoot();
  else playShoot();
}

// ─── CL UNLOCK ───────────────────────────────────────────────────────────────
function triggerCLUnlock(newCL) {
  clearanceLevel = newCL;
  clProgress = 0;

  // UI flash
  const flash = document.getElementById('cl-flash');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 400);

  const chroma = document.getElementById('chroma-overlay');
  chroma.style.opacity = '1';
  setTimeout(() => { chroma.style.opacity = '0'; }, 300);

  // Update HUD
  document.getElementById('cl-level').textContent = `LEVEL ${newCL}`;
  document.getElementById('cl-number').textContent = newCL;
  document.getElementById('cl-bar-fill').style.width = '0%';

  // Play sting
  playCLUnlock(newCL);

  // Camera shake
  cameraShakeAmt = 0.5;

  // Unlock ability
  const unlockKey = CL_UNLOCKS[newCL];
  if (unlockKey) {
    abilities[unlockKey] = true;
    if (unlockKey === 'grenade') grenadeCharges = GRENADE_CHARGES_MAX;
    updateAbilityBar();

    // Show unlock notification
    const notif = document.getElementById('unlock-notif');
    document.getElementById('unlock-ability').textContent = UNLOCK_NAMES[unlockKey];
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 2000);
  }

  // At CL10, show extract zone
  if (newCL >= 10) {
    placeExtractZone();
  }

  // Update best
  if (newCL > bestCL) {
    bestCL = newCL;
    localStorage.setItem('clearance_best', bestCL);
  }
}

function placeExtractZone() {
  // G4: randomized position per run via runSeed
  const rng2 = seededRNG(runSeed + 99);
  const angle = rng2() * Math.PI * 2;
  const dist = 8 + rng2() * 6;
  extractPos.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  extractMesh.position.copy(extractPos);
  extractMesh.position.y = 0.05;
  extractRing.position.copy(extractPos);
  extractRing.position.y = 0.5;
  extractMesh.visible = true;
  extractRing.visible = true;
}

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
function spawnParticles(pos, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.12);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(speed * (0.5 + Math.random()));

    particles.push({ mesh, vel, life: 0.8 + Math.random() * 0.4 });
  }
}

function spawnGrenadeExplosion(pos) {
  // Big explosion — ring shockwave + particles
  spawnParticles(pos, 0xff8800, 20, 6);
  spawnParticles(pos, 0xff4400, 12, 9);

  const ringGeo = new THREE.TorusGeometry(0.3, 0.05, 6, 24);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  particles.push({ mesh: ring, vel: new THREE.Vector3(0,0,0), life: 0.5, isShockwave: true, scale: 1 });

  playGrenade();
  cameraShakeAmt += 0.4;

  // Flash light
  const pl = new THREE.PointLight(0xff8800, 8, 12);
  pl.position.copy(pos);
  pl.position.y = 0.5;
  scene.add(pl);
  setTimeout(() => scene.remove(pl), 200);
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
function update(dt) {
  if (gameState !== 'wave') return;

  // LP8: all physics × dt
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateGrenades(dt);
  updateParticles(dt);
  updateAbilityCooldowns(dt);
  updateTelegraphs(dt);

  // Extract check
  if (clearanceLevel >= 10 && extractMesh.visible) {
    const dist = playerMesh.position.distanceTo(extractPos);
    if (dist < 2) {
      triggerWin();
    }
    // Pulse extract ring
    extractRing.rotation.z += dt * 1.5;
    extractRing.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);
  }

  // Rifle auto-fire
  if (abilities.rifle) {
    rifleFireTimer -= dt;
    if (rifleFireTimer <= 0 && (keys['Mouse0'] || false)) {
      // handled by mousemove+click; but auto rapid fire when holding:
    }
  }

  // Check wave clear
  if (enemies.length === 0 && gameState === 'wave') {
    waveClear();
  }
}

function updatePlayer(dt) {
  // LP8: movement × dt
  if (dashActive) {
    dashTimer -= dt;
    if (dashTimer <= 0) {
      dashActive = false;
      playerMesh.material.emissiveIntensity = 1;
    } else {
      const mv = dashDir.clone().multiplyScalar(DASH_SPEED * dt);
      playerMesh.position.add(mv);
    }
  } else {
    const moveDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp'])    moveDir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  moveDir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(PLAYER_SPEED * dt);
      playerMesh.position.add(moveDir);
    }
  }

  // Arena bounds
  const half = ARENA_SIZE - 1;
  playerMesh.position.x = Math.max(-half, Math.min(half, playerMesh.position.x));
  playerMesh.position.z = Math.max(-half, Math.min(half, playerMesh.position.z));
  playerMesh.position.y = 0.5;

  // Face mouse
  const angle = Math.atan2(
    mouseWorld.x - playerMesh.position.x,
    mouseWorld.z - playerMesh.position.z
  );
  playerMesh.rotation.y = angle;
  playerMesh.rotation.x += dt * 2; // constant spin for feel

  // Update light
  playerLight.position.copy(playerMesh.position);
  playerLight.position.y += 1;

  // Shield material reset
  if (shieldActive) {
    shieldTimer -= dt;
    if (shieldTimer <= 0) {
      shieldActive = false;
      playerMesh.material.emissive.setHex(0x004488);
      playerMesh.material.emissiveIntensity = 1;
      playerLight.color.setHex(0x00ffff);
    }
  }

  // Invincibility
  if (invincibleTimer > 0) {
    invincibleTimer -= dt;
    playerMesh.visible = Math.floor(Date.now() / 80) % 2 === 0;
  } else {
    playerMesh.visible = true;
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) {
      scene.remove(b.mesh, b.light);
      bullets.splice(i, 1);
      continue;
    }

    // LP8
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    b.light.position.copy(b.mesh.position);

    // Bounds
    const bp = b.mesh.position;
    if (Math.abs(bp.x) > ARENA_SIZE || Math.abs(bp.z) > ARENA_SIZE) {
      scene.remove(b.mesh, b.light);
      bullets.splice(i, 1);
      continue;
    }

    // Hit enemies
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dist = b.mesh.position.distanceTo(e.mesh.position);
      if (dist < e.radius + 0.2) {
        e.hp -= b.damage;
        spawnParticles(e.mesh.position.clone(), 0xff2200, 4, 3);
        cameraShakeAmt += 0.1; // Breach pattern
        if (e.hp <= 0) killEnemy(j);
        scene.remove(b.mesh, b.light);
        bullets.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }
}

function killEnemy(idx) {
  const e = enemies[idx];
  spawnParticles(e.mesh.position.clone(), 0xff3300, 10, 5);
  scene.remove(e.mesh, e.light, e.telegraph);
  enemies.splice(idx, 1);
  totalKills++;
  playEnemyDeath();
  document.getElementById('kill-counter').textContent = `KILLS: ${totalKills}`;

  // CL progress: each kill fills a portion
  // 2 waves per CL level; wave = count kills to fill
  // Progress based on enemies per wave
  const waveCount = Math.min(3 + (waveNumber - 1) * 2, 18);
  const progressPerKill = 0.5 / waveCount; // half a CL per wave kill
  clProgress += progressPerKill;

  const clBarFill = document.getElementById('cl-bar-fill');
  // CL bar shows progress within current 2-wave cycle
  const fillPct = Math.min(clProgress * 100, 100);
  clBarFill.style.width = `${fillPct}%`;
}

function updateEnemies(dt) {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dir = new THREE.Vector3(
      playerMesh.position.x - e.mesh.position.x,
      0,
      playerMesh.position.z - e.mesh.position.z
    );
    const dist = dir.length();

    // LP8: movement × dt
    if (dist > 1.0) {
      dir.normalize().multiplyScalar(e.speed * dt);
      e.mesh.position.add(dir);
      e.light.position.copy(e.mesh.position);
      e.light.position.y += 0.8;
    }

    e.mesh.rotation.y += dt * 2;

    // Update telegraph position
    e.telegraph.position.x = e.mesh.position.x;
    e.telegraph.position.z = e.mesh.position.z;

    // Attack logic — telegraph ring before melee hit
    e.attackTimer -= dt;
    if (e.attackTimer <= 0 && !e.isTelegraphing) {
      // Start telegraph
      e.isTelegraphing = true;
      e.telegraphTimer = 0.4;
      e.telegraph.material.opacity = 0.8;
    }
    if (e.isTelegraphing) {
      e.telegraphTimer -= dt;
      if (e.telegraphTimer <= 0) {
        // Attack fires
        e.isTelegraphing = false;
        e.telegraph.material.opacity = 0;
        e.attackTimer = 2.0 + Math.random() * 1.5;

        // Check hit
        const playerDist = e.mesh.position.distanceTo(playerMesh.position);
        if (playerDist < ENEMY_RADIUS + PLAYER_RADIUS + 0.5) { // G5
          damagePlayer();
        }
      }
    }
  }
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.timer -= dt;
    g.mesh.position.addScaledVector(g.dir, g.speed * dt); // LP8
    g.mesh.rotation.x += dt * 5;
    g.mesh.rotation.z += dt * 3;

    if (g.timer <= 0) {
      // Explode
      const pos = g.mesh.position.clone();
      spawnGrenadeExplosion(pos);
      scene.remove(g.mesh);
      grenades.splice(i, 1);

      // Damage enemies in radius 4
      for (let j = enemies.length - 1; j >= 0; j--) {
        const dist = pos.distanceTo(enemies[j].mesh.position);
        if (dist < 4) {
          enemies[j].hp -= 2;
          if (enemies[j].hp <= 0) killEnemy(j);
        }
      }
      continue;
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }

    if (p.isShockwave) {
      p.scale += dt * 8;
      p.mesh.scale.setScalar(p.scale);
      p.mesh.material.opacity = p.life;
    } else {
      // LP8
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 3 * dt; // gravity
      p.mesh.material.opacity = p.life;
    }
  }
}

function updateAbilityCooldowns(dt) {
  // LP8
  if (dashCooldown > 0) dashCooldown -= dt;
  if (grenadeCooldown > 0) {
    grenadeCooldown -= dt;
    if (grenadeCooldown <= 0) grenadeCharges = GRENADE_CHARGES_MAX;
  }
  if (shieldCooldown > 0) shieldCooldown -= dt;

  // Update cooldown bars
  if (abilities.dash) {
    document.getElementById('cd-dash').style.width = `${Math.max(0, (1 - dashCooldown/DASH_CD) * 100)}%`;
  }
  if (abilities.grenade) {
    document.getElementById('cd-grenade').style.width = `${Math.max(0, (1 - grenadeCooldown/GRENADE_CD) * 100)}%`;
  }
  if (abilities.shield) {
    document.getElementById('cd-shield').style.width = `${Math.max(0, (1 - shieldCooldown/SHIELD_CD) * 100)}%`;
  }
}

function updateTelegraphs(dt) {
  for (const e of enemies) {
    if (e.isTelegraphing) {
      // Pulse opacity
      const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
      e.telegraph.material.opacity = pulse;
    }
  }
}

// ─── DAMAGE ──────────────────────────────────────────────────────────────────
function damagePlayer() {
  if (invincibleTimer > 0) return; // G9: iframe check FIRST
  if (shieldActive) {
    // Shield absorbs hit
    cameraShakeAmt += 0.2;
    shieldActive = false;
    shieldTimer = 0;
    playerMesh.material.emissive.setHex(0x004488);
    playerMesh.material.emissiveIntensity = 1;
    return;
  }

  playerHP--;
  invincibleTimer = 1.5; // G1
  cameraShakeAmt += 0.3; // Breach: 0.3 on player hit
  playPlayerHit();
  updateHPBar();

  if (playerHP <= 0) {
    triggerGameOver();
  }
}

// ─── WAVE CLEAR ──────────────────────────────────────────────────────────────
function waveClear() {
  gameState = 'waveclear'; // T3: only transition from 'wave'
  playWaveClear();

  // CL progress: completing a wave gives significant progress
  clProgress += 0.5;

  const waveFlash = document.getElementById('wave-flash');
  waveFlash.classList.add('show');

  setTimeout(() => {
    waveFlash.classList.remove('show');

    // Check CL threshold
    const newCL = Math.min(10, Math.floor(clProgress));
    if (newCL > clearanceLevel) {
      triggerCLUnlock(newCL);
    }

    updateHUD();

    if (waveNumber >= 10) {
      // Last wave cleared — if CL10 not reached, force CL10
      if (clearanceLevel < 10) {
        triggerCLUnlock(10);
      }
      gameState = 'wave';
      // Extract zone should be visible now
      return;
    }

    gameState = 'wave';
    startWave();
  }, 600);
}

// ─── WIN / GAME OVER ─────────────────────────────────────────────────────────
function triggerWin() {
  if (gameState === 'win' || gameState === 'gameover') return; // B2 guard
  gameState = 'win'; // B2: terminal state FIRST
  playWin();
  cameraShakeAmt = 0.8;

  setTimeout(() => {
    showOverlay('EXTRACTED', `CLEARANCE: LEVEL ${clearanceLevel}`, `KILLS: ${totalKills}`, 'MISSION COMPLETE');
  }, 800);
}

function triggerGameOver() {
  if (gameState === 'gameover' || gameState === 'win') return;
  gameState = 'gameover'; // B2
  playGameOver();

  setTimeout(() => {
    showOverlay('TERMINATED', `CLEARANCE REACHED: LEVEL ${clearanceLevel}`, `KILLS: ${totalKills} | PERSONAL BEST: CL ${bestCL}`, 'RETRY');
  }, 800);
}

function showOverlay(title, sub, score, btnText) {
  const overlay = document.getElementById('overlay');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent = sub;
  document.getElementById('overlay-score').textContent = score;
  document.getElementById('overlay-btn').textContent = `[ ${btnText} ]`;
  overlay.classList.remove('hidden');
}

// ─── CAMERA ──────────────────────────────────────────────────────────────────
function cameraUpdate(dt) {
  // G7: smooth camera lerp tracking player
  const targetX = playerMesh.position.x * 0.3;
  const targetZ = playerMesh.position.z * 0.3 + 14;
  camera.position.x += (targetX - camera.position.x) * 0.06;
  camera.position.z += (targetZ - camera.position.z) * 0.06;
  camera.position.y = 20;

  // Camera shake (Breach pattern)
  if (cameraShakeAmt > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShakeAmt;
    camera.position.z += (Math.random() - 0.5) * cameraShakeAmt;
    cameraShakeAmt *= 0.85; // LP8: decay each frame
    if (cameraShakeAmt < 0.01) cameraShakeAmt = 0;
  }

  camera.lookAt(playerMesh.position.x * 0.1, 0, playerMesh.position.z * 0.1);
}

// ─── HUD UPDATES ─────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('cl-level').textContent = `LEVEL ${clearanceLevel}`;
  document.getElementById('cl-number').textContent = clearanceLevel;
  document.getElementById('wave-num').textContent = `${waveNumber} / 10`;
  document.getElementById('wave-number').textContent = waveNumber;
  document.getElementById('kill-counter').textContent = `KILLS: ${totalKills}`;
  updateHPBar();

  const fillPct = (clProgress % 1) * 100;
  document.getElementById('cl-bar-fill').style.width = `${fillPct}%`;
}

function updateHPBar() {
  for (let i = 0; i < 3; i++) {
    const pip = document.getElementById(`hp-${i}`);
    if (pip) {
      if (i < playerHP) {
        pip.classList.remove('empty');
      } else {
        pip.classList.add('empty');
      }
    }
  }
  // Red flashing on low HP
  const clEl = document.getElementById('cl-level');
  if (playerHP <= 1) {
    clEl.classList.add('red');
  } else {
    clEl.classList.remove('red');
  }
}

function updateAbilityBar() {
  const slots = {
    dash: 'ab-dash',
    grenade: 'ab-grenade',
    rifle: 'ab-rifle',
    shield: 'ab-shield'
  };
  for (const [key, id] of Object.entries(slots)) {
    const el = document.getElementById(id);
    if (abilities[key]) {
      el.classList.add('unlocked');
    }
  }
}

// ─── RESIZE ──────────────────────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ─── RIFLE AUTO-FIRE via mousemove hold ─────────────────────────────────────
let mouseDown = false;
window.addEventListener('mousedown', e => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  mouseDown = true;
  if (gameState === 'wave') tryShoot();
});
window.addEventListener('mouseup', () => { mouseDown = false; });

// Rifle holds fire while mousedown
setInterval(() => {
  if (mouseDown && gameState === 'wave' && abilities.rifle) {
    spawnBullet(true);
  }
}, 80);

// ─── START ──────────────────────────────────────────────────────────────────
init();
