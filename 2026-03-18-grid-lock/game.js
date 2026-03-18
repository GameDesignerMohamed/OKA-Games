import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// MODULE-SCOPE STATE (T2)
// ============================================================
let scene, camera, renderer, composer, useComposer = false;
let clock;
let gameState = 'title'; // title | placing | wave | waveclear | win | lose
let credits = 100;
let breaches = 0;
let maxBreaches = 3;
let killCount = 0;
let waveNum = 0;
let selectedTower = 'pulse';
let gameSpeed = 1;

// Grid state
const GRID_COLS = 14;
const GRID_ROWS = 10;
const CELL_SIZE = 1.4;
const GRID_OFFSET_X = -(GRID_COLS / 2) * CELL_SIZE + CELL_SIZE / 2;
const GRID_OFFSET_Z = -(GRID_ROWS / 2) * CELL_SIZE + CELL_SIZE / 2;

// Cell types: 'road', 'sidewalk', 'tower', 'server', 'start'
let grid = [];         // [row][col] = { type, mesh, tower }
let towers = [];       // placed towers
let enemies = [];
let projectiles = [];
let particles = [];

let hoverMesh = null;
let hoverPos = null;
let waveTimer = 0;
let waveClearTimer = 0;
const WAVE_PAUSE = 3.5;
let spawnQueue = [];
let spawnTimer = 0;
let shakeMag = 0, shakeX = 0, shakeY = 0;

// Path waypoints (world coords) for two lanes
let pathA = []; // left lane
let pathB = []; // right lane

// Tower configs
const TOWER_CONFIG = {
  pulse: { cost: 25, damage: 1, range: 2.2, fireRate: 0.6, color: 0xff44aa, projectileColor: 0xff88dd, special: 'none' },
  cryo:  { cost: 35, damage: 0.5, range: 2.8, fireRate: 1.0, color: 0x44aaff, projectileColor: 0x88ccff, special: 'slow' },
  arc:   { cost: 50, damage: 1.5, range: 3.2, fireRate: 1.4, color: 0x44ff88, projectileColor: 0x88ffaa, special: 'chain' },
};

// Wave configs [{ count, hp, speed, lane }] -- lane: 'A', 'B', 'both'
const WAVE_CONFIG = [
  { count: 6,  hp: 2, speed: 1.8, lane: 'A' },
  { count: 8,  hp: 3, speed: 2.0, lane: 'A' },
  { count: 10, hp: 3, speed: 2.2, lane: 'B' },
  { count: 12, hp: 4, speed: 2.4, lane: 'A' },
  { count: 20, hp: 5, speed: 2.6, lane: 'both' }, // TRIAL CLIFF
];

// Audio
let audioCtx = null;
let bgmStarted = false;

// ============================================================
// GRID SETUP
// ============================================================
function buildGrid() {
  // Define the layout:
  // Row 0-9, Col 0-13
  // Lane A: rows 2-3 (top lane going left→right, server col 12-13)
  // Lane B: rows 6-7 (bottom lane going left→right)
  // Sidewalk: rows 0-1, 4-5, 8-9 (placeable zones)
  // Decorative buildings: remaining cells

  for (let r = 0; r < GRID_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      let type = 'building';

      // Lane A (top road)
      if (r === 3 || r === 4) type = 'road';
      // Lane B (bottom road)
      if (r === 6 || r === 7) type = 'road';

      // Sidewalks (placeable)
      if (r === 2 || r === 5) type = 'sidewalk'; // between roads
      if (r === 1 || r === 8) type = 'sidewalk'; // outer sides

      // Entry/exit columns
      if (c === 0 && (r === 3 || r === 4 || r === 6 || r === 7)) type = 'start';
      if (c === GRID_COLS - 1 && (r === 3 || r === 4 || r === 6 || r === 7)) type = 'server';
      if (c === GRID_COLS - 2 && (r === 3 || r === 4 || r === 6 || r === 7)) type = 'server';

      grid[r][c] = { type, mesh: null, tower: null, row: r, col: c };
    }
  }
}

function cellToWorld(r, c) {
  return new THREE.Vector3(
    GRID_OFFSET_X + c * CELL_SIZE,
    0,
    GRID_OFFSET_Z + r * CELL_SIZE
  );
}

