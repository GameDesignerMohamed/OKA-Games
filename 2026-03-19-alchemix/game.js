import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// ELEMENT DATA
// ============================================================

const ELEMENT_COLORS = {
  Fire: 0xff4500, Water: 0x1e90ff, Earth: 0x8b4513, Air: 0xe8e8ff,
  Steam: 0x9de8e8, Lava: 0xff2200, Mud: 0x6b4226, Smoke: 0x888888,
  Mist: 0xc0e8ff, Dust: 0xd4b483, Ash: 0xaaaaaa, Ice: 0x80d8ff,
  Cloud: 0xffffff, Obsidian: 0x4d1a8a, Brick: 0xb85c38, Fog: 0xc8c8d8,
  Clay: 0xe07040, Swamp: 0x4a6741, Storm: 0x4466aa, Charcoal: 0x555555,
  Glass: 0xa0e8e8, Ceramic: 0xe8c070, Crystal: 0xd0a0ff, Rainbow: 0xff88ff,
  Peat: 0x5d4037, Thunder: 0xffdd44, Lightning: 0xffff00, Prism: 0xff80ff,
  Diamond: 0xe8f8ff, Silicon: 0xc0c0a0, Hurricane: 0x8888cc, Coal: 0x333344,
  Energy: 0xffee00, Vessel: 0xd4a060, Golem: 0x808060, Oil: 0x3a2000,
  Petroleum: 0x332211, Algae: 0x44aa44, Oxygen: 0xccffff, Wall: 0xbbbbbb,
  Rune: 0x8844ff, Earthquake: 0x885533, Typhoon: 0x4466cc, Radiance: 0xffffaa,
  Circuit: 0x00ff88, Aurora: 0x44ffcc, Vapor: 0xddddff, Spirit: 0xffccff,
  Automaton: 0xaaaacc, Glyph: 0xaa88ff, Glacier: 0x99ddff, Phoenix: 0xff6600,
  Singularity: 0x8800ff, 'Rune of Power': 0xee00ff, Permafrost: 0xbbddff,
  'Celestial Light': 0xffffd0, Blizzard: 0xaaccff, Consciousness: 0xff88ff,
  Alchemy: 0xffd700, Light: 0xffffee, Life: 0x88ff44, Sun: 0xffcc00,
  Time: 0xcc88ff, Sea: 0x0066aa, Pressure: 0xcc8844, Sand: 0xddcc88,
  Stone: 0x999999, Magic: 0xee44ff, Soul: 0xffddff
};

const ELEMENT_TIERS = {
  Fire: 1, Water: 1, Earth: 1, Air: 1,
  Steam: 2, Lava: 2, Mud: 2, Smoke: 2, Mist: 2, Dust: 2, Ash: 2, Ice: 2,
  Light: 2, Life: 2, Sun: 2, Sea: 2, Sand: 2, Stone: 2,
  Cloud: 3, Obsidian: 3, Brick: 3, Fog: 3, Clay: 3, Swamp: 3, Storm: 3,
  Charcoal: 3, Glass: 3, Ceramic: 3, Crystal: 3, Rainbow: 3, Peat: 3,
  Thunder: 3, Lightning: 3, Time: 3, Pressure: 3,
  Prism: 4, Diamond: 4, Silicon: 4, Hurricane: 4, Coal: 4, Energy: 4,
  Vessel: 4, Golem: 4, Oil: 4, Petroleum: 4, Algae: 4, Oxygen: 4,
  Wall: 4, Rune: 4, Earthquake: 4, Typhoon: 4, Radiance: 4, Circuit: 4,
  Aurora: 4, Vapor: 4, Spirit: 4, Automaton: 4, Glyph: 4, Glacier: 4,
  Magic: 4, Soul: 4,
  Phoenix: 5, Singularity: 5, 'Rune of Power': 5, Permafrost: 5,
  'Celestial Light': 5, Blizzard: 5, Consciousness: 5, Alchemy: 5
};

// Recipes — symmetric lookup
const RECIPES_RAW = [
  ['Fire', 'Water', 'Steam'],
  ['Fire', 'Earth', 'Lava'],
  ['Water', 'Earth', 'Mud'],
  ['Air', 'Fire', 'Smoke'],
  ['Air', 'Water', 'Mist'],
  ['Air', 'Earth', 'Dust'],
  ['Ash', 'Water', 'Charcoal'],
  ['Water', 'Air', 'Mist'],
  ['Fire', 'Ice', 'Water'],
  ['Water', 'Water', 'Ice'],
  ['Steam', 'Air', 'Cloud'],
  ['Lava', 'Water', 'Obsidian'],
  ['Mud', 'Fire', 'Brick'],
  ['Smoke', 'Water', 'Fog'],
  ['Dust', 'Water', 'Clay'],
  ['Mist', 'Earth', 'Swamp'],
  ['Cloud', 'Air', 'Storm'],
  ['Fire', 'Air', 'Ash'],
  ['Brick', 'Fire', 'Glass'],
  ['Clay', 'Fire', 'Ceramic'],
  ['Obsidian', 'Air', 'Crystal'],
  ['Fog', 'Fire', 'Rainbow'],
  ['Swamp', 'Fire', 'Peat'],
  ['Storm', 'Earth', 'Thunder'],
  ['Cloud', 'Fire', 'Lightning'],
  // Abstract element unlocks
  ['Fire', 'Steam', 'Light'],
  ['Earth', 'Water', 'Life'],
  ['Fire', 'Cloud', 'Sun'],
  ['Crystal', 'Ice', 'Time'],
  ['Water', 'Mist', 'Sea'],
  ['Thunder', 'Stone', 'Pressure'],
  ['Dust', 'Earth', 'Sand'],
  ['Earth', 'Crystal', 'Stone'],
  // Tier 4
  ['Glass', 'Fire', 'Prism'],
  ['Crystal', 'Light', 'Diamond'],
  ['Lightning', 'Sand', 'Silicon'],
  ['Storm', 'Lightning', 'Hurricane'],
  ['Charcoal', 'Pressure', 'Coal'],
  ['Coal', 'Fire', 'Energy'],
  ['Ceramic', 'Life', 'Vessel'],
  ['Clay', 'Life', 'Golem'],
  ['Peat', 'Time', 'Oil'],
  ['Oil', 'Fire', 'Petroleum'],
  ['Swamp', 'Life', 'Algae'],
  ['Algae', 'Sun', 'Oxygen'],
  ['Brick', 'Stone', 'Wall'],
  ['Wall', 'Magic', 'Rune'],
  ['Thunder', 'Earth', 'Earthquake'],
  ['Hurricane', 'Sea', 'Typhoon'],
  ['Diamond', 'Fire', 'Radiance'],
  ['Silicon', 'Energy', 'Circuit'],
  ['Prism', 'Storm', 'Aurora'],
  ['Oil', 'Air', 'Vapor'],
  ['Vessel', 'Soul', 'Spirit'],
  ['Golem', 'Fire', 'Automaton'],
  ['Rune', 'Stone', 'Glyph'],
  ['Aurora', 'Ice', 'Glacier'],
  ['Rune', 'Spirit', 'Magic'],
  ['Spirit', 'Vessel', 'Soul'],
  // Tier 5
  ['Spirit', 'Fire', 'Phoenix'],
  ['Automaton', 'Circuit', 'Singularity'],
  ['Glyph', 'Thunder', 'Rune of Power'],
  ['Glacier', 'Time', 'Permafrost'],
  ['Radiance', 'Aurora', 'Celestial Light'],
  ['Typhoon', 'Permafrost', 'Blizzard'],
  ['Singularity', 'Spirit', 'Consciousness'],
  ['Phoenix', 'Blizzard', 'Alchemy']
];

// Build bidirectional recipe map
const RECIPES = {};
for (const [a, b, result] of RECIPES_RAW) {
  const key1 = a + '+' + b;
  const key2 = b + '+' + a;
  RECIPES[key1] = result;
  RECIPES[key2] = result;
}

function combineElements(a, b) {
  return RECIPES[a + '+' + b] || RECIPES[b + '+' + a] || null;
}

// ============================================================
// STATE
// ============================================================

let discovered = new Set(['Fire', 'Water', 'Earth', 'Air']);
let selectedA = null;
let selectedB = null;
let toastTimer = 0;
let gameStarted = false;

// Load from localStorage
try {
  const saved = localStorage.getItem('alchemix_discovered');
  if (saved) {
    const arr = JSON.parse(saved);
    arr.forEach(e => discovered.add(e));
  }
} catch(e) {}

function saveProgress() {
  try {
    localStorage.setItem('alchemix_discovered', JSON.stringify([...discovered]));
  } catch(e) {}
}

// ============================================================
// THREE.JS SCENE
// ============================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0f05);
scene.fog = new THREE.FogExp2(0x1a0f05, 0.008);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting — warm candle atmosphere
const ambientLight = new THREE.AmbientLight(0xffe8c0, 2.2);
scene.add(ambientLight);

const candleA = new THREE.PointLight(0xff9030, 2.5, 12);
candleA.position.set(-4, 3, -1);
scene.add(candleA);

const candleB = new THREE.PointLight(0xff8020, 2.0, 12);
candleB.position.set(4, 3, -1);
scene.add(candleB);

const candleC = new THREE.PointLight(0xffaa40, 1.5, 10);
candleC.position.set(0, 4, 3);
scene.add(candleC);

const dirLight = new THREE.DirectionalLight(0xffe0a0, 1.5);
dirLight.position.set(2, 8, 4);
scene.add(dirLight);

// Post-processing
let composer, useComposer = false;
try {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4, 0.4, 0.85
  );
  composer.addPass(bloomPass);
  useComposer = true;
} catch(e) {
  useComposer = false;
}

// ============================================================
// TABLE + CAULDRON
// ============================================================

// Wooden table surface
const tableGeo = new THREE.BoxGeometry(14, 0.4, 9);
const tableMat = new THREE.MeshStandardMaterial({
  color: 0x5c3010,
  roughness: 0.9,
  metalness: 0.0
});
const table = new THREE.Mesh(tableGeo, tableMat);
table.position.set(0, -0.2, 0);
scene.add(table);

// Table edge detail
const edgeGeo = new THREE.BoxGeometry(14.2, 0.15, 9.2);
const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3a1e06, roughness: 0.95 });
const tableEdge = new THREE.Mesh(edgeGeo, edgeMat);
tableEdge.position.set(0, -0.28, 0);
scene.add(tableEdge);

// Cauldron
const cauldronGeo = new THREE.CylinderGeometry(1.0, 0.6, 1.2, 16);
const cauldronMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.4,
  metalness: 0.8,
  emissive: 0x110500,
  emissiveIntensity: 0.3
});
const cauldron = new THREE.Mesh(cauldronGeo, cauldronMat);
cauldron.position.set(0, 0.6, -1);
scene.add(cauldron);

const rimGeo = new THREE.TorusGeometry(1.05, 0.08, 8, 24);
const rimMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.9 });
const cauldronRim = new THREE.Mesh(rimGeo, rimMat);
cauldronRim.rotation.x = Math.PI / 2;
cauldronRim.position.set(0, 1.22, -1);
scene.add(cauldronRim);

// Cauldron glow light
const cauldronLight = new THREE.PointLight(0x60ff80, 0, 6);
cauldronLight.position.set(0, 2, -1);
scene.add(cauldronLight);

// Cauldron liquid
const liquidGeo = new THREE.CircleGeometry(0.85, 16);
const liquidMat = new THREE.MeshStandardMaterial({
  color: 0x204020,
  roughness: 0.1,
  metalness: 0.2,
  emissive: 0x103010,
  emissiveIntensity: 1.0
});
const liquid = new THREE.Mesh(liquidGeo, liquidMat);
liquid.rotation.x = -Math.PI / 2;
liquid.position.set(0, 1.21, -1);
scene.add(liquid);

// Cauldron legs
for (let i = 0; i < 3; i++) {
  const angle = (i / 3) * Math.PI * 2;
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.3 });
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.set(Math.cos(angle) * 0.7, 0.25, -1 + Math.sin(angle) * 0.7);
  scene.add(leg);
}

// ============================================================
// ELEMENT ORB SYSTEM
// ============================================================

// Orbs floating on table (the "active" elements displayed in 3D)
const orbMeshes = []; // {mesh, name, baseY, phase}
const orbPositions = [
  [-4, 0, 1.5], [-2.5, 0, 1.5], [-1, 0, 1.5], [0.5, 0, 1.5],
  [2, 0, 1.5],  [3.5, 0, 1.5], [-3.5, 0, 3], [-1.5, 0, 3],
];

function getElementGeometry(name) {
  const tier = ELEMENT_TIERS[name] || 1;
  if (tier === 1) return new THREE.IcosahedronGeometry(0.35, 0);
  if (tier === 2) return new THREE.OctahedronGeometry(0.35, 0);
  if (tier === 3) return new THREE.TetrahedronGeometry(0.42, 0);
  if (tier === 4) return new THREE.DodecahedronGeometry(0.38, 0);
  return new THREE.IcosahedronGeometry(0.42, 1); // tier 5
}

function createOrbMesh(name) {
  const color = ELEMENT_COLORS[name] || 0xffffff;
  const geo = getElementGeometry(name);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.3,
    transparent: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.elementName = name;
  return mesh;
}

// Display starting 4 elements on table
const STARTING = ['Fire', 'Water', 'Earth', 'Air'];
STARTING.forEach((name, i) => {
  const mesh = createOrbMesh(name);
  const pos = orbPositions[i];
  mesh.position.set(pos[0], pos[1] + 0.4, pos[2]);
  mesh.userData.baseY = pos[1] + 0.4;
  mesh.userData.phase = Math.random() * Math.PI * 2;
  scene.add(mesh);
  orbMeshes.push({ mesh, name, baseY: pos[1] + 0.4, phase: mesh.userData.phase });
});

// ============================================================
// PARTICLES
// ============================================================

const particleSystems = []; // { points, velocities, ages, maxAge, color }

function spawnDiscoveryParticles(position, color, tier) {
  const count = tier >= 5 ? 80 : tier >= 4 ? 50 : 25;
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 4
    ));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: color,
    size: tier >= 5 ? 0.18 : 0.12,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const maxAge = tier >= 5 ? 2.5 : 1.5;
  particleSystems.push({ points, velocities, ages: 0, maxAge, count, posAttr: geo.attributes.position });
}

function updateParticles(dt) {
  for (let i = particleSystems.length - 1; i >= 0; i--) {
    const ps = particleSystems[i];
    ps.ages += dt;

    const t = ps.ages / ps.maxAge;
    ps.points.material.opacity = Math.max(0, 1 - t);

    for (let j = 0; j < ps.count; j++) {
      const vel = ps.velocities[j];
      ps.posAttr.array[j * 3] += vel.x * dt;
      ps.posAttr.array[j * 3 + 1] += vel.y * dt;
      ps.posAttr.array[j * 3 + 2] += vel.z * dt;
      vel.y -= 4 * dt; // gravity
    }
    ps.posAttr.needsUpdate = true;

    if (ps.ages >= ps.maxAge) {
      scene.remove(ps.points);
      particleSystems.splice(i, 1);
    }
  }
}

// ============================================================
// CAULDRON BUBBLE PARTICLES
// ============================================================

let cauldronBubbles = null;
let bubblePositions = null;

function initCauldronBubbles() {
  const count = 20;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.7;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = 1.2 + Math.random() * 0.3;
    positions[i * 3 + 2] = -1 + Math.sin(angle) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x80ff80,
    size: 0.06,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  cauldronBubbles = new THREE.Points(geo, mat);
  scene.add(cauldronBubbles);
  bubblePositions = positions;
}

initCauldronBubbles();

let bubbleSpeeds = Array.from({length: 20}, () => 0.3 + Math.random() * 0.4);
let bubblePhases = Array.from({length: 20}, () => Math.random() * Math.PI * 2);

function updateCauldronBubbles(t) {
  for (let i = 0; i < 20; i++) {
    const angle = bubblePhases[i] + t * bubbleSpeeds[i];
    const r = 0.2 + 0.5 * Math.abs(Math.sin(bubblePhases[i] * 2));
    bubblePositions[i * 3] = Math.cos(angle) * r;
    bubblePositions[i * 3 + 1] = 1.22 + ((t * bubbleSpeeds[i] * 0.5 + bubblePhases[i]) % 0.8) * 0.5;
    bubblePositions[i * 3 + 2] = -1 + Math.sin(angle) * r;
    if (bubblePositions[i * 3 + 1] > 2.0) {
      bubblePositions[i * 3 + 1] = 1.22;
    }
  }
  cauldronBubbles.geometry.attributes.position.needsUpdate = true;
}

// ============================================================
// AUDIO (Web Audio API)
// ============================================================

let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startBGM();
}

function playTone(freq, duration, type = 'sine', gainVal = 0.3, delay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const startTime = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function sfxHover() {
  if (!audioCtx) return;
  playTone(880, 0.08, 'sine', 0.06);
}

function sfxSelect() {
  if (!audioCtx) return;
  playTone(660, 0.12, 'sine', 0.15);
}

function sfxAlreadyKnown() {
  if (!audioCtx) return;
  playTone(440, 0.1, 'triangle', 0.1);
  playTone(330, 0.15, 'triangle', 0.08, 0.08);
}

function sfxNoRecipe() {
  if (!audioCtx) return;
  playTone(220, 0.2, 'triangle', 0.1);
}

function sfxDiscovery(tier) {
  if (!audioCtx) return;
  const notes = {
    1: [523, 659],
    2: [523, 659, 784],
    3: [523, 659, 784, 1047],
    4: [523, 659, 784, 1047, 1319],
    5: [523, 659, 784, 1047, 1319, 1568, 2093]
  };
  const tones = notes[tier] || notes[1];
  tones.forEach((freq, i) => {
    playTone(freq, 0.4 + i * 0.1, 'sine', 0.2, i * 0.08);
  });
}

function sfxCombine() {
  if (!audioCtx) return;
  // Bubbling / wooden clunk
  playTone(150, 0.3, 'triangle', 0.2);
  playTone(200, 0.2, 'triangle', 0.15, 0.1);
  playTone(300, 0.1, 'triangle', 0.1, 0.2);
}

function sfxWin() {
  if (!audioCtx) return;
  const scale = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
  scale.forEach((freq, i) => {
    playTone(freq, 0.6, 'sine', 0.25, i * 0.1);
  });
}

// BGM — gentle marimba-like arpeggio
let bgmRunning = false;
function startBGM() {
  if (bgmRunning || !audioCtx) return;
  bgmRunning = true;

  // Simple harmonic drone
  const drone = audioCtx.createOscillator();
  const droneGain = audioCtx.createGain();
  drone.connect(droneGain);
  droneGain.connect(audioCtx.destination);
  drone.type = 'sine';
  drone.frequency.value = 65;
  droneGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 2);
  drone.start();

  // Arpeggio pattern
  const bgmNotes = [261, 329, 392, 523, 392, 329, 261, 196];
  let noteIdx = 0;
  const BPM = 75;
  const beatMs = (60 / BPM) * 1000;

  function scheduleBeat() {
    if (!bgmRunning) return;
    const freq = bgmNotes[noteIdx % bgmNotes.length];
    noteIdx++;
    playTone(freq, 0.3, 'sine', 0.04);
    setTimeout(scheduleBeat, beatMs);
  }
  setTimeout(scheduleBeat, 500);
}

