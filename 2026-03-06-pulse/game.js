import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── T2: ALL GAME-CRITICAL VARS DECLARED AT MODULE SCOPE ──
let scene, camera, renderer, composer, clock;
let playerMesh, playerGlow, beatPulseRing;
let gameState = 'idle';
let playerHP = 3;
let score = 0;
let comboCount = 0;
let waveIndex = 0;
let beatTimer = 0;
let currentBPM = 100;
let beatInterval = 0.6;
let beatWindowOpen = false;
let beatWindowDuration = 0.17;
let beatPhase = 0;
let invulnTimer = 0;
let shakeTimer = 0;
let shakeAmt = 0;
let isBoss = false;
let bossHP = 0;
let bossAngle = 0;
let bossFireTimer = 0;
let bossPatternPhase = 0;
let bossTempoJumpTimer = 0;
let bossBeamActive = false;
let bossBeamTimer = 0;
let waveKilled = 0;
let waveTarget = 0;
let waveBreakTimer = 0;
let ringSpawnTimer = 0;
let shootCooldown = 0;
let shootReq = false;
let musicStarted = false;
let comboLayerOn = false;

let rings = [], enemies = [], bullets = [], enemyBullets = [], particles = [];
let bossMesh = null, bossLight = null, bossBeamMesh = null;
let starfield = null;
let mouseX = 0, mouseY = 0;

// Audio (T2: top-scope)
let audioCtx = null;
let masterGain = null, beatOsc = null, beatGain = null;
let bassOsc = null, bassGain = null;
let arpeOsc = null, arpeGain = null;
let comboOsc = null, comboGainNode = null;

// UI refs
const overlay   = document.getElementById('overlay');
const startBtn  = document.getElementById('start-btn');
const feedbackEl= document.getElementById('feedback');
const waveAnn   = document.getElementById('wave-ann');
const beatFill  = document.getElementById('beat-fill');
const waveLbl   = document.getElementById('wave-lbl');
const scoreLbl  = document.getElementById('score-lbl');
const comboLbl  = document.getElementById('combo-lbl');
const bossWrap  = document.getElementById('boss-wrap');
const bossFill  = document.getElementById('boss-fill');
const hearts    = [document.getElementById('h1'), document.getElementById('h2'), document.getElementById('h3')];

// Wave configs: bpm, layers, enemies, label
const WAVES = [
  { bpm:100, layers:1, enemies:6,  label:'WAVE 1' },
  { bpm:105, layers:1, enemies:8,  label:'WAVE 2' },
  { bpm:110, layers:2, enemies:10, label:'WAVE 3' },
  { bpm:115, layers:2, enemies:12, label:'WAVE 4' },
  { bpm:120, layers:3, enemies:14, label:'WAVE 5' },
  { bpm:130, layers:2, enemies:999,label:'BOSS'   },
];

// ── INIT ──
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020008);
  scene.fog = new THREE.FogExp2(0x050012, 0.055);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 0, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight), 2.0, 0.5, 0.15
  ));

  // Lighting
  scene.add(new THREE.AmbientLight(0x111133, 3));
  const dLight = new THREE.DirectionalLight(0xff44cc, 4);
  dLight.position.set(5, 8, 5);
  scene.add(dLight);

  buildStars();
  buildPlayer();
  buildBeatRing();

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', e => { if (e.button === 0) shootReq = true; });
  window.addEventListener('keydown',   e => { if (e.code === 'Space') { e.preventDefault(); shootReq = true; } });
  window.addEventListener('resize', onResize);
  startBtn.addEventListener('click', startGame);

  animate();
}

function buildStars() {
  const n = 500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i*3]   = (Math.random()-0.5)*80;
    pos[i*3+1] = (Math.random()-0.5)*80;
    pos[i*3+2] = (Math.random()-0.5)*30 - 5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starfield = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x8888ff, size: 0.07, transparent: true, opacity: 0.5
  }));
  scene.add(starfield);
}