function buildSceneMeshes() {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = grid[r][c];
      const wp = cellToWorld(r, c);

      let mat;
      const geo = new THREE.BoxGeometry(CELL_SIZE - 0.06, 0.1, CELL_SIZE - 0.06);

      if (cell.type === 'road') {
        mat = new THREE.MeshStandardMaterial({ color: 0x111a1a, roughness: 0.9 });
      } else if (cell.type === 'sidewalk') {
        mat = new THREE.MeshStandardMaterial({ color: 0x1a2a22, roughness: 0.7, emissive: 0x001108, emissiveIntensity: 0.4 });
      } else if (cell.type === 'server') {
        mat = new THREE.MeshStandardMaterial({ color: 0x002233, roughness: 0.5, emissive: 0x004466, emissiveIntensity: 0.6 });
      } else if (cell.type === 'start') {
        mat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.8, emissive: 0x110800, emissiveIntensity: 0.3 });
      } else {
        // Building
        const bh = 0.6 + Math.random() * 1.2;
        const bgeo = new THREE.BoxGeometry(CELL_SIZE - 0.15, bh, CELL_SIZE - 0.15);
        const bmat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.5 + Math.random() * 0.15, 0.1, 0.06 + Math.random() * 0.04),
          roughness: 0.8,
          emissive: Math.random() > 0.6 ? new THREE.Color().setHSL(Math.random(), 0.5, 0.04) : 0x000000,
          emissiveIntensity: 0.4,
        });
        const bmesh = new THREE.Mesh(bgeo, bmat);
        bmesh.position.set(wp.x, bh / 2 + 0.05, wp.z);
        bmesh.castShadow = true;
        scene.add(bmesh);
        cell.mesh = bmesh;
        continue;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(wp.x, 0.05, wp.z);
      mesh.receiveShadow = true;
      mesh.userData = { row: r, col: c };
      scene.add(mesh);
      cell.mesh = mesh;
    }
  }

  // Server node markers
  buildServerNodes();

  // Rain puddle reflections (PlaneGeometry overlay on roads)
  buildPuddles();

  // Street lights
  buildStreetLights();
}

function buildServerNodes() {
  const serverGeo = new THREE.OctahedronGeometry(0.35, 0);
  const serverMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2, metalness: 0.5 });
  [[3, GRID_COLS - 1], [4, GRID_COLS - 1], [6, GRID_COLS - 1], [7, GRID_COLS - 1]].forEach(([r, c]) => {
    const wp = cellToWorld(r, c);
    const mesh = new THREE.Mesh(serverGeo, serverMat.clone());
    mesh.position.set(wp.x, 0.5, wp.z);
    scene.add(mesh);
  });
  const nodeLight = new THREE.PointLight(0x00ffcc, 3, 5);
  nodeLight.position.set(cellToWorld(5, GRID_COLS - 1).x, 1, cellToWorld(5, GRID_COLS - 1).z);
  scene.add(nodeLight);
}

function buildPuddles() {
  const pGeo = new THREE.PlaneGeometry(CELL_SIZE - 0.2, CELL_SIZE - 0.2);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x002211, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.6 });
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c].type === 'road' && Math.random() > 0.4) {
        const wp = cellToWorld(r, c);
        const mesh = new THREE.Mesh(pGeo, pMat.clone());
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(wp.x + (Math.random() - 0.5) * 0.4, 0.12, wp.z + (Math.random() - 0.5) * 0.4);
        scene.add(mesh);
      }
    }
  }
}

