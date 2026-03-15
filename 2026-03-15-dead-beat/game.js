import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// MODULE-SCOPE VARIABLES (T2 — all declared at top)
// ============================================================
let scene, camera, renderer, composer, useComposer = false;
let clock;
let gameState = 'menu'; // menu | playing | dead | win | transition

// Beat system
let BPM = 100;
let beatInterval = 60 / BPM; // seconds per beat
let beatTimer = 0;
let beatCount = 0;
let beatPhase = 0; // 0-1 within current beat
let onBeatWindow = 0.18; // fraction of beat that counts as "on beat" (both sides of snap)
let totalBeats = 0;

// Player
let playerMesh, playerLight;
let playerPos = new THREE.Vector3(0, 0.5, 0);
let playerHP = 3;
let playerMaxHP = 3;
let playerSpeed = 5;
let invincibleTimer = 0;
let iframeActive = false;
let comboCount = 1;
let comboTimer = 0;
const COMBO_DECAY = 3.0; // seconds before combo resets
let score = 0;
let perfectHits = 0;
let totalHits = 0;
let maxCombo = 1;

// Input
const keys = { w: false, a: false, s: false, d: false };
let mousePos = new THREE.Vector3();
let mouseWorldPos = new THREE.Vector3();
let punchPending = false;
let dodgePending = false;

// Enemies
let enemies = [];
let enemyGroup;

// Particles
let particles = [];

// Beat ring indicator (shrinking toward player)
let beatRingMesh, beatRingScale;
let warningRings = []; // enemy attack telegraphs

// Arena
let arenaIndex = 0; // 0,1,2
const ARENAS = [
  { name: 'ARENA 1', bpm: 100, waves: 3, color: 0x331133, fogColor: 0x110022 },
  { name: 'ARENA 2', bpm: 120, waves: 3, color: 0x113311, fogColor: 0x002211 },
  { name: 'ARENA 3', bpm: 140, waves: 3, color: 0x332211, fogColor: 0x221100 }
];
let currentWave = 0;
let waveState = 'idle'; // idle | announcing | fighting | clear | boss
let waveEnemiesLeft = 0;
let announceTimer = 0;
let clearTimer = 0;

// Camera shake
let shakeAmount = 0;
let shakeDx = 0, shakeDy = 0;
let freezeTimer = 0; // freeze-frame on hit

// Audio
let audioCtx;
let musicNodes = [];
let musicInterval = null;

// DOM refs
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const overlayBody = document.getElementById('overlay-body');
const overlayBtn = document.getElementById('overlay-btn');
const beatFlash = document.getElementById('beat-flash');
const chromaFlash = document.getElementById('chroma-flash');
const missFlash = document.getElementById('miss-flash');
const waveAnnounce = document.getElementById('wave-announce');
const comboDisplay = document.getElementById('combo-display');
const scoreDisplay = document.getElementById('score-display');
const arenaDisplay = document.getElementById('arena-display');
const bpmLabel = document.getElementById('bpm-label');
const beatDots = [
  document.getElementById('bd0'),
  document.getElementById('bd1'),
  document.getElementById('bd2'),
  document.getElementById('bd3')
];
const perfStats = document.getElementById('perf-stats');

// ============================================================
// SCENE SETUP
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 18, 10);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Postprocessing (T9)
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6, 0.4, 0.85
    );
    composer.addPass(bloom);
    useComposer = true;
  } catch (e) {
    useComposer = false;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (useComposer) composer.setSize(window.innerWidth, window.innerHeight);
  });

  buildArena();
  buildPlayer();
  buildBeatRing();
  buildStarfield();
  addLights();

  animate();
}

function buildArena() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(30, 30, 20, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111122, roughness: 1, metalness: 0
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid
  const grid = new THREE.GridHelper(30, 30, 0x222244, 0x222244);
  scene.add(grid);

  // Arena boundary walls (glowing pillars)
  const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x4444ff, emissive: 0x2222aa, emissiveIntensity: 1.5
  });
  const positions = [
    [-12, 1.5, -12], [12, 1.5, -12],
    [-12, 1.5, 12], [12, 1.5, 12],
    [0, 1.5, -12], [0, 1.5, 12],
    [-12, 1.5, 0], [12, 1.5, 0]
  ];
  positions.forEach(([x, y, z]) => {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x, y, z);
    scene.add(p);
  });

  // Boundary rings
  const ringGeo = new THREE.TorusGeometry(12, 0.15, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3333ff, emissive: 0x1111aa, emissiveIntensity: 2
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  scene.add(ring);

  // Fog
  scene.fog = new THREE.FogExp2(0x110022, 0.02);
  scene.background = new THREE.Color(0x110022);

  // Enemy group
  enemyGroup = new THREE.Group();
  scene.add(enemyGroup);
}

