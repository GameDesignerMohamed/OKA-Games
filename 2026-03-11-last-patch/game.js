import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── T2: ALL GAME-CRITICAL VARS AT MODULE SCOPE ───────────────────────────────
let scene, camera, renderer, composer, clock;
let animId = null;

// Game state
let gameState = 'idle'; // 'idle' | 'playing' | 'ended'
let serverCredits = 1000;
let shutdownTimer = 300; // 5 minutes in seconds
let creditDrainTimer = 0;
let creditDrainRate = 3; // drain 1 credit per 3 seconds

// Features
let featureNodes = [];
let hoveredNode = null;
let pendingDelete = null;

// Players
let playerOrbs = [];
const INITIAL_PLAYERS = 18;

// Audio
let audioCtx = null;
let bgmGain = null;
let bgmDistortion = null;
let bgmStarted = false;

// Three.js objects
let rackGroup = null;
let orbGroup = null;
let particles = [];

// DOM refs
const creditEl = document.getElementById('credit-val');
const timerEl = document.getElementById('timer-val');
const playersEl = document.getElementById('players-val');
const tooltipEl = document.getElementById('tooltip');
const confirmEl = document.getElementById('confirm-panel');
const cpNameEl = document.getElementById('cp-name');
const overlayEl = document.getElementById('overlay');
const logPanel = document.getElementById('log-panel');

// ─── FEATURE DEFINITIONS ──────────────────────────────────────────────────────
const FEATURES = [
  { name: 'Chat System',        credits: 120, affinity: 0.9, tier: 'final',  players: 0 },
  { name: 'Trading Post',       credits: 95,  affinity: 0.7, tier: 'mid',    players: 0 },
  { name: 'Guild Halls',        credits: 140, affinity: 0.85,tier: 'final',  players: 0 },
  { name: 'Daily Quests',       credits: 80,  affinity: 0.6, tier: 'mid',    players: 0 },
  { name: 'PvP Arena',          credits: 110, affinity: 0.65,tier: 'mid',    players: 0 },
  { name: 'Leaderboards',       credits: 60,  affinity: 0.45,tier: 'early',  players: 0 },
  { name: 'Custom Avatars',     credits: 75,  affinity: 0.5, tier: 'early',  players: 0 },
  { name: 'Core Engine',        credits: 200, affinity: 1.0, tier: 'final',  players: 0 },
];

// Player archetype weights (which features they care about most)
const PLAYER_ARCHETYPES = [
  { name: 'Social',  weights: [1.0, 0.3, 0.9, 0.4, 0.2, 0.6, 0.5, 0.7] },
  { name: 'Trader',  weights: [0.4, 1.0, 0.5, 0.7, 0.3, 0.8, 0.4, 0.6] },
  { name: 'Guild',   weights: [0.8, 0.5, 1.0, 0.6, 0.5, 0.4, 0.6, 0.7] },
  { name: 'Fighter', weights: [0.3, 0.4, 0.4, 0.5, 1.0, 0.7, 0.3, 0.6] },
  { name: 'Casual',  weights: [0.5, 0.4, 0.3, 0.9, 0.3, 0.5, 0.8, 0.5] },
];

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040408);
  scene.fog = new THREE.FogExp2(0x040408, 0.04);

  // Isometric-ish camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 14, 22);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.5, 0.15
  );
  composer.addPass(bloom);

  clock = new THREE.Clock();

  // Lighting — brighter so feature nodes are readable
  const ambient = new THREE.AmbientLight(0x334466, 2.5);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x6688cc, 3);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0x4466aa, 1.5);
  dirLight2.position.set(-5, 8, -3);
  scene.add(dirLight2);
  const pointLight = new THREE.PointLight(0x44aaff, 4, 40);
  pointLight.position.set(0, 8, 0);
  scene.add(pointLight);

  // Grid floor
  const grid = new THREE.GridHelper(40, 40, 0x111133, 0x0a0a1a);
  grid.position.y = -3;
  scene.add(grid);

  window.addEventListener('resize', onResize);
  document.getElementById('c').addEventListener('mousemove', onMouseMove);
  document.getElementById('c').addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
}

