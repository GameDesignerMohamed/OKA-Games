import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── MODULE SCOPE VARS (T2 rule — declared at top) ─────────────────────────
let scene, camera, renderer, composer, clock;
let bloomPass;

// Game state
let gameState = 'menu'; // menu | playing | dead | waveclear | win
let currentWave = 0;
let coresCollected = 0;
let waveTimer = 30;
let slowmoTimer = 0;
let timerFlashTimer = 0;
let gravityDirTimer = 0;
let keys = {};

// Physics
let gravityDir = new THREE.Vector3(0, -1, 0); // current gravity direction
let gravityDirName = 'DOWN';

// Scene objects
let playerMesh, playerLight, playerGlow;
let playerVel = new THREE.Vector3();
let playerPos = new THREE.Vector3();

let debrisList = [];
let coreList   = [];
let hatchMesh, hatchLight, hatchGlow;
let hatchActive = false;

let wallMeshes   = [];
let starfield;
let particles    = [];
let shakeAmount  = 0;
let cameraBase   = new THREE.Vector3(0, 0, 30);

// DOM elements
const overlay       = document.getElementById('overlay');
const startBtn      = document.getElementById('start-btn');
const waveNumEl     = document.getElementById('wave-num');
const coreCountEl   = document.getElementById('core-count');
const timerValEl    = document.getElementById('timer-val');
const timerPanel    = document.getElementById('timer-panel');
const gravLabel     = document.getElementById('grav-label');
const hitFlash      = document.getElementById('hit-flash');
const gravFlash     = document.getElementById('gravity-flash');
const timerFlashEl  = document.getElementById('timer-flash');
const slowmoText    = document.getElementById('slowmo-text');
const gravDirEl     = document.getElementById('gravity-dir');

// ─── AUDIO ─────────────────────────────────────────────────────────────────
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startMusic();
}

function makeGain(vol) {
  const g = audioCtx.createGain();
  g.gain.value = vol;
  g.connect(audioCtx.destination);
  return g;
}

// Background music: ambient space drone
let musicNodes = [];
function startMusic() {
  stopMusic();
  const t = audioCtx.currentTime;

  // bass drone
  const osc1 = audioCtx.createOscillator();
  const g1 = makeGain(0.06);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(55, t);
  osc1.connect(g1);
  osc1.start();

  // tension oscillator — slow LFO sweep
  const osc2 = audioCtx.createOscillator();
  const g2 = makeGain(0.04);
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(110, t);
  osc2.frequency.linearRampToValueAtTime(220, t + 8);
  osc2.frequency.linearRampToValueAtTime(110, t + 16);
  osc2.connect(g2);
  osc2.start();

  // metallic arp loop
  const arpFreqs = [220, 277, 330, 415, 220];
  arpFreqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, t + i * 0.9);
    env.gain.linearRampToValueAtTime(0.025, t + i * 0.9 + 0.05);
    env.gain.linearRampToValueAtTime(0, t + i * 0.9 + 0.7);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(t + i * 0.9);
    osc.stop(t + i * 0.9 + 0.8);
  });

  musicNodes = [osc1, osc2];
}

function stopMusic() {
  musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  musicNodes = [];
}

function sfxGravityFlip() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  g.gain.setValueAtTime(0.18, t);
  g.gain.linearRampToValueAtTime(0, t + 0.3);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.35);

  // whoosh
  const noise = audioCtx.createOscillator();
  const ng = audioCtx.createGain();
  noise.type = 'sawtooth';
  noise.frequency.setValueAtTime(200, t);
  noise.frequency.linearRampToValueAtTime(600, t + 0.15);
  ng.gain.setValueAtTime(0.08, t);
  ng.gain.linearRampToValueAtTime(0, t + 0.2);
  noise.connect(ng); ng.connect(audioCtx.destination);
  noise.start(t); noise.stop(t + 0.25);
}

function sfxCorePickup() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.15, t + i * 0.08);
    g.gain.linearRampToValueAtTime(0, t + i * 0.08 + 0.25);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.3);
  });
}

function sfxHit() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  g.gain.setValueAtTime(0.3, t);
  g.gain.linearRampToValueAtTime(0, t + 0.4);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.45);
}

function sfxWaveClear() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [261, 329, 415, 523, 659].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t + i * 0.12);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.05);
    g.gain.linearRampToValueAtTime(0, t + i * 0.12 + 0.5);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.6);
  });
}

function sfxDeath() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 - i * 30, t + i * 0.06);
    g.gain.setValueAtTime(0.15, t + i * 0.06);
    g.gain.linearRampToValueAtTime(0, t + i * 0.06 + 0.25);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.3);
  }
}

function sfxHatchActivate() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
  g.gain.setValueAtTime(0.2, t);
  g.gain.linearRampToValueAtTime(0, t + 0.55);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.6);
}

function sfxTimerUrgent() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 440;
  g.gain.setValueAtTime(0.07, t);
  g.gain.linearRampToValueAtTime(0, t + 0.1);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.12);
}

// ─── THREE.JS SETUP ─────────────────────────────────────────────────────────
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.FogExp2(0x020408, 0.025);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
  camera.position.copy(cameraBase);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  // Postprocessing — bloom
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4, 0.5, 0.15
  );
  composer.addPass(bloomPass);

  clock = new THREE.Clock();

  // Lighting
  const ambient = new THREE.AmbientLight(0x112233, 0.8);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x88ccff, 1.2);
  dirLight.position.set(5, 10, 8);
  scene.add(dirLight);

  // Starfield background
  buildStarfield();

  // Arena walls
  buildArena();

  window.addEventListener('resize', onResize);
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

// ─── STARFIELD ─────────────────────────────────────────────────────────────
function buildStarfield() {
  if (starfield) scene.remove(starfield);
  const count = 800;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 200;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 60 - 20;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.15, transparent: true, opacity: 0.6 });
  starfield = new THREE.Points(geo, mat);
  scene.add(starfield);
}

// ─── ARENA ─────────────────────────────────────────────────────────────────
const ARENA = 10; // half-size of arena

function buildArena() {
  wallMeshes.forEach(m => scene.remove(m));
  wallMeshes = [];

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x223344,
    emissive: 0x001122,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.6
  });

  // 6 walls (box room)
  const wallData = [
    { pos: [0, -ARENA, 0], size: [ARENA*2, 0.4, ARENA*2] }, // floor
    { pos: [0,  ARENA, 0], size: [ARENA*2, 0.4, ARENA*2] }, // ceiling
    { pos: [-ARENA, 0, 0], size: [0.4, ARENA*2, ARENA*2] }, // left
    { pos: [ ARENA, 0, 0], size: [0.4, ARENA*2, ARENA*2] }, // right
    { pos: [0, 0, -ARENA], size: [ARENA*2, ARENA*2, 0.4] }, // back
    { pos: [0, 0,  ARENA], size: [ARENA*2, ARENA*2, 0.4] }, // front
  ];

  wallData.forEach(d => {
    const geo = new THREE.BoxGeometry(...d.size);
    const m = new THREE.Mesh(geo, wallMat.clone());
    m.position.set(...d.pos);
    scene.add(m);
    wallMeshes.push(m);
  });

  // Add grid lines on walls for depth
  addWallGrid();
}

function addWallGrid() {
  const lineMat = new THREE.LineBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.4 });
  const gridCount = 5;
  const step = (ARENA * 2) / gridCount;
  for (let i = 0; i <= gridCount; i++) {
    const val = -ARENA + i * step;
    // horizontal lines on back wall
    const hGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-ARENA, val, -ARENA + 0.3),
      new THREE.Vector3( ARENA, val, -ARENA + 0.3)
    ]);
    scene.add(new THREE.Line(hGeo, lineMat));
    // vertical
    const vGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(val, -ARENA, -ARENA + 0.3),
      new THREE.Vector3(val,  ARENA, -ARENA + 0.3)
    ]);
    scene.add(new THREE.Line(vGeo, lineMat));
  }
}

