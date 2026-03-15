import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── MODULE SCOPE VARS (T2) ───────────────────────────────────────────────────
let renderer, scene, camera, composer;
let clock;
let animId;

// game state
let gameState = 'idle'; // idle | running | ended (T3 — transitions own their state change)
let score = 0;
let hp = 3;
let timeLeft = 45;
let invincibleTimer = 0;
let weaponIndex = 0;
let weaponCooldown = 0;
let waveTimer = 0;
let waveNumber = 0;
let shakeIntensity = 0;
let arenaFlashTimer = 0;

// scene objects
let playerMesh;
let enemies = [];
let projectiles = [];
let particles = [];
let wells = [];       // gravity wells
let lightningArcs = [];
let starField;

// input
const keys = {};
let mouseWorld = new THREE.Vector3();
let mouseX = 0;
let mouseY = 0;

// raycaster for mouse world pos
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// UI refs
const overlayEl = document.getElementById('overlay');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const hpEl = document.getElementById('hp');
const weaponLabelEl = document.getElementById('weapon-label');

// colors per weapon
const WEAPON_COLORS = [0x00ffff, 0xff8800, 0xaa00ff, 0xffffff];
const WEAPON_NAMES = ['🪃 BOOMERANG', '🔱 SCATTER', '🌑 GRAVITY WELL', '⚡ CHAIN LIGHTNING'];
const WEAPON_COLOR_CSS = ['#00ffff', '#ff8800', '#aa00ff', '#ffffff'];

// ─── AUDIO ───────────────────────────────────────────────────────────────────
let audioCtx = null;
let masterGain = null;
let bgmGain = null;
let bgmTimeout = null;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  bgmGain = audioCtx.createGain();
  bgmGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  bgmGain.connect(masterGain);

  startBGM();
}

function playTone(freq, type, attackT, sustainT, releaseT, peakGain, destination, startOffset = 0) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + startOffset;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(peakGain, t + attackT);
  gain.gain.setValueAtTime(peakGain * 0.7, t + attackT + sustainT); // B5: sustain never 0
  gain.gain.linearRampToValueAtTime(0.001, t + attackT + sustainT + releaseT);
  osc.connect(gain);
  gain.connect(destination || masterGain);
  osc.start(t);
  osc.stop(t + attackT + sustainT + releaseT + 0.05);
}

function startBGM() {
  if (!audioCtx) return;
  // Sub-bass drone
  playTone(55, 'sine', 0.5, 62, 1.5, 0.28, bgmGain);
  playTone(110, 'sine', 0.3, 62, 1.0, 0.12, bgmGain);

  // S6: irregular arpeggio events across 64s loop
  const arpeggioNotes = [220, 277, 330, 392, 440, 523, 330, 277];
  const timings = [4, 9, 15, 21, 27, 33, 40, 47, 54, 61];
  timings.forEach((t, i) => {
    const note = arpeggioNotes[i % arpeggioNotes.length];
    playTone(note, 'triangle', 0.05, 0.2, 0.4, 0.06, bgmGain, t);
  });

  // Kick-like pulses
  [2, 10, 18, 26, 34, 42, 50, 58].forEach(t => {
    playTone(80, 'sine', 0.01, 0.08, 0.15, 0.18, bgmGain, t);
  });

  bgmTimeout = setTimeout(startBGM, 64000);
}

function sfxShoot(wIdx) {
  if (!audioCtx) return;
  if (wIdx === 0) { // boomerang
    playTone(660, 'sawtooth', 0.02, 0.08, 0.12, 0.15, masterGain);
    playTone(880, 'sine', 0.01, 0.06, 0.10, 0.08, masterGain);
  } else if (wIdx === 1) { // scatter
    for (let i = 0; i < 5; i++) {
      playTone(440 + Math.random() * 200, 'square', 0.005, 0.04, 0.06, 0.06, masterGain, i * 0.01);
    }
  } else if (wIdx === 2) { // gravity well
    playTone(200, 'sawtooth', 0.05, 0.6, 0.4, 0.2, masterGain);
    playTone(100, 'sine', 0.1, 0.8, 0.5, 0.15, masterGain);
  } else { // chain lightning
    playTone(1200, 'sawtooth', 0.005, 0.03, 0.08, 0.18, masterGain);
    playTone(900, 'sawtooth', 0.005, 0.03, 0.08, 0.12, masterGain, 0.02);
    playTone(600, 'sawtooth', 0.005, 0.03, 0.08, 0.08, masterGain, 0.04);
  }
}

function sfxEnemyDeath() {
  if (!audioCtx) return;
  playTone(440, 'sine', 0.01, 0.05, 0.15, 0.12, masterGain);
  playTone(660, 'sine', 0.01, 0.04, 0.12, 0.08, masterGain, 0.03);
}

function sfxPlayerHit() {
  if (!audioCtx) return;
  playTone(120, 'sawtooth', 0.005, 0.1, 0.2, 0.3, masterGain);
  playTone(80, 'sine', 0.005, 0.15, 0.25, 0.2, masterGain);
}

function sfxWeaponSwitch() {
  if (!audioCtx) return;
  [523, 659, 784, 1047].forEach((f, i) => {
    playTone(f, 'sine', 0.02, 0.08, 0.15, 0.15, masterGain, i * 0.07);
  });
}

function sfxWave() {
  if (!audioCtx) return;
  [220, 277, 330].forEach((f, i) => {
    playTone(f, 'sine', 0.05, 0.2, 0.3, 0.1, masterGain, i * 0.1);
  });
}

function sfxWin() {
  if (!audioCtx) return;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    playTone(f, 'sine', 0.05, 0.3, 0.4, 0.2, masterGain, i * 0.12);
  });
}

function sfxLose() {
  if (!audioCtx) return;
  [400, 320, 250, 180].forEach((f, i) => {
    playTone(f, 'sawtooth', 0.02, 0.25, 0.3, 0.18, masterGain, i * 0.15);
  });
}

function sfxWellDetonate() {
  if (!audioCtx) return;
  playTone(60, 'sine', 0.01, 0.15, 0.5, 0.35, masterGain);
  playTone(120, 'sawtooth', 0.01, 0.1, 0.4, 0.2, masterGain);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initRenderer() {
  // T4: Try WebGPU, fall back to WebGL
  try {
    if (THREE.WebGPURenderer) {
      renderer = new THREE.WebGPURenderer({ antialias: true });
      await renderer.init();
    } else {
      throw new Error('no WebGPU');
    }
  } catch (e) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);
}

function initScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000008, 0.035);
  scene.background = new THREE.Color(0x000008);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 22, 18);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0x111122, 2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Bloom composer
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4, 0.5, 0.2
  );
  composer.addPass(bloom);

  // Arena floor
  const floorGeo = new THREE.CircleGeometry(20, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 1, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Arena ring (boundary)
  const ringGeo = new THREE.TorusGeometry(20, 0.35, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x334466, emissive: 0x112244, emissiveIntensity: 1.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  // Pillar accents around ring
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x112233, emissiveIntensity: 1 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(Math.cos(angle) * 20, 0.4, Math.sin(angle) * 20);
    scene.add(pillar);
  }

  // Grid lines on floor
  const gridHelper = new THREE.GridHelper(40, 20, 0x111133, 0x080820);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Stars (THREE.Points)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 600;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 300;
    starPositions[i * 3 + 1] = Math.random() * 150 + 20;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  clock = new THREE.Clock();
}