function buildPlayer() {
  // T1: use .set(), NOT Object.assign() on THREE objects
  const geo = new THREE.OctahedronGeometry(0.38, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.5,
    metalness: 0.8, roughness: 0.2
  });
  playerMesh = new THREE.Mesh(geo, mat);
  scene.add(playerMesh);
  playerMesh.position.set(0, 0, 0); // T1: use .set()

  const gGeo = new THREE.SphereGeometry(0.7, 12, 6);
  const gMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.1, side: THREE.BackSide });
  playerGlow = new THREE.Mesh(gGeo, gMat);
  playerMesh.add(playerGlow);
}

function buildBeatRing() {
  const geo = new THREE.RingGeometry(0.55, 0.62, 64);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.0 });
  beatPulseRing = new THREE.Mesh(geo, mat);
  beatPulseRing.position.set(0, 0, 0); // T1
  scene.add(beatPulseRing);
}

// ── START GAME ──
function startGame() {
  overlay.style.display = 'none';
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();
  startMusic();
  resetGame();
  gameState = 'playing';
  loadWave(0);
}

function resetGame() {
  playerHP = 3; score = 0; comboCount = 0; waveIndex = 0;
  invulnTimer = 0; shakeTimer = 0; shakeAmt = 0;
  shootCooldown = 0; shootReq = false; comboLayerOn = false;
  waveKilled = 0; waveTarget = 0; waveBreakTimer = 0;
  ringSpawnTimer = 0; isBoss = false; bossHP = 0;
  updateHPUI(); scoreLbl.textContent = '0';
  comboLbl.style.opacity = '0'; bossWrap.style.display = 'none';
  clearEntities();
  playerMesh.visible = true;
  playerMesh.position.set(0, 0, 0); // T1
}

function clearEntities() {
  for (const r of rings)        { scene.remove(r.mesh); }
  for (const e of enemies)      { scene.remove(e.mesh); if(e.lt) scene.remove(e.lt); }
  for (const b of bullets)      { scene.remove(b.mesh); }
  for (const b of enemyBullets) { scene.remove(b.mesh); }
  for (const p of particles)    { scene.remove(p.mesh); }
  if (bossMesh)  { scene.remove(bossMesh);  bossMesh  = null; }
  if (bossLight) { scene.remove(bossLight); bossLight = null; }
  if (bossBeamMesh) { scene.remove(bossBeamMesh); bossBeamMesh = null; }
  rings = []; enemies = []; bullets = []; enemyBullets = []; particles = [];
}

// ── AUDIO ──
function startMusic() {
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.32;
  masterGain.connect(audioCtx.destination);

  // Bass
  bassOsc = audioCtx.createOscillator();
  bassOsc.type = 'sawtooth';
  bassOsc.frequency.value = 55;
  const bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = 'lowpass'; bassFilter.frequency.value = 180;
  bassGain = audioCtx.createGain(); bassGain.gain.value = 0.1;
  bassOsc.connect(bassFilter); bassFilter.connect(bassGain); bassGain.connect(masterGain);
  bassOsc.start();

  // Beat click
  beatOsc = audioCtx.createOscillator();
  beatOsc.type = 'sine'; beatOsc.frequency.value = 85;
  beatGain = audioCtx.createGain(); beatGain.gain.value = 0;
  beatOsc.connect(beatGain); beatGain.connect(masterGain);
  beatOsc.start();

  // Arpeggio layer
  arpeOsc = audioCtx.createOscillator();
  arpeOsc.type = 'triangle'; arpeOsc.frequency.value = 330;
  arpeGain = audioCtx.createGain(); arpeGain.gain.value = 0.05;
  arpeOsc.connect(arpeGain); arpeGain.connect(masterGain);
  arpeOsc.start();

  musicStarted = true;
}

function fireBeat() {
  if (!audioCtx || !beatGain) return;
  const t = audioCtx.currentTime;
  beatOsc.frequency.setValueAtTime(90, t);
  beatOsc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
  beatGain.gain.cancelScheduledValues(t);
  beatGain.gain.setValueAtTime(0.38, t);
  beatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

  // Update arpeggio pitch per beat
  if (arpeOsc) {
    const freqs = [330, 392, 440, 523, 440, 392];
    const beatNum = Math.round(beatTimer / beatInterval) % freqs.length;
    arpeOsc.frequency.setValueAtTime(freqs[beatNum], t);
  }
}