function buildPlayer() {
  const geo = new THREE.OctahedronGeometry(0.6, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffaa, emissive: 0x00aa55, emissiveIntensity: 2,
    roughness: 0.3, metalness: 0.7
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.position.copy(playerPos);
  playerMesh.castShadow = true;
  scene.add(playerMesh);

  playerLight = new THREE.PointLight(0x00ffaa, 3, 8);
  playerLight.position.copy(playerPos);
  scene.add(playerLight);
}

function buildBeatRing() {
  // Shrinking ring that pulses toward player indicating beat window
  const geo = new THREE.TorusGeometry(1, 0.08, 8, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 3,
    transparent: true, opacity: 0.9
  });
  beatRingMesh = new THREE.Mesh(geo, mat);
  beatRingMesh.rotation.x = Math.PI / 2;
  beatRingMesh.position.y = 0.15;
  scene.add(beatRingMesh);
  beatRingScale = 4.0;
}

function buildStarfield() {
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 30 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });
  scene.add(new THREE.Points(geo, mat));
}

function addLights() {
  const ambient = new THREE.AmbientLight(0x334466, 2.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0x8888ff, 3);
  dir.position.set(5, 15, 8);
  dir.castShadow = true;
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0xff4488, 1.5);
  dir2.position.set(-5, 10, -8);
  scene.add(dir2);
}

// ============================================================
// AUDIO
// ============================================================
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, dur, vol, startDelay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startDelay);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + startDelay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startDelay + dur);
  osc.start(audioCtx.currentTime + startDelay);
  osc.stop(audioCtx.currentTime + startDelay + dur);
}

function sfxOnBeat() {
  // Deep bass THWACK — sawtooth for SFX (V6)
  playTone(80, 'sawtooth', 0.12, 0.6);
  playTone(160, 'square', 0.08, 0.3);
  playTone(320, 'sine', 0.06, 0.2);
}

function sfxOffBeat() {
  // Dull clunk
  playTone(120, 'sawtooth', 0.06, 0.2);
  playTone(60, 'sine', 0.1, 0.15);
}

function sfxComboBreak() {
  playTone(220, 'sawtooth', 0.15, 0.3);
  playTone(110, 'sawtooth', 0.2, 0.25, 0.05);
}

function sfxEnemyDeath() {
  playTone(440, 'sine', 0.08, 0.3);
  playTone(660, 'sine', 0.06, 0.2, 0.04);
}

function sfxDodgeOnBeat() {
  playTone(880, 'sine', 0.08, 0.25);
  playTone(1100, 'sine', 0.06, 0.2, 0.04);
}

function sfxPlayerHit() {
  playTone(80, 'sawtooth', 0.3, 0.5);
  playTone(60, 'sawtooth', 0.4, 0.4, 0.05);
}

function sfxWaveAnnounce() {
  playTone(440, 'triangle', 0.1, 0.2);
  playTone(550, 'triangle', 0.1, 0.2, 0.1);
  playTone(660, 'triangle', 0.15, 0.2, 0.2);
}

function sfxWaveClear() {
  playTone(523, 'sine', 0.1, 0.3);
  playTone(659, 'sine', 0.1, 0.3, 0.1);
  playTone(784, 'sine', 0.1, 0.3, 0.2);
  playTone(1047, 'sine', 0.2, 0.3, 0.3);
}

function sfxComboMilestone() {
  playTone(880, 'triangle', 0.06, 0.25);
  playTone(1100, 'triangle', 0.06, 0.25, 0.05);
  playTone(1320, 'triangle', 0.08, 0.25, 0.1);
}

