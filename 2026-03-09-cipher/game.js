import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── T2: ALL game state at module scope ──────────────────────────────────────
let scene, camera, renderer, composer;
let animId;
let audioCtx = null;
let musicNodes = [];

// Game state
let gameState = 'menu'; // menu | playing | scanning | level_clear | game_over | win
let playerHP = 3;
let currentLevel = 0;
let invincibleTimer = 0;
let scanProgress = 0;
let scanDuration = 1.8;
let scanActive = false;
let pendingPackage = null;
let levelRules = [];
let contrabandItems = [];
let probeItems = [];
let logEntries = [];
let selectedCard = null;
let selectedIsProbe = false;
let contrabandPassed = 0; // per level
let levelClearTimer = 0;
let gameoverTimer = 0;

// 3D scene objects
let conveyorMesh = null;
let scannerMesh = null;
let scannerBeam = null;
let scannerGlow = null;
let packageOnBelt = null;
let ambientParticles = [];
let beltSegments = [];
let clock;

// Rule pool (12 possible rules, drawn without replacement per session)
const RULE_POOL = [
  { id: 'red',        label: 'RED items',            test: p => p.color === 'red' },
  { id: 'blue',       label: 'BLUE items',           test: p => p.color === 'blue' },
  { id: 'large',      label: 'LARGE items',          test: p => p.size === 'large' },
  { id: 'small',      label: 'SMALL items',          test: p => p.size === 'small' },
  { id: 'metal',      label: 'METAL items',          test: p => p.material === 'metal' },
  { id: 'fabric',     label: 'FABRIC items',         test: p => p.material === 'fabric' },
  { id: 'red_large',  label: 'RED and LARGE items',  test: p => p.color === 'red' && p.size === 'large' },
  { id: 'blue_metal', label: 'BLUE and METAL items', test: p => p.color === 'blue' && p.material === 'metal' },
  { id: 'not_small',  label: 'anything NOT SMALL',   test: p => p.size !== 'small' },
  { id: 'not_fabric', label: 'anything NOT FABRIC',  test: p => p.material !== 'fabric' },
  { id: 'green_fab',  label: 'GREEN or FABRIC items', test: p => p.color === 'green' || p.material === 'fabric' },
  { id: 'metal_large', label: 'METAL and LARGE items', test: p => p.material === 'metal' && p.size === 'large' },
];

const COLORS = ['red', 'blue', 'green', 'yellow'];
const SIZES  = ['small', 'medium', 'large'];
const MATS   = ['metal', 'wood', 'fabric'];

const COLOR_HEX = {
  red: 0xe04040, blue: 0x4080e0, green: 0x40c060, yellow: 0xe0c040
};
const SIZE_SCALE = { small: 0.45, medium: 0.65, large: 0.88 };

// ── DOM refs ────────────────────────────────────────────────────────────────
const container    = document.getElementById('canvas-container');
const overlay      = document.getElementById('overlay');
const startBtn     = document.getElementById('start-btn');
const sendBtn      = document.getElementById('send-btn');
const scanFlash    = document.getElementById('scan-flash');
const scanBar      = document.getElementById('scan-bar');
const iframeInd    = document.getElementById('iframe-indicator');
const probeListEl  = document.getElementById('probe-list');
const contListEl   = document.getElementById('contraband-list');
const logEl        = document.getElementById('log');
const levelNumEl   = document.getElementById('level-num');

// ── INIT ────────────────────────────────────────────────────────────────────
function init() {
  clock = new THREE.Clock();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.FogExp2(0x070710, 0.06);

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8, 12);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, 0.5, 0.1
  );
  composer.addPass(bloom);

  // Lighting
  const ambient = new THREE.AmbientLight(0x101018, 1.0);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x4040a0, 1.5);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Build static scene
  buildScene();

  // Resize
  window.addEventListener('resize', onResize);

  // Start btn
  startBtn.addEventListener('click', () => {
    resumeAudio();
    startGame();
  });

  // Send btn
  sendBtn.addEventListener('click', () => {
    if (selectedCard !== null && gameState === 'playing') {
      sendPackage();
    }
  });

  animate();
}

// ── SCENE ────────────────────────────────────────────────────────────────────
function buildScene() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(30, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0d0d15, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  scene.add(floor);

  // Grid lines on floor
  const gridHelper = new THREE.GridHelper(30, 30, 0x1a1a2e, 0x1a1a2e);
  gridHelper.position.y = -0.49;
  scene.add(gridHelper);

  // Conveyor belt
  const beltGeo = new THREE.BoxGeometry(10, 0.2, 2.2);
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.8, metalness: 0.4 });
  conveyorMesh = new THREE.Mesh(beltGeo, beltMat);
  conveyorMesh.position.set(-1, 0, 0);
  scene.add(conveyorMesh);

  // Belt stripes (animated)
  for (let i = -4; i <= 4; i++) {
    const stripeGeo = new THREE.BoxGeometry(0.4, 0.22, 2.0);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x252538, roughness: 0.7 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(i * 1.0, 0, 0);
    scene.add(stripe);
    beltSegments.push(stripe);
  }

  // Left wall (package source)
  const wallL = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 4, 3),
    new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.9 })
  );
  wallL.position.set(-5.5, 1.5, 0);
  scene.add(wallL);

  // Scanner machine (right side of belt)
  buildScanner();

  // Ambient floating particles
  const partGeo = new THREE.BufferGeometry();
  const pCount = 200;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3]     = (Math.random() - 0.5) * 24;
    pPos[i * 3 + 1] = Math.random() * 6;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const partMat = new THREE.PointsMaterial({ color: 0x2020a0, size: 0.04, transparent: true, opacity: 0.6 });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);
  ambientParticles.push(particles);
}

function buildScanner() {
  // Scanner housing
  const housingGeo = new THREE.BoxGeometry(2.2, 3.5, 3.2);
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.5, metalness: 0.7 });
  scannerMesh = new THREE.Mesh(housingGeo, housingMat);
  scannerMesh.position.set(4.5, 1.5, 0);
  scene.add(scannerMesh);

  // Scanner arch ring
  const archGeo = new THREE.TorusGeometry(1.4, 0.12, 8, 32);
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x3030c0, emissive: 0x1010a0, emissiveIntensity: 0.8,
    roughness: 0.3, metalness: 0.9
  });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(3.5, 1.5, 0);
  scene.add(arch);

  // Scanner beam (swept plane, starts at top)
  const beamGeo = new THREE.PlaneGeometry(2.6, 0.08);
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x2020ff, emissive: 0x2020ff, emissiveIntensity: 2.0,
    transparent: true, opacity: 0.0, side: THREE.DoubleSide
  });
  scannerBeam = new THREE.Mesh(beamGeo, beamMat);
  scannerBeam.rotation.y = Math.PI / 2;
  scannerBeam.position.set(3.5, 2.8, 0);
  scene.add(scannerBeam);

  // Glow point light on scanner
  scannerGlow = new THREE.PointLight(0x2020c0, 0.5, 6);
  scannerGlow.position.set(3.5, 1.5, 0);
  scene.add(scannerGlow);

  // Right wall (exit)
  const wallR = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 4, 3),
    new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.9 })
  );
  wallR.position.set(6.0, 1.5, 0);
  scene.add(wallR);
}

// ── GAME LOGIC ───────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomPkg() {
  return {
    color:    COLORS[Math.floor(Math.random() * COLORS.length)],
    size:     SIZES[Math.floor(Math.random() * SIZES.length)],
    material: MATS[Math.floor(Math.random() * MATS.length)],
  };
}

function pkgLabel(p) {
  return `${p.color.toUpperCase()} · ${p.size.toUpperCase()} · ${p.material.toUpperCase()}`;
}

function startGame() {
  playerHP = 3;
  currentLevel = 0;
  logEntries = [];
  logEl.innerHTML = '';

  // Shuffle rule pool (G4 — randomize per run)
  levelRules = shuffle([...RULE_POOL]).slice(0, 5);

  hideOverlay();
  startLevel();
}

function startLevel() {
  gameState = 'playing';
  contrabandPassed = 0;
  selectedCard = null;
  selectedIsProbe = false;
  invincibleTimer = 0;

  const rule = levelRules[currentLevel];
  levelNumEl.textContent = currentLevel + 1;

  // Generate probe items (5 per level, varied to be helpful for deduction)
  probeItems = [];
  for (let i = 0; i < 5; i++) {
    probeItems.push({ pkg: randomPkg(), used: false, id: 'p' + i });
  }

  // Generate 3 contraband items that DON'T trigger the rule
  // (so they can theoretically be slipped through)
  contrabandItems = [];
  let attempts = 0;
  while (contrabandItems.length < 3 && attempts < 200) {
    const pkg = randomPkg();
    if (!rule.test(pkg)) {
      contrabandItems.push({ pkg, used: false, id: 'c' + contrabandItems.length });
    }
    attempts++;
  }
  // Safety fallback
  while (contrabandItems.length < 3) {
    contrabandItems.push({ pkg: randomPkg(), used: false, id: 'c' + contrabandItems.length });
  }

  updateHUD();
  renderPackagePanel();
  sendBtn.disabled = true;
}

function renderPackagePanel() {
  probeListEl.innerHTML = '';
  probeItems.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `pkg-card probe-card${item.used ? ' used' : ''}`;
    if (!item.used && selectedCard === item.id && selectedIsProbe) card.classList.add('selected');
    card.innerHTML = buildCardHTML(item.pkg);
    if (!item.used) {
      card.addEventListener('click', () => selectCard(item.id, true));
    }
    probeListEl.appendChild(card);
  });

  contListEl.innerHTML = '';
  contrabandItems.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `pkg-card contraband-card${item.used ? ' used' : ''}`;
    if (!item.used && selectedCard === item.id && !selectedIsProbe) card.classList.add('selected');
    card.innerHTML = buildCardHTML(item.pkg);
    if (!item.used) {
      card.addEventListener('click', () => selectCard(item.id, false));
    }
    contListEl.appendChild(card);
  });
}

function buildCardHTML(p) {
  const colorStyle = `background: ${getColorCSS(p.color)}; color: #fff; padding: 1px 5px; border-radius: 2px; font-size: 10px; font-weight: bold; margin-right: 3px;`;
  return `
    <span style="${colorStyle}">${p.color.toUpperCase()}</span>
    <span style="border: 1px solid #444; padding: 1px 4px; font-size: 10px; margin-right: 3px; border-radius: 2px;">${p.size.toUpperCase()}</span>
    <span style="border: 1px solid #444; padding: 1px 4px; font-size: 10px; border-radius: 2px;">${p.material.toUpperCase()}</span>
  `;
}

function getColorCSS(c) {
  return { red: '#b03030', blue: '#3060b0', green: '#308050', yellow: '#9a8020' }[c] || '#555';
}

function selectCard(id, isProbe) {
  if (gameState !== 'playing') return;
  selectedCard = id;
  selectedIsProbe = isProbe;
  sendBtn.disabled = false;
  renderPackagePanel();

  // Show package on belt (3D preview)
  const item = isProbe
    ? probeItems.find(p => p.id === id)
    : contrabandItems.find(p => p.id === id);
  if (item) showPackageOnBelt(item.pkg, isProbe);
}

function showPackageOnBelt(pkg, isProbe) {
  if (packageOnBelt) {
    scene.remove(packageOnBelt);
    packageOnBelt = null;
  }
  const mesh = buildPackageMesh(pkg, isProbe);
  mesh.position.set(-4.5, 0.5, 0);
  scene.add(mesh);
  packageOnBelt = mesh;
}