// ─── BUILD SERVER RACK ────────────────────────────────────────────────────────
function buildServerRack() {
  rackGroup = new THREE.Group();
  scene.add(rackGroup);

  const cols = 4, rows = 2;
  const nodeW = 3.2, nodeH = 1.4, nodeD = 1.2;
  const gapX = 0.4, gapY = 0.4;

  FEATURES.forEach((feat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * (nodeW + gapX);
    const y = (row - (rows - 1) / 2) * (nodeH + gapY);
    const z = 0;

    // Node body
    const geo = new THREE.BoxGeometry(nodeW, nodeH, nodeD);
    const tierColors = { early: 0x2a5040, mid: 0x2a4060, final: 0x503030 };
    const tierEmissive = { early: 0x1a4030, mid: 0x1a3050, final: 0x402020 };
    const mat = new THREE.MeshStandardMaterial({
      color: tierColors[feat.tier],
      emissive: tierEmissive[feat.tier],
      emissiveIntensity: 0.8,
      roughness: 0.5,
      metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    rackGroup.add(mesh);

    // LED strip (top edge)
    const ledGeo = new THREE.BoxGeometry(nodeW * 0.8, 0.08, 0.05);
    const ledColors = { early: 0x00ff88, mid: 0x0088ff, final: 0xff4444 };
    const ledMat = new THREE.MeshStandardMaterial({
      color: ledColors[feat.tier],
      emissive: ledColors[feat.tier],
      emissiveIntensity: 2.0,
    });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(x, y + nodeH / 2 + 0.05, z + nodeD / 2 + 0.01);
    rackGroup.add(led);

    // Label sprite — text on the node face
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(feat.name, 128, 32);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0.9 });
    const label = new THREE.Sprite(labelMat);
    label.position.set(x, y, z + nodeD / 2 + 0.15);
    label.scale.set(nodeW * 0.9, nodeH * 0.4, 1);
    rackGroup.add(label);

    feat.label = label;
    feat.mesh = mesh;
    feat.led = led;
    feat.baseColor = tierColors[feat.tier];
    feat.ledColor = ledColors[feat.tier];
    feat.deleted = false;
    feat.index = i;
    feat.originalPos = new THREE.Vector3(x, y, z);
  });

  // Rack frame
  const frameGeo = new THREE.BoxGeometry(cols * (nodeW + gapX) + 0.5, rows * (nodeH + gapY) + 0.5, nodeD + 0.4);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x111118,
    roughness: 0.9,
    metalness: 0.5,
    wireframe: false,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  scene.add(frame);

  // Rack outline
  const edgesGeo = new THREE.EdgesGeometry(frameGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0x223344 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  scene.add(edges);

  // Starfield / ambient particles
  const starGeo = new THREE.BufferGeometry();
  const starPositions = [];
  for (let s = 0; s < 600; s++) {
    starPositions.push(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 60 + 10,
      (Math.random() - 0.5) * 100 - 40
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x334455, size: 0.15, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));
}

// ─── BUILD PLAYER ORBS ────────────────────────────────────────────────────────
function buildPlayerOrbs() {
  orbGroup = new THREE.Group();
  orbGroup.position.set(0, -8, 0); // below the rack
  scene.add(orbGroup);

  // Platform for orbs
  const platformGeo = new THREE.CylinderGeometry(9, 9, 0.1, 32);
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.8 });
  const platform = new THREE.Mesh(platformGeo, platformMat);
  orbGroup.add(platform);

  // Outer ring
  const ringGeo = new THREE.TorusGeometry(9.2, 0.06, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x224455, emissive: 0x112233, emissiveIntensity: 1.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  orbGroup.add(ring);

  for (let i = 0; i < INITIAL_PLAYERS; i++) {
    spawnPlayerOrb(i);
  }
}

function spawnPlayerOrb(index) {
  const archetype = PLAYER_ARCHETYPES[index % PLAYER_ARCHETYPES.length];
  const hue = index / INITIAL_PLAYERS;
  const color = new THREE.Color().setHSL(hue, 0.8, 0.65);

  const geo = new THREE.SphereGeometry(0.35, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const orb = new THREE.Mesh(geo, mat);

  // Random position on the platform
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.5 + Math.random() * 6.5;
  orb.position.set(Math.cos(angle) * radius, 0.35 + Math.random() * 0.3, Math.sin(angle) * radius);

  const light = new THREE.PointLight(color, 0.8, 3);
  light.position.set(0, 0.5, 0);
  orb.add(light);

  orbGroup.add(orb);

  const player = {
    mesh: orb,
    light,
    archetype,
    loyalty: 0.8 + Math.random() * 0.2,
    baseColor: color.clone(),
    state: 'happy', // 'happy' | 'upset' | 'leaving' | 'gone'
    floatOffset: Math.random() * Math.PI * 2,
    floatSpeed: 0.4 + Math.random() * 0.3,
    orbitAngle: Math.atan2(orb.position.z, orb.position.x),
    orbitRadius: Math.sqrt(orb.position.x ** 2 + orb.position.z ** 2),
    lastReactTime: 0,
    fadeOut: 0,
    alive: true,
    index,
  };
  playerOrbs.push(player);
}

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function startBGM() {
  if (bgmStarted || !audioCtx) return;
  bgmStarted = true;

  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.08;

  // Distortion node for degradation effect
  bgmDistortion = audioCtx.createWaveShaper();
  bgmDistortion.curve = makeDistortionCurve(0);
  bgmDistortion.oversample = '4x';

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6;

  bgmGain.connect(bgmDistortion);
  bgmDistortion.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  scheduleBGMLoop(audioCtx.currentTime);
}

function makeDistortionCurve(amount) {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function updateBGMDistortion(playerRatio) {
  // As players leave, music degrades — distortion increases
  if (!bgmDistortion) return;
  const distAmount = (1 - playerRatio) * 180;
  bgmDistortion.curve = makeDistortionCurve(distAmount);
  if (bgmGain) bgmGain.gain.setTargetAtTime(0.04 + playerRatio * 0.06, audioCtx.currentTime, 0.5);
}

function scheduleBGMLoop(startTime) {
  // 64-second lo-fi ambient — warm sine pads, no harsh sawtooth static
  const loopLen = 64;

  // Warm pad drones — sine waves for clean tone
  playDrone(startTime, 65, loopLen, 0.06, 0.04, 'sine');      // low root
  playDrone(startTime, 98, loopLen, 0.04, 0.03, 'sine');      // fifth
  playDrone(startTime, 131, loopLen, 0.025, 0.02, 'triangle'); // octave

  // Slow evolving pad — slight detune for warmth/chorus
  playDrone(startTime, 196, loopLen, 0.02, 0.015, 'sine');
  playDrone(startTime, 198, loopLen, 0.015, 0.01, 'sine');

  // Sparse melodic notes — gentle plucks spread across 64s
  const melNotes = [
    [0, 330, 2.5],    // E4
    [8, 294, 2.0],    // D4
    [16, 262, 2.5],   // C4
    [24, 247, 2.0],   // B3
    [32, 330, 2.2],   // E4
    [40, 294, 1.8],   // D4
    [48, 262, 2.5],   // C4
    [56, 220, 3.0],   // A3
  ];
  melNotes.forEach(([offset, freq, dur]) => {
    playNote(startTime + offset, freq, dur, 0.035, 'sine');
    playNote(startTime + offset + 0.02, freq * 2, dur * 0.5, 0.012, 'sine');
  });

  // Soft ambient texture instead of harsh glitches
  const textureTimes = [5, 15, 28, 38, 50, 60];
  textureTimes.forEach(t => {
    playNote(startTime + t, 440, 0.5, 0.008, 'sine');
    playNote(startTime + t + 0.1, 660, 0.4, 0.005, 'triangle');
  });

  // Schedule next loop
  setTimeout(() => {
    if (gameState === 'playing') scheduleBGMLoop(audioCtx.currentTime);
  }, (loopLen - 2) * 1000);
}

function playDrone(startTime, freq, dur, attack, sustain, type = 'sine') {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(attack, startTime + 1.5);
  gain.gain.setValueAtTime(sustain, startTime + 2);
  gain.gain.setValueAtTime(sustain, startTime + dur - 1.5);
  gain.gain.linearRampToValueAtTime(0, startTime + dur);
  osc.connect(gain);
  if (bgmGain) gain.connect(bgmGain);
  else gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

function playNote(startTime, freq, dur, vol, type = 'sine') {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.1);
  gain.gain.setValueAtTime(vol * 0.7, startTime + 0.2); // sustain
  gain.gain.setValueAtTime(vol * 0.7, startTime + dur - 0.2);
  gain.gain.linearRampToValueAtTime(0, startTime + dur);
  osc.connect(gain);
  if (bgmGain) gain.connect(bgmGain);
  else gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

function playGlitch(startTime) {
  const bufferSize = audioCtx.sampleRate * 0.08;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.06, startTime);
  gain.gain.linearRampToValueAtTime(0, startTime + 0.08);
  source.connect(gain);
  if (bgmGain) gain.connect(bgmGain);
  else gain.connect(audioCtx.destination);
  source.start(startTime);
}

function playSFX(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);

  if (type === 'delete') {
    // Satisfying crunch — node deletion
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    const nd = noiseBuffer.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.3));
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(now);

    // Low thud
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    g.gain.setValueAtTime(0.5, now);
    g.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  if (type === 'player-leave') {
    // Mournful sting
    const freqs = [440, 330, 220];
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.05);
      g.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.4);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  }

  if (type === 'message-sent') {
    // Warm chime
    const freqs = [523, 659, 784];
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.05);
      g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.5);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.6);
    });
  }

  if (type === 'last-player-gone') {
    // Silence then single plucked note
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 220;
    g.gain.setValueAtTime(0, now + 0.8);
    g.gain.linearRampToValueAtTime(0.3, now + 0.9);
    g.gain.linearRampToValueAtTime(0, now + 2.5);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now + 0.8);
    osc.stop(now + 3);
  }

  if (type === 'win') {
    // Resolving arpeggio
    const notes = [261, 329, 392, 523];
    notes.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.2);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.2 + 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.2 + 0.3);
      g.gain.linearRampToValueAtTime(0, now + i * 0.2 + 1.5);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 1.8);
    });
  }

  if (type === 'node-hover') {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.04, now);
    g.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