// ============================================================
// INTERACTION — Selection system
// ============================================================

let selectedElements = []; // max 2 names
let highlightedButtons = new Set();

function getElementColor(name) {
  return ELEMENT_COLORS[name] || 0xffffff;
}

function hexToCSS(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgb(${r},${g},${b})`;
}

function selectElement(name) {
  initAudio();
  sfxSelect();

  if (selectedElements.includes(name)) {
    // Deselect
    selectedElements = selectedElements.filter(e => e !== name);
  } else if (selectedElements.length < 2) {
    selectedElements.push(name);
  } else {
    // Replace second
    selectedElements[1] = name;
  }

  updateComboDisplay();
  updatePickerHighlights();

  if (selectedElements.length === 2) {
    // Attempt combination
    setTimeout(attemptCombination, 300);
  }
}

function updateComboDisplay() {
  const slotA = document.getElementById('slot-a');
  const slotB = document.getElementById('slot-b');
  const slotResult = document.getElementById('slot-result');

  if (selectedElements.length === 0) {
    slotA.textContent = '—'; slotA.className = 'combo-slot';
    slotB.textContent = '—'; slotB.className = 'combo-slot';
    slotResult.textContent = '?'; slotResult.className = 'combo-result';
  } else if (selectedElements.length === 1) {
    const color = hexToCSS(getElementColor(selectedElements[0]));
    slotA.innerHTML = `<span style="color:${color}">●</span> ${selectedElements[0]}`;
    slotA.className = 'combo-slot filled';
    slotB.textContent = '—'; slotB.className = 'combo-slot';
    slotResult.textContent = '?'; slotResult.className = 'combo-result';
  } else {
    const colorA = hexToCSS(getElementColor(selectedElements[0]));
    const colorB = hexToCSS(getElementColor(selectedElements[1]));
    slotA.innerHTML = `<span style="color:${colorA}">●</span> ${selectedElements[0]}`;
    slotA.className = 'combo-slot filled';
    slotB.innerHTML = `<span style="color:${colorB}">●</span> ${selectedElements[1]}`;
    slotB.className = 'combo-slot filled';
    const result = combineElements(selectedElements[0], selectedElements[1]);
    if (result) {
      const rc = hexToCSS(getElementColor(result));
      if (discovered.has(result)) {
        slotResult.innerHTML = `<span style="color:${rc}">●</span> ${result}`;
        slotResult.className = 'combo-result known';
      } else {
        slotResult.innerHTML = `<span style="color:${rc}">●</span> ${result}`;
        slotResult.className = 'combo-result found';
      }
    } else {
      slotResult.textContent = '✗ No recipe';
      slotResult.className = 'combo-result';
    }
  }
}

function updatePickerHighlights() {
  document.querySelectorAll('.picker-btn').forEach(btn => {
    if (selectedElements.includes(btn.dataset.name)) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
}

function attemptCombination() {
  if (selectedElements.length < 2) return;
  const [a, b] = selectedElements;
  const result = combineElements(a, b);

  sfxCombine();

  // Flash cauldron
  cauldronLight.intensity = 3;
  setTimeout(() => { cauldronLight.intensity = 0; }, 500);

  // Animate liquid
  liquidMat.emissive.set(0x40a040);
  setTimeout(() => { liquidMat.emissive.set(0x103010); }, 600);

  if (!result) {
    sfxNoRecipe();
    showToast('No Reaction', '(Try a different combination)', '', false);
  } else if (discovered.has(result)) {
    sfxAlreadyKnown();
    showToast('Already Known', result, `Tier ${ELEMENT_TIERS[result] || '?'}`, false);
  } else {
    // NEW DISCOVERY!
    discovered.add(result);
    saveProgress();
    const tier = ELEMENT_TIERS[result] || 1;
    sfxDiscovery(tier);

    // Spawn particles at cauldron
    const cauldronPos = new THREE.Vector3(0, 1.5, -1);
    spawnDiscoveryParticles(cauldronPos, ELEMENT_COLORS[result] || 0xffffff, tier);

    // Add orb to table
    addOrbToTable(result);

    showToast('New Element Discovered!', result, `Tier ${tier} — ${getTierName(tier)}`, true);
    updateProgressText();
    refreshCodex();
    refreshPicker();

    // Check win
    if (discovered.has('Alchemy')) {
      setTimeout(() => {
        sfxWin();
        document.getElementById('win-overlay').classList.add('visible');
      }, 2000);
    }
  }

  selectedElements = [];
  updateComboDisplay();
  updatePickerHighlights();
}

function getTierName(tier) {
  const names = {1: 'Primal', 2: 'Natural', 3: 'Compound', 4: 'Advanced', 5: 'Mythic'};
  return names[tier] || 'Unknown';
}

// ============================================================
// TABLE ORBS MANAGEMENT
// ============================================================

const MAX_ORBS_ON_TABLE = 8;

function addOrbToTable(name) {
  // Remove oldest if at max
  if (orbMeshes.length >= MAX_ORBS_ON_TABLE) {
    const oldest = orbMeshes.shift();
    scene.remove(oldest.mesh);
  }

  const idx = orbMeshes.length;
  const pos = orbPositions[idx % orbPositions.length];

  const mesh = createOrbMesh(name);
  mesh.position.set(pos[0], pos[1] + 0.4, pos[2]);
  mesh.userData.baseY = pos[1] + 0.4;
  mesh.userData.phase = Math.random() * Math.PI * 2;
  // Entrance animation
  mesh.scale.set(0.1, 0.1, 0.1);
  scene.add(mesh);
  orbMeshes.push({ mesh, name, baseY: pos[1] + 0.4, phase: mesh.userData.phase });

  // Scale up animation handled in update loop via entrance flag
  mesh.userData.entering = true;
  mesh.userData.enterProgress = 0;
}

// ============================================================
// UI REFRESH
// ============================================================

function updateProgressText() {
  const total = Object.keys(ELEMENT_TIERS).length;
  document.getElementById('progress-text').textContent = `${discovered.size} / ${total} elements discovered`;
}

function refreshCodex() {
  const list = document.getElementById('codex-list');
  list.innerHTML = '';
  const sorted = [...discovered].sort((a, b) => {
    const ta = ELEMENT_TIERS[a] || 1;
    const tb = ELEMENT_TIERS[b] || 1;
    if (ta !== tb) return ta - tb;
    return a.localeCompare(b);
  });
  sorted.forEach(name => {
    const color = ELEMENT_COLORS[name] || 0xffffff;
    const div = document.createElement('div');
    div.className = 'codex-entry';
    div.innerHTML = `
      <span class="codex-dot" style="background:${hexToCSS(color)};color:${hexToCSS(color)}"></span>
      <span class="codex-name">${name}</span>
      <span class="codex-tier">T${ELEMENT_TIERS[name] || 1}</span>
    `;
    list.appendChild(div);
  });
}

function refreshPicker() {
  const grid = document.getElementById('picker-grid');
  grid.innerHTML = '';
  const sorted = [...discovered].sort((a, b) => {
    const ta = ELEMENT_TIERS[a] || 1;
    const tb = ELEMENT_TIERS[b] || 1;
    if (ta !== tb) return ta - tb;
    return a.localeCompare(b);
  });
  sorted.forEach(name => {
    const color = ELEMENT_COLORS[name] || 0xffffff;
    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.dataset.name = name;
    btn.innerHTML = `<span class="picker-dot" style="background:${hexToCSS(color)}"></span>${name}`;
    btn.addEventListener('click', () => selectElement(name));
    if (selectedElements.includes(name)) btn.classList.add('selected');
    grid.appendChild(btn);
  });
}

// ============================================================
// DISCOVERY TOAST
// ============================================================

let toastTimeoutId = null;

function showToast(label, name, tier, isNew) {
  const toast = document.getElementById('discovery-toast');
  document.getElementById('toast-label').textContent = label;
  document.getElementById('toast-name').textContent = name;
  document.getElementById('toast-tier').textContent = tier;
  toast.style.borderColor = isNew ? 'rgba(255,200,80,0.6)' : 'rgba(150,120,60,0.4)';
  toast.classList.add('visible');
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => toast.classList.remove('visible'), 2200);
}

// ============================================================
// RAYCASTER — Mouse hover on 3D orbs
// ============================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh = null;

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(e) {
  if (!gameStarted) return;
  raycaster.setFromCamera(mouse, camera);
  const meshes = orbMeshes.map(o => o.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length > 0) {
    const name = intersects[0].object.userData.elementName;
    if (name) selectElement(name);
  }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// ============================================================
// CLOCK + ANIMATION LOOP
// ============================================================

const clock = new THREE.Clock();
let t = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (!gameStarted) {
    // Gentle scene preview
    scene.rotation.y = Math.sin(t * 0.1) * 0.05;
    useComposer ? composer.render() : renderer.render(scene, camera);
    return;
  }
  scene.rotation.y = 0;

  // Candle flicker
  const flicker = 0.9 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.7) * 0.04;
  candleA.intensity = 2.5 * flicker;
  candleB.intensity = 2.0 * (0.9 + Math.sin(t * 8.1) * 0.07);

  // Cauldron liquid pulse
  const bubbleIntensity = 0.5 + Math.sin(t * 2) * 0.3;
  liquidMat.emissiveIntensity = bubbleIntensity;
  updateCauldronBubbles(t);

  // Hover detection
  raycaster.setFromCamera(mouse, camera);
  const meshes = orbMeshes.map(o => o.mesh);
  const hits = raycaster.intersectObjects(meshes);

  let newHovered = hits.length > 0 ? hits[0].object : null;
  if (newHovered !== hoveredMesh) {
    if (hoveredMesh) {
      hoveredMesh.material.emissiveIntensity = selectedElements.includes(hoveredMesh.userData.elementName) ? 0.8 : 0.4;
      hoveredMesh.scale.set(1, 1, 1);
    }
    if (newHovered) {
      sfxHover();
      newHovered.material.emissiveIntensity = 1.2;
    }
    hoveredMesh = newHovered;
  }

  // Animate orbs
  orbMeshes.forEach((orbData, i) => {
    const { mesh, baseY, phase } = orbData;
    mesh.position.y = baseY + Math.sin(t * 1.5 + phase) * 0.12;
    mesh.rotation.y += dt * (0.5 + (i % 3) * 0.2);
    mesh.rotation.x += dt * 0.15;

    // Selected highlight
    if (selectedElements.includes(mesh.userData.elementName)) {
      mesh.material.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;
      mesh.scale.setScalar(1.2 + Math.sin(t * 3) * 0.05);
    } else if (mesh !== hoveredMesh) {
      mesh.material.emissiveIntensity = 0.4;
      mesh.scale.setScalar(1.0);
    }

    // Entrance animation
    if (mesh.userData.entering) {
      mesh.userData.enterProgress = Math.min(1, (mesh.userData.enterProgress || 0) + dt * 3);
      const s = mesh.userData.enterProgress;
      mesh.scale.setScalar(s);
      if (s >= 1) {
        mesh.userData.entering = false;
        mesh.scale.setScalar(1);
      }
    }
  });

  updateParticles(dt);

  useComposer ? composer.render() : renderer.render(scene, camera);
}

// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (useComposer) composer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// START GAME
// ============================================================

function startGame() {
  initAudio();
  gameStarted = true;
  document.getElementById('start-overlay').style.display = 'none';
  updateProgressText();
  refreshCodex();
  refreshPicker();
}

document.getElementById('start-btn').addEventListener('click', startGame);

// Also init UI for saved progress
updateProgressText();
refreshCodex();
refreshPicker();

// Start render loop
animate();