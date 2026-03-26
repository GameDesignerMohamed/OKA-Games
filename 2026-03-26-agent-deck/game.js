import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ═══════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════
let AC = null;
function getAC() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}
function tone(freq, type, dur, vol, delay = 0) {
  try {
    const ctx = getAC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch (e) {}
}

const SFX = {
  deploy:   () => { tone(880,'sine',0.07,0.3); tone(1320,'sine',0.06,0.2,0.06); },
  overload: () => { [1600,1400,1200,1000,800].forEach((f,i) => tone(f,'sawtooth',0.07,0.28,i*0.04)); },
  reroute:  () => { tone(330,'triangle',0.1,0.22); tone(220,'triangle',0.1,0.2,0.09); },
  scan:     () => { [440,660,880,1100].forEach((f,i) => tone(f,'sine',0.06,0.2,i*0.04)); },
  patch:    () => { tone(660,'triangle',0.14,0.25); tone(880,'triangle',0.1,0.18,0.11); },
  damage:   () => { tone(110,'sawtooth',0.22,0.45); tone(80,'sawtooth',0.14,0.3,0.1); },
  select:   () => tone(660,'sine',0.05,0.15),
  waveclear:() => { [440,550,660,880].forEach((f,i) => tone(f,'triangle',0.22,0.3,i*0.09)); },
  win:      () => { [440,550,660,880,1100,1320].forEach((f,i) => tone(f,'triangle',0.22,0.3,i*0.07)); },
  over:     () => { [440,330,220,165,110].forEach((f,i) => tone(f,'sawtooth',0.26,0.4,i*0.13)); },
  link:     () => { [440,330,440,330].forEach((f,i) => tone(f,'sawtooth',0.05,0.2,i*0.08)); },
  reshuffle:() => { [330,440,330].forEach((f,i) => tone(f,'triangle',0.08,0.18,i*0.07)); },
};

const BGM = [110,138,165,174,220,174,165,138];
let bgmStep = 0, bgmTimer = null;
function startBGM() {
  if (bgmTimer) return;
  bgmTimer = setInterval(() => {
    const f = BGM[bgmStep % 8];
    tone(f,'triangle',0.38,0.07);
    tone(f*2,'triangle',0.28,0.04);
    bgmStep++;
  }, 420);
}
function stopBGM() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } }

// ═══════════════════════════════════════════════════
// THREE.JS SCENE
// ═══════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060812);
scene.fog = new THREE.FogExp2(0x060812, 0.038);

const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
cam.position.set(0, 13, 11);
cam.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('c').appendChild(renderer.domElement);

let composer = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.8);
  composer.addPass(bloom);
} catch (e) { composer = null; }

// Lights
scene.add(new THREE.AmbientLight(0x223355, 2.5));
const dirL = new THREE.DirectionalLight(0x4488ff, 1.5);
dirL.position.set(5, 10, 5); scene.add(dirL);
const coreLight = new THREE.PointLight(0x44ff88, 3, 15);
coreLight.position.set(0, 2, 0); scene.add(coreLight);

// Stars
const sgeo = new THREE.BufferGeometry();
const sp = [];
for (let i = 0; i < 400; i++) sp.push((Math.random()-0.5)*90, (Math.random()+0.3)*20, (Math.random()-0.5)*90);
sgeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0x3355aa, size: 0.13, transparent: true, opacity: 0.8 })));

// ═══════════════════════════════════════════════════
// GRID
// ═══════════════════════════════════════════════════
const GW = 5, GH = 5, CELL = 2.3;
function cellWorld(gx, gz) {
  return new THREE.Vector3((gx - GW/2 + 0.5)*CELL, 0, (gz - GH/2 + 0.5)*CELL);
}