function initPlayer() {
  if (playerMesh) {
    scene.remove(playerMesh);
    playerMesh.geometry.dispose();
    playerMesh.material.dispose();
  }
  const geo = new THREE.OctahedronGeometry(0.6);
  const mat = new THREE.MeshStandardMaterial({
    color: WEAPON_COLORS[weaponIndex],
    emissive: WEAPON_COLORS[weaponIndex],
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.8
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.position.set(0, 0.6, 0);
  scene.add(playerMesh);
}

// ─── GAME START / END ─────────────────────────────────────────────────────────
function startGame() {
  // reset state
  score = 0;
  hp = 3;
  timeLeft = 45;
  invincibleTimer = 0;
  weaponCooldown = 0;
  waveTimer = 0;
  waveNumber = 0;
  shakeIntensity = 0;
  arenaFlashTimer = 0;

  // clear existing objects
  enemies.forEach(e => { scene.remove(e.mesh); e.geometry?.dispose(); if (e.telegraph) scene.remove(e.telegraph); });
  enemies = [];
  projectiles.forEach(p => { scene.remove(p.mesh); });
  projectiles = [];
  particles.forEach(p => { scene.remove(p.mesh); });
  particles = [];
  wells.forEach(w => { scene.remove(w.mesh); if (w.ring) scene.remove(w.ring); });
  wells = [];
  lightningArcs.forEach(a => scene.remove(a));
  lightningArcs = [];

  initPlayer();
  updateUI();
  showWeaponLabel();

  gameState = 'running'; // T3: set directly, no intermediate state

  spawnWave();

  clock.getDelta(); // reset dt accumulator
}

function endGame(won) {
  gameState = 'ended'; // B2: terminal state set FIRST

  if (won) {
    score += 50;
    sfxWin();
  } else {
    sfxLose();
  }

  updateUI();

  weaponIndex = (weaponIndex + 1) % 4;

  // B2: async callbacks AFTER state set
  setTimeout(() => {
    if (gameState !== 'ended') return; // guard: player already clicked to restart
    const nextWeaponName = WEAPON_NAMES[weaponIndex];
    overlayEl.innerHTML = `
      <h1>${won ? 'SURVIVED' : 'DEAD'}</h1>
      <div class="final-score">${score} pts</div>
      <div class="sub">${won ? '+50 SURVIVAL BONUS' : ''}</div>
      <div class="weapon-next">NEXT WEAPON: ${nextWeaponName}</div>
      <div class="hint">CLICK FOR NEXT RUN</div>
    `;
    overlayEl.style.display = 'flex';
  }, 800);
}

// ─── ENEMIES ──────────────────────────────────────────────────────────────────
function spawnWave() {
  waveNumber++;
  const count = 3 + waveNumber * 2;
  for (let i = 0; i < count; i++) {
    spawnEnemy();
  }
  sfxWave();
  waveTimer = 0;
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 18 + Math.random() * 1.5;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const geo = new THREE.ConeGeometry(0.45, 1.0, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xcc2222,
    emissive: 0x440000,
    emissiveIntensity: 1.2,
    roughness: 0.4,
    metalness: 0.6
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.5, z);
  mesh.rotation.x = Math.PI; // cone points down
  scene.add(mesh);

  // telegraph ring
  const tGeo = new THREE.RingGeometry(0.6, 0.8, 16);
  const tMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const telegraph = new THREE.Mesh(tGeo, tMat);
  telegraph.rotation.x = -Math.PI / 2;
  telegraph.position.set(x, 0.05, z);
  scene.add(telegraph);

  const speed = 3 + waveNumber * 0.5;
  enemies.push({ mesh, telegraph, geo, speed, hp: 1, telegraphTimer: 0, telegraphActive: false });
}

function killEnemy(enemy, idx) {
  scene.remove(enemy.mesh);
  scene.remove(enemy.telegraph);
  enemy.geo.dispose();
  enemy.mesh.material.dispose();
  enemy.telegraph.geometry.dispose();
  enemy.telegraph.material.dispose();
  enemies.splice(idx, 1);

  score += 10;
  cameraShake(0.15);
  sfxEnemyDeath();
  spawnParticles(enemy.mesh.position.clone(), WEAPON_COLORS[weaponIndex], 12);
  updateUI();
}

// ─── PROJECTILES ──────────────────────────────────────────────────────────────
function fireWeapon() {
  if (weaponCooldown > 0) return;
  const pos = playerMesh.position.clone();
  const dir = mouseWorld.clone().sub(pos).setY(0).normalize();

  if (weaponIndex === 0) { // BOOMERANG
    weaponCooldown = 0.8;
    sfxShoot(0);
    const geo = new THREE.TorusGeometry(0.35, 0.1, 8, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2, roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = 0.6;
    scene.add(mesh);
    projectiles.push({
      mesh, type: 'boomerang',
      vel: dir.clone().multiplyScalar(14),
      origin: pos.clone(),
      maxDist: 12,
      returning: false,
      hitEnemies: new Set()
    });
  } else if (weaponIndex === 1) { // SCATTER
    weaponCooldown = 0.25;
    sfxShoot(1);
    for (let i = -2; i <= 2; i++) {
      const angle = i * (Math.PI / 12); // ±15° spread
      const rotDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const geo = new THREE.SphereGeometry(0.18, 6, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff8800, emissive: 0xff8800, emissiveIntensity: 2, roughness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.y = 0.6;
      scene.add(mesh);
      projectiles.push({ mesh, type: 'scatter', vel: rotDir.multiplyScalar(18), maxDist: 15, dist: 0 });
    }
  } else if (weaponIndex === 2) { // GRAVITY WELL
    weaponCooldown = 3.0;
    sfxShoot(2);
    const geo = new THREE.SphereGeometry(0.5, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 2.5, roughness: 0.1, transparent: true, opacity: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mouseWorld);
    mesh.position.y = 0.5;
    scene.add(mesh);

    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(mesh.position);
    ring.position.y = 0.05;
    scene.add(ring);

    wells.push({ mesh, ring, timer: 2.0, pullRadius: 8, detonateRadius: 5, detonated: false });
  } else { // CHAIN LIGHTNING
    weaponCooldown = 0.5;
    sfxShoot(3);
    fireChainLightning(pos, 3);
  }
}

function fireChainLightning(origin, jumpsLeft) {
  if (enemies.length === 0) return;

  // remove old arcs
  lightningArcs.forEach(a => scene.remove(a));
  lightningArcs = [];

  let remaining = [...enemies];
  let currentPos = origin.clone();
  let hitSet = new Set();
  let chainCount = Math.min(jumpsLeft, remaining.length);

  for (let j = 0; j < chainCount; j++) {
    let closest = null;
    let closestDist = Infinity;
    remaining.forEach(e => {
      if (hitSet.has(e)) return;
      const d = currentPos.distanceTo(e.mesh.position);
      if (d < closestDist) { closestDist = d; closest = e; }
    });
    if (!closest) break;

    hitSet.add(closest);

    // draw arc (LineSegments)
    const points = [];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lx = currentPos.x + (closest.mesh.position.x - currentPos.x) * t + (Math.random() - 0.5) * 0.6 * (1 - Math.abs(t - 0.5) * 2);
      const ly = 0.6 + Math.sin(t * Math.PI) * 0.8;
      const lz = currentPos.z + (closest.mesh.position.z - currentPos.z) * t + (Math.random() - 0.5) * 0.6 * (1 - Math.abs(t - 0.5) * 2);
      points.push(new THREE.Vector3(lx, ly, lz));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const arc = new THREE.Line(lineGeo, lineMat);
    scene.add(arc);
    lightningArcs.push(arc);

    // kill enemy
    const idx = enemies.indexOf(closest);
    if (idx !== -1) killEnemy(closest, idx);

    currentPos = closest.mesh.position.clone();
  }

  // remove arcs after 0.15s
  setTimeout(() => {
    lightningArcs.forEach(a => { scene.remove(a); a.geometry.dispose(); });
    lightningArcs = [];
  }, 150);
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.TetrahedronGeometry(0.12);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 2, roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = 0.4;
    const vx = (Math.random() - 0.5) * 10;
    const vy = Math.random() * 5 + 2;
    const vz = (Math.random() - 0.5) * 10;
    scene.add(mesh);
    particles.push({ mesh, vel: new THREE.Vector3(vx, vy, vz), life: 0.6, maxLife: 0.6 });
  }
}

// ─── CAMERA SHAKE ─────────────────────────────────────────────────────────────
function cameraShake(amount) {
  shakeIntensity = Math.max(shakeIntensity, amount);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
  timerEl.textContent = Math.ceil(timeLeft);
  scoreEl.textContent = score;
  const hearts = '♥ '.repeat(hp) + '♡ '.repeat(Math.max(0, 3 - hp));
  hpEl.textContent = hearts.trim();
  hpEl.style.color = hp <= 1 ? '#ff4444' : '#ffffff';
}

function showWeaponLabel() {
  const name = WEAPON_NAMES[weaponIndex];
  const color = WEAPON_COLOR_CSS[weaponIndex];
  weaponLabelEl.textContent = name;
  weaponLabelEl.style.color = color;
  weaponLabelEl.style.opacity = '1';
  setTimeout(() => { weaponLabelEl.style.opacity = '0'; }, 1500);
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
function tick() {
  animId = requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05); // LP8: dt cap

  // always render (even in idle/ended)
  if (gameState === 'running') {
    update(dt);
  }

  // camera shake
  const camBase = new THREE.Vector3(0, 22, 18);
  if (shakeIntensity > 0.001) {
    camera.position.x = camBase.x + (Math.random() - 0.5) * shakeIntensity * 4;
    camera.position.y = camBase.y + (Math.random() - 0.5) * shakeIntensity * 2;
    camera.position.z = camBase.z + (Math.random() - 0.5) * shakeIntensity * 4;
    shakeIntensity *= 0.85;
  } else {
    camera.position.copy(camBase);
  }
  camera.lookAt(0, 0, 0);

  // arena flash
  if (arenaFlashTimer > 0) {
    arenaFlashTimer -= dt;
  }

  composer.render();
}

function update(dt) {
  // ── Player movement ──
  const moveSpeed = 7;
  const moveDir = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp'])    moveDir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  moveDir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;

  if (moveDir.length() > 0) {
    moveDir.normalize();
    playerMesh.position.x += moveDir.x * moveSpeed * dt; // LP8
    playerMesh.position.z += moveDir.z * moveSpeed * dt; // LP8
  }

  // clamp to arena
  const pLen = Math.sqrt(playerMesh.position.x ** 2 + playerMesh.position.z ** 2);
  if (pLen > 19) {
    playerMesh.position.x = (playerMesh.position.x / pLen) * 19;
    playerMesh.position.z = (playerMesh.position.z / pLen) * 19;
  }

  // player rotation toward mouse
  const dx = mouseWorld.x - playerMesh.position.x;
  const dz = mouseWorld.z - playerMesh.position.z;
  playerMesh.rotation.y = Math.atan2(dx, dz);
  playerMesh.rotation.x += 1.5 * dt;

  // weapon cooldown
  if (weaponCooldown > 0) weaponCooldown -= dt; // LP8

  // invincibility timer
  if (invincibleTimer > 0) invincibleTimer -= dt; // LP8

  // ── Timer ──
  timeLeft -= dt; // LP8
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateUI();
    endGame(true);
    return;
  }
  updateUI();

  // ── Waves ──
  waveTimer += dt; // LP8
  if (waveTimer > 8) {
    spawnWave();
  }

  // ── Enemies ──
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const toPlayer = playerMesh.position.clone().sub(e.mesh.position).setY(0);
    const dist = toPlayer.length();

    if (dist > 0.01) {
      const mv = toPlayer.normalize().multiplyScalar(e.speed * dt); // LP8
      e.mesh.position.x += mv.x;
      e.mesh.position.z += mv.z;
      e.telegraph.position.x = e.mesh.position.x;
      e.telegraph.position.z = e.mesh.position.z;
    }

    e.mesh.rotation.y += 2 * dt; // LP8

    // telegraph ring — pulse red when close
    if (dist < 3.5) {
      e.telegraphTimer += dt; // LP8
      const pulse = Math.abs(Math.sin(e.telegraphTimer * 8));
      e.telegraph.material.opacity = pulse * 0.7;
    } else {
      e.telegraph.material.opacity = 0;
      e.telegraphTimer = 0;
    }

    // player contact damage
    if (dist < 1.1 && invincibleTimer <= 0) {
      hp--;
      invincibleTimer = 1.5; // G1
      cameraShake(0.35);
      sfxPlayerHit();
      updateUI();
      if (hp <= 0) {
        endGame(false);
        return;
      }
    }
  }

  // ── Projectiles ──
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    if (p.type === 'boomerang') {
      const travelDir = p.vel.clone().normalize();
      p.mesh.position.x += p.vel.x * dt; // LP8
      p.mesh.position.z += p.vel.z * dt; // LP8
      p.mesh.rotation.y += 6 * dt;
      p.mesh.rotation.z += 4 * dt;

      const travelDist = p.mesh.position.clone().setY(0).distanceTo(p.origin.clone().setY(0));

      if (!p.returning && travelDist >= p.maxDist) {
        p.returning = true;
        // reverse velocity toward player
      }
      if (p.returning) {
        const toPlayer = playerMesh.position.clone().sub(p.mesh.position).setY(0).normalize();
        p.vel.x = toPlayer.x * 14;
        p.vel.z = toPlayer.z * 14;
        // remove when returned to player
        if (p.mesh.position.distanceTo(playerMesh.position) < 1.2) {
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          continue;
        }
      }

      // hit enemies (use object reference, not index, since array splices)
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (p.hitEnemies.has(e)) continue;
        if (p.mesh.position.distanceTo(e.mesh.position) < 1.1) {
          p.hitEnemies.add(e);
          killEnemy(e, j);
        }
      }

    } else if (p.type === 'scatter') {
      p.mesh.position.x += p.vel.x * dt; // LP8
      p.mesh.position.z += p.vel.z * dt; // LP8
      p.dist += p.vel.length() * dt;

      if (p.dist >= p.maxDist) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (p.mesh.position.distanceTo(enemies[j].mesh.position) < 0.9) {
          killEnemy(enemies[j], j);
          hit = true;
          break;
        }
      }
      if (hit) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }
  }

  // ── Gravity Wells ──
  for (let i = wells.length - 1; i >= 0; i--) {
    const w = wells[i];
    w.timer -= dt; // LP8
    w.mesh.rotation.y += 3 * dt;
    w.ring.rotation.z += 2 * dt;

    // scale ring pulse
    const pulse = 1 + Math.sin(w.timer * 10) * 0.15;
    w.ring.scale.setScalar(pulse);

    // pull enemies toward well
    if (!w.detonated) {
      for (const e of enemies) {
        const toWell = w.mesh.position.clone().sub(e.mesh.position).setY(0);
        const dist = toWell.length();
        if (dist < w.pullRadius && dist > 0.1) {
          const pullForce = (1 - dist / w.pullRadius) * 8;
          const pull = toWell.normalize().multiplyScalar(pullForce * dt); // LP8
          e.mesh.position.x += pull.x;
          e.mesh.position.z += pull.z;
        }
      }
    }

    // detonate when timer runs out
    if (w.timer <= 0 && !w.detonated) {
      w.detonated = true;
      sfxWellDetonate();
      cameraShake(0.4);
      spawnParticles(w.mesh.position.clone(), 0xaa00ff, 20);

      // shockwave — kill enemies in detonateRadius
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (w.mesh.position.distanceTo(enemies[j].mesh.position) < w.detonateRadius) {
          killEnemy(enemies[j], j);
        }
      }

      // shockwave ring visual
      const swGeo = new THREE.RingGeometry(0.1, 0.3, 32);
      const swMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const sw = new THREE.Mesh(swGeo, swMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.copy(w.mesh.position);
      sw.position.y = 0.05;
      scene.add(sw);
      particles.push({ mesh: sw, vel: new THREE.Vector3(0, 0, 0), life: 0.5, maxLife: 0.5, shockwave: true, radius: 0 });

      scene.remove(w.mesh);
      scene.remove(w.ring);
      wells.splice(i, 1);
    }
  }

  // ── Particles ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; // LP8

    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
      continue;
    }

    const t = p.life / p.maxLife;
    p.mesh.material.opacity = t;

    if (p.shockwave) {
      // expand shockwave ring
      p.radius += 12 * dt; // LP8
      p.mesh.scale.setScalar(p.radius);
    } else {
      p.mesh.position.x += p.vel.x * dt; // LP8
      p.mesh.position.y += p.vel.y * dt; // LP8
      p.mesh.position.z += p.vel.z * dt; // LP8
      p.vel.y -= 9.8 * dt; // LP8 gravity
    }
  }
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup', e => { keys[e.code] = false; });

document.addEventListener('mousemove', e => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

  if (renderer && camera) {
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);
    if (target) mouseWorld.copy(target);
  }
});

document.addEventListener('mousedown', e => {
  if (gameState === 'idle' || gameState === 'ended') {
    if (!audioCtx) initAudio();
    overlayEl.style.display = 'none';
    startGame();
    return;
  }
  if (gameState === 'running' && e.button === 0) {
    fireWeapon();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
async function boot() {
  await initRenderer();
  initScene();
  tick();
}

boot();