function sfxBeat() {
  // The actual beat click (metronome feel — sine/triangle only, V6)
  playTone(200, 'triangle', 0.05, 0.15);
}

function sfxWin() {
  const notes = [523, 659, 784, 1047, 1319, 1568];
  notes.forEach((n, i) => playTone(n, 'sine', 0.15, 0.3, i * 0.12));
}

function sfxGameOver() {
  const notes = [440, 330, 220, 165];
  notes.forEach((n, i) => playTone(n, 'sawtooth', 0.2, 0.35, i * 0.15));
}

// BGM — arena-specific looping music (sine/triangle, V6)
function startMusic(arenaIdx) {
  stopMusic();
  const bpmVal = ARENAS[arenaIdx].bpm;
  const beatMs = (60 / bpmVal) * 1000;

  // Bassline notes per arena
  const basslines = [
    [55, 55, 73, 55, 55, 73, 62, 55],      // Arena 1 — 100 BPM minor
    [65, 65, 87, 65, 65, 87, 73, 65],      // Arena 2 — 120 BPM
    [73, 73, 98, 73, 73, 98, 82, 73]       // Arena 3 — 140 BPM
  ];
  const bass = basslines[arenaIdx];

  // Arpeggio notes
  const arps = [
    [220, 261, 329, 261, 220, 196, 220, 261],
    [261, 329, 392, 329, 261, 246, 261, 329],
    [329, 392, 493, 392, 329, 293, 329, 392]
  ];
  const arp = arps[arenaIdx];

  let beatIdx = 0;
  musicInterval = setInterval(() => {
    if (audioCtx.state === 'suspended') return;
    if (gameState !== 'playing') return;

    const i = beatIdx % bass.length;

    // Bass (triangle, low frequency, V6)
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = bass[i];
    bassGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + beatMs / 900);
    bassOsc.start();
    bassOsc.stop(audioCtx.currentTime + beatMs / 900);

    // Arp on every other beat (sine, V6)
    if (beatIdx % 2 === 0) {
      const arpOsc = audioCtx.createOscillator();
      const arpGain = audioCtx.createGain();
      arpOsc.connect(arpGain);
      arpGain.connect(audioCtx.destination);
      arpOsc.type = 'sine';
      arpOsc.frequency.value = arp[i];
      arpGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      arpGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + beatMs / 600);
      arpOsc.start();
      arpOsc.stop(audioCtx.currentTime + beatMs / 600);
    }

    beatIdx++;
  }, beatMs);
}

function stopMusic() {
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  musicNodes = [];
}

// ============================================================
// GAME START
// ============================================================
window.startGame = function() {
  resumeAudio();
  overlay.classList.remove('active');
  gameState = 'playing';
  arenaIndex = 0;
  score = 0;
  perfectHits = 0;
  totalHits = 0;
  maxCombo = 1;
  loadArena(0);
};

function loadArena(idx) {
  arenaIndex = idx;
  const arena = ARENAS[idx];
  BPM = arena.bpm;
  beatInterval = 60 / BPM;
  beatTimer = beatInterval; // start with a fresh beat
  beatCount = 0;
  currentWave = 0;
  comboCount = 1;
  comboTimer = 0;

  // Reset player position
  playerPos.set(0, 0.5, 0);
  playerHP = playerMaxHP;

  // Update scene colors
  scene.fog = new THREE.FogExp2(arena.fogColor, 0.02);
  scene.background = new THREE.Color(arena.fogColor);

  bpmLabel.textContent = `${BPM} BPM`;
  arenaDisplay.textContent = arena.name;

  updateHP();
  updateComboDisplay();

  // Clear existing enemies
  clearEnemies();

  startMusic(idx);

  // Start first wave
  waveState = 'announcing';
  announceWave(1);
}

// ============================================================
// WAVES
// ============================================================
function announceWave(waveNum) {
  sfxWaveAnnounce(); // FX11
  waveAnnounce.textContent = waveNum === 4 ? 'BOSS WAVE!' : `WAVE ${waveNum}`;
  waveAnnounce.style.display = 'block';
  waveAnnounce.style.color = waveNum === 4 ? '#ff4444' : '#ffffff';
  announceTimer = 1.5;
  waveState = 'announcing';
}

function startWave(waveNum) {
  waveAnnounce.style.display = 'none';

  const isBoss = waveNum === 4;
  clearEnemies();

  if (isBoss) {
    // Boss — 1 heavy with lots of HP
    spawnEnemy('boss', 0, -8);
    waveState = 'boss';
  } else {
    // Normal waves — escalating counts
    const enemyCounts = [3, 5, 7];
    const n = enemyCounts[waveNum - 1] || 3;
    for (let i = 0; i < n; i++) {
      const type = (waveNum >= 3 && i % 3 === 0) ? 'heavy' : 'grunt';
      const angle = (i / n) * Math.PI * 2;
      const r = 8 + Math.random() * 2;
      spawnEnemy(type, Math.sin(angle) * r, Math.cos(angle) * r);
    }
    waveState = 'fighting';
  }

  waveEnemiesLeft = enemies.length;
  currentWave = waveNum;
}

function spawnEnemy(type, x, z) {
  let geo, mat, hp, speed, attackBeats;
  if (type === 'grunt') {
    // Small/fast/purple (CL5)
    geo = new THREE.TetrahedronGeometry(0.5, 0);
    mat = new THREE.MeshStandardMaterial({
      color: 0x9944ff, emissive: 0x4411aa, emissiveIntensity: 1.5
    });
    hp = 2;
    speed = 2.5;
    attackBeats = 1; // 1-beat telegraph
  } else if (type === 'heavy') {
    // Large/slow/red (CL5)
    geo = new THREE.IcosahedronGeometry(0.8, 0);
    mat = new THREE.MeshStandardMaterial({
      color: 0xff3322, emissive: 0xaa1100, emissiveIntensity: 1.5
    });
    hp = 5;
    speed = 1.5;
    attackBeats = 2; // 2-beat telegraph
  } else { // boss
    geo = new THREE.OctahedronGeometry(1.2, 1);
    mat = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 2.5
    });
    hp = 15;
    speed = 1.8;
    attackBeats = 2;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.6, z);
  mesh.castShadow = true;
  enemyGroup.add(mesh);

  // HP bar
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x440000 })
  );
  hpBarBg.position.set(0, 1.5, 0);
  hpBarBg.rotation.x = -Math.PI / 6;
  mesh.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xff4444 })
  );
  hpBarFill.position.set(0, 1.5, 0.01);
  hpBarFill.rotation.x = -Math.PI / 6;
  mesh.add(hpBarFill);

  // Warning ring
  const warnGeo = new THREE.TorusGeometry(1, 0.07, 8, 48);
  const warnMat = new THREE.MeshStandardMaterial({
    color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 2,
    transparent: true, opacity: 0
  });
  const warnRing = new THREE.Mesh(warnGeo, warnMat);
  warnRing.rotation.x = Math.PI / 2;
  warnRing.position.y = 0.1;
  mesh.add(warnRing);

  const enemy = {
    mesh, mat, type,
    hp, maxHp: hp, speed,
    attackBeats,
    attackTimer: -1, // T10 — dt-based, not setTimeout
    attackWindup: attackBeats * beatInterval,
    inAttackWindup: false,
    hpBarFill,
    warnRing,
    dead: false,
    pos: new THREE.Vector3(x, 0.6, z),
    vel: new THREE.Vector3(),
    staggerTimer: 0,
    beatPhaseTarget: Math.random() // offset enemy attacks to different beats
  };
  enemies.push(enemy);
}

function clearEnemies() {
  enemies.forEach(e => {
    if (e.mesh) enemyGroup.remove(e.mesh);
  });
  enemies = [];
  warningRings = [];
}

// ============================================================
// BEAT SYSTEM
// ============================================================
function isOnBeat() {
  // Phase 0 = start of beat, 1 = end. On-beat window around the snap point
  const phase = beatPhase;
  return (phase <= onBeatWindow || phase >= (1 - onBeatWindow));
}

function updateBeat(dt) {
  beatTimer -= dt;
  if (beatTimer <= 0) {
    beatTimer += beatInterval;
    beatCount++;
    totalBeats++;
    onBeatTick();
  }

  beatPhase = 1 - (beatTimer / beatInterval); // 0 at start of beat, 1 just before next

  // Shrinking ring: starts big (scale 4), shrinks to 1 at beat snap (phase = 0 or 1)
  // Ring reaches player size (1) right when beat fires
  // Phase 0 = just after beat, ring resets to 4
  // Phase approaching 1 = ring at ~1 (snap point)
  const ringTarget = 4.0 - (beatPhase * 3.0); // 4 → 1 as phase 0 → 1
  beatRingScale = ringTarget;
  beatRingMesh.scale.setScalar(ringTarget);
  beatRingMesh.position.x = playerPos.x;
  beatRingMesh.position.z = playerPos.z;

  // Opacity: bright near snap, dim mid-beat
  const distToSnap = Math.min(beatPhase, 1 - beatPhase);
  const opacity = 0.3 + (1 - distToSnap * 2) * 0.6;
  beatRingMesh.material.opacity = Math.max(0.1, opacity);

  // Beat dot visualization
  const dotIdx = beatCount % 4;
  beatDots.forEach((d, i) => {
    d.classList.toggle('active', i === dotIdx && beatTimer < 0.08);
  });
}

function onBeatTick() {
  sfxBeat();

  // Flash beat indicator border
  beatFlash.style.opacity = '0.4';
  setTimeout(() => { beatFlash.style.opacity = '0'; }, 80);

  // Schedule enemy attacks (T10 — enemies attack on beats)
  enemies.forEach(e => {
    if (e.dead || e.inAttackWindup) return;
    // Each enemy attacks every 2-3 beats based on type
    const attackEvery = e.attackBeats + 1;
    if (totalBeats % attackEvery === Math.floor(e.beatPhaseTarget * attackEvery)) {
      e.inAttackWindup = true;
      e.attackTimer = e.attackWindup;
    }
  });
}

// ============================================================
// PLAYER ACTIONS
// ============================================================
function doPunch() {
  if (gameState !== 'playing') return;
  if (waveState === 'announcing') return;

  const onBeat = isOnBeat();
  totalHits++;

  // Find closest enemy in range
  const punchRange = 3.5;
  let closest = null;
  let closestDist = Infinity;
  enemies.forEach(e => {
    if (e.dead) return;
    const d = playerPos.distanceTo(e.pos);
    if (d < punchRange && d < closestDist) {
      closestDist = d;
      closest = e;
    }
  });

  if (!closest) {
    // Miss — off-beat feel even if on beat
    if (onBeat) {
      sfxOffBeat();
    } else {
      sfxOffBeat();
    }
    breakCombo();
    return;
  }

  if (onBeat) {
    // ON-BEAT HIT — 3× damage, stagger, big effects
    perfectHits++;
    const dmg = 3;
    hitEnemy(closest, dmg, true);
    sfxOnBeat();
    buildCombo();

    // 2-frame freeze-frame
    freezeTimer = 0.06;

    // Screen-edge chromatic aberration
    chromaFlash.style.opacity = '0.7';
    setTimeout(() => { chromaFlash.style.opacity = '0'; }, 120);

    // Camera punch-zoom
    shakeAmount = 0.4;

    // Enemy emissive flash
    closest.mat.emissiveIntensity = 8;
    setTimeout(() => {
      if (!closest.dead) closest.mat.emissiveIntensity = 1.5;
    }, 120);

  } else {
    // OFF-BEAT HIT — 1× damage, no stagger
    hitEnemy(closest, 1, false);
    sfxOffBeat();
    breakCombo();

    missFlash.style.opacity = '0.4';
    setTimeout(() => { missFlash.style.opacity = '0'; }, 100);
  }
}

function hitEnemy(enemy, dmg, stagger) {
  enemy.hp -= dmg;
  // Update HP bar
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  enemy.hpBarFill.scale.x = ratio;
  enemy.hpBarFill.position.x = (ratio - 1) * 0.6;

  if (stagger) {
    enemy.staggerTimer = 0.4;
    enemy.inAttackWindup = false;
    enemy.attackTimer = -1;
    enemy.warnRing.material.opacity = 0;
  }

  // Spawn hit particles
  spawnHitParticles(enemy.pos.clone(), stagger ? 0xffcc00 : 0x888888, stagger ? 16 : 6);

  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  enemy.dead = true;
  sfxEnemyDeath();
  spawnDeathParticles(enemy.pos.clone(), enemy.mat.color.getHex());
  enemyGroup.remove(enemy.mesh);

  // Score
  const pts = (enemy.type === 'boss') ? 500 :
              (enemy.type === 'heavy') ? 100 : 50;
  score += pts * comboCount;
  updateScore();

  enemies = enemies.filter(e => e !== enemy);
  waveEnemiesLeft = enemies.filter(e => !e.dead).length;

  if (enemies.filter(e => !e.dead).length === 0) {
    onWaveClear();
  }
}

function onWaveClear() {
  sfxWaveClear();
  clearTimer = 1.2;
  waveState = 'clear';

  if (currentWave < 4) {
    // Next wave
    const nextWave = currentWave + 1;
    setTimeout(() => {
      if (gameState !== 'playing') return;
      announceWave(nextWave);
      setTimeout(() => {
        if (gameState !== 'playing') return;
        startWave(nextWave);
      }, 1500);
    }, 1200);
  } else {
    // Arena clear
    if (arenaIndex < 2) {
      setTimeout(() => {
        if (gameState !== 'playing') return;
        arenaIndex++;
        loadArena(arenaIndex);
      }, 2000);
    } else {
      // WIN
      triggerWin();
    }
  }
}

function doDodge() {
  if (gameState !== 'playing') return;
  if (invincibleTimer > 0) return;

  const onBeat = isOnBeat();

  if (onBeat) {
    // Full iframe + dash trail effect
    invincibleTimer = 0.5;
    iframeActive = true;
    sfxDodgeOnBeat();
    // Flash player emissive for iframe
    playerMesh.material.emissiveIntensity = 6;
    setTimeout(() => {
      if (playerMesh) playerMesh.material.emissiveIntensity = 2;
    }, 300);
    // Spawn dash trail
    spawnDashTrail();
  } else {
    // Just move with no iframe
    sfxOffBeat();
  }
}

function spawnDashTrail() {
  // Quick particle puff in player's direction
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.SphereGeometry(0.12, 4, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa, emissive: 0x00aa55, emissiveIntensity: 3,
      transparent: true, opacity: 0.8
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(playerPos);
    m.position.x += (Math.random() - 0.5) * 1.5;
    m.position.z += (Math.random() - 0.5) * 1.5;
    m.position.y = 0.4;
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3),
      life: 0.4
    });
  }
}

// ============================================================
// COMBO SYSTEM
// ============================================================
function buildCombo() {
  comboCount = Math.min(5, comboCount + 1);
  comboTimer = COMBO_DECAY;
  maxCombo = Math.max(maxCombo, comboCount);
  if (comboCount >= 3) sfxComboMilestone(); // FX7
  updateComboDisplay();
}

function breakCombo() {
  if (comboCount > 1) {
    sfxComboBreak();
  }
  comboCount = 1;
  comboTimer = 0;
  updateComboDisplay();
}

function updateComboDisplay() {
  comboDisplay.textContent = `×${comboCount}`;
  const colors = ['#ffffff', '#ffdd44', '#ffaa00', '#ff7700', '#ff4400'];
  comboDisplay.style.color = colors[comboCount - 1] || '#ff4400';
  comboDisplay.style.textShadow = `0 0 ${comboCount * 5}px ${colors[comboCount - 1] || '#ff4400'}`;
}

function updateScore() {
  scoreDisplay.textContent = score.toLocaleString();
  perfStats.textContent = `PERFECT HITS: ${perfectHits}/${totalHits}  MAX COMBO: ×${maxCombo}`;
}

// ============================================================
// PLAYER DAMAGE
// ============================================================
function damagePlayer(amt) {
  if (invincibleTimer > 0) return; // G9 — iframe check FIRST
  if (gameState !== 'playing') return;

  playerHP -= amt;
  invincibleTimer = 1.5;
  sfxPlayerHit();
  shakeAmount = 0.6;
  breakCombo();

  // Red screen flash
  missFlash.style.opacity = '0.6';
  setTimeout(() => { missFlash.style.opacity = '0'; }, 200);

  updateHP();

  if (playerHP <= 0) {
    playerHP = 0;
    triggerDeath();
  }
}

function updateHP() {
  for (let i = 0; i < 3; i++) {
    const pip = document.getElementById(`hp${i}`);
    if (pip) pip.classList.toggle('empty', i >= playerHP);
  }
}

// ============================================================
// PARTICLES
// ============================================================
function spawnHitParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.1, 0);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 3,
      transparent: true, opacity: 1.0 // FX10 — transparent: true at creation
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      ),
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.5 + Math.random() * 0.3
    });
  }
}

function spawnDeathParticles(pos, color) {
  spawnHitParticles(pos, color, 20);
}

function updateParticles(dt) {
  particles = particles.filter(p => {
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      return false;
    }
    p.vel.y -= 8 * dt; // gravity
    p.mesh.position.addScaledVector(p.vel, dt);
    const lifeRatio = p.life / (p.maxLife || 0.5);
    p.mesh.material.opacity = lifeRatio;
    p.mesh.rotation.x += dt * 3;
    p.mesh.rotation.z += dt * 2;
    return true;
  });
}

// ============================================================
// ENEMY UPDATE
// ============================================================
function updateEnemies(dt) {
  enemies.forEach(e => {
    if (e.dead) return;

    // Rotate for visual feel
    e.mesh.rotation.y += dt * 1.5;

    // Stagger overrides movement
    if (e.staggerTimer > 0) {
      e.staggerTimer -= dt;
      return;
    }

    // Move toward player
    const toPlayer = playerPos.clone().sub(e.pos);
    const distToPlayer = toPlayer.length();

    if (distToPlayer > 1.0) {
      toPlayer.normalize();
      e.pos.addScaledVector(toPlayer, e.speed * dt);
      e.mesh.position.copy(e.pos);
    }

    // Attack windupTimer countdown (T10 — dt-based, not setTimeout)
    if (e.inAttackWindup) {
      e.attackTimer -= dt;

      // Warning ring opacity scales with windupTimer progress
      const progress = 1 - (e.attackTimer / e.attackWindup);
      e.warnRing.material.opacity = progress * 0.8;
      // Scale warning ring from large to small as it approaches
      const warnScale = 2.5 - progress * 1.5;
      e.warnRing.scale.setScalar(warnScale);

      if (e.attackTimer <= 0) {
        // Attack fires
        e.inAttackWindup = false;
        e.attackTimer = -1;
        e.warnRing.material.opacity = 0;

        if (distToPlayer < 2.5) {
          damagePlayer(1);
        }
      }
    }
  });
}

// ============================================================
// TERMINAL STATES (B2 — set gameState FIRST)
// ============================================================
function triggerDeath() {
  gameState = 'dead'; // B2 — first
  stopMusic();
  sfxGameOver();

  setTimeout(() => {
    overlayTitle.textContent = 'DEAD';
    overlaySub.textContent = `Arena ${arenaIndex + 1} — Wave ${currentWave}`;
    overlayBody.innerHTML = `SCORE: ${score.toLocaleString()}<br>PERFECT HITS: ${perfectHits}/${totalHits}<br>MAX COMBO: ×${maxCombo}<br><br>The beat goes on — even without you.`;
    overlayBtn.textContent = 'TRY AGAIN';
    overlayBtn.onclick = restartGame;
    overlay.classList.add('active');
  }, 1000);
}

function triggerWin() {
  gameState = 'win'; // B2 — first
  stopMusic();
  sfxWin();

  setTimeout(() => {
    overlayTitle.textContent = 'DEAD BEAT';
    overlaySub.textContent = 'ALL 3 ARENAS CLEARED';
    const pct = totalHits > 0 ? Math.round((perfectHits / totalHits) * 100) : 0;
    overlayBody.innerHTML = `SCORE: ${score.toLocaleString()}<br>PERFECT HITS: ${perfectHits}/${totalHits} (${pct}%)<br>MAX COMBO: ×${maxCombo}<br><br>You feel the rhythm in your fists.`;
    overlayBtn.textContent = 'PLAY AGAIN';
    overlayBtn.onclick = restartGame;
    overlay.classList.add('active');
  }, 1500);
}

function restartGame() {
  overlay.classList.remove('active');
  gameState = 'playing';
  score = 0;
  perfectHits = 0;
  totalHits = 0;
  maxCombo = 1;
  playerHP = playerMaxHP;
  clearEnemies();
  particles.forEach(p => scene.remove(p.mesh));
  particles = [];
  loadArena(0);
}

// ============================================================
// CAMERA SHAKE
// ============================================================
function updateCamera(dt) {
  if (shakeAmount > 0) {
    shakeDx = (Math.random() - 0.5) * shakeAmount;
    shakeDy = (Math.random() - 0.5) * shakeAmount;
    shakeAmount *= 0.85;
    if (shakeAmount < 0.01) shakeAmount = 0;
  } else {
    shakeDx = 0;
    shakeDy = 0;
  }

  // Smoothly follow player
  const targetX = playerPos.x + shakeDx;
  const targetZ = playerPos.z + 10 + shakeDy;
  camera.position.x += (targetX - camera.position.x) * 0.08;
  camera.position.z += (targetZ - camera.position.z) * 0.08;
  camera.lookAt(playerPos.x, 0, playerPos.z);
}

// ============================================================
// PLAYER MOVEMENT
// ============================================================
function updatePlayer(dt) {
  if (gameState !== 'playing') return;

  // Invincibility timer
  if (invincibleTimer > 0) {
    invincibleTimer -= dt;
    if (invincibleTimer <= 0) {
      invincibleTimer = 0;
      iframeActive = false;
      playerMesh.material.emissiveIntensity = 2;
    }
    // Flicker during iframe (FX9)
    if (iframeActive) {
      const flicker = Math.sin(Date.now() * 0.03) > 0;
      playerMesh.material.emissiveIntensity = flicker ? 6 : 0.5;
    }
  }

  // Combo decay
  if (comboCount > 1 && comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      breakCombo();
    }
  }

  // Movement
  const moveDir = new THREE.Vector3();
  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;

  if (moveDir.length() > 0) {
    moveDir.normalize();
    playerPos.addScaledVector(moveDir, playerSpeed * dt);
    // Clamp to arena
    playerPos.x = Math.max(-11, Math.min(11, playerPos.x));
    playerPos.z = Math.max(-11, Math.min(11, playerPos.z));
  }

  playerMesh.position.copy(playerPos);
  playerLight.position.copy(playerPos);
  playerMesh.rotation.y += dt * 2;

  // Player faces mouse
  const angle = Math.atan2(
    mouseWorldPos.x - playerPos.x,
    mouseWorldPos.z - playerPos.z
  );
  playerMesh.rotation.y = angle;

  // Handle pending actions
  if (punchPending) {
    punchPending = false;
    doPunch();
  }
  if (dodgePending) {
    dodgePending = false;
    doDodge();
  }
}

// ============================================================
// WAVE STATE MACHINE
// ============================================================
function updateWaveState(dt) {
  if (waveState === 'announcing') {
    announceTimer -= dt;
    if (announceTimer <= 0) {
      startWave(currentWave + 1);
    }
  }
}

// ============================================================
// MAIN LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  let dt = clock.getDelta();

  // Freeze-frame (on-beat hit) (LP8 — dt-based)
  if (freezeTimer > 0) {
    freezeTimer -= dt;
    dt = 0.001; // near-pause during freeze
  }

  if (gameState === 'playing') {
    updateBeat(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateWaveState(dt);
  }

  updateParticles(dt);
  updateCamera(dt);
  updateScore();

  if (useComposer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// ============================================================
// RAYCASTER — mouse → world position
// ============================================================
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function updateMouseWorld(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(floorPlane, mouseWorldPos);
}

// ============================================================
// INPUT
// ============================================================
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (k === ' ') { e.preventDefault(); dodgePending = true; }
  resumeAudio();
});

document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
});

// T5 — addEventListener only, no inline onclick, e.button === 0 guard for left click
document.addEventListener('mousedown', e => {
  if (e.button !== 0) return; // T5 — left click only
  updateMouseWorld(e);
  punchPending = true;
  resumeAudio();
}, false);

document.addEventListener('mousemove', e => {
  updateMouseWorld(e);
});

// Prevent space from scrolling
document.addEventListener('keydown', e => {
  if (e.key === ' ') e.preventDefault();
}, false);

// ============================================================
// INIT
// ============================================================
initAudio();
initScene();