// ─── PARTICLE BURST ───────────────────────────────────────────────────────────
function spawnDeleteBurst(position) {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 4, 4);
    const colors = [0x4488ff, 0xff4444, 0xffaa44, 0x44ff88];
    const mat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      emissive: colors[Math.floor(Math.random() * colors.length)],
      emissiveIntensity: 2.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.2 + 0.05,
      (Math.random() - 0.5) * 0.3
    );
    particles.push({ mesh, vel, life: 1.0, decay: 0.02 + Math.random() * 0.03 });
  }
}

// ─── RAYCASTING ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getHitNode(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = FEATURES.filter(f => !f.deleted && f.mesh).map(f => f.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    return FEATURES.find(f => f.mesh === hits[0].object);
  }
  return null;
}

function onMouseMove(event) {
  if (gameState !== 'playing') return;

  const node = getHitNode(event);

  if (node !== hoveredNode) {
    // Dehover old
    if (hoveredNode && !hoveredNode.deleted) {
      hoveredNode.mesh.material.emissiveIntensity = 0.4;
      hoveredNode.mesh.material.color.setHex(hoveredNode.baseColor);
    }
    hoveredNode = node;
    if (node) {
      node.mesh.material.emissiveIntensity = 1.2;
      node.mesh.material.color.setHex(0x446688);
      playSFX('node-hover');
    }
  }

  if (node) {
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (event.clientX + 16) + 'px';
    tooltipEl.style.top = (event.clientY - 60) + 'px';
    document.getElementById('tt-name').textContent = node.name;
    document.getElementById('tt-credits').textContent = node.credits;
    document.getElementById('tt-players').textContent = node.players;
    document.getElementById('tt-aff').textContent = node.affinity >= 0.8 ? 'CRITICAL' : node.affinity >= 0.6 ? 'high' : 'low';
  } else {
    tooltipEl.style.display = 'none';
  }

  renderer.domElement.style.cursor = node ? 'pointer' : 'default';
}

function onClick(event) {
  if (gameState !== 'playing') return;
  if (pendingDelete) return; // already confirming

  const node = getHitNode(event);
  if (!node) return;

  pendingDelete = node;
  cpNameEl.textContent = node.name;
  confirmEl.style.display = 'block';
  tooltipEl.style.display = 'none';
}

function onKeyDown(event) {
  if (gameState === 'playing' && pendingDelete) {
    if (event.key === 'y' || event.key === 'Y') {
      confirmDelete(pendingDelete);
      pendingDelete = null;
      confirmEl.style.display = 'none';
    } else if (event.key === 'n' || event.key === 'N' || event.key === 'Escape') {
      pendingDelete = null;
      confirmEl.style.display = 'none';
    }
  }

  if (gameState === 'playing' && !pendingDelete) {
    if (event.key === 'e' || event.key === 'E') {
      // Show message options (handled by buttons)
    }
  }
}

// ─── FEATURE DELETION ─────────────────────────────────────────────────────────
function confirmDelete(node) {
  if (node.deleted) return;
  node.deleted = true;

  // Grant credits
  serverCredits += node.credits;
  updateHUD();

  // Visual: shatter animation
  spawnDeleteBurst(node.mesh.position);
  node.mesh.visible = false;
  if (node.led) node.led.visible = false;
  if (node.label) node.label.visible = false;

  addLog(`Deleted: ${node.name} (+${node.credits} credits)`, 'blue');
  playSFX('delete');

  // Affect players — their loyalty drops based on affinity weight
  const tier = node.tier;
  const tierMultiplier = { early: 0.8, mid: 1.2, final: 2.0 };
  const impact = node.affinity * tierMultiplier[tier];

  let lostCount = 0;
  playerOrbs.forEach(p => {
    if (!p.alive) return;
    const weight = p.archetype.weights[node.index] || 0.5;
    const loyaltyDrop = impact * weight * (0.08 + Math.random() * 0.08);
    p.loyalty = Math.max(0, p.loyalty - loyaltyDrop);

    if (p.loyalty < 0.15 && p.state !== 'leaving') {
      p.state = 'leaving';
      p.fadeOut = 1.0;
    } else if (p.loyalty < 0.4 && p.state === 'happy') {
      p.state = 'upset';
      setOrbState(p, 'upset');
    }
  });

  // Count how many are now leaving
  const leaving = playerOrbs.filter(p => p.state === 'leaving' && p.alive).length;
  if (leaving > 0) {
    addLog(`${leaving} player(s) are leaving...`, 'red');
  }

  // Update feature player counts
  updateFeaturePlayerCounts();

  // Update node player count in FEATURES
  node.players = 0;
}

function setOrbState(p, state) {
  if (!p.alive) return;
  if (state === 'upset') {
    p.mesh.material.emissive.setHex(0xffaa00);
    p.mesh.material.emissiveIntensity = 1.8;
  } else if (state === 'happy') {
    p.mesh.material.emissive.copy(p.baseColor);
    p.mesh.material.emissiveIntensity = 1.2;
  }
}

function updateFeaturePlayerCounts() {
  const aliveCount = playerOrbs.filter(p => p.alive).length;
  FEATURES.forEach((f, fi) => {
    if (f.deleted) { f.players = 0; return; }
    let count = 0;
    playerOrbs.forEach(p => {
      if (!p.alive) return;
      if (p.archetype.weights[fi] > 0.5) count++;
    });
    f.players = count;
  });
}

// ─── PLAYER MESSAGES ──────────────────────────────────────────────────────────
const MESSAGES = [
  { text: "Hang tight", loyaltyBoost: 0.06, log: 'Dev: "Hang tight"' },
  { text: "Thank you", loyaltyBoost: 0.10, log: 'Dev: "Thank you for playing"' },
  { text: "I\'m sorry", loyaltyBoost: 0.08, log: 'Dev: "I\'m sorry..."' },
];

let msgCooldown = 0;

function sendMessage(idx) {
  if (gameState !== 'playing' || msgCooldown > 0) return;
  const msg = MESSAGES[idx];

  playerOrbs.forEach(p => {
    if (!p.alive) return;
    p.loyalty = Math.min(1, p.loyalty + msg.loyaltyBoost);
    if (p.loyalty > 0.35 && p.state === 'leaving') {
      p.state = 'upset';
      p.fadeOut = 0; // cancel fade
    }
    if (p.loyalty > 0.55 && p.state === 'upset') {
      p.state = 'happy';
      setOrbState(p, 'happy');
    }
    // Flash white briefly
    p.mesh.material.emissive.setHex(0xffffff);
    p.mesh.material.emissiveIntensity = 3;
    setTimeout(() => {
      if (p.alive) setOrbState(p, p.state === 'happy' ? 'happy' : 'upset');
    }, 400);
  });

  addLog(msg.log, 'green');
  playSFX('message-sent');

  // Disable buttons briefly
  msgCooldown = 15; // 15 seconds
  document.querySelectorAll('.msg-btn').forEach(b => b.disabled = true);
  setTimeout(() => {
    msgCooldown = 0;
    if (gameState === 'playing') {
      document.querySelectorAll('.msg-btn').forEach(b => b.disabled = false);
    }
  }, 15000);
}

// Expose to global for HTML onclick
window.sendMessage = sendMessage;