function buildStreetLights() {
  // Place neon light poles along the lanes
  const lightPositions = [2, 5, 8, 11];
  const rows = [0.5, 9.5];
  lightPositions.forEach(c => {
    rows.forEach(r => {
      const wp = cellToWorld(Math.round(r), c);
      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(wp.x, 0.75, wp.z);
      scene.add(pole);
      // Lamp
      const lampColors = [0xff44aa, 0x44aaff, 0x44ff88, 0xffaa00];
      const lc = lampColors[Math.floor(Math.random() * lampColors.length)];
      const lampGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const lampMat = new THREE.MeshStandardMaterial({ color: lc, emissive: lc, emissiveIntensity: 3 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(wp.x, 1.6, wp.z);
      scene.add(lamp);
      const pl = new THREE.PointLight(lc, 0.8, 3.5);
      pl.position.copy(lamp.position);
      scene.add(pl);
    });
  });
}

// ============================================================
// PATH COMPUTATION
// ============================================================
function buildPaths() {
  // Lane A path: enter col 0, row 3.5 → travel right → exit col 13, row 3.5
  // Lane B path: enter col 0, row 6.5 → travel right → exit col 13, row 6.5
  const laneARow = 3.5;
  const laneBRow = 6.5;

  pathA = [];
  pathB = [];
  for (let c = 0; c <= GRID_COLS; c++) {
    const wp = cellToWorld(laneARow, c);
    pathA.push(new THREE.Vector3(wp.x, 0.35, wp.z));
  }
  for (let c = 0; c <= GRID_COLS; c++) {
    const wp = cellToWorld(laneBRow, c);
    pathB.push(new THREE.Vector3(wp.x, 0.35, wp.z));
  }
}

// ============================================================
// TOWER PLACEMENT
// ============================================================
function canPlaceTower(r, c) {
  if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return false;
  const cell = grid[r][c];
  return cell.type === 'sidewalk' && cell.tower === null;
}

function placeTower(r, c) {
  const cfg = TOWER_CONFIG[selectedTower];
  if (credits < cfg.cost) return;
  if (!canPlaceTower(r, c)) return;

  credits -= cfg.cost;
  updateCreditsUI();

  const wp = cellToWorld(r, c);
  const towerMesh = buildTowerMesh(selectedTower, wp);
  scene.add(towerMesh);

  const rangeLight = new THREE.PointLight(cfg.color, 1.0, cfg.range);
  rangeLight.position.copy(wp);
  rangeLight.position.y = 0.6;
  scene.add(rangeLight);

  const tower = {
    type: selectedTower,
    row: r, col: c,
    mesh: towerMesh,
    rangeLight,
    fireTimer: 0,
    level: 1,
    cfg: { ...cfg },
    pos: wp.clone().setY(0.6),
    dead: false,
  };
  towers.push(tower);
  grid[r][c].tower = tower;

  sfxPlace();
  spawnForgeParticles(wp.clone().setY(0.8), cfg.color, 12);
}

function buildTowerMesh(type, pos) {
  const cfg = TOWER_CONFIG[type];
  let geo;
  if (type === 'pulse') {
    geo = new THREE.CylinderGeometry(0.18, 0.25, 0.7, 8);
  } else if (type === 'cryo') {
    geo = new THREE.OctahedronGeometry(0.28, 0);
  } else {
    geo = new THREE.TetrahedronGeometry(0.32, 0);
  }
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: cfg.color,
    emissiveIntensity: 1.2,
    metalness: 0.7,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos.x, 0.5, pos.z);
  mesh.castShadow = true;
  return mesh;
}

// ============================================================
// ENEMY SPAWNING
// ============================================================
function spawnEnemy(lane, hp, speed) {
  const path = lane === 'A' ? pathA : pathB;
  const geoChoices = [
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.SphereGeometry(0.18, 6, 6),
    new THREE.TetrahedronGeometry(0.22, 0),
  ];
  const geo = geoChoices[Math.floor(Math.random() * geoChoices.length)];
  const col = lane === 'A' ? 0xff4455 : 0xff8822;
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 1.5,
    metalness: 0.5,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(path[0]);
  mesh.castShadow = true;
  scene.add(mesh);

  // HP bar
  const barBgGeo = new THREE.PlaneGeometry(0.5, 0.07);
  const barBgMat = new THREE.MeshBasicMaterial({ color: 0x220000, side: THREE.DoubleSide });
  const barBg = new THREE.Mesh(barBgGeo, barBgMat);
  barBg.position.set(0, 0.45, 0);
  barBg.rotation.x = -Math.PI / 3;
  mesh.add(barBg);

  const barFgGeo = new THREE.PlaneGeometry(0.44, 0.05);
  const barFgMat = new THREE.MeshBasicMaterial({ color: 0xff4455, side: THREE.DoubleSide });
  const barFg = new THREE.Mesh(barFgGeo, barFgMat);
  barFg.position.set(0, 0.001, 0);
  barBg.add(barFg);

  // Neon trail light
  const eLight = new THREE.PointLight(col, 0.8, 2.0);
  mesh.add(eLight);

  enemies.push({
    mesh,
    path,
    pathIdx: 0,
    hp, maxHp: hp,
    speed,
    barFg,
    slow: 0, // slow timer
    dead: false,
    reached: false,
    rotSpeed: (Math.random() - 0.5) * 4,
  });
}

// ============================================================
// TOWER TARGETING & SHOOTING
// ============================================================
function updateTowers(dt) {
  for (const t of towers) {
    if (t.dead) continue;

    // Pulse animation
    const pulse = 1.0 + Math.sin(clock.elapsedTime * 3 + t.row) * 0.06;
    t.mesh.scale.setScalar(pulse);
    t.mesh.rotation.y += dt * (t.type === 'arc' ? 2 : 1);

    t.fireTimer -= dt;
    if (t.fireTimer > 0) continue;

    // Find nearest enemy in range
    let target = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (e.dead || e.reached) continue;
      const d = t.pos.distanceTo(e.mesh.position);
      if (d <= t.cfg.range && d < minDist) { minDist = d; target = e; }
    }
    if (!target) continue;

    t.fireTimer = t.cfg.fireRate;
    fireProjectile(t, target);
    sfxTowerFire(t.type);
  }
}