function buildPackageMesh(pkg, isProbe) {
  const s = SIZE_SCALE[pkg.size];
  let geo;
  // Different geometry per material (T1 — all position via .set())
  if (pkg.material === 'metal') {
    geo = new THREE.BoxGeometry(s, s, s);
  } else if (pkg.material === 'wood') {
    geo = new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 1.1, 6);
  } else {
    // fabric = rounded box approximation
    geo = new THREE.SphereGeometry(s * 0.55, 8, 8);
  }

  const emissiveColor = isProbe ? 0x004400 : 0x440000;
  const mat = new THREE.MeshStandardMaterial({
    color: COLOR_HEX[pkg.color],
    emissive: emissiveColor,
    emissiveIntensity: 0.4,
    roughness: pkg.material === 'metal' ? 0.2 : 0.8,
    metalness: pkg.material === 'metal' ? 0.8 : 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Point light per package for glow
  const light = new THREE.PointLight(COLOR_HEX[pkg.color], 0.8, 3);
  light.position.set(0, 0.5, 0);
  mesh.add(light);

  return mesh;
}

function sendPackage() {
  if (!selectedCard || gameState !== 'playing') return;

  const isProbe = selectedIsProbe;
  const item = isProbe
    ? probeItems.find(p => p.id === selectedCard)
    : contrabandItems.find(p => p.id === selectedCard);

  if (!item || item.used) return;

  // Mark used immediately
  item.used = true;
  sendBtn.disabled = true;
  selectedCard = null;
  gameState = 'scanning';
  scanActive = true;
  scanProgress = 0;

  pendingPackage = { pkg: item.pkg, isProbe };

  // Animate beam color to active
  scannerBeam.material.opacity = 0.8;
  scannerBeam.material.color.setHex(0x2020ff);
  scannerBeam.material.emissive.setHex(0x2020ff);

  playSound('scan');
  renderPackagePanel();
}

function resolvePackage(pkg, isProbe) {
  const rule = levelRules[currentLevel];
  const flagged = rule.test(pkg);

  // Clear belt package
  if (packageOnBelt) {
    scene.remove(packageOnBelt);
    packageOnBelt = null;
  }
  scannerBeam.material.opacity = 0.0;
  scanActive = false;
  scanBar.style.width = '0%';

  if (flagged) {
    // FLAGGED
    showScanResult('FLAGGED', 'flag');
    playSound('flag');
    triggerShake();
    addLog(`FLAGGED: ${pkgLabel(pkg)} — ${isProbe ? 'probe' : 'CONTRABAND'}`, 'flag');

    if (!isProbe) {
      // Contraband flagged — HP cost (with invincibility check)
      if (invincibleTimer <= 0) {
        playerHP = Math.max(0, playerHP - 1);
        invincibleTimer = 1.5; // G9 — 1.5s iframes
        updateHUD();
        if (playerHP <= 0) {
          setTimeout(() => showGameOver(), 1200);
          return;
        }
      }
    }
  } else {
    // PASSED
    showScanResult('CLEARED', 'pass');
    playSound('pass');
    addLog(`CLEARED: ${pkgLabel(pkg)} — ${isProbe ? 'probe' : '✓ CONTRABAND THROUGH'}`, 'pass');

    if (!isProbe) {
      contrabandPassed++;
      if (contrabandPassed >= 3) {
        setTimeout(() => showLevelClear(), 1200);
        return;
      }
    }
  }

  // Return to playing after brief delay
  setTimeout(() => {
    if (gameState === 'scanning') gameState = 'playing';
    renderPackagePanel();
  }, 1200);
}

function showScanResult(text, type) {
  scanFlash.textContent = text;
  scanFlash.className = type;
  scanFlash.style.opacity = '1';
  setTimeout(() => { scanFlash.style.opacity = '0'; }, 900);
}

function showLevelClear() {
  gameState = 'level_clear';

  const rule = levelRules[currentLevel];
  const isLast = currentLevel >= 4;

  // Show rule reveal overlay
  overlay.innerHTML = `
    <h1 style="color: #40e040; font-size: 28px;">OPERATION ${isLast ? 'COMPLETE' : 'CLEARED'}</h1>
    <div class="rule-reveal">
      🔍 The AI was flagging:<br>
      <strong style="color: #c0c0ff; font-size: 16px;">${rule.label}</strong>
    </div>
    <div class="subtitle" style="color: #607060;">
      ${isLast ? 'All 5 operations complete. The system is compromised.' : `${currentLevel + 1} / 5 levels complete.`}
    </div>
    ${isLast
      ? `<button class="btn btn-primary" id="restart-btn">► RUN AGAIN</button>`
      : `<button class="btn btn-primary" id="next-btn">► NEXT OPERATION</button>`
    }
  `;
  overlay.style.display = 'flex';

  if (isLast) {
    playSound('win');
    document.getElementById('restart-btn').addEventListener('click', () => {
      hideOverlay();
      startGame();
    });
  } else {
    playSound('level_clear');
    document.getElementById('next-btn').addEventListener('click', () => {
      currentLevel++;
      hideOverlay();
      startLevel();
    });
  }
}

function showGameOver() {
  gameState = 'game_over';
  overlay.innerHTML = `
    <h1 style="color: #e04040;">COMPROMISED</h1>
    <div class="subtitle">The AI adapted faster than you could.<br>All contraband flagged. Operation failed.</div>
    <button class="btn btn-primary" id="retry-btn">► TRY AGAIN</button>
  `;
  overlay.style.display = 'flex';
  playSound('gameover');
  document.getElementById('retry-btn').addEventListener('click', () => {
    hideOverlay();
    startGame();
  });
}

function hideOverlay() {
  overlay.style.display = 'none';
}

function updateHUD() {
  levelNumEl.textContent = currentLevel + 1;
  ['hp1', 'hp2', 'hp3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('empty', i >= playerHP);
  });
}

function addLog(msg, type) {
  logEntries.push({ msg, type });
  if (logEntries.length > 8) logEntries.shift();
  logEl.innerHTML = logEntries.map(e =>
    `<div class="log-entry ${e.type}">${e.msg}</div>`
  ).join('');
}

// ── SHAKE / FLASH ────────────────────────────────────────────────────────────
function triggerShake() {
  container.classList.remove('shake');
  void container.offsetWidth;
  container.classList.add('shake');
  setTimeout(() => container.classList.remove('shake'), 400);
}

// ── AUDIO ────────────────────────────────────────────────────────────────────
function resumeAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  startMusic();
}

function startMusic() {
  // G6 — looping music via oscillator + setTimeout restart before end
  playMusicLoop();
}

let musicLoopTimer = null;
function playMusicLoop() {
  if (!audioCtx) return;

  const loopDuration = 8; // seconds

  // Bass drone
  const bassOsc = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  bassOsc.type = 'sine';
  bassOsc.frequency.value = 55;
  bassGain.gain.value = 0.12;
  bassOsc.connect(bassGain);
  bassGain.connect(audioCtx.destination);
  bassOsc.start();
  musicNodes.push(bassOsc, bassGain);

  // Sparse glitch notes at irregular intervals
  const glitchTimes = [0.8, 2.3, 3.7, 5.1, 6.6];
  const glitchNotes = [220, 165, 196, 247, 185];
  glitchTimes.forEach((t, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = glitchNotes[i % glitchNotes.length];
    gain.gain.setValueAtTime(0, audioCtx.currentTime + t);
    gain.gain.linearRampToValueAtTime(0.025, audioCtx.currentTime + t + 0.02);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + t + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + t);
    osc.stop(audioCtx.currentTime + t + 0.25);
  });

  // Restart before end (G6 — never silent)
  musicLoopTimer = setTimeout(() => {
    // Stop current drone nodes and restart
    bassOsc.stop();
    musicNodes = [];
    playMusicLoop();
  }, (loopDuration - 0.1) * 1000);
}

function playSound(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const mkOsc = (freq, type, dur, gain, start = now) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(start);
    o.stop(start + dur + 0.05);
  };

  if (type === 'scan') {
    // Rising sweep
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, now);
    o.frequency.linearRampToValueAtTime(800, now + 1.8);
    g.gain.setValueAtTime(0.06, now);
    g.gain.linearRampToValueAtTime(0.0, now + 1.8);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 1.9);
  }
  else if (type === 'pass') {
    // Satisfying 3-note chime
    [0, 0.12, 0.24].forEach((t, i) => {
      mkOsc([523, 659, 784][i], 'triangle', 0.35, 0.14, now + t);
    });
  }
  else if (type === 'flag') {
    // Alarm blare
    mkOsc(220, 'sawtooth', 0.15, 0.2);
    mkOsc(180, 'sawtooth', 0.15, 0.2, now + 0.18);
    mkOsc(220, 'sawtooth', 0.15, 0.2, now + 0.36);
  }
  else if (type === 'level_clear') {
    // 5-note ascending
    [0, 0.1, 0.2, 0.3, 0.45].forEach((t, i) => {
      mkOsc([392, 440, 523, 587, 659][i], 'triangle', 0.4, 0.12, now + t);
    });
  }
  else if (type === 'win') {
    // Victory fanfare
    [0, 0.1, 0.2, 0.35, 0.5, 0.7].forEach((t, i) => {
      mkOsc([392, 440, 523, 587, 659, 784][i], 'triangle', 0.5, 0.15, now + t);
    });
  }
  else if (type === 'gameover') {
    // Descending alarm
    [0, 0.18, 0.36, 0.54].forEach((t, i) => {
      mkOsc([440, 370, 311, 261][i], 'sawtooth', 0.25, 0.15, now + t);
    });
  }
}

// ── ANIMATE ───────────────────────────────────────────────────────────────────
function animate() {
  animId = requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Invincibility timer (G9)
  if (invincibleTimer > 0) {
    invincibleTimer -= dt;
    iframeInd.classList.add('active');
    if (invincibleTimer <= 0) iframeInd.classList.remove('active');
  }

  // Belt stripe scroll animation
  const beltSpeed = gameState === 'scanning' ? 0.8 : 0.2;
  beltSegments.forEach((seg, i) => {
    seg.position.x += beltSpeed * dt;
    if (seg.position.x > 4.5) seg.position.x -= 9.0;
  });

  // Package moves along belt during scanning
  if (scanActive && packageOnBelt) {
    scanProgress = Math.min(scanProgress + dt / scanDuration, 1.0);
    const startX = -4.5;
    const endX = 3.5;
    packageOnBelt.position.x = startX + (endX - startX) * scanProgress;
    packageOnBelt.rotation.y += dt * 0.8;

    // Scan bar progress
    scanBar.style.width = (scanProgress * 100) + '%';

    // Scanner beam sweep
    if (scanProgress > 0.4) {
      const beamT = (scanProgress - 0.4) / 0.6;
      scannerBeam.position.y = 2.8 - beamT * 2.6;
    }

    // Scanner glow pulses during scan
    scannerGlow.intensity = 0.5 + Math.sin(scanProgress * Math.PI * 4) * 0.4;
    scannerGlow.color.setHex(0x2020ff);

    if (scanProgress >= 1.0) {
      // Resolve — keep state as 'scanning' so resolvePackage timeout can reset to 'playing'
      const { pkg, isProbe } = pendingPackage;
      resolvePackage(pkg, isProbe);
    }
  }

  // Scanner idle pulse
  if (!scanActive && scannerGlow) {
    const t = clock.getElapsedTime();
    scannerGlow.intensity = 0.3 + Math.sin(t * 1.5) * 0.2;
    scannerGlow.color.setHex(0x2020c0);
    if (scannerMesh) {
      scannerMesh.rotation.y += dt * 0.05;
    }
  }

  // Camera lerp (G7) — lerps slightly toward scanner during scanning
  const targetCamX = (gameState === 'scanning' || gameState === 'resolve') ? 1.5 : 0;
  const targetCamZ = (gameState === 'scanning' || gameState === 'resolve') ? 10 : 12;
  camera.position.x += (targetCamX - camera.position.x) * 0.04;
  camera.position.z += (targetCamZ - camera.position.z) * 0.04;
  camera.lookAt(0, 1.0, 0);

  // Ambient particles drift
  ambientParticles.forEach(p => {
    p.rotation.y += dt * 0.02;
  });

  composer.render();
}

// ── RESIZE ────────────────────────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
init();