// ─── PLAYER ─────────────────────────────────────────────────────────────────
function buildPlayer() {
  if (playerMesh) scene.remove(playerMesh);
  if (playerLight) scene.remove(playerLight);

  const geo = new THREE.OctahedronGeometry(0.6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ccff,
    emissive: 0x0088ff,
    emissiveIntensity: 1.2
  });
  playerMesh = new THREE.Mesh(geo, mat);
  // T1: use .set() for position — no Object.assign()
  playerPos.set(0, 0, 0);
  playerMesh.position.copy(playerPos);
  scene.add(playerMesh);

  playerLight = new THREE.PointLight(0x00aaff, 2.5, 6);
  playerLight.position.copy(playerPos);
  scene.add(playerLight);

  // glow halo
  const glowGeo = new THREE.SphereGeometry(0.85, 16, 16);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x0044ff,
    emissive: 0x0055ff,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.25
  });
  playerGlow = new THREE.Mesh(glowGeo, glowMat);
  playerMesh.add(playerGlow);

  playerVel.set(0, 0, 0);
}

// ─── CORES ─────────────────────────────────────────────────────────────────
function buildCores(wave) {
  coreList.forEach(c => scene.remove(c.mesh));
  coreList = [];
  const count = 5;
  const colors = [0x00ff88, 0xff8800, 0xff00aa, 0xffff00, 0x88ffff];
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.45, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      emissive: colors[i % colors.length],
      emissiveIntensity: 1.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    // place randomly inside arena
    const px = (Math.random() - 0.5) * (ARENA * 2 - 3);
    const py = (Math.random() - 0.5) * (ARENA * 2 - 3);
    const pz = (Math.random() - 0.5) * 4 - 1;
    mesh.position.set(px, py, pz);

    const light = new THREE.PointLight(colors[i % colors.length], 1.8, 5);
    light.position.copy(mesh.position);
    scene.add(light);

    scene.add(mesh);
    coreList.push({ mesh, light, vel: new THREE.Vector3(), collected: false });
  }
}

// ─── DEBRIS ─────────────────────────────────────────────────────────────────
function buildDebris(wave) {
  debrisList.forEach(d => scene.remove(d.mesh));
  debrisList = [];

  const count = 6 + wave * 3;
  const debrisShapes = [
    () => new THREE.BoxGeometry(0.6 + Math.random() * 0.6, 0.3 + Math.random() * 0.5, 0.5 + Math.random() * 0.4),
    () => new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.3),
    () => new THREE.CylinderGeometry(0.15, 0.3, 0.5 + Math.random() * 0.5, 6),
  ];

  for (let i = 0; i < count; i++) {
    const shapeFn = debrisShapes[i % debrisShapes.length];
    const geo = shapeFn();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4422,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      roughness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * (ARENA * 2 - 2),
      (Math.random() - 0.5) * (ARENA * 2 - 2),
      (Math.random() - 0.5) * 3
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      0
    );
    scene.add(mesh);
    debrisList.push({ mesh, vel, spin: new THREE.Vector3(
      (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
    )});
  }
}

// ─── HATCH ─────────────────────────────────────────────────────────────────
function buildHatch() {
  if (hatchMesh) scene.remove(hatchMesh);
  if (hatchLight) scene.remove(hatchLight);

  const geo = new THREE.BoxGeometry(1.2, 1.2, 0.3);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff44,
    emissive: 0x004422,
    emissiveIntensity: 0.4
  });
  hatchMesh = new THREE.Mesh(geo, mat);
  // place at corner
  hatchMesh.position.set(ARENA - 2, ARENA - 2, 0);
  scene.add(hatchMesh);

  hatchLight = new THREE.PointLight(0x00ff44, 0.5, 4);
  hatchLight.position.copy(hatchMesh.position);
  scene.add(hatchLight);

  hatchActive = false;
}