// ─── LOG ─────────────────────────────────────────────────────────────────────
function addLog(text, cls = '') {
  const entry = document.createElement('div');
  entry.className = 'log-entry' + (cls ? ' ' + cls : '');
  entry.textContent = text;
  logPanel.prepend(entry);
  // Keep max 12 entries
  while (logPanel.children.length > 12) logPanel.removeChild(logPanel.lastChild);
}

// ─── HUD UPDATE ───────────────────────────────────────────────────────────────
function updateHUD() {
  creditEl.textContent = Math.floor(serverCredits);
  const mins = Math.floor(shutdownTimer / 60);
  const secs = Math.floor(shutdownTimer % 60);
  timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  const alive = playerOrbs.filter(p => p.alive).length;
  playersEl.textContent = alive;

  // Color the timer based on urgency
  if (shutdownTimer < 60) {
    timerEl.style.color = '#f44';
  } else if (shutdownTimer < 120) {
    timerEl.style.color = '#fa4';
  } else {
    timerEl.style.color = '#fa4';
  }

  // Color credits
  if (serverCredits < 100) {
    creditEl.style.color = '#f44';
  } else if (serverCredits < 300) {
    creditEl.style.color = '#fa4';
  } else {
    creditEl.style.color = '#4af';
  }
}

// ─── GAME OVER ────────────────────────────────────────────────────────────────
function triggerLose() {
  // B2: set gameState BEFORE any async calls
  gameState = 'ended';

  cancelAnimationFrame(animId);
  playSFX('last-player-gone');

  overlayEl.className = 'lose';
  overlayEl.innerHTML = `
    <h1>CONNECTION LOST</h1>
    <div class="sub">The last player disconnected.</div>
    <div class="quote">"They stayed as long as they could."</div>
    <button id="start-btn" onclick="restartGame()">PLAY AGAIN</button>
  `;
  overlayEl.style.display = 'flex';
  window.restartGame = restartGame;
}

function triggerWin() {
  // B2: set gameState BEFORE any async calls
  gameState = 'ended';

  cancelAnimationFrame(animId);
  playSFX('win');

  const alive = playerOrbs.filter(p => p.alive).length;
  overlayEl.className = 'win';
  overlayEl.innerHTML = `
    <h1>SERVERS OFFLINE</h1>
    <div class="sub">Shutdown complete. ${alive} player${alive !== 1 ? 's' : ''} stayed until the end.</div>
    <div class="quote">"Some things are worth keeping alive, even if just a little longer."</div>
    <button id="start-btn" onclick="restartGame()">PLAY AGAIN</button>
  `;
  overlayEl.style.display = 'flex';
  window.restartGame = restartGame;
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function tick() {
  animId = requestAnimationFrame(tick);
  const dt = clock.getDelta();

  if (gameState !== 'playing') return;

  const now = performance.now() / 1000;

  // ── Credit drain ──
  creditDrainTimer += dt;
  if (creditDrainTimer >= creditDrainRate) {
    creditDrainTimer = 0;
    serverCredits = Math.max(0, serverCredits - 1);
  }

  // ── Shutdown timer ──
  shutdownTimer -= dt;
  if (shutdownTimer <= 0 && gameState === 'playing') {
    shutdownTimer = 0;
    updateHUD();
    triggerWin();
    return;
  }

  // ── Out of credits → drain players faster ──
  if (serverCredits <= 0) {
    // Force loyalty drop on all players
    playerOrbs.forEach(p => {
      if (!p.alive) return;
      p.loyalty = Math.max(0, p.loyalty - 0.003);
      if (p.loyalty < 0.1 && p.state !== 'leaving') {
        p.state = 'leaving';
        p.fadeOut = 1.0;
      }
    });
  }

  // ── Player orb animation + state management ──
  playerOrbs.forEach(p => {
    if (!p.alive) return;

    // Float animation
    p.mesh.position.y = 0.35 + Math.sin(now * p.floatSpeed + p.floatOffset) * 0.18;

    // Slow orbit
    p.orbitAngle += dt * 0.08 * (0.5 + Math.random() * 0.01);
    p.mesh.position.x = Math.cos(p.orbitAngle) * p.orbitRadius;
    p.mesh.position.z = Math.sin(p.orbitAngle) * p.orbitRadius;

    // Pulse based on loyalty
    const pulse = 0.9 + Math.sin(now * 3 + p.floatOffset) * 0.1 * p.loyalty;
    p.mesh.scale.setScalar(pulse);

    // Upset state: flicker
    if (p.state === 'upset') {
      const flicker = 0.8 + Math.sin(now * 8 + p.floatOffset) * 0.3;
      p.mesh.material.emissiveIntensity = flicker * 1.5;
      p.mesh.material.emissive.setHex(0xffaa00);
    }

    // Leaving state: fade out
    if (p.state === 'leaving') {
      p.fadeOut -= dt * 0.4;
      if (p.fadeOut <= 0) {
        // Player is gone
        p.alive = false;
        orbGroup.remove(p.mesh);
        addLog(`A player disconnected.`, 'red');
        playSFX('player-leave');

        // Check lose condition
        const aliveCount = playerOrbs.filter(pp => pp.alive).length;
        if (aliveCount <= 0 && gameState === 'playing') {
          triggerLose();
          return;
        }
      } else {
        p.mesh.material.opacity = p.fadeOut;
        p.mesh.material.transparent = true;
        p.mesh.material.emissive.setHex(0xff2222);
        p.mesh.material.emissiveIntensity = p.fadeOut * 2;
      }
    }
  });

  // ── BGM distortion based on player ratio ──
  const aliveRatio = playerOrbs.filter(p => p.alive).length / INITIAL_PLAYERS;
  updateBGMDistortion(aliveRatio);

  // ── Particle burst update ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= pt.decay;
    pt.mesh.position.x += pt.vel.x;
    pt.mesh.position.y += pt.vel.y;
    pt.mesh.position.z += pt.vel.z;
    pt.vel.y -= 0.004; // gravity
    pt.mesh.material.opacity = pt.life;
    pt.mesh.material.transparent = true;
    if (pt.life <= 0) {
      scene.remove(pt.mesh);
      particles.splice(i, 1);
    }
  }

  // ── Feature node LED pulse ──
  FEATURES.forEach(f => {
    if (f.deleted || !f.led) return;
    const pulse = 1.5 + Math.sin(now * 2 + f.index) * 0.5;
    f.led.material.emissiveIntensity = pulse;
  });

  // ── Feature node subtle idle animation ──
  FEATURES.forEach(f => {
    if (f.deleted || !f.mesh) return;
    f.mesh.rotation.y = Math.sin(now * 0.3 + f.index * 0.5) * 0.015;
  });

  updateHUD();
  composer.render();
}

// ─── START / RESTART ─────────────────────────────────────────────────────────
function startGame() {
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  startBGM();

  overlayEl.style.display = 'none';

  // Reset state
  serverCredits = 1000;
  shutdownTimer = 300;
  creditDrainTimer = 0;
  gameState = 'playing';
  pendingDelete = null;
  hoveredNode = null;
  particles = [];

  // Reset features
  FEATURES.forEach((f, i) => {
    f.deleted = false;
    f.players = 0;
    if (f.mesh) {
      f.mesh.visible = true;
      f.mesh.material.emissiveIntensity = 0.4;
      f.mesh.material.color.setHex(f.baseColor);
    }
    if (f.led) f.led.visible = true;
  });

  // Reset players
  playerOrbs.forEach(p => {
    orbGroup.remove(p.mesh);
  });
  playerOrbs = [];
  for (let i = 0; i < INITIAL_PLAYERS; i++) spawnPlayerOrb(i);

  updateFeaturePlayerCounts();
  updateHUD();

  addLog('Shift started. Keep them online.', 'blue');
  addLog('Servers running. Credits draining.', 'yellow');

  if (animId) cancelAnimationFrame(animId);
  clock.getDelta(); // reset delta
  tick();
}

window.startGame = startGame;

function restartGame() {
  // Clean scene
  if (rackGroup) {
    scene.remove(rackGroup);
    rackGroup = null;
  }
  if (orbGroup) {
    scene.remove(orbGroup);
    orbGroup = null;
  }
  particles.forEach(p => scene.remove(p.mesh));
  particles = [];

  // Rebuild
  FEATURES.forEach(f => { f.mesh = null; f.led = null; f.label = null; f.deleted = false; f.players = 0; });
  buildServerRack();
  buildPlayerOrbs();

  bgmStarted = false;
  logPanel.innerHTML = '';
  document.querySelectorAll('.msg-btn').forEach(b => b.disabled = false);
  msgCooldown = 0;

  startGame();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
initThree();
buildServerRack();
buildPlayerOrbs();
updateFeaturePlayerCounts();
updateHUD();

// Initial render
composer.render();

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