const lmat = new THREE.LineBasicMaterial({ color: 0x1a2a44, transparent: true, opacity: 0.4 });
for (let x = 0; x <= GW; x++) {
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3((x-GW/2)*CELL, 0, (-GH/2)*CELL),
    new THREE.Vector3((x-GW/2)*CELL, 0, (GH/2)*CELL)
  ]), lmat));
}
for (let z = 0; z <= GH; z++) {
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3((-GW/2)*CELL, 0, (z-GH/2)*CELL),
    new THREE.Vector3((GW/2)*CELL, 0, (z-GH/2)*CELL)
  ]), lmat));
}

// Cell planes for raycasting + hover glow
const cellMeshes = [];
for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL*0.88, CELL*0.88),
    new THREE.MeshStandardMaterial({ color: 0x0a1428, transparent: true, opacity: 0.55, roughness: 0.9 })
  );
  m.rotation.x = -Math.PI/2;
  m.position.copy(cellWorld(x, z)).setY(0.01);
  m.userData = { gx: x, gz: z };
  scene.add(m);
  cellMeshes.push(m);
}

// Core node
const CORE_GX = 2, CORE_GZ = 4;
const corePos = cellWorld(CORE_GX, CORE_GZ);
const coreMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.55),
  new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1, roughness: 0.3 })
);
coreMesh.position.set(corePos.x, 0.85, corePos.z);
scene.add(coreMesh);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ═══════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════
let gameRunning = false;
let playerTurn = true;
let processing = false;
let coreHP = 10;
let wave = 1;
let energy = 3;
const MAX_ENERGY = 3;
let selectedCard = null;

let deck = [], discardPile = [], hand = [];
let threats = [];
let beams = [];
let particles = [];
let camShake = 0;
let coreShakeTime = 0;

// ─── CARD DEFINITIONS ─────────────────────────────
const CARDS = {
  DEPLOY:   { name: 'DEPLOY',   icon: '⚡', cost: 1, col: '#4488ff', desc: '1 dmg to threat' },
  OVERLOAD: { name: 'OVERLOAD', icon: '💥', cost: 2, col: '#ff6644', desc: '2 dmg + AoE splash' },
  REROUTE:  { name: 'REROUTE',  icon: '🔄', cost: 1, col: '#aa44ff', desc: 'Push threat 2 rows back' },
  SCAN:     { name: 'SCAN',     icon: '🔍', cost: 1, col: '#44ffaa', desc: 'Reveal & peek 3 cards' },
  PATCH:    { name: 'PATCH',    icon: '🔧', cost: 1, col: '#ffaa44', desc: 'Restore 1 Core HP' },
};

const BASE_DECK = [
  'DEPLOY','DEPLOY','DEPLOY','DEPLOY','DEPLOY',
  'OVERLOAD','OVERLOAD',
  'REROUTE','REROUTE','REROUTE',
  'SCAN','SCAN','SCAN',
  'PATCH','PATCH','PATCH'
];

// ─── DECK FUNCTIONS ───────────────────────────────
function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function initDeck() { deck = shuffle(BASE_DECK); discardPile = []; hand = []; }

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (!deck.length) {
      deck = shuffle(discardPile);
      discardPile = [];
      showStatus('DECK RESHUFFLED');
      SFX.reshuffle();
    }
    if (deck.length) hand.push(deck.shift());
  }
}

function discardHand() { discardPile.push(...hand); hand = []; }

// ─── THREAT MANAGEMENT ────────────────────────────
let nextLinkId = 0;

function spawnWaveThreats() {
  const count = 2 + wave + (wave >= 3 ? 1 : 0);
  const armoredChance = wave >= 3;
  const linkedChance = wave >= 4;
  for (let i = 0; i < count; i++) {
    const gz = Math.floor(Math.random() * 3); // rows 0-2
    const gx = Math.floor(Math.random() * GW);
    const armored = armoredChance && (i % 3 === 0);
    const linked = linkedChance && (i % 4 === 0);
    const linkId = linked ? nextLinkId++ : null;
    const hp = armored ? 2 : 1;
    spawnThreat(gx, gz, hp, armored, linkId);
  }
}