// ─── PARTICLES ─────────────────────────────────────────────────────────────
function spawnParticles(pos, color, count) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const vels = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    vels.push(new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 3
    ));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 1.0 });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  particles.push({ pts, vels, life: 1.0 });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 1.5;
    if (p.life <= 0) {
      scene.remove(p.pts);
      particles.splice(i, 1);
      continue;
    }
    const pos = p.pts.geometry.attributes.position;
    for (let j = 0; j < p.vels.length; j++) {
      pos.array[j*3]     += p.vels[j].x * dt;
      pos.array[j*3 + 1] += p.vels[j].y * dt;
      pos.array[j*3 + 2] += p.vels[j].z * dt;
    }
    pos.needsUpdate = true;
    p.pts.material.opacity = p.life;
  }
}

// ─── GRAVITY ────────────────────────────────────────────────────────────────
function setGravity(dir) {
  // T1: use .set() not Object.assign()
  const prevDir = gravityDir.clone();
  gravityDir.set(dir.x, dir.y, dir.z);
  if (prevDir.equals(gravityDir)) return;

  sfxGravityFlip();

  // screen flash
  gravFlash.style.opacity = '1';
  setTimeout(() => { gravFlash.style.opacity = '0'; }, 120);

  // give debris a velocity kick in new gravity direction
  debrisList.forEach(d => {
    d.vel.add(gravityDir.clone().multiplyScalar(2 + Math.random() * 2));
  });
  coreList.forEach(c => {
    if (!c.collected) {
      c.vel.add(gravityDir.clone().multiplyScalar(1.5 + Math.random()));
    }
  });

  // camera tilt based on gravity dir
  camera.rotation.z = gravityDir.x * 0.15;

  // Show gravity direction indicator
  const dirNames = { '0,-1,0': '↓ DOWN', '0,1,0': '↑ UP', '-1,0,0': '← LEFT', '1,0,0': '→ RIGHT' };
  const key = `${gravityDir.x},${gravityDir.y},${gravityDir.z}`;
  gravityDirName = dirNames[key] || 'SHIFT';
  gravLabel.textContent = gravityDirName;

  gravDirEl.textContent = gravityDirName;
  gravDirEl.classList.add('show');
  gravityDirTimer = 1.2;
}

// ─── WAVE SETUP ─────────────────────────────────────────────────────────────
function startWave(wave) {
  currentWave = wave;
  coresCollected = 0;
  hatchActive = false;
  waveTimer = Math.max(30 - (wave - 1) * 3, 15);
  gravityDir.set(0, -1, 0);
  camera.rotation.z = 0;
  camera.rotation.x = 0;

  buildPlayer();
  buildCores(wave);
  buildDebris(wave);
  buildHatch();

  waveNumEl.textContent = wave;
  coreCountEl.textContent = '0';
  timerValEl.textContent = Math.ceil(waveTimer);
  timerPanel.classList.remove('urgent');
  gravLabel.textContent = '↓ DOWN';

  gameState = 'playing';
  startMusic();
}

// ─── INPUT ──────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (gameState !== 'playing') return;

  // Gravity flip
  if (e.code === 'ArrowUp'    || e.code === 'KeyW') setGravity(new THREE.Vector3(0,  1, 0));
  if (e.code === 'ArrowDown'  || e.code === 'KeyS') setGravity(new THREE.Vector3(0, -1, 0));
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') setGravity(new THREE.Vector3(-1, 0, 0));
  if (e.code === 'ArrowRight' || e.code === 'KeyD') setGravity(new THREE.Vector3(1,  0, 0));

  // Collect core
  if (e.code === 'Space') tryCollectCore();
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

function tryCollectCore() {
  if (gameState !== 'playing') return;
  for (let i = coreList.length - 1; i >= 0; i--) {
    const c = coreList[i];
    if (c.collected) continue;
    const dist = playerPos.distanceTo(c.mesh.position);
    if (dist < 2.5) {
      c.collected = true;
      coresCollected++;
      scene.remove(c.mesh);
      scene.remove(c.light);
      sfxCorePickup();
      spawnParticles(c.mesh.position.clone(), c.mesh.material.color.getHex(), 20);
      coreCountEl.textContent = coresCollected;

      if (coresCollected >= 5) {
        activateHatch();
      }
      return;
    }
  }
}

function activateHatch() {
  hatchActive = true;
  // T1: use set() not assign
  hatchMesh.material.emissive.set(0x00ff44);
  hatchMesh.material.emissiveIntensity = 2.5;
  hatchLight.intensity = 4;
  sfxHatchActivate();
}

// ─── PHYSICS UPDATE ─────────────────────────────────────────────────────────
const GRAVITY_STRENGTH = 9;
const BOUNCE = 0.45;
const DEBRIS_DAMPING = 0.98;

function updatePhysics(dt) {
  if (gameState !== 'playing') return;

  // Player physics
  playerVel.addScaledVector(gravityDir, GRAVITY_STRENGTH * dt);
  playerPos.addScaledVector(playerVel, dt);

  // Wall collision for player
  const pBound = ARENA - 0.8;
  if (playerPos.x < -pBound) { playerPos.x = -pBound; playerVel.x = Math.abs(playerVel.x) * BOUNCE; }
  if (playerPos.x >  pBound) { playerPos.x =  pBound; playerVel.x = -Math.abs(playerVel.x) * BOUNCE; }
  if (playerPos.y < -pBound) { playerPos.y = -pBound; playerVel.y = Math.abs(playerVel.y) * BOUNCE; }
  if (playerPos.y >  pBound) { playerPos.y =  pBound; playerVel.y = -Math.abs(playerVel.y) * BOUNCE; }
  playerPos.z = 0; playerVel.z = 0;

  // T1: use .copy() and .set() for Three.js vector operations
  playerMesh.position.copy(playerPos);
  playerLight.position.copy(playerPos);

  // Debris physics
  debrisList.forEach(d => {
    d.vel.addScaledVector(gravityDir, GRAVITY_STRENGTH * 0.7 * dt);
    d.vel.multiplyScalar(DEBRIS_DAMPING);
    d.mesh.position.addScaledVector(d.vel, dt);

    // spin
    d.mesh.rotation.x += d.spin.x * dt;
    d.mesh.rotation.y += d.spin.y * dt;
    d.mesh.rotation.z += d.spin.z * dt;

    // wall bounce
    const dBound = ARENA - 0.5;
    if (d.mesh.position.x < -dBound) { d.mesh.position.x = -dBound; d.vel.x = Math.abs(d.vel.x) * BOUNCE; }
    if (d.mesh.position.x >  dBound) { d.mesh.position.x =  dBound; d.vel.x = -Math.abs(d.vel.x) * BOUNCE; }
    if (d.mesh.position.y < -dBound) { d.mesh.position.y = -dBound; d.vel.y = Math.abs(d.vel.y) * BOUNCE; }
    if (d.mesh.position.y >  dBound) { d.mesh.position.y =  dBound; d.vel.y = -Math.abs(d.vel.y) * BOUNCE; }
    d.mesh.position.z = Math.max(-2, Math.min(2, d.mesh.position.z));
  });

  // Core slow drift
  coreList.forEach(c => {
    if (c.collected) return;
    c.vel.addScaledVector(gravityDir, GRAVITY_STRENGTH * 0.2 * dt);
    c.vel.multiplyScalar(0.95);
    c.mesh.position.addScaledVector(c.vel, dt);
    c.light.position.copy(c.mesh.position);

    // gentle pulse
    const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.12;
    c.mesh.scale.setScalar(pulse);

    const cBound = ARENA - 0.6;
    if (c.mesh.position.x < -cBound) { c.mesh.position.x = -cBound; c.vel.x = Math.abs(c.vel.x) * 0.6; }
    if (c.mesh.position.x >  cBound) { c.mesh.position.x =  cBound; c.vel.x = -Math.abs(c.vel.x) * 0.6; }
    if (c.mesh.position.y < -cBound) { c.mesh.position.y = -cBound; c.vel.y = Math.abs(c.vel.y) * 0.6; }
    if (c.mesh.position.y >  cBound) { c.mesh.position.y =  cBound; c.vel.y = -Math.abs(c.vel.y) * 0.6; }
    c.mesh.position.z = Math.max(-1.5, Math.min(1.5, c.mesh.position.z));
  });

  // Hatch glow pulse
  if (hatchActive && hatchMesh) {
    const hp = 1.5 + Math.sin(Date.now() * 0.006) * 0.8;
    hatchMesh.material.emissiveIntensity = hp * 2;
    hatchLight.intensity = hp * 3;
    hatchMesh.rotation.y += dt;
    hatchMesh.rotation.z += dt * 0.5;
  }

  // Check collision with debris
  debrisList.forEach(d => {
    const dist = playerPos.distanceTo(d.mesh.position);
    if (dist < 1.0) {
      onPlayerHit();
    }
  });

  // Check hatch reach
  if (hatchActive && hatchMesh) {
    const distH = playerPos.distanceTo(hatchMesh.position);
    if (distH < 2.2) {
      onWaveClear();
    }
  }
}

// ─── HIT / DEATH ─────────────────────────────────────────────────────────────
let hitCooldown = 0;

function onPlayerHit() {
  if (hitCooldown > 0 || gameState !== 'playing') return;
  hitCooldown = 1.5; // 1.5s invincibility

  sfxHit();
  spawnParticles(playerPos.clone(), 0xff4444, 15);
  shakeAmount = 0.5;

  hitFlash.style.opacity = '1';
  setTimeout(() => { hitFlash.style.opacity = '0'; }, 180);

  // Rule #3: Always show WHY failure happened — visual + audio hit feedback
  // Immediate red flash + shake = player always knows they were hit

  // Single-life per wave — restart wave on hit
  gameState = 'dead';
  sfxDeath();
  stopMusic();

  setTimeout(() => {
    showDeadOverlay();
  }, 800);
}

function showDeadOverlay() {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h1 style="color:#ff4444;text-shadow:0 0 40px rgba(255,68,68,0.8)">SYSTEM FAILURE</h1>
    <div class="sub" style="color:rgba(255,100,100,0.7)">Debris impact — wave ${currentWave}</div>
    <div class="desc">The debris hit you. Restart this wave and try again.</div>
    <div style="margin-bottom:24px;font-size:14px;color:rgba(136,238,255,0.6)">
      Cores collected: ${coresCollected} / 5
    </div>
    <button id="start-btn">RESTART WAVE ${currentWave}</button>
  `;
  document.getElementById('start-btn').onclick = () => {
    overlay.classList.add('hidden');
    startWave(currentWave);
    initAudio();
  };
}

// ─── WAVE CLEAR ─────────────────────────────────────────────────────────────
function onWaveClear() {
  if (gameState !== 'playing') return;
  gameState = 'waveclear';
  sfxWaveClear();
  spawnParticles(playerPos.clone(), 0x00ff88, 30);

  // Rule #7: breathing room — slow-mo moment before next wave
  slowmoText.classList.add('show');
  setTimeout(() => {
    slowmoText.classList.remove('show');
    if (currentWave >= 5) {
      onWin();
    } else {
      showWaveTransition();
    }
  }, 1500);
}

function showWaveTransition() {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h1>WAVE ${currentWave} CLEAR</h1>
    <div class="wave-announce">Cores recovered. Advancing deeper...</div>
    <div class="desc">
      Next wave has more debris and less time.<br>
      Keep flipping — stay alive.
    </div>
    <div style="margin-bottom:16px;font-size:14px;color:rgba(136,238,255,0.5)">
      Wave ${currentWave + 1} of 5 — Timer: ${Math.max(30 - currentWave * 3, 15)}s
    </div>
    <button id="start-btn">WAVE ${currentWave + 1}</button>
  `;
  document.getElementById('start-btn').onclick = () => {
    overlay.classList.add('hidden');
    startWave(currentWave + 1);
    initAudio();
  };
}

function onWin() {
  gameState = 'win';
  stopMusic();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h1 style="color:#00ff88;text-shadow:0 0 40px rgba(0,255,136,0.9)">ESCAPED</h1>
    <div class="sub" style="color:rgba(0,255,136,0.7)">All 5 waves survived</div>
    <div class="desc">
      You navigated the collapsing station through pure physics instinct.<br>
      25 cores recovered. Station abandoned successfully.
    </div>
    <div style="margin-bottom:32px;font-size:14px;color:rgba(136,238,255,0.5)">
      The gravity-flip mechanic proved the concept: two-variable survival works.
    </div>
    <button id="start-btn" style="background:#00ff88">PLAY AGAIN</button>
  `;
  document.getElementById('start-btn').onclick = () => {
    overlay.classList.add('hidden');
    currentWave = 0;
    startWave(1);
    initAudio();
  };
}

// ─── TIMER ──────────────────────────────────────────────────────────────────
let lastUrgentBeep = 0;

function updateTimer(dt) {
  if (gameState !== 'playing') return;

  waveTimer -= dt;
  const display = Math.ceil(Math.max(0, waveTimer));
  timerValEl.textContent = display;

  if (waveTimer <= 8) {
    timerPanel.classList.add('urgent');
    // heartbeat beep
    if (audioCtx && audioCtx.currentTime - lastUrgentBeep > 0.9) {
      lastUrgentBeep = audioCtx.currentTime;
      sfxTimerUrgent();
    }
    // Rule #3: timer flash = visible signal of impending failure
    timerFlashTimer -= dt;
    if (timerFlashTimer <= 0) {
      timerFlashEl.style.opacity = '0.3';
      setTimeout(() => { timerFlashEl.style.opacity = '0'; }, 150);
      timerFlashTimer = 0.9;
    }
  }

  if (waveTimer <= 0) {
    // Timer expired — player dies
    onPlayerHit();
  }
}

// ─── ANIMATIONS ─────────────────────────────────────────────────────────────
function updateAnimations(dt) {
  // Player rotation
  if (playerMesh) {
    playerMesh.rotation.x += dt * 1.2;
    playerMesh.rotation.y += dt * 0.8;
    // pulse scale with gravity change
    const ps = 1 + Math.sin(Date.now() * 0.003) * 0.05;
    playerMesh.scale.setScalar(ps);
  }

  // Camera shake
  if (shakeAmount > 0) {
    shakeAmount -= dt * 3;
    shakeAmount = Math.max(0, shakeAmount);
    camera.position.set(
      cameraBase.x + (Math.random() - 0.5) * shakeAmount,
      cameraBase.y + (Math.random() - 0.5) * shakeAmount,
      cameraBase.z
    );
  } else {
    camera.position.copy(cameraBase);
  }

  // Gravity dir indicator fade
  if (gravityDirTimer > 0) {
    gravityDirTimer -= dt;
    if (gravityDirTimer <= 0) {
      gravDirEl.classList.remove('show');
    }
  }

  // Starfield slow rotation
  if (starfield) {
    starfield.rotation.z += dt * 0.01;
  }

  // Hitcooldown
  if (hitCooldown > 0) {
    hitCooldown -= dt;
    // flash player when invincible
    if (playerMesh) {
      playerMesh.visible = Math.floor(hitCooldown * 10) % 2 === 0;
    }
  } else if (playerMesh) {
    playerMesh.visible = true;
  }
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = (gameState === 'waveclear') ? rawDt * 0.15 : rawDt; // slow-mo on wave clear

  if (gameState === 'playing' || gameState === 'waveclear') {
    updatePhysics(dt);
    updateTimer(rawDt); // timer uses real dt
    updateAnimations(rawDt);
    updateParticles(rawDt);
  } else {
    updateAnimations(rawDt);
    updateParticles(rawDt);
  }

  composer.render();
}

// ─── INIT ───────────────────────────────────────────────────────────────────
initThree();
animate();

document.getElementById('start-btn').onclick = () => {
  initAudio();
  overlay.classList.add('hidden');
  startWave(1);
};