function sfx(type) {
  if (!audioCtx || !masterGain) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  const t = audioCtx.currentTime;
  if (type === 'shoot_on') {
    o.type = 'square';
    o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(330, t+0.1);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.12);
  } else if (type === 'shoot_off') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.07);
  } else if (type === 'hit') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(80, t+0.35);
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.4);
  } else if (type === 'enemy_die') {
    o.type = 'sine';
    o.frequency.setValueAtTime(440 + Math.random()*220, t); o.frequency.exponentialRampToValueAtTime(880, t+0.15);
    g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
  } else if (type === 'wave_clear') {
    [330,440,550,660].forEach((f,i) => {
      const oo=audioCtx.createOscillator(), gg=audioCtx.createGain();
      oo.connect(gg); gg.connect(masterGain);
      oo.type='triangle'; oo.frequency.value=f;
      const tt=t+i*0.1;
      gg.gain.setValueAtTime(0.16,tt); gg.gain.exponentialRampToValueAtTime(0.001,tt+0.25);
      oo.start(tt); oo.stop(tt+0.3);
    });
    o.disconnect(); g.disconnect(); return;
  } else if (type === 'boss_hit') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t+0.2);
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.25);
  } else if (type === 'win') {
    [330,440,550,660,880].forEach((f,i) => {
      const oo=audioCtx.createOscillator(), gg=audioCtx.createGain();
      oo.connect(gg); gg.connect(masterGain);
      oo.type='sine'; oo.frequency.value=f;
      const tt=t+i*0.14;
      gg.gain.setValueAtTime(0.18,tt); gg.gain.exponentialRampToValueAtTime(0.001,tt+0.4);
      oo.start(tt); oo.stop(tt+0.5);
    });
    o.disconnect(); g.disconnect(); return;
  } else if (type === 'die') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(40, t+0.8);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.9);
  }
  o.start(t); o.stop(t + 2);
}

function activateComboLayer() {
  if (comboLayerOn || !audioCtx) return;
  comboLayerOn = true;
  comboOsc = audioCtx.createOscillator();
  comboOsc.type = 'square'; comboOsc.frequency.value = 220;
  comboGainNode = audioCtx.createGain(); comboGainNode.gain.value = 0.04;
  comboOsc.connect(comboGainNode); comboGainNode.connect(masterGain);
  comboOsc.start();
}

// ── WAVE LOGIC ──
function loadWave(idx) {
  waveIndex = idx;
  const cfg = WAVES[idx];
  currentBPM = cfg.bpm;
  beatInterval = 60 / currentBPM;
  beatTimer = 0; beatPhase = 0; beatWindowOpen = false;
  ringSpawnTimer = 0; waveKilled = 0; waveTarget = cfg.enemies;
  isBoss = cfg.label === 'BOSS';
  waveLbl.textContent = cfg.label;
  showAnnounce(cfg.label);
  clearEntities();
  bossWrap.style.display = 'none';

  if (isBoss) {
    bossHP = 30;
    spawnBoss();
  } else {
    let delay = 1200;
    for (let i = 0; i < cfg.enemies; i++) {
      setTimeout(() => {
        if (gameState === 'playing' && waveIndex === idx) spawnEnemy(idx);
      }, delay);
      delay += 1400 + Math.random() * 600;
    }
  }
}

function showAnnounce(label) {
  waveAnn.style.transition = 'none';
  waveAnn.style.opacity = '1';
  waveAnn.textContent = label;
  setTimeout(() => {
    waveAnn.style.transition = 'opacity 0.9s';
    waveAnn.style.opacity = '0';
  }, 900);
}

// ── RING SPAWN ──
function spawnRing() {
  const cfg = WAVES[waveIndex];
  if (isBoss) return;
  const layers = cfg.layers;
  const baseSpeed = 3.8 + waveIndex * 0.35;
  const colors = [0xff3399, 0x00aaff, 0xaa00ff];

  for (let i = 0; i < layers; i++) {
    const offset = i * (beatInterval * 0.45);
    setTimeout(() => {
      if (gameState !== 'playing') return;
      // Gap: the opening arc where player can pass
      const gapSize = Math.max(0.6, 1.2 - waveIndex * 0.1);
      const gapAngle = Math.random() * Math.PI * 2;
      const col = colors[i % 3];

      // Create ring as arc segments (torus ring)
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      // Full ring mesh (thin torus)
      const torusGeo = new THREE.TorusGeometry(0.3, 0.06, 8, 64);
      const torusMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
      const torusMesh = new THREE.Mesh(torusGeo, torusMat);
      ringGroup.add(torusMesh);

      // Gap markers (two bright dashes at gap edges)
      for (let g = 0; g < 2; g++) {
        const angle = gapAngle + (g === 0 ? -gapSize/2 : gapSize/2);
        const markerGeo = new THREE.SphereGeometry(0.12, 8, 4);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(Math.cos(angle)*0.3, Math.sin(angle)*0.3, 0); // T1: .set()
        ringGroup.add(marker);
      }

      rings.push({
        mesh: ringGroup,
        torus: torusMesh,
        radius: 0.3,
        speed: baseSpeed + i * 0.3,
        gapAngle,
        gapSize,
        col,
        dead: false
      });
    }, offset * 1000);
  }
}

// ── ENEMIES ──
function spawnEnemy(waveIdx) {
  if (gameState !== 'playing') return;
  const angle = Math.random() * Math.PI * 2;
  const r = 7 + Math.random() * 2;
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;
  const cols = [0xff2266, 0xff6600, 0xcc00ff, 0xff0044, 0x00aaff];
  const col = cols[Math.floor(Math.random() * cols.length)];

  const geo = new THREE.TetrahedronGeometry(0.3 + Math.random()*0.1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, metalness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0); // T1
  scene.add(mesh);

  const lt = new THREE.PointLight(col, 2.5, 4);
  lt.position.set(x, y, 0); // T1
  scene.add(lt);

  enemies.push({
    mesh, lt, col,
    hp: waveIdx >= 2 ? 2 : 1,
    speed: 1.0 + Math.random()*0.8 + waveIdx*0.1,
    fireTimer: 1.5 + Math.random()*1.5,
    fireRate: 2.0 + Math.random()*1.0,
    rot: Math.random()*2 - 1,
    dead: false
  });
}

function spawnBoss() {
  const geo = new THREE.IcosahedronGeometry(1.3, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 3.5,
    metalness: 0.7, roughness: 0.2
  });
  bossMesh = new THREE.Mesh(geo, mat);
  bossMesh.position.set(0, 3.5, 0); // T1
  scene.add(bossMesh);

  bossLight = new THREE.PointLight(0xff0055, 5, 12);
  bossLight.position.set(0, 3.5, 0); // T1
  scene.add(bossLight);

  bossAngle = 0; bossFireTimer = 0; bossPatternPhase = 0;
  bossTempoJumpTimer = 8;
  bossBeamActive = false; bossBeamTimer = 0;

  bossWrap.style.display = 'block';
  updateBossBar();
}

function updateBossBar() {
  bossFill.style.width = Math.max(0, bossHP / 30 * 100) + '%';
}

// ── BULLETS ──
function fireBullet(onBeat) {
  if (!playerMesh) return;
  const px = playerMesh.position.x;
  const py = playerMesh.position.y;

  let tx, ty;
  // Aim at nearest enemy/boss
  if (isBoss && bossMesh) {
    tx = bossMesh.position.x - px;
    ty = bossMesh.position.y - py;
  } else if (enemies.length > 0) {
    let nearest = enemies[0];
    let minDist = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.mesh.position.x - px, e.mesh.position.y - py);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    tx = nearest.mesh.position.x - px;
    ty = nearest.mesh.position.y - py;
  } else {
    tx = 0; ty = 1;
  }
  const len = Math.hypot(tx, ty) || 1;
  const vx = (tx/len) * 12;
  const vy = (ty/len) * 12;

  const col = onBeat ? 0x00ffcc : 0x336688;
  const size = onBeat ? 0.14 : 0.09;
  const geo = new THREE.SphereGeometry(size, 8, 4);
  const mat = new THREE.MeshBasicMaterial({ color: col });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(px, py, 0); // T1
  scene.add(mesh);

  bullets.push({ mesh, vx, vy, onBeat, life: 2.5, damage: onBeat ? 2 : 1 });

  if (onBeat) spawnShockwave(px, py);
}

function spawnShockwave(x, y) {
  const geo = new THREE.RingGeometry(0.1, 0.2, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0); // T1
  scene.add(mesh);
  particles.push({ mesh, type: 'shockwave', life: 0.5, maxLife: 0.5, scaleRate: 5 });
}

function fireEnemyBullet(ex, ey) {
  const px = playerMesh.position.x, py = playerMesh.position.y;
  const dx = px - ex, dy = py - ey;
  const len = Math.hypot(dx,dy)||1;
  const vx = (dx/len) * 5, vy = (dy/len) * 5;

  const geo = new THREE.SphereGeometry(0.1, 6, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3344 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(ex, ey, 0); // T1
  scene.add(mesh);

  enemyBullets.push({ mesh, vx, vy, life: 3 });
}

function fireBossProjectile(angle) {
  if (!bossMesh) return;
  const bx = bossMesh.position.x, by = bossMesh.position.y;
  const vx = Math.cos(angle) * 4, vy = Math.sin(angle) * 4;

  const geo = new THREE.SphereGeometry(0.13, 6, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(bx, by, 0); // T1
  scene.add(mesh);

  enemyBullets.push({ mesh, vx, vy, life: 4 });
}

// ── PARTICLES ──
function spawnBurst(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    const geo = new THREE.SphereGeometry(0.06 + Math.random()*0.06, 4, 2);
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0); // T1
    scene.add(mesh);
    particles.push({
      mesh, type: 'burst',
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      life: 0.4 + Math.random()*0.3, maxLife: 0.7
    });
  }
}

// ── FEEDBACK UI (Rule #3: always show WHY) ──
let feedbackTimer = 0;
function showFeedback(text, col, dur) {
  feedbackEl.textContent = text;
  feedbackEl.style.color = col;
  feedbackEl.style.opacity = '1';
  feedbackEl.style.transition = 'none';
  feedbackTimer = dur || 0.4;
}

function updateHP(delta) {
  playerHP = Math.max(0, Math.min(3, playerHP + delta));
  updateHPUI();
  if (delta < 0) {
    shakeTimer = 0.3; shakeAmt = 0.25;
    // Beat stutters for 1 cycle
    if (beatGain) {
      const t = audioCtx.currentTime;
      beatGain.gain.setValueAtTime(0, t);
    }
  }
}

function updateHPUI() {
  for (let i = 0; i < 3; i++) {
    hearts[i].classList.toggle('lost', i >= playerHP);
  }
}