function fireProjectile(tower, target) {
  const geo = new THREE.SphereGeometry(0.1, 4, 4);
  const mat = new THREE.MeshStandardMaterial({
    color: tower.cfg.projectileColor,
    emissive: tower.cfg.projectileColor,
    emissiveIntensity: 3,
    transparent: true, opacity: 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(tower.pos);
  scene.add(mesh);

  const pLight = new THREE.PointLight(tower.cfg.projectileColor, 1.2, 2);
  mesh.add(pLight);

  projectiles.push({
    mesh,
    target,
    tower,
    speed: 8,
    dead: false,
    life: 0,
    maxLife: 1.5,
  });
}

// ============================================================
// PROJECTILE UPDATE
// ============================================================
function updateProjectiles(dt) {
  projectiles = projectiles.filter(p => !p.dead);
  for (const p of projectiles) {
    p.life += dt;
    if (p.life > p.maxLife || p.target.dead || p.target.reached) {
      p.dead = true;
      scene.remove(p.mesh);
      continue;
    }
    const dir = p.target.mesh.position.clone().sub(p.mesh.position);
    const dist = dir.length();
    if (dist < 0.25) {
      // Hit
      hitEnemy(p.target, p.tower);
      p.dead = true;
      scene.remove(p.mesh);
    } else {
      dir.normalize();
      p.mesh.position.addScaledVector(dir, p.speed * dt);
    }
  }
}

function hitEnemy(enemy, tower) {
  if (enemy.dead || enemy.reached) return;
  enemy.hp -= tower.cfg.damage;
  updateEnemyBar(enemy);
  spawnHitParticles(enemy.mesh.position.clone(), tower.cfg.projectileColor, 5);
  sfxHit();

  if (tower.cfg.special === 'slow') {
    enemy.slow = Math.max(enemy.slow, 1.5);
  }

  if (tower.cfg.special === 'chain') {
    // Chain to 2 nearby enemies
    const nearby = enemies.filter(e => e !== enemy && !e.dead && !e.reached)
      .filter(e => e.mesh.position.distanceTo(enemy.mesh.position) < 2.5)
      .slice(0, 2);
    nearby.forEach(e => {
      e.hp -= tower.cfg.damage * 0.5;
      updateEnemyBar(e);
      spawnHitParticles(e.mesh.position.clone(), tower.cfg.projectileColor, 3);
      if (e.hp <= 0) killEnemy(e);
    });
  }

  if (enemy.hp <= 0) killEnemy(enemy);
}

function updateEnemyBar(e) {
  const ratio = Math.max(0, e.hp / e.maxHp);
  e.barFg.scale.x = ratio;
  e.barFg.position.x = -(1 - ratio) * 0.22;
  if (ratio < 0.4) e.barFg.material.color.setHex(0xff8800);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  scene.remove(e.mesh);
  killCount++;
  credits += 5;
  updateCreditsUI();
  document.getElementById('kill-num').textContent = killCount;
  spawnDeathParticles(e.mesh.position.clone());
  sfxKill();
  cameraShake(0.08);
}

// ============================================================
// ENEMY MOVEMENT
// ============================================================
function updateEnemies(dt) {
  enemies = enemies.filter(e => !e.dead && !e.reached);
  for (const e of enemies) {
    if (e.dead || e.reached) continue;

    const slowFactor = e.slow > 0 ? 0.35 : 1.0;
    e.slow = Math.max(0, e.slow - dt);

    const nextIdx = e.pathIdx + 1;
    if (nextIdx >= e.path.length) {
      // Reached server
      e.reached = true;
      scene.remove(e.mesh);
      onBreach();
      continue;
    }

    const target = e.path[nextIdx];
    const dir = target.clone().sub(e.mesh.position);
    const dist = dir.length();
    const moveStep = e.speed * slowFactor * dt;

    if (dist <= moveStep) {
      e.mesh.position.copy(target);
      e.pathIdx = nextIdx;
    } else {
      dir.normalize();
      e.mesh.position.addScaledVector(dir, moveStep);
    }

    e.mesh.rotation.y += e.rotSpeed * dt;
    e.mesh.rotation.x += e.rotSpeed * 0.5 * dt;
  }
}

// ============================================================
// PARTICLES
// ============================================================
function spawnHitParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 4, 4);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 0.5, (Math.random() - 0.5) * 3);
    particles.push({ mesh, vel, life: 0, maxLife: 0.4 + Math.random() * 0.3, dead: false });
  }
}

function spawnDeathParticles(pos) {
  for (let i = 0; i < 14; i++) {
    const colors = [0xff4455, 0xff8800, 0xffcc00];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.08, 0);
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.5, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4 + 1, (Math.random() - 0.5) * 5);
    particles.push({ mesh, vel, life: 0, maxLife: 0.5 + Math.random() * 0.4, dead: false });
  }
}

function spawnForgeParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4);
    particles.push({ mesh, vel, life: 0, maxLife: 0.4 + Math.random() * 0.3, dead: false });
  }
}

function updateParticles(dt) {
  particles = particles.filter(p => !p.dead);
  for (const p of particles) {
    p.life += dt;
    if (p.life >= p.maxLife) { p.dead = true; scene.remove(p.mesh); continue; }
    const ratio = p.life / p.maxLife;
    p.vel.y -= 6 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = 1.0 - ratio;
    p.mesh.rotation.x += dt * 3;
    p.mesh.rotation.y += dt * 2;
  }
}

// ============================================================
// WAVE MANAGEMENT
// ============================================================
function startWave(num) {
  waveNum = num;
  gameState = 'wave';
  document.getElementById('wave-num').textContent = num + '/5';
  showWaveAnnounce(num === 5 ? 'WAVE 5\nTRIAL CLIFF' : 'WAVE ' + num);
  sfxWaveSiren();

  const cfg = WAVE_CONFIG[num - 1];
  spawnQueue = [];
  for (let i = 0; i < cfg.count; i++) {
    let lane;
    if (cfg.lane === 'both') lane = i % 2 === 0 ? 'A' : 'B';
    else lane = cfg.lane;
    spawnQueue.push({ lane, hp: cfg.hp, speed: cfg.speed, delay: i * 0.9 });
  }
  spawnTimer = 0;

  if (num === 5) {
    // Wave 5 bonus credits warning
    setTimeout(() => {
      if (gameState === 'wave') showWaveAnnounce('DUAL LANE SURGE!');
    }, 2000);
  }

  cameraShake(0.3);
}

function showWaveAnnounce(text) {
  const el = document.getElementById('wave-announce');
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

function onBreach() {
  breaches++;
  updateBreachUI();
  cameraShake(0.6);
  sfxBreach();
  if (breaches >= maxBreaches) {
    triggerLose();
  }
}

function checkWaveComplete() {
  if (spawnQueue.length === 0 && enemies.length === 0) {
    if (waveNum >= 5) {
      triggerWin();
    } else {
      gameState = 'waveclear';
      waveClearTimer = 0;
      credits += 20; // Between-wave bonus
      updateCreditsUI();
      showWaveAnnounce('WAVE ' + waveNum + ' CLEAR');
      sfxWaveClear();
    }
  }
}

// ============================================================
// UI
// ============================================================
function updateBreachUI() {
  for (let i = 0; i < 3; i++) {
    document.getElementById(`bp-${i}`).classList.toggle('used', i < breaches);
  }
}

function updateCreditsUI() {
  document.getElementById('credits-num').textContent = credits;
  document.getElementById('panel-credits').querySelector('.hud-val').textContent = credits;
  // Dim tower buttons if can't afford
  document.querySelectorAll('.tower-btn').forEach(btn => {
    const type = btn.dataset.type;
    const costEl = btn.querySelector('.tower-cost');
    if (TOWER_CONFIG[type] && credits < TOWER_CONFIG[type].cost) {
      btn.style.opacity = '0.4';
    } else {
      btn.style.opacity = '1';
    }
  });
}

// ============================================================
// CAMERA SHAKE
// ============================================================
function cameraShake(mag) {
  shakeMag = Math.max(shakeMag, mag);
}

// ============================================================
// GAME STATE
// ============================================================
function triggerWin() {
  gameState = 'win';
  const best = parseInt(localStorage.getItem('gl_best') || '0');
  if (killCount > best) localStorage.setItem('gl_best', killCount);
  sfxWin();
  setTimeout(() => {
    const overlay = document.getElementById('screen-overlay');
    overlay.innerHTML = `
      <h1 style="color:#00ffcc">DISTRICT SECURED</h1>
      <div class="sub" style="color:#00aa88">All 5 Waves Survived</div>
      <div class="hint">Kills: ${killCount} · Breaches: ${breaches}/3</div>
      <div id="best-display">Best: ${Math.max(killCount, best)} kills</div>
      <button id="restart-btn" onclick="location.reload()">PLAY AGAIN</button>
    `;
    overlay.style.display = 'flex';
  }, 800);
}

function triggerLose() {
  gameState = 'lose';
  sfxGameOver();
  cameraShake(1.0);
  setTimeout(() => {
    const best = parseInt(localStorage.getItem('gl_best') || '0');
    const overlay = document.getElementById('screen-overlay');
    overlay.innerHTML = `
      <h1 style="color:#ff4455">GRID BREACH</h1>
      <div class="sub" style="color:#882233">Server node compromised</div>
      <div class="hint">Kills: ${killCount} · Wave ${waveNum}/5</div>
      <div id="best-display">Best: ${best} kills</div>
      <button id="restart-btn" onclick="location.reload()">RETRY</button>
    `;
    overlay.style.display = 'flex';
  }, 700);
}

// ============================================================
// HOVER INDICATOR
// ============================================================
function updateHover(r, c) {
  if (hoverMesh) {
    scene.remove(hoverMesh);
    hoverMesh = null;
  }
  if (r < 0 || c < 0 || !canPlaceTower(r, c)) return;
  const wp = cellToWorld(r, c);
  const geo = new THREE.BoxGeometry(CELL_SIZE - 0.1, 0.12, CELL_SIZE - 0.1);
  const canAfford = credits >= TOWER_CONFIG[selectedTower].cost;
  const mat = new THREE.MeshBasicMaterial({
    color: canAfford ? 0x00ffcc : 0xff4455,
    transparent: true, opacity: 0.3, depthWrite: false,
  });
  hoverMesh = new THREE.Mesh(geo, mat);
  hoverMesh.position.set(wp.x, 0.12, wp.z);
  scene.add(hoverMesh);
}

// ============================================================
// MOUSE / RAYCASTING
// ============================================================
function getGridCell(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  // Convert world → grid
  const col = Math.round((target.x - GRID_OFFSET_X) / CELL_SIZE);
  const row = Math.round((target.z - GRID_OFFSET_Z) / CELL_SIZE);
  return { row, col };
}

document.addEventListener('mousemove', (e) => {
  if (gameState !== 'placing' && gameState !== 'waveclear') return;
  const { row, col } = getGridCell(e);
  updateHover(row, col);
});

document.addEventListener('click', (e) => {
  // Resume audio
  if (audioCtx) audioCtx.resume();
  if (gameState !== 'placing' && gameState !== 'waveclear') return;
  const target = e.target;
  if (target.closest('#tower-panel') || target.closest('#screen-overlay') || target.closest('#speed-btn')) return;
  const { row, col } = getGridCell(e);
  if (canPlaceTower(row, col)) {
    placeTower(row, col);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (useComposer) composer.setSize(window.innerWidth, window.innerHeight);
});

// Tower selection buttons
document.querySelectorAll('.tower-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioCtx) audioCtx.resume();
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedTower = btn.dataset.type;
  });
});

// Speed button
document.getElementById('speed-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (audioCtx) audioCtx.resume();
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('speed-btn');
  btn.textContent = gameSpeed === 1 ? '▶ 1×' : '▶▶ 2×';
  btn.classList.toggle('fast', gameSpeed === 2);
});

// ============================================================
// RAIN CANVAS (2D overlay — cosmetic only, not game world)
// ============================================================
function initRain() {
  const canvas = document.getElementById('rain-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const drops = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 4 + Math.random() * 6,
    len: 8 + Math.random() * 12,
  }));

  function drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(100,200,180,0.5)';
    ctx.lineWidth = 0.5;
    drops.forEach(d => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
    });
    requestAnimationFrame(drawRain);
  }
  drawRain();
}

// ============================================================
// THREE.JS SCENE SETUP
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020a06);
  scene.fog = new THREE.FogExp2(0x010806, 0.012);
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 14, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Bloom
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.4, 0.82
    );
    composer.addPass(bloom);
    useComposer = true;
  } catch(e) { useComposer = false; }

  // Lighting
  const ambient = new THREE.AmbientLight(0x113322, 2.5);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0x223344, 1.5);
  sun.position.set(5, 12, 5);
  sun.castShadow = true;
  scene.add(sun);

  buildGrid();
  buildSceneMeshes();
  buildPaths();
  initRain();
}

// ============================================================
// AUDIO
// ============================================================
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, gain, startDelay = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + startDelay;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.7, t + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t); osc.stop(t + duration + 0.05);
  } catch(e) {}
}

function sfxPlace() {
  playTone(440, 'triangle', 0.1, 0.15);
  playTone(660, 'sine', 0.12, 0.12, 0.05);
}

function sfxTowerFire(type) {
  const freqs = { pulse: 880, cryo: 330, arc: 550 };
  const types = { pulse: 'sawtooth', cryo: 'sine', arc: 'square' };
  playTone(freqs[type] || 440, types[type] || 'triangle', 0.05, 0.1);
}

function sfxHit() {
  playTone(220, 'triangle', 0.04, 0.08);
}

function sfxKill() {
  playTone(660, 'sine', 0.06, 0.12);
  playTone(880, 'sine', 0.06, 0.1, 0.03);
}

function sfxBreach() {
  playTone(110, 'sawtooth', 0.3, 0.3);
  playTone(80, 'sine', 0.4, 0.25, 0.05);
}

function sfxWaveSiren() {
  [330, 440, 550].forEach((f, i) => playTone(f, 'triangle', 0.2, 0.2, i * 0.18));
}

function sfxWaveClear() {
  [330, 440, 550, 660].forEach((f, i) => playTone(f, 'sine', 0.2, 0.18, i * 0.1));
}

function sfxWin() {
  [330, 440, 550, 660, 880, 1100].forEach((f, i) => playTone(f, 'sine', 0.35, 0.2, i * 0.1));
}

function sfxGameOver() {
  [440, 330, 220, 165].forEach((f, i) => playTone(f, 'sawtooth', 0.3, 0.25, i * 0.18));
}

function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  scheduleBGM();
}

function scheduleBGM() {
  try {
    const ctx = getAudioCtx();
    const bpm = 90;
    const beat = 60 / bpm;
    const loopLen = beat * 16;
    const start = ctx.currentTime + 0.05;

    // Sub-bass drone
    {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 55;
      g.gain.setValueAtTime(0.08, start);
      g.gain.setValueAtTime(0.06, start + loopLen * 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, start + loopLen);
      osc.start(start); osc.stop(start + loopLen + 0.1);
    }

    // Kick pattern: beats 0, 4, 8, 12
    [0, 4, 8, 12].forEach(b => {
      const t = start + b * beat;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.2);
    });

    // Vinyl crackle — random noise pops
    for (let i = 0; i < 6; i++) {
      const t = start + Math.random() * loopLen;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sawtooth'; osc.frequency.value = 2000 + Math.random() * 2000;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      osc.start(t); osc.stop(t + 0.03);
    }

    // Synth pad (sine chords on beats 0, 8)
    [[0, [220, 277, 330]], [8, [196, 247, 294]]].forEach(([b, chords]) => {
      const t = start + b * beat;
      chords.forEach(f => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = f;
        g.gain.setValueAtTime(0.04, t);
        g.gain.setValueAtTime(0.03, t + beat * 3);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 4);
        osc.start(t); osc.stop(t + beat * 4 + 0.05);
      });
    });

    // Schedule next
    const until = (start + loopLen - ctx.currentTime - 0.1) * 1000;
    if (bgmStarted && (gameState === 'wave' || gameState === 'placing' || gameState === 'waveclear')) {
      setTimeout(() => {
        if (bgmStarted) scheduleBGM();
      }, Math.max(0, until));
    }
  } catch(e) {}
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
function update(dt) {
  if (gameState === 'title' || gameState === 'win' || gameState === 'lose') return;

  const scaledDt = dt * gameSpeed;

  // Placing state — just animate scene
  if (gameState === 'placing') {
    // Wait for player to place towers, then press ready / or auto-start after 8 sec
    waveTimer += dt;
    if (waveTimer >= 8) {
      waveTimer = 0;
      startWave(waveNum + 1);
    }
    animateScene(scaledDt);
    updateParticles(scaledDt);
    return;
  }

  if (gameState === 'waveclear') {
    waveClearTimer += dt;
    animateScene(scaledDt);
    updateParticles(scaledDt);
    if (waveClearTimer >= WAVE_PAUSE) {
      gameState = 'placing';
      waveTimer = 0;
      showWaveAnnounce('PLACE TOWERS');
    }
    return;
  }

  // Wave state
  if (gameState === 'wave') {
    // Process spawn queue
    spawnTimer += scaledDt;
    spawnQueue = spawnQueue.filter(s => {
      if (spawnTimer >= s.delay) {
        spawnEnemy(s.lane, s.hp, s.speed);
        return false;
      }
      return true;
    });

    animateScene(scaledDt);
    updateTowers(scaledDt);
    updateEnemies(scaledDt);
    updateProjectiles(scaledDt);
    updateParticles(scaledDt);
    checkWaveComplete();
  }
}

function animateScene(dt) {
  // Camera shake
  if (shakeMag > 0.01) {
    shakeX = (Math.random() - 0.5) * shakeMag;
    shakeY = (Math.random() - 0.5) * shakeMag;
    shakeMag *= 0.82;
  } else { shakeX = 0; shakeY = 0; shakeMag = 0; }
  camera.position.set(shakeX, 14 + shakeY, 8);
  camera.lookAt(0, 0, 0);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  if (useComposer) composer.render();
  else renderer.render(scene, camera);
}

// ============================================================
// GAME START
// ============================================================
function startGame() {
  document.getElementById('screen-overlay').style.display = 'none';
  gameState = 'placing';
  waveTimer = 0;
  credits = 100;
  breaches = 0;
  killCount = 0;
  waveNum = 0;
  updateCreditsUI();
  updateBreachUI();
  document.getElementById('wave-num').textContent = '—';
  document.getElementById('kill-num').textContent = '0';
  startBGM();
  showWaveAnnounce('PLACE YOUR TOWERS');
}

document.getElementById('start-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (audioCtx) audioCtx.resume();
  startGame();
});

document.addEventListener('click', () => { if (audioCtx) audioCtx.resume(); }, { once: true });

const best = localStorage.getItem('gl_best');
if (best) document.getElementById('best-display').textContent = 'Best: ' + best + ' kills';

initScene();
animate();