function spawnThreat(gx, gz, hp, armored, linkId) {
  const col = armored ? 0xff8822 : (linkId !== null ? 0xff44aa : 0xff3322);
  const geo = armored ? new THREE.DodecahedronGeometry(0.42) : new THREE.IcosahedronGeometry(0.38);
  const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  const wp = cellWorld(gx, gz);
  mesh.position.set(wp.x, 0.75, wp.z);
  scene.add(mesh);

  // HP bar background
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x220000, transparent: true, opacity: 0.7 })
  );
  barBg.rotation.x = -Math.PI/2;
  barBg.position.set(wp.x, 0.04, wp.z + 0.5);
  scene.add(barBg);

  // HP bar foreground
  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff3322, transparent: true, opacity: 0.9 })
  );
  barFg.rotation.x = -Math.PI/2;
  barFg.position.set(wp.x, 0.05, wp.z + 0.5);
  scene.add(barFg);

  // Link ring
  let linkMesh = null;
  if (linkId !== null) {
    linkMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xff44aa, emissive: 0xff44aa, emissiveIntensity: 0.5 })
    );
    linkMesh.rotation.x = Math.PI/2;
    linkMesh.position.set(wp.x, 0.75, wp.z);
    scene.add(linkMesh);
  }

  threats.push({ gx, gz, hp, maxHp: hp, armored, linkId, mesh, barBg, barFg, linkMesh, animT: 0 });
  updateThreatBar(threats[threats.length - 1]);
}

function updateThreatBar(t) {
  const r = Math.max(0, t.hp / t.maxHp);
  t.barFg.scale.x = r;
  const wx = cellWorld(t.gx, t.gz).x;
  t.barFg.position.x = wx - (1 - r) * 0.525;
}

function removeThreat(t) {
  scene.remove(t.mesh); t.mesh.geometry.dispose();
  scene.remove(t.barBg); t.barBg.geometry.dispose();
  scene.remove(t.barFg); t.barFg.geometry.dispose();
  if (t.linkMesh) { scene.remove(t.linkMesh); t.linkMesh.geometry.dispose(); }
}

function moveThreatToCore(t) {
  if (t.gz < CORE_GZ) {
    t.gz++;
    const wp = cellWorld(t.gx, t.gz);
    t.mesh.position.set(wp.x, 0.75, wp.z);
    t.barBg.position.set(wp.x, 0.04, wp.z + 0.5);
    t.barFg.position.set(wp.x, 0.05, wp.z + 0.5);
    if (t.linkMesh) t.linkMesh.position.set(wp.x, 0.75, wp.z);
    updateThreatBar(t);
    return false;
  } else {
    // Reached core — deal damage
    return true;
  }
}

// ─── PARTICLES ─────────────────────────────────────
function spawnParticles(pos, color, count = 14) {
  const geo = new THREE.BufferGeometry();
  const pArr = [], vArr = [];
  for (let i = 0; i < count; i++) {
    pArr.push(pos.x, pos.y + 0.4, pos.z);
    vArr.push((Math.random()-0.5)*0.22, Math.random()*0.18+0.06, (Math.random()-0.5)*0.22);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pArr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 1 }));
  scene.add(pts);
  particles.push({ pts, vArr, life: 1 });
}

// ─── BEAMS ─────────────────────────────────────────
function spawnBeam(from, to, color, dur = 0.35) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    from.clone().setY(1.3), to.clone().setY(0.75)
  ]);
  const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
  scene.add(ln);
  beams.push({ ln, life: dur });
}

// ─── FLOATING TEXT ─────────────────────────────────
function floatAt(screenX, screenY, text, color = '#ffffff') {
  const el = document.createElement('div');
  el.className = 'flt';
  el.textContent = text;
  el.style.left = screenX + 'px';
  el.style.top = screenY + 'px';
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function threatScreen(t) {
  const v = t.mesh.position.clone().project(cam);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
}

// ─── STATUS BANNER ─────────────────────────────────
let statusTO = null;
function showStatus(msg) {
  const el = document.getElementById('sbanner');
  el.textContent = msg; el.style.opacity = '1';
  if (statusTO) clearTimeout(statusTO);
  statusTO = setTimeout(() => { el.style.opacity = '0'; }, 1300);
}

function flash(id) {
  const el = document.getElementById(id);
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 350);
}

// ─── HUD UPDATE ────────────────────────────────────
function updateHUD() {
  document.getElementById('sv-hp').textContent = coreHP;
  document.getElementById('sv-wave').textContent = wave + '/7';
  document.getElementById('sv-threats').textContent = threats.length;
  document.getElementById('dinfo').textContent = 'DECK: ' + deck.length + ' | DISCARD: ' + discardPile.length;
  for (let i = 0; i < MAX_ENERGY; i++) {
    const p = document.getElementById('ep' + i);
    if (p) p.className = 'ep' + (i < energy ? ' on' : '');
  }
}

// ─── HAND RENDERING ────────────────────────────────
function renderHand() {
  const area = document.getElementById('hand');
  area.innerHTML = '';
  hand.forEach((key, idx) => {
    const def = CARDS[key];
    const div = document.createElement('div');
    div.className = 'card' + (idx === selectedCard ? ' sel' : '') + (def.cost > energy ? ' off' : '');
    div.innerHTML = `<div class="ccost">${def.cost}</div><div class="cicon">${def.icon}</div><div class="cname">${def.name}</div><div class="cdesc">${def.desc}</div>`;
    div.style.borderColor = def.cost > energy ? '#0d1220' : idx === selectedCard ? '#44ff88' : '#1c2b44';
    div.addEventListener('click', () => onCardClick(idx));
    area.appendChild(div);
  });
  updateHUD();
}

// ─── CARD LOGIC ────────────────────────────────────
function onCardClick(idx) {
  if (!playerTurn || processing) return;
  const key = hand[idx];
  const def = CARDS[key];
  if (def.cost > energy) return;

  // Instant-use cards
  if (key === 'PATCH') {
    useCard(idx, null);
    return;
  }
  if (key === 'SCAN') {
    useCard(idx, null);
    return;
  }

  // Needs target
  if (selectedCard === idx) {
    selectedCard = null;
    SFX.select();
  } else {
    selectedCard = idx;
    SFX.select();
  }
  renderHand();
}

function useCard(handIdx, targetThreat) {
  const key = hand[handIdx];
  const def = CARDS[key];
  if (def.cost > energy) return;

  energy -= def.cost;
  hand.splice(handIdx, 1);
  discardPile.push(key);
  if (selectedCard === handIdx) selectedCard = null;
  else if (selectedCard !== null && selectedCard > handIdx) selectedCard--;

  switch (key) {
    case 'DEPLOY':
      if (!targetThreat) { energy += def.cost; hand.splice(handIdx, 0, key); discardPile.pop(); return; }
      doAttack(targetThreat, 1, 0x4488ff);
      SFX.deploy();
      break;
    case 'OVERLOAD':
      if (!targetThreat) { energy += def.cost; hand.splice(handIdx, 0, key); discardPile.pop(); return; }
      doAOE(targetThreat, 2, 0xff6644);
      SFX.overload();
      break;
    case 'REROUTE':
      if (!targetThreat) { energy += def.cost; hand.splice(handIdx, 0, key); discardPile.pop(); return; }
      doReroute(targetThreat);
      SFX.reroute();
      break;
    case 'SCAN':
      doScan();
      SFX.scan();
      break;
    case 'PATCH':
      doPatch();
      SFX.patch();
      break;
  }

  renderHand();
  checkWaveClear();
}

function doAttack(t, dmg, color) {
  const fromPos = coreMesh.position.clone();
  const toPos = t.mesh.position.clone();
  spawnBeam(fromPos, toPos, color);
  t.hp -= dmg;
  spawnParticles(toPos, color, 10);
  const sp = threatScreen(t);
  floatAt(sp.x, sp.y - 30, '-' + dmg, '#ff4444');
  updateThreatBar(t);
  if (t.hp <= 0) killThreat(t);
}

function doAOE(t, dmg, color) {
  const fromPos = coreMesh.position.clone();
  const toPos = t.mesh.position.clone();
  spawnBeam(fromPos, toPos, color, 0.5);
  // Hit target
  t.hp -= dmg;
  spawnParticles(toPos, color, 14);
  const sp = threatScreen(t);
  floatAt(sp.x, sp.y - 30, '-' + dmg, '#ff8844');
  updateThreatBar(t);

  // AoE splash adjacent threats (1 dmg)
  const toRemove = [];
  threats.forEach(other => {
    if (other === t) return;
    const dx = Math.abs(other.gx - t.gx);
    const dz = Math.abs(other.gz - t.gz);
    if (dx <= 1 && dz <= 1) {
      spawnBeam(toPos, other.mesh.position.clone(), 0xff4422, 0.3);
      other.hp -= 1;
      spawnParticles(other.mesh.position, 0xff6644, 7);
      const osp = threatScreen(other);
      floatAt(osp.x, osp.y - 30, '-1', '#ff6644');
      updateThreatBar(other);
      if (other.hp <= 0) toRemove.push(other);
    }
  });
  if (t.hp <= 0) toRemove.push(t);
  toRemove.forEach(tr => killThreat(tr));
}

function doReroute(t) {
  const fromPos = coreMesh.position.clone();
  const toPos = t.mesh.position.clone();
  spawnBeam(fromPos, toPos, 0xaa44ff);
  // Push 2 rows back (toward row 0)
  const oldGz = t.gz;
  t.gz = Math.max(0, t.gz - 2);
  const wp = cellWorld(t.gx, t.gz);
  t.mesh.position.set(wp.x, 0.75, wp.z);
  t.barBg.position.set(wp.x, 0.04, wp.z + 0.5);
  t.barFg.position.set(wp.x, 0.05, wp.z + 0.5);
  if (t.linkMesh) t.linkMesh.position.set(wp.x, 0.75, wp.z);
  const sp = threatScreen(t);
  floatAt(sp.x, sp.y - 30, 'REROUTED', '#aa44ff');
}

function doScan() {
  const preview = deck.slice(0, 3).map(k => CARDS[k].icon).join(' ');
  showStatus('DECK: ' + (preview || 'EMPTY'));
  // Draw 1 bonus card
  drawCards(1);
  renderHand();
}

function doPatch() {
  if (coreHP < 10) {
    coreHP = Math.min(10, coreHP + 1);
    spawnParticles(coreMesh.position, 0x44ff88, 8);
    showStatus('CORE PATCHED +1 HP');
  } else {
    showStatus('CORE ALREADY AT MAX');
    // Refund
    energy += CARDS.PATCH.cost;
    hand.push('PATCH');
    discardPile.pop();
  }
  updateHUD();
}

function killThreat(t) {
  const idx = threats.indexOf(t);
  if (idx === -1) return;
  spawnParticles(t.mesh.position, 0xff3322, 16);
  // Check linked — if linked, respawn it if it has a partner still alive
  if (t.linkId !== null) {
    const hasLinkedPartner = threats.some((other, i) => i !== idx && other.linkId === t.linkId && other.hp > 0);
    if (hasLinkedPartner) {
      // Respawn at row 0
      const gx = t.gx; const gz = 0;
      removeThreat(t);
      threats.splice(idx, 1);
      spawnThreat(gx, gz, 1, false, t.linkId);
      SFX.link();
      showStatus('LINKED NODE RESPAWNED');
      return;
    }
  }
  removeThreat(t);
  threats.splice(idx, 1);
  updateHUD();
}

function checkWaveClear() {
  if (threats.length === 0) {
    setTimeout(() => nextWave(), 600);
  }
}

// ─── WAVE FLOW ─────────────────────────────────────
function nextWave() {
  if (wave >= 7) {
    endGame(true);
    return;
  }
  wave++;
  flash('wflash');
  SFX.waveclear();
  showStatus('WAVE ' + wave + ' INCOMING');
  discardHand();
  energy = MAX_ENERGY;
  drawCards(5);
  spawnWaveThreats();
  renderHand();
  // Camera pull-back animation
  camPullbackStart = performance.now();
}

let camPullbackStart = 0;

function startNewGame() {
  // Clear threats
  threats.forEach(t => removeThreat(t));
  threats = [];
  // Clear effects
  beams.forEach(b => scene.remove(b.ln));
  beams = [];
  particles.forEach(p => scene.remove(p.pts));
  particles = [];

  coreHP = 10;
  wave = 1;
  energy = MAX_ENERGY;
  selectedCard = null;
  playerTurn = true;
  processing = false;
  gameRunning = true;

  initDeck();
  drawCards(5);
  spawnWaveThreats();
  renderHand();
  showStatus('WAVE 1 — NEUTRALIZE ALL THREATS');
  startBGM();
}

function endGame(won) {
  stopBGM();
  gameRunning = false;
  if (won) {
    SFX.win();
    document.getElementById('winsc').style.display = 'flex';
  } else {
    SFX.over();
    document.getElementById('oversc').style.display = 'flex';
  }
}

// ─── END TURN ──────────────────────────────────────
async function endTurn() {
  if (!playerTurn || processing) return;
  playerTurn = false;
  processing = true;
  selectedCard = null;
  document.getElementById('endbtn').disabled = true;

  // Enemy turn: each threat advances one step
  const toRemove = [];
  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    const reachedCore = moveThreatToCore(t);
    if (reachedCore) {
      coreHP = Math.max(0, coreHP - 1);
      flash('dflash');
      SFX.damage();
      camShake = 0.4;
      spawnParticles(coreMesh.position.clone(), 0xff4444, 10);
      floatAt(innerWidth/2, innerHeight/2 - 60, '-1 CORE', '#ff4444');
      toRemove.push(t);
      if (coreHP <= 0) {
        // Remove remaining threats then game over
        toRemove.forEach(tr => {
          removeThreat(tr);
          threats.splice(threats.indexOf(tr), 1);
        });
        endGame(false);
        return;
      }
    }
    await new Promise(r => setTimeout(r, 80));
  }

  // Remove threats that hit core
  toRemove.forEach(t => {
    removeThreat(t);
    const idx = threats.indexOf(t);
    if (idx !== -1) threats.splice(idx, 1);
  });

  updateHUD();

  // Start player turn
  discardHand();
  energy = MAX_ENERGY;
  drawCards(5);
  playerTurn = true;
  processing = false;
  document.getElementById('endbtn').disabled = false;
  renderHand();
  showStatus('YOUR TURN');
}

// ═══════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════
renderer.domElement.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  // Hover highlight
  if (selectedCard !== null && gameRunning && playerTurn) {
    raycaster.setFromCamera(mouse, cam);
    const hits = raycaster.intersectObjects(cellMeshes);
    cellMeshes.forEach(m => (m.material.color.set(0x0a1428)));
    if (hits.length) {
      const { gx, gz } = hits[0].object.userData;
      const hasThreat = threats.some(t => t.gx === gx && t.gz === gz);
      if (hasThreat) hits[0].object.material.color.set(0x1a3a60);
    }
  }
});

renderer.domElement.addEventListener('click', e => {
  if (!gameRunning || !playerTurn || processing) return;
  if (selectedCard === null) return;

  // Resume AudioContext on click
  if (AC && AC.state === 'suspended') AC.resume();

  raycaster.setFromCamera(mouse, cam);
  const hits = raycaster.intersectObjects(cellMeshes);
  if (!hits.length) return;

  const { gx, gz } = hits[0].object.userData;
  const target = threats.find(t => t.gx === gx && t.gz === gz);
  if (!target) return;

  const cardIdx = selectedCard;
  selectedCard = null;
  useCard(cardIdx, target);
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); endTurn(); }
});