// ── MAIN UPDATE ──
function update(dt) {
  if (gameState === 'dead' || gameState === 'won' || gameState === 'idle') return;

  if (gameState === 'waveBreak') {
    waveBreakTimer -= dt;
    if (waveBreakTimer <= 0) {
      gameState = 'playing';
      loadWave(waveIndex + 1);
    }
    return;
  }

  // Invuln & shake
  if (invulnTimer > 0) invulnTimer -= dt;
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    camera.position.x = (Math.random()-0.5)*shakeAmt; // T1: direct axis ok
    camera.position.y = (Math.random()-0.5)*shakeAmt;
  } else {
    camera.position.x = 0; camera.position.y = 0;
  }

  // Feedback timer

  if (feedbackTimer > 0) {
    feedbackTimer -= dt;
    if (feedbackTimer <= 0) {
      feedbackEl.style.transition = 'opacity 0.3s';
      feedbackEl.style.opacity = '0';
    }
  }

  // Beat timing
  beatTimer += dt;
  beatPhase = (beatTimer % beatInterval) / beatInterval; // 0-1
  beatFill.style.width = (beatPhase * 100) + '%';

  // Beat window: 0-17% of cycle = open
  const wasOpen = beatWindowOpen;
  beatWindowOpen = beatPhase < beatWindowDuration / beatInterval;
  if (!wasOpen && beatPhase < 0.05) {
    // New beat fired
    fireBeat();
    spawnRing();
    // Pulse beat ring
    beatPulseRing.position.set(playerMesh.position.x, playerMesh.position.y, 0);
    beatPulseRing.material.opacity = 0.8;
  }

  // Beat pulse ring fade
  if (beatPulseRing.material.opacity > 0) {
    beatPulseRing.material.opacity = Math.max(0, beatPulseRing.material.opacity - dt * 4);
    const s = 1 + (1 - beatPulseRing.material.opacity) * 1.5;
    beatPulseRing.scale.set(s, s, 1);
  }

  // Player movement (smooth follow mouse)
  if (playerMesh) {
    const tx = mouseX, ty = mouseY;
    playerMesh.position.x += (tx - playerMesh.position.x) * Math.min(1, dt * 8);
    playerMesh.position.y += (ty - playerMesh.position.y) * Math.min(1, dt * 8);
    playerMesh.rotation.x += dt * 1.2;
    playerMesh.rotation.y += dt * 0.9;
    // Clamp to play area
    const maxR = 7.5;
    const pr = Math.hypot(playerMesh.position.x, playerMesh.position.y);
    if (pr > maxR) {
      playerMesh.position.x = (playerMesh.position.x / pr) * maxR;
      playerMesh.position.y = (playerMesh.position.y / pr) * maxR;
    }
    beatPulseRing.position.set(playerMesh.position.x, playerMesh.position.y, 0.01);
  }

  // Shooting
  if (shootCooldown > 0) shootCooldown -= dt;
  if (shootReq && shootCooldown <= 0) {
    shootReq = false;
    shootCooldown = 0.28;
    const onBeat = beatWindowOpen;
    fireBullet(onBeat);
    if (onBeat) {
      sfx('shoot_on');
      comboCount++;
      scoreLbl.textContent = score;
      comboLbl.textContent = `×${comboCount} COMBO`;
      comboLbl.style.opacity = '1';
      if (comboCount >= 5) {
        activateComboLayer();
        showFeedback('ON BEAT!', '#00ffcc', 0.35);
      }
    } else {
      sfx('shoot_off');
      comboCount = 0;
      comboLbl.style.opacity = '0';
      // Rule #3: show WHY off-beat failed
      showFeedback('OFF BEAT', '#ff6644', 0.35);
    }
  } else {
    shootReq = false;
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.y += b.vy * dt;
    if (b.life <= 0) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }

    // Hit enemy
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (e.dead) continue;
      const dist = b.mesh.position.distanceTo(e.mesh.position);
      if (dist < 0.5) {
        e.hp -= b.damage;
        spawnBurst(e.mesh.position.x, e.mesh.position.y, e.col, 6);
        scene.remove(b.mesh); bullets.splice(i, 1);
        if (e.hp <= 0) {
          e.dead = true;
          sfx('enemy_die');
          spawnBurst(e.mesh.position.x, e.mesh.position.y, e.col, 14);
          scene.remove(e.mesh); if(e.lt) scene.remove(e.lt);
          enemies.splice(j, 1);
          score += b.onBeat ? 150 : 75;
          scoreLbl.textContent = score;
          waveKilled++;
          if (waveKilled >= waveTarget && !isBoss) checkWaveClear();
        }
        break;
      }
    }

    // Hit boss
    if (isBoss && bossMesh) {
      const dist = b.mesh.position.distanceTo(bossMesh.position);
      if (dist < 1.8) {
        bossHP -= b.damage;
        sfx('boss_hit');
        spawnBurst(bossMesh.position.x, bossMesh.position.y, 0xff0055, 5);
        scene.remove(b.mesh); bullets.splice(i, 1);
        score += b.onBeat ? 300 : 150;
        scoreLbl.textContent = score;
        updateBossBar();
        if (bossHP <= 0) triggerWin();
      }
    }
  }

  // Update enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.life -= dt; b.mesh.position.x += b.vx * dt; b.mesh.position.y += b.vy * dt;
    if (b.life <= 0) { scene.remove(b.mesh); enemyBullets.splice(i, 1); continue; }
    if (playerMesh && invulnTimer <= 0) {
      const d = b.mesh.position.distanceTo(playerMesh.position);
      if (d < 0.45) {
        scene.remove(b.mesh); enemyBullets.splice(i, 1);
        takeDamage();
      }
    }
  }

  // Update enemies
  for (const e of enemies) {
    if (e.dead) continue;
    if (!playerMesh) continue;
    const dx = playerMesh.position.x - e.mesh.position.x;
    const dy = playerMesh.position.y - e.mesh.position.y;
    const len = Math.hypot(dx,dy)||1;
    e.mesh.position.x += (dx/len)*e.speed*dt;
    e.mesh.position.y += (dy/len)*e.speed*dt;
    e.mesh.rotation.x += dt * e.rot * 2;
    e.mesh.rotation.y += dt * e.rot;
    if (e.lt) {
      e.lt.position.x = e.mesh.position.x;
      e.lt.position.y = e.mesh.position.y;
    }

    // Enemy fires
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      fireEnemyBullet(e.mesh.position.x, e.mesh.position.y);
    }

    // Enemy touches player
    if (invulnTimer <= 0) {
      const d = e.mesh.position.distanceTo(playerMesh.position);
      if (d < 0.6) takeDamage();
    }
  }

  // Update rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.radius += r.speed * dt;
    r.mesh.scale.setScalar(r.radius / 0.3);

    // Ring opacity based on size
    const alpha = Math.max(0, 1 - (r.radius - 2) / 8);
    r.torus.material.opacity = alpha * 0.88;

    // Collision: when ring wall passes through player position
    if (playerMesh && invulnTimer <= 0 && r.radius > 0.8) {
      const pd = Math.hypot(playerMesh.position.x, playerMesh.position.y);
      // Ring wall is at world radius = r.radius (torus scaled)
      if (Math.abs(pd - r.radius) < 0.42) {
        // Check if player is in gap opening
        const pAngle = Math.atan2(playerMesh.position.y, playerMesh.position.x);
        let diff = Math.abs(pAngle - r.gapAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const inGap = diff < r.gapSize / 2;
        if (!inGap) takeDamage();
      }
    }

    if (r.radius > 12 || alpha <= 0) {
      scene.remove(r.mesh); rings.splice(i, 1);
    }
  }

  // Boss update
  if (isBoss && bossMesh) {
    bossAngle += dt * 0.6;
    bossMesh.rotation.x += dt * 0.8;
    bossMesh.rotation.y += dt * 1.1;
    const bR = 3.5;
    bossMesh.position.x = Math.cos(bossAngle) * bR;
    bossMesh.position.y = Math.sin(bossAngle) * bR + 1;
    if (bossLight) { bossLight.position.x = bossMesh.position.x; bossLight.position.y = bossMesh.position.y; }

    // Boss fires on beat + spread
    bossFireTimer -= dt;
    if (bossFireTimer <= 0) {
      bossFireTimer = beatInterval * 1.5;
      bossPatternPhase++;
      const baseAngle = Math.atan2(
        (playerMesh?.position.y||0) - bossMesh.position.y,
        (playerMesh?.position.x||0) - bossMesh.position.x
      );
      if (bossPatternPhase % 3 === 0) {
        // Spread shot: 5 bullets fan
        for (let a = -2; a <= 2; a++) {
          fireBossProjectile(baseAngle + a * 0.35);
        }
      } else if (bossPatternPhase % 3 === 1) {
        // Aimed shot
        fireBossProjectile(baseAngle);
        fireBossProjectile(baseAngle + Math.PI);
      } else {
        // Ring burst
        for (let a = 0; a < 8; a++) {
          fireBossProjectile(a * Math.PI / 4);
        }
      }
    }

    // Boss tempo jump (every 8s): Rule #3 — show feedback
    bossTempoJumpTimer -= dt;
    if (bossTempoJumpTimer <= 0) {
      bossTempoJumpTimer = 6 + Math.random() * 4;
      const shift = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 10);
      currentBPM = Math.max(90, Math.min(160, currentBPM + shift));
      beatInterval = 60 / currentBPM;
      showFeedback(shift > 0 ? 'TEMPO UP!' : 'TEMPO DOWN!', '#ffaa00', 0.6);
    }
  }

  // Particles update
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
    if (p.type === 'burst') {
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.material.opacity = p.life / p.maxLife;
    } else if (p.type === 'shockwave') {
      const t = 1 - p.life / p.maxLife;
      const s = 1 + t * p.scaleRate;
      p.mesh.scale.set(s, s, 1);
      p.mesh.material.opacity = 1 - t;
    }
  }

  // Stars slow drift
  if (starfield) starfield.rotation.z += dt * 0.01;

  // Combo layer pitch sweep
  if (comboLayerOn && comboOsc && beatPhase < 0.05) {
    const freqs2 = [220, 262, 330, 392];
    const idx2 = Math.round(beatTimer / beatInterval) % freqs2.length;
    comboOsc.frequency.setValueAtTime(freqs2[idx2], audioCtx.currentTime);
  }
}

