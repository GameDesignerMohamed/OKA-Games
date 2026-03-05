import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ═══════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════
let audioCtx = null;
let masterGain = null;
const musicLayers = [];
let audioUnlocked = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
  audioUnlocked = true;
  document.getElementById('ahint').style.opacity = '0';
  startMusic();
}

function startMusic() {
  // 4 layers, unlock at 0/2/5/8 settled
  const configs = [
    { freq: [130.81, 164.81, 196, 261.63], type: 'sine',     vol: 0.12, tempo: 2.0 },
    { freq: [261.63, 329.63, 392, 523.25], type: 'triangle', vol: 0.0,  tempo: 1.5 },
    { freq: [523.25, 659.25, 784, 1046.5], type: 'sine',     vol: 0.0,  tempo: 0.8 },
    { freq: [196,    246.94, 293.66, 392], type: 'sine',     vol: 0.0,  tempo: 1.2 },
  ];
  configs.forEach((cfg, i) => {
    const g = audioCtx.createGain();
    g.gain.value = cfg.vol;
    g.connect(masterGain);
    const osc = audioCtx.createOscillator();
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq[0];
    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfo.frequency.value = 0.25 + i * 0.05;
    lfoG.gain.value = 3;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    osc.connect(g); osc.start(); lfo.start();
    let noteIdx = 0;
    function tick() {
      osc.frequency.setTargetAtTime(cfg.freq[noteIdx % cfg.freq.length], audioCtx.currentTime, 0.12);
      noteIdx++;
      setTimeout(tick, cfg.tempo * 1000);
    }
    tick();
    musicLayers.push({ gain: g, active: i === 0 });
  });
}

function unlockMusicLayer(count) {
  if (!audioCtx) return;
  const thresh = [0, 2, 5, 8];
  thresh.forEach((t, i) => {
    if (musicLayers[i] && count >= t && !musicLayers[i].active) {
      musicLayers[i].gain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 1.8);
      musicLayers[i].active = true;
    }
  });
}

function sfx(type) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const play = (freq, waveType, vol, dur, bend) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = waveType; o.frequency.value = freq;
    if (bend) o.frequency.setTargetAtTime(bend, t, dur * 0.3);
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.15);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + dur);
  };
  if (type === 'place') {
    play(440, 'sine', 0.25, 0.12, 880);
  } else if (type === 'erase') {
    play(220, 'sawtooth', 0.1, 0.08, 110);
  } else if (type === 'arrive') {
    [523.25, 659.25, 784].forEach((f, i) => {
      setTimeout(() => play(f, 'triangle', 0.18, 0.22, null), i * 70);
    });
  } else if (type === 'settle') {
    [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => play(f, 'sine', 0.22, 0.35, null), i * 80);
    });
  } else if (type === 'leave') {
    play(330, 'sine', 0.14, 0.45, 165);
  } else if (type === 'win') {
    [523.25,587.33,659.25,698.46,784,880,987.77,1046.5].forEach((f, i) => {
      setTimeout(() => play(f, 'triangle', 0.28, 0.6, null), i * 100);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// THREE.JS
// ═══════════════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060318);
scene.fog = new THREE.FogExp2(0x060318, 0.03);

const W = window.innerWidth, H = window.innerHeight;
const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
camera.position.set(0, 15, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.4, 0.55);
composer.addPass(bloom);

// Lights
scene.add(new THREE.AmbientLight(0x2244aa, 1.0));
const sun = new THREE.DirectionalLight(0xffeecc, 2.2);
sun.position.set(6, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
scene.add(sun);
const fillLight = new THREE.DirectionalLight(0x5566ff, 0.6);
fillLight.position.set(-8, 4, -8);
scene.add(fillLight);

// ─── CONSTANTS ───────────────────────────────────────────────────
const GRID_SIZE = 8;
const CELL = 1.5;

// ─── GRID STATE ──────────────────────────────────────────────────
const grid = [];
const meshes = { tile: [], food: [], shelter: [], flag: [] };
for (let r = 0; r < GRID_SIZE; r++) {
  grid.push([]);
  meshes.tile.push([]);
  meshes.food.push([]);
  meshes.shelter.push([]);
  meshes.flag.push([]);
  for (let c = 0; c < GRID_SIZE; c++) {
    grid[r].push({ terrain: null, food: null, shelter: null });
    meshes.tile[r].push(null);
    meshes.food[r].push(null);
    meshes.shelter[r].push(null);
    meshes.flag[r].push(null);
  }
}

// ─── COORD HELPERS ───────────────────────────────────────────────
function gx(c) { return (c - GRID_SIZE / 2 + 0.5) * CELL; }
function gz(r) { return (r - GRID_SIZE / 2 + 0.5) * CELL; }

// ─── ISLAND BASE ─────────────────────────────────────────────────
const islandMat = new THREE.MeshStandardMaterial({ color: 0x5d3a1a, roughness: 0.9 });
const island = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 5.5, 0.9, 24), islandMat);
island.position.y = -0.95; island.receiveShadow = true; scene.add(island);
const dirt = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 3.8, 0.5, 24),
  new THREE.MeshStandardMaterial({ color: 0x3d2008, roughness: 1 }));