document.getElementById('endbtn').addEventListener('click', () => endTurn());

// Buttons
document.getElementById('startbtn').addEventListener('click', () => {
  if (AC && AC.state === 'suspended') AC.resume();
  else { try { getAC(); } catch(err){} }
  document.getElementById('sc').style.display = 'none';
  startNewGame();
});
document.getElementById('winbtn').addEventListener('click', () => {
  document.getElementById('winsc').style.display = 'none';
  startNewGame();
});
document.getElementById('overbtn').addEventListener('click', () => {
  document.getElementById('oversc').style.display = 'none';
  startNewGame();
});

// ═══════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════
const clock = new THREE.Clock();
let camBaseY = 13, camBaseZ = 11;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // Rotate core
  if (coreMesh) {
    coreMesh.rotation.y += dt * 1.2;
    coreMesh.rotation.x += dt * 0.5;
    coreLight.intensity = 2.5 + Math.sin(t * 2.5) * 0.7;
  }

  // Animate threats
  threats.forEach(th => {
    th.mesh.rotation.y += dt * (th.armored ? 0.8 : 1.5);
    th.mesh.rotation.x += dt * 0.6;
    th.mesh.position.y = 0.75 + Math.sin(t * 3 + th.gx) * 0.08;
    if (th.linkMesh) th.linkMesh.rotation.z += dt * 2;
    // Pulse emissive
    th.mesh.material.emissiveIntensity = 0.5 + Math.sin(t * 4 + th.gz) * 0.25;
  });

  // Camera shake
  if (camShake > 0) {
    cam.position.x = (Math.random() - 0.5) * camShake * 0.4;
    cam.position.y = camBaseY + (Math.random() - 0.5) * camShake * 0.3;
    camShake = Math.max(0, camShake - dt * 3);
    if (camShake <= 0) { cam.position.x = 0; cam.position.y = camBaseY; }
  }

  // Camera pull-back on wave clear
  if (camPullbackStart > 0) {
    const elapsed = (performance.now() - camPullbackStart) / 1000;
    if (elapsed < 0.8) {
      const pull = Math.sin(elapsed * Math.PI / 0.8) * 2;
      cam.position.z = camBaseZ + pull;
    } else {
      cam.position.z = camBaseZ;
      camPullbackStart = 0;
    }
  }

  // Beams
  for (let i = beams.length - 1; i >= 0; i--) {
    beams[i].life -= dt;
    beams[i].ln.material.opacity = beams[i].life / 0.35;
    beams[i].ln.material.transparent = true;
    if (beams[i].life <= 0) {
      scene.remove(beams[i].ln);
      beams.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 1.8;
    const pos = p.pts.geometry.attributes.position;
    const arr = pos.array;
    for (let j = 0; j < arr.length / 3; j++) {
      arr[j*3]   += p.vArr[j*3]   * dt * 60;
      arr[j*3+1] += p.vArr[j*3+1] * dt * 60;
      arr[j*3+2] += p.vArr[j*3+2] * dt * 60;
      p.vArr[j*3+1] -= 0.003; // gravity
    }
    pos.needsUpdate = true;
    p.pts.material.opacity = p.life;
    if (p.life <= 0) {
      scene.remove(p.pts);
      particles.splice(i, 1);
    }
  }

  // Cell hover glow pulse
  cellMeshes.forEach(m => {
    if (m.material.color.r > 0.05) {
      m.material.emissiveIntensity = 0.1 + Math.sin(t * 4) * 0.05;
    }
  });

  if (composer) composer.render();
  else renderer.render(scene, cam);
}

// Resize
window.addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) {
    composer.setSize(innerWidth, innerHeight);
  }
});

animate();