// ── TAKE DAMAGE ──
function takeDamage() {
  if (invulnTimer > 0) return;
  invulnTimer = 1.2;
  updateHP(-1);
  sfx('hit');
  showFeedback('HIT!', '#ff3344', 0.4);
  comboCount = 0; comboLbl.style.opacity = '0';
  spawnBurst(playerMesh.position.x, playerMesh.position.y, 0xff3344, 10);
  if (playerHP <= 0) triggerDeath();
}

// ── WAVE CLEAR ──
function checkWaveClear() {
  if (gameState !== 'playing') return;
  sfx('wave_clear');
  score += 500;
  scoreLbl.textContent = score;
  gameState = 'waveBreak';

  // Rule #7: breathing room — 1s pause before next wave
  showFeedback('WAVE CLEAR!', '#00ffcc', 1.0);
  // Camera zoom exhale
  const zoomIn = () => {
    camera.fov = 65; camera.updateProjectionMatrix();
    setTimeout(() => { camera.fov = 70; camera.updateProjectionMatrix(); }, 500);
  };
  zoomIn();
  waveBreakTimer = 1.5;

  if (waveIndex >= WAVES.length - 2) {
    // Next is boss
    waveBreakTimer = 2.0;
    showFeedback('⚠ BOSS INCOMING', '#ff3399', 1.8);
  }
}