dirt.position.y = -1.6; scene.add(dirt);
const surf = new THREE.Mesh(new THREE.PlaneGeometry(GRID_SIZE * CELL + 0.4, GRID_SIZE * CELL + 0.4),
  new THREE.MeshStandardMaterial({ color: 0x2d4a1e, roughness: 0.85 }));
surf.rotation.x = -Math.PI / 2; surf.position.y = -0.48; surf.receiveShadow = true; scene.add(surf);

// Grid lines
for (let i = 0; i <= GRID_SIZE; i++) {
  const x = gx(i) - CELL/2;
  const z0 = gz(0) - CELL/2;
  const z1 = gz(GRID_SIZE-1) + CELL/2;
  const lm = new THREE.LineBasicMaterial({ color: 0x3a6a2a, transparent: true, opacity: 0.25 });
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 0.01, z0), new THREE.Vector3(x, 0.01, z1)]), lm));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(z0, 0.01, x), new THREE.Vector3(z1, 0.01, x)]), lm));
}

// Stars
const starGeo = new THREE.BufferGeometry();
const sp = new Float32Array(400 * 3);
for (let i = 0; i < 400; i++) {
  const t = Math.random() * Math.PI * 2, p = Math.acos(2*Math.random()-1), r = 80 + Math.random()*30;
  sp[i*3] = r*Math.sin(p)*Math.cos(t); sp[i*3+1] = Math.abs(r*Math.cos(p)); sp[i*3+2] = r*Math.sin(p)*Math.sin(t);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.85 })));

// Clouds
const clouds = [];
for (let i = 0; i < 6; i++) {
  const cm = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 + Math.random(), 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.12, roughness: 1 })
  );
  cm.position.set((Math.random()-.5)*35, 7 + Math.random()*5, (Math.random()-.5)*35);
  scene.add(cm);
  clouds.push({ mesh: cm, speed: 0.25 + Math.random()*0.2, phase: Math.random()*Math.PI*2 });
}