// ── WIN / DEATH ──
function triggerWin() {
  gameState = 'won';
  sfx('win');
  score += 2000;
  // Rule #7: boss defeat — 2s ring-collapse animation + breathing room
  if (bossMesh) {
    bossBeamActive = false;
    const mat = bossMesh.material;
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      mat.emissiveIntensity = 3.5 * (1 - t);
      bossMesh.scale.setScalar(1 + t * 3);
      if (t >= 1) { clearInterval(interval); scene.remove(bossMesh); bossMesh = null; }
    }, 50);
  }
  setTimeout(() => {
    for (let a = 0; a < 20; a++) {
      spawnBurst(
        (Math.random()-0.5)*6, (Math.random()-0.5)*6,
        [0x00ffcc, 0xff3399, 0xaa00ff][Math.floor(Math.random()*3)], 8
      );
    }
    overlay.innerHTML = `
      <h1 style="color:#00ffcc;text-shadow:0 0 40px #00ffcc;">CLEAR!</h1>
      <div class="sub" style="font-size:16px;letter-spacing:4px;color:#fff;margin-bottom:20px;">SCORE: ${score}</div>
      <div class="sub">ALL WAVES SURVIVED</div>
      <div style="height:30px"></div>
      <button class="btn" onclick="location.reload()">▶ PLAY AGAIN</button>
    `;
    overlay.style.display = 'flex';
    bossWrap.style.display = 'none';
  }, 2200);
}

function triggerDeath() {
  gameState = 'dead';
  sfx('die');
  playerMesh.visible = false;
  setTimeout(() => {
    overlay.innerHTML = `
      <h1 style="color:#ff3344;text-shadow:0 0 40px #ff3344;">DEAD</h1>
      <div class="sub" style="font-size:16px;letter-spacing:4px;color:#fff;margin-bottom:20px;">SCORE: ${score}</div>
      <div class="sub">WAVE ${waveIndex + 1}</div>
      <div style="height:30px"></div>
      <button class="btn" onclick="location.reload()">▶ TRY AGAIN</button>
    `;
    overlay.style.display = 'flex';
    bossWrap.style.display = 'none';
  }, 800);
}

// ── ANIMATE ──
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  composer.render();
}

// ── INPUT ──
function onMouseMove(e) {
  // Convert mouse to world coords (approx for perspective at z=0)
  const rect = renderer.domElement.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  // Approx world scale at z=0 with fov=70, dist=15
  const scale = Math.tan(70 * Math.PI / 360) * 15;
  mouseX = nx * scale * (innerWidth / innerHeight);
  mouseY = ny * scale;
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}

// ── BOOT ──
init();