// ─── EMOJI SPRITE FACTORY ────────────────────────────────────────
function makeSprite(text, size) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = `${Math.floor(size * 200)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.renderOrder = 2;
  return mesh;
}

// ─── TERRAIN MATS ────────────────────────────────────────────────
const TERRAIN_MAT = {
  grass:  new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, emissive: 0x1a5e1c, emissiveIntensity: 0.05 }),
  water:  new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.88, emissive: 0x0d47a1, emissiveIntensity: 0.18 }),
  forest: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9, emissive: 0x1b5e20, emissiveIntensity: 0.08 }),
  stone:  new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 1.0 }),
};

const FOOD_EMOJIS = { berry: '🍓', mushroom: '🍄', fish: '🐟' };
const SHELTER_EMOJIS = { burrow: '🕳️', nest: '🪺', den: '🏠' };
const TERRAIN_EMOJIS = { grass: '🌿', water: '💧', forest: '🌲', stone: '🪨' };

// ─── TILE PLACEMENT ───────────────────────────────────────────────
const TERRAIN_TYPES = ['grass','water','forest','stone'];
const FOOD_TYPES = ['berry','mushroom','fish'];
const SHELTER_TYPES = ['burrow','nest','den'];

function removeTileObjs(r, c) {
  ['tile','food','shelter','flag'].forEach(k => {
    if (meshes[k][r][c]) {
      // Remove extras (trees, water shimmer, etc.)
      if (meshes[k][r][c].userData.extras) {
        meshes[k][r][c].userData.extras.forEach(e => scene.remove(e));
      }
      scene.remove(meshes[k][r][c]);
      meshes[k][r][c] = null;
    }
  });
}

function placeTileAt(r, c, type) {
  const x = gx(c), z = gz(r);

  if (type === 'erase') {
    removeTileObjs(r, c);
    grid[r][c] = { terrain: null, food: null, shelter: null };
    sfx('erase');
    return;
  }

  if (TERRAIN_TYPES.includes(type)) {
    // Remove old tile and food/shelter on it
    removeTileObjs(r, c);
    grid[r][c] = { terrain: type, food: null, shelter: null };

    const geo = new THREE.BoxGeometry(CELL - 0.1, 0.22, CELL - 0.1);
    const mesh = new THREE.Mesh(geo, TERRAIN_MAT[type]);
    mesh.position.set(x, 0.11, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    meshes.tile[r][c] = mesh;

    // Add tree for forest
    if (type === 'forest') {
      for (let t = 0; t < 2; t++) {
        const tx = x + (t===0 ? -0.25 : 0.22), tz = z + (t===0 ? 0.15 : -0.2);
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x5d4037 })
        );
        trunk.position.set(tx, 0.42, tz); scene.add(trunk);
        const top = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 0.55, 7),
          new THREE.MeshStandardMaterial({ color: 0x33691e, emissive: 0x1b5e20, emissiveIntensity: 0.1 })
        );
        top.position.set(tx, 0.75, tz); scene.add(top);
        if (!mesh.userData.extras) mesh.userData.extras = [];
        mesh.userData.extras.push(trunk, top);
      }
    }
    // Water shimmer plane
    if (type === 'water') {
      const wm = new THREE.Mesh(
        new THREE.PlaneGeometry(CELL - 0.2, CELL - 0.2),
        new THREE.MeshBasicMaterial({ color: 0x64b5f6, transparent: true, opacity: 0.35 })
      );
      wm.rotation.x = -Math.PI/2; wm.position.set(x, 0.235, z);
      scene.add(wm);
      if (!mesh.userData.extras) mesh.userData.extras = [];
      mesh.userData.extras.push(wm);
    }
    sfx('place');
    addRipple(x, z);

  } else if (FOOD_TYPES.includes(type)) {
    if (!grid[r][c].terrain) return; // Need terrain first
    if (meshes.food[r][c]) { scene.remove(meshes.food[r][c]); }
    grid[r][c].food = type;
    const sp = makeSprite(FOOD_EMOJIS[type], 0.7);
    sp.position.set(x, 0.6, z);
    scene.add(sp);
    meshes.food[r][c] = sp;
    sfx('place');

  } else if (SHELTER_TYPES.includes(type)) {
    if (!grid[r][c].terrain) return;
    if (meshes.shelter[r][c]) { scene.remove(meshes.shelter[r][c]); }
    grid[r][c].shelter = type;
    const sp = makeSprite(SHELTER_EMOJIS[type], 0.7);
    sp.position.set(x, 0.6, z);
    scene.add(sp);
    meshes.shelter[r][c] = sp;
    sfx('place');
  }
}

// ─── HOVER HIGHLIGHT ─────────────────────────────────────────────
const hoverGeo = new THREE.PlaneGeometry(CELL - 0.12, CELL - 0.12);
const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffd866, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
hoverMesh.rotation.x = -Math.PI/2;
hoverMesh.position.y = 0.25;
hoverMesh.visible = false;
scene.add(hoverMesh);

// ─── RAYCASTING ──────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);

function getGridFromMouse(event) {
  mouse.x = (event.clientX / W) * 2 - 1;
  mouse.y = -(event.clientY / H) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const pt = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, pt);
  if (!pt) return null;
  const c = Math.floor((pt.x / CELL) + GRID_SIZE/2);
  const r = Math.floor((pt.z / CELL) + GRID_SIZE/2);
  if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) return { r, c };
  return null;
}

// ─── TOOLS ───────────────────────────────────────────────────────
let currentTool = 'grass';
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
  });
});

let mouseDown = false;
renderer.domElement.addEventListener('mousedown', e => {
  if (e.target !== renderer.domElement) return;
  initAudio();
  mouseDown = true;
  const cell = getGridFromMouse(e);
  if (cell) placeTileAt(cell.r, cell.c, currentTool);
});
renderer.domElement.addEventListener('mousemove', e => {
  const cell = getGridFromMouse(e);
  if (cell) {
    hoverMesh.visible = true;
    hoverMesh.position.x = gx(cell.c);
    hoverMesh.position.z = gz(cell.r);
    if (mouseDown) placeTileAt(cell.r, cell.c, currentTool);
  } else {
    hoverMesh.visible = false;
  }
});
renderer.domElement.addEventListener('mouseup', () => { mouseDown = false; });

// ─── CREATURES ───────────────────────────────────────────────────
let settledCount = 0;
let gameWon = false;
const creatures = [];

const CREATURE_TYPES = ['riverpaw', 'spinekin', 'featherling'];
const CREATURE_EMOJI = { riverpaw: '🦦', spinekin: '🦔', featherling: '🐦' };

// Needs: creature checks radius around its position
function checkNeeds(type, r, c) {
  const cell = grid[r][c];
  if (type === 'riverpaw') {
    // Needs: water tile nearby, fish food on any adj water, burrow shelter on grass
    const hasWaterNearby = hasTerrainNearby(r, c, 'water', 2);
    const hasFishNearby = hasFoodOnTerrain(r, c, 'fish', 'water', 3);
    const hasBurrowOnGrass = hasShelterOnTerrain(r, c, 'burrow', 'grass', 3);
    return hasWaterNearby && hasFishNearby && hasBurrowOnGrass;
  } else if (type === 'spinekin') {
    const hasForestNearby = hasTerrainNearby(r, c, 'forest', 2);
    const hasMushroomNearby = hasFoodOnTerrain(r, c, 'mushroom', 'forest', 3);
    const hasDenOnStone = hasShelterOnTerrain(r, c, 'den', 'stone', 3);
    return hasForestNearby && hasMushroomNearby && hasDenOnStone;
  } else { // featherling
    const hasGrassNearby = hasTerrainNearby(r, c, 'grass', 2);
    const hasBerryNearby = hasFoodOnTerrain(r, c, 'berry', 'grass', 3);
    const hasNestNearby = hasShelterNearby(r, c, 'nest', 3);
    return hasGrassNearby && hasBerryNearby && hasNestNearby;
  }
}

function hasTerrainNearby(r, c, terrain, radius) {
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    const nr = r+dr, nc = c+dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc].terrain === terrain) return true;
  }
  return false;
}

function hasFoodOnTerrain(r, c, food, terrain, radius) {
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    const nr = r+dr, nc = c+dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE
        && grid[nr][nc].food === food && grid[nr][nc].terrain === terrain) return true;
  }
  return false;
}

function hasShelterOnTerrain(r, c, shelter, terrain, radius) {
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    const nr = r+dr, nc = c+dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE
        && grid[nr][nc].shelter === shelter && grid[nr][nc].terrain === terrain) return true;
  }
  return false;
}

function hasShelterNearby(r, c, shelter, radius) {
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    const nr = r+dr, nc = c+dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc].shelter === shelter) return true;
  }
  return false;
}

// Spawn creature from edge
function spawnCreature() {
  if (gameWon) return;
  const type = CREATURE_TYPES[Math.floor(Math.random() * 3)];
  // Start from edge
  const edge = Math.floor(Math.random() * 4);
  let startR, startC;
  if (edge === 0) { startR = 0; startC = Math.floor(Math.random()*GRID_SIZE); }
  else if (edge === 1) { startR = GRID_SIZE-1; startC = Math.floor(Math.random()*GRID_SIZE); }
  else if (edge === 2) { startR = Math.floor(Math.random()*GRID_SIZE); startC = 0; }
  else { startR = Math.floor(Math.random()*GRID_SIZE); startC = GRID_SIZE-1; }

  const sprite = makeSprite(CREATURE_EMOJI[type], 0.85);
  sprite.position.set(gx(startC), 0.9, gz(startR));
  scene.add(sprite);

  // Needs floating indicator
  const needsMap = { riverpaw: '💧🐟🕳️', spinekin: '🌲🍄🏠', featherling: '🌿🍓🪺' };
  const needSprite = makeSprite(needsMap[type], 0.55);
  needSprite.position.set(gx(startC), 1.55, gz(startR));
  scene.add(needSprite);

  creatures.push({
    type, r: startR, c: startC,
    mesh: sprite, needsMesh: needSprite,
    state: 'wandering', // wandering | evaluating | settling | leaving | settled
    timer: 0, evalTimer: 0, settleAnim: 0,
    targetR: startR, targetC: startC,
    moveTimer: 0, satisfied: false,
    spinAngle: 0
  });

  sfx('arrive');
}

// Update creature each frame
function updateCreature(cr, dt, elapsed) {
  const { r, c } = cr;

  // Billboard sprites
  cr.mesh.lookAt(camera.position);
  cr.needsMesh.lookAt(camera.position);
  cr.needsMesh.position.set(cr.mesh.position.x, cr.mesh.position.y + 0.75, cr.mesh.position.z);

  if (cr.state === 'settled') {
    cr.spinAngle += dt * 0.5;
    cr.mesh.position.y = 0.9 + Math.sin(elapsed * 1.5 + cr.spinAngle) * 0.07;
    return;
  }

  if (cr.state === 'settling') {
    cr.settleAnim += dt * 3;
    const s = 1 + Math.sin(cr.settleAnim) * 0.3;
    cr.mesh.scale.set(s, s, 1);
    if (cr.settleAnim > Math.PI) {
      cr.state = 'settled';
      cr.mesh.scale.set(1, 1, 1);
      // Place flag
      const flag = makeSprite('🚩', 0.5);
      flag.position.set(gx(cr.c), 1.3, gz(cr.r));
      scene.add(flag);
      cr.flagMesh = flag;
      settledCount++;
      document.getElementById('sc').textContent = settledCount;
      unlockMusicLayer(settledCount);
      sfx('settle');
      if (settledCount >= 10) triggerWin();
    }
    return;
  }

  if (cr.state === 'leaving') {
    cr.timer += dt;
    cr.mesh.position.y += dt * 1.5;
    cr.mesh.material.opacity = Math.max(0, 1 - cr.timer * 2);
    if (cr.timer > 0.8) {
      scene.remove(cr.mesh); scene.remove(cr.needsMesh);
      cr.dead = true;
    }
    return;
  }

  // Wandering + evaluation
  cr.moveTimer -= dt;
  cr.evalTimer += dt;

  if (cr.moveTimer <= 0) {
    cr.moveTimer = 0.5 + Math.random() * 0.8;
    // Move to adjacent cell
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    const d = dirs[Math.floor(Math.random()*4)];
    const nr = cr.r + d[0], nc = cr.c + d[1];
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      cr.r = nr; cr.c = nc;
    }
    // Smooth move
    cr.targetX = gx(cr.c);
    cr.targetZ = gz(cr.r);
  }

  // Lerp position
  if (cr.targetX !== undefined) {
    cr.mesh.position.x += (cr.targetX - cr.mesh.position.x) * 0.1;
    cr.mesh.position.z += (cr.targetZ - cr.mesh.position.z) * 0.1;
  }

  // Gentle bob
  cr.mesh.position.y = 0.9 + Math.sin(elapsed * 2.5 + cr.r * 0.7) * 0.06;

  // Evaluate every 2 seconds
  if (cr.evalTimer > 2.0) {
    cr.evalTimer = 0;
    const happy = checkNeeds(cr.type, cr.r, cr.c);
    if (happy) {
      cr.state = 'settling';
      cr.settleAnim = 0;
      cr.needsMesh.visible = false;
    } else {
      // Check if been wandering too long (leave after 20s)
      cr.timer += 2;
      if (cr.timer > 20) {
        cr.state = 'leaving';
        cr.timer = 0;
        sfx('leave');
      }
    }
  }
}

// ─── WIN ─────────────────────────────────────────────────────────
function triggerWin() {
  gameWon = true;
  sfx('win');
  document.getElementById('win').classList.add('show');
  // Particle burst
  for (let i = 0; i < 60; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 1, 0.6) })
    );
    p.position.set((Math.random()-0.5)*12, 0.5, (Math.random()-0.5)*12);
    scene.add(p);
    const vx = (Math.random()-0.5)*5, vy = 3+Math.random()*4, vz = (Math.random()-0.5)*5;
    particles.push({ mesh: p, vx, vy, vz, life: 1.5 });
  }
}

// ─── PARTICLES ───────────────────────────────────────────────────
const particles = [];

function updateParticles(dt) {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= dt * 9;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.material.opacity = Math.max(0, p.life / 1.5);
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
}

// ─── RIPPLE EFFECT ON PLACE ──────────────────────────────────────
const ripples = [];
function addRipple(x, z) {
  const rm = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.15, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd866, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  rm.rotation.x = -Math.PI/2;
  rm.position.set(x, 0.26, z);
  scene.add(rm);
  ripples.push({ mesh: rm, life: 0.5, maxLife: 0.5 });
}

function updateRipples(dt) {
  for (let i = ripples.length-1; i >= 0; i--) {
    const rp = ripples[i];
    rp.life -= dt;
    const t = 1 - rp.life / rp.maxLife;
    rp.mesh.scale.set(1 + t * 4, 1, 1 + t * 4);
    rp.mesh.material.opacity = (1 - t) * 0.7;
    if (rp.life <= 0) { scene.remove(rp.mesh); ripples.splice(i, 1); }
  }
}

// ─── SPAWN TIMER ─────────────────────────────────────────────────
let spawnTimer = 5; // First creature at 5s
let totalCreaturesSpawned = 0;
const MAX_ACTIVE = 8;

// ─── CLOCK ───────────────────────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0;

// ─── ANIMATE ─────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // Clouds drift
  clouds.forEach(cl => {
    cl.mesh.position.x += cl.speed * dt;
    cl.mesh.position.y = 7 + Math.sin(elapsed * 0.2 + cl.phase) * 1.0;
    if (cl.mesh.position.x > 30) cl.mesh.position.x = -30;
  });

  // Water shimmer
  const waterAmt = Math.sin(elapsed * 1.8) * 0.06;
  meshes.tile.forEach(row => row.forEach(m => {
    if (m && m.geometry.type === 'BoxGeometry' && m.material === TERRAIN_MAT.water) {
      m.position.y = 0.11 + waterAmt;
    }
  }));

  // Spawn creatures
  if (!gameWon) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const activeCount = creatures.filter(c => !c.dead && c.state !== 'settled').length;
      if (activeCount < MAX_ACTIVE && settledCount < 10) {
        spawnCreature();
        totalCreaturesSpawned++;
        spawnTimer = 6 + Math.random() * 4;
      } else {
        spawnTimer = 2;
      }
    }
  }

  // Update creatures
  creatures.forEach(cr => {
    if (!cr.dead) updateCreature(cr, dt, elapsed);
  });
  // Remove dead
  for (let i = creatures.length-1; i >= 0; i--) {
    if (creatures[i].dead) creatures.splice(i, 1);
  }

  // Hover pulse
  hoverMesh.material.opacity = 0.15 + Math.sin(elapsed * 4) * 0.08;

  updateParticles(dt);
  updateRipples(dt);

  // Food/shelter sprites always face camera
  meshes.food.forEach(row => row.forEach(m => { if (m) m.lookAt(camera.position); }));
  meshes.shelter.forEach(row => row.forEach(m => { if (m) m.lookAt(camera.position); }));
  meshes.flag.forEach(row => row.forEach(m => { if (m) m.lookAt(camera.position); }));

  composer.render();
}
animate();

// ─── RESIZE ──────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const nW = window.innerWidth, nH = window.innerHeight;
  camera.aspect = nW / nH;
  camera.updateProjectionMatrix();
  renderer.setSize(nW, nH);
  composer.setSize(nW, nH);
});

// Audio hint
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });
