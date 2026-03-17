import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// MODULE-SCOPE STATE (T2 — all game-critical vars at top scope)
// ============================================================
let scene, camera, renderer, composer, useComposer = false;
let clock;
let gameState = 'title'; // title | playing | waveclear | win | lose
let score = 0;
let lives = 3;
let waveNum = 0;
let killCount = 0;
let enemies = [];
let projectiles = [];
let particles = [];
let playerMesh;
let playerForgeLight;
let waveTimer = 0;
let waveClearTimer = 0;
const WAVE_PAUSE = 4.0;
let cooldownTimer = 0;
const FORGE_COOLDOWN = 2.0;
let cooldownActive = false;
let shakeX = 0, shakeY = 0, shakeMag = 0;
let audioCtx = null;
let bgmStarted = false;
let bgmNodes = [];

// Current weapon state
let currentWeapon = {
  word: 'BLAST',
  damageType: 'fire',
  projectileCount: 3,
  speed: 2,
  special: 'straight',
  color: 0xff6600,
  parsed: false
};

// Mouse position in world
let mouseWorld = new THREE.Vector2(0, 0);

// Waves config
const WAVE_CONFIG = [
  { count: 5, speed: 1.4 },
  { count: 8, speed: 1.6 },
  { count: 12, speed: 1.8 },
  { count: 16, speed: 2.1 },
  { count: 20, speed: 2.4 },
];
let waveEnemiesLeft = 0;
let waveSpawnTimer = 0;
const SPAWN_INTERVAL = 1.0;
let spawnedThisWave = 0;

// ============================================================
// PARSE SYSTEM
// ============================================================
const FIRE_LETTERS = ['B','P','F','V'];
const POISON_LETTERS = ['S','Z','H'];
const PIERCE_LETTERS = ['T','D','C','K'];
const WAVE_LETTERS = ['L','R','W'];
const MAGNET_LETTERS = ['M','N'];

const TYPE_COLOR = {
  fire:    0xff5500,
  poison:  0x44ff44,
  pierce:  0x88ccff,
  wave:    0xaa44ff,
  magnet:  0xff44aa,
};
const TYPE_NAME = {
  fire: 'FIRE', poison: 'VENOM', pierce: 'BLADE', wave: 'ARCWAVE', magnet: 'PULL',
};

function parseWord(raw) {
  const word = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (word.length < 2) return null;

  const first = word[0];
  const last2 = word.slice(-2);
  const vowels = (word.match(/[AEIOU]/g) || []).length;
  const len = word.length;

  // Damage type
  let damageType = 'fire';
  if (FIRE_LETTERS.includes(first)) damageType = 'fire';
  else if (POISON_LETTERS.includes(first)) damageType = 'poison';
  else if (PIERCE_LETTERS.includes(first)) damageType = 'pierce';
  else if (WAVE_LETTERS.includes(first)) damageType = 'wave';
  else if (MAGNET_LETTERS.includes(first)) damageType = 'magnet';
  else damageType = 'fire'; // fallback

  // Projectile count (word length)
  let projCount;
  if (len <= 3) projCount = 1;
  else if (len === 4) projCount = 2;
  else if (len === 5) projCount = 3;
  else if (len === 6) projCount = 4;
  else projCount = 5;

  // Speed (vowel count)
  let speedTier;
  const v = Math.max(vowels, 1);
  if (v === 1) speedTier = 1;
  else if (v === 2) speedTier = 2;
  else speedTier = 3;

  // Special effect
  let special = 'straight';
  if (last2 === 'NG') special = 'chain';
  else if (last2 === 'SH') special = 'spread';
  else if (last2 === 'ST') special = 'burst';
  else if (last2 === 'ER') special = 'homing';

  const color = TYPE_COLOR[damageType];

  return {
    word,
    damageType,
    projectileCount: projCount,
    speed: speedTier,
    special,
    color,
    parsed: true,
    vowelCount: v,
  };
}

function getTraceLines(w) {
  const first = w.word[0];
  const last2 = w.word.slice(-2);
  const len = w.word.length;
  const specialDesc = {
    chain: 'chain (hits 2 targets)',
    spread: 'spread cone (45°)',
    burst: 'burst on impact',
    homing: 'homing',
    straight: 'straight',
  };
  return [
    { key: `"${first}"`, val: `→ ${TYPE_NAME[w.damageType]} type` },
    { key: `${len} letters`, val: `→ ${w.projectileCount} projectile${w.projectileCount > 1 ? 's' : ''}` },
    { key: `${w.vowelCount} vowel${w.vowelCount !== 1 ? 's' : ''}`, val: `→ ${['','slow','medium','fast'][w.speed]} speed` },
    { key: `"-${last2}"`, val: `→ ${specialDesc[w.special]}` },
  ];
}

// ============================================================
// THREE.JS SETUP
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x100400);
  scene.fog = new THREE.FogExp2(0x1a0500, 0.018);

  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 22, 14);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Postprocessing
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.4, 0.85
    );
    composer.addPass(bloom);
    useComposer = true;
  } catch(e) {
    useComposer = false;
  }

  // Lighting
  const ambient = new THREE.AmbientLight(0xff8844, 2.2);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffaa55, 3.0);
  sun.position.set(5, 15, 8);
  sun.castShadow = true;
  scene.add(sun);

  const fillLight = new THREE.PointLight(0xff4400, 1.5, 40);
  fillLight.position.set(-8, 8, -4);
  scene.add(fillLight);

  // Ground — forge floor (copper-tinted grid)
  const gridHelper = new THREE.GridHelper(40, 20, 0x552200, 0x331100);
  gridHelper.position.y = 0;
  scene.add(gridHelper);

  // Ground plane (slightly below grid)
  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a0800, roughness: 0.9, metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Arena boundary — forge walls (glowing embers)
  buildForgeArena();

  // Player mesh
  createPlayer();

  // Starfield / ember particles
  buildEmberField();

  // Mouse tracking
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  window.addEventListener('resize', onResize);
}

function buildForgeArena() {
  // Corner forge pillars (anvil-like)
  const pillarGeo = new THREE.CylinderGeometry(0.6, 0.9, 3.5, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x442200, metalness: 0.8, roughness: 0.3 });
  const positions = [
    [-14, 0, -14], [14, 0, -14], [-14, 0, 14], [14, 0, 14],
    [-14, 0, 0], [14, 0, 0], [0, 0, -14], [0, 0, 14]
  ];
  positions.forEach((pos, i) => {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(pos[0], pos[1] + 1.75, pos[2]);
    p.castShadow = true;
    scene.add(p);
    // Ember light on every other pillar
    if (i % 2 === 0) {
      const emberLight = new THREE.PointLight(0xff4400, 1.2, 12);
      emberLight.position.set(pos[0], 4.5, pos[2]);
      scene.add(emberLight);
    }
  });

  // Center anvil / forge base where player stands
  const baseGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.4, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x663300, metalness: 0.7, roughness: 0.4, emissive: 0x220800, emissiveIntensity: 0.3 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.2, 0);
  scene.add(base);
}

function createPlayer() {
  // Player: glowing octahedron (like a forge crystal)
  const geo = new THREE.OctahedronGeometry(0.9, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0xff4400,
    emissiveIntensity: 1.0,
    metalness: 0.5,
    roughness: 0.3,
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.position.set(0, 1.2, 0);
  playerMesh.castShadow = true;
  scene.add(playerMesh);

  playerForgeLight = new THREE.PointLight(0xff6600, 2.5, 8);
  playerForgeLight.position.set(0, 1.5, 0);
  scene.add(playerForgeLight);
}

function buildEmberField() {
  const count = 400;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 36;
    positions[i * 3 + 1] = Math.random() * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xff6600, size: 0.08, transparent: true, opacity: 0.6 });
  const embers = new THREE.Points(geo, mat);
  scene.add(embers);
  // Store for animation
  scene.userData.embers = embers;
  scene.userData.emberPositions = positions;
}

// ============================================================
// WEAPON COLOR UPDATE
// ============================================================
function updatePlayerWeaponColor(color) {
  if (!playerMesh) return;
  playerMesh.material.emissive.setHex(color);
  playerMesh.material.color.setHex(color);
  playerForgeLight.color.setHex(color);
  // Update weapon-glow CSS element
  const glowEl = document.getElementById('weapon-glow');
  const hex = '#' + color.toString(16).padStart(6, '0');
  glowEl.style.background = hex;
  glowEl.style.boxShadow = `0 0 20px 8px ${hex}66`;
  glowEl.style.opacity = '1';
}

// ============================================================
// ENEMY CREATION
// ============================================================
function spawnEnemy(waveSpeed) {
  const side = Math.floor(Math.random() * 4);
  let x, z;
  const R = 14;
  if (side === 0) { x = -R + Math.random() * R * 2; z = -R; }
  else if (side === 1) { x = R; z = -R + Math.random() * R * 2; }
  else if (side === 2) { x = -R + Math.random() * R * 2; z = R; }
  else { x = -R; z = -R + Math.random() * R * 2; }

  const geoChoices = [
    new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.TetrahedronGeometry(0.9, 0),
    new THREE.IcosahedronGeometry(0.7, 0),
  ];
  const geo = geoChoices[Math.floor(Math.random() * geoChoices.length)];
  const mat = new THREE.MeshStandardMaterial({
    color: 0xcc2200,
    emissive: 0x660000,
    emissiveIntensity: 0.7,
    metalness: 0.6,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.8, z);
  mesh.castShadow = true;
  scene.add(mesh);

  // HP bar (plane geometry)
  const barBgGeo = new THREE.PlaneGeometry(1.2, 0.18);
  const barBgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
  const barBg = new THREE.Mesh(barBgGeo, barBgMat);
  barBg.position.set(0, 1.4, 0);
  barBg.rotation.x = -Math.PI / 4;
  mesh.add(barBg);

  const barFgGeo = new THREE.PlaneGeometry(1.0, 0.12);
  const barFgMat = new THREE.MeshBasicMaterial({ color: 0xff3300, side: THREE.DoubleSide });
  const barFg = new THREE.Mesh(barFgGeo, barFgMat);
  barFg.position.set(0, 0.001, 0);
  barBg.add(barFg);

  const maxHp = waveNum <= 2 ? 2 : waveNum <= 4 ? 3 : 4;
  enemies.push({
    mesh,
    hp: maxHp, maxHp,
    speed: waveSpeed,
    attackTimer: 0,
    barFg,
    rotSpeed: (Math.random() - 0.5) * 2.0,
    dead: false,
  });
}

// ============================================================
// PROJECTILE CREATION
// ============================================================
function fireWeapon() {
  if (!currentWeapon.parsed) {
    // Default weapon
    currentWeapon = parseWord('BLAST');
    currentWeapon.parsed = true;
  }

  const w = currentWeapon;
  const baseDir = new THREE.Vector3(mouseWorld.x - 0, 0, mouseWorld.y - 0).normalize();
  if (baseDir.length() < 0.01) return;

  const speedMap = [0, 7, 10, 14];
  const projSpeed = speedMap[w.speed];

  const colorObj = new THREE.Color(w.color);

  if (w.special === 'spread') {
    // Fan of projectiles
    const count = Math.max(w.projectileCount, 2);
    const spreadAngle = (Math.PI / 4); // 45 degrees
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5);
      const angle = t * spreadAngle;
      const dir = baseDir.clone();
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      spawnProjectile(dir, projSpeed, w, colorObj);
    }
  } else if (w.special === 'burst') {
    // Fires normal but on hit will AoE — just fires in cone for prototype
    for (let i = 0; i < w.projectileCount; i++) {
      const jitter = (Math.random() - 0.5) * 0.25;
      const dir = baseDir.clone();
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), jitter);
      spawnProjectile(dir, projSpeed, w, colorObj);
    }
  } else {
    // Straight (also chain and homing use same fire but different hit logic)
    for (let i = 0; i < w.projectileCount; i++) {
      const jitter = w.projectileCount > 1 ? (i / (w.projectileCount - 1) - 0.5) * 0.3 : 0;
      const dir = baseDir.clone();
      dir.applyAxisAngle(new THREE.Vector3(0,1,0), jitter);
      spawnProjectile(dir, projSpeed, w, colorObj);
    }
  }

  sfxFire(w);
  triggerCooldown();
}

function spawnProjectile(dir, speed, weapon, colorObj) {
  const geo = new THREE.SphereGeometry(0.22, 6, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: colorObj,
    emissive: colorObj,
    emissiveIntensity: 2.0,
    transparent: true, opacity: 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(playerMesh.position.x, 0.9, playerMesh.position.z);
  scene.add(mesh);

  const pLight = new THREE.PointLight(colorObj, 1.5, 5);
  mesh.add(pLight);

  projectiles.push({
    mesh,
    dir: dir.clone(),
    speed,
    weapon: { ...weapon },
    life: 0,
    maxLife: 3.5,
    dead: false,
    chainsLeft: weapon.special === 'chain' ? 2 : 0,
    homingTarget: null,
  });
}

// ============================================================
// PARTICLES
// ============================================================
function spawnHitParticles(pos, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.TetrahedronGeometry(0.15 + Math.random() * 0.15, 0);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 2,
      transparent: true, opacity: 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 6
    );
    particles.push({ mesh, vel, life: 0, maxLife: 0.7 + Math.random() * 0.4, dead: false });
  }
}

function spawnForgeSparkParticles(pos, count = 20) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 4, 4);
    const colors = [0xff8800, 0xff4400, 0xffcc00, 0xff6600];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 8
    );
    particles.push({ mesh, vel, life: 0, maxLife: 0.5 + Math.random() * 0.4, dead: false });
  }
}

// ============================================================
// WAVE MANAGEMENT
// ============================================================
function startWave(num) {
  waveNum = num;
  spawnedThisWave = 0;
  waveSpawnTimer = 0;
  const cfg = WAVE_CONFIG[num - 1];
  waveEnemiesLeft = cfg.count;

  document.getElementById('wave-num').textContent = num + '/5';
  showWaveAnnounce('WAVE ' + num);
  sfxWaveSiren();
}

function showWaveAnnounce(text) {
  const el = document.getElementById('wave-announce');
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

function checkWaveComplete() {
  if (spawnedThisWave >= (WAVE_CONFIG[waveNum - 1]?.count || 0) && enemies.length === 0) {
    if (waveNum >= 5) {
      triggerWin();
    } else {
      gameState = 'waveclear';
      waveClearTimer = 0;
      showWaveAnnounce('WAVE CLEAR ✓');
      sfxWaveClear();
      // Re-enable forge during wave clear
      enableForge();
    }
  }
}

// ============================================================
// DAMAGE & LIVES
// ============================================================
function enemyReachesCenter(enemy) {
  enemy.dead = true;
  scene.remove(enemy.mesh);
  lives--;
  updateLivesUI();
  cameraShake(0.5);
  sfxPlayerHit();
  if (lives <= 0) {
    triggerLose();
  }
}

function damageEnemy(enemy, dmg, projectile) {
  enemy.hp -= dmg;
  updateEnemyBar(enemy);
  cameraShake(0.1);
  spawnHitParticles(enemy.mesh.position.clone(), new THREE.Color(projectile.weapon.color), 8);

  // Special: burst = AoE
  if (projectile.weapon.special === 'burst') {
    enemies.forEach(e => {
      if (e !== enemy && !e.dead) {
        const d = e.mesh.position.distanceTo(enemy.mesh.position);
        if (d < 3.5) {
          e.hp -= 1;
          updateEnemyBar(e);
          spawnHitParticles(e.mesh.position.clone(), new THREE.Color(projectile.weapon.color), 4);
          if (e.hp <= 0) killEnemy(e);
        }
      }
    });
  }

  // Special: chain
  if (projectile.weapon.special === 'chain' && projectile.chainsLeft > 0) {
    const nearby = enemies.filter(e => e !== enemy && !e.dead)
      .sort((a, b) => a.mesh.position.distanceTo(enemy.mesh.position) - b.mesh.position.distanceTo(enemy.mesh.position));
    if (nearby.length > 0) {
      const target = nearby[0];
      const chainProj = {
        mesh: null,
        dir: target.mesh.position.clone().sub(enemy.mesh.position).normalize(),
        speed: projectile.speed + 2,
        weapon: { ...projectile.weapon },
        life: 0,
        maxLife: 1.5,
        dead: false,
        chainsLeft: projectile.chainsLeft - 1,
        homingTarget: target,
        isChain: true,
      };
      // Spawn tiny chain projectile
      const geo = new THREE.SphereGeometry(0.14, 4, 4);
      const mat = new THREE.MeshStandardMaterial({ color: projectile.weapon.color, emissive: projectile.weapon.color, emissiveIntensity: 3, transparent: true, opacity: 1.0 });
      chainProj.mesh = new THREE.Mesh(geo, mat);
      chainProj.mesh.position.copy(enemy.mesh.position);
      scene.add(chainProj.mesh);
      projectiles.push(chainProj);
    }
  }

  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  scene.remove(enemy.mesh);
  killCount++;
  score += 10;
  document.getElementById('score-num').textContent = killCount;
  spawnHitParticles(enemy.mesh.position.clone(), new THREE.Color(0xff4400), 14);
  sfxEnemyDie();
  cameraShake(0.15);
}

function updateEnemyBar(enemy) {
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  enemy.barFg.scale.x = ratio;
  enemy.barFg.position.x = -(1 - ratio) * 0.5;
  if (ratio < 0.4) enemy.barFg.material.color.setHex(0xff8800);
}

// ============================================================
// FORGE INPUT SYSTEM
// ============================================================
function enableForge() {
  const input = document.getElementById('word-input');
  const btn = document.getElementById('forge-btn');
  if (!cooldownActive) {
    input.disabled = false;
    btn.disabled = false;
    input.focus();
  }
}

function disableForge() {
  const input = document.getElementById('word-input');
  const btn = document.getElementById('forge-btn');
  input.disabled = true;
  btn.disabled = true;
}

function triggerCooldown() {
  cooldownTimer = 0;
  cooldownActive = true;
  disableForge();
}

function onForgeWord(word) {
  if (!word || word.trim().length < 2) return;
  const parsed = parseWord(word);
  if (!parsed) return;

  currentWeapon = parsed;
  updatePlayerWeaponColor(parsed.color);
  animateForgeTrace(parsed);
  sfxForgeComplete(parsed);
  spawnForgeSparkParticles(playerMesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 25);

  // Update weapon display
  document.getElementById('weapon-name-display').textContent =
    `⚒ ${parsed.word} — ${TYPE_NAME[parsed.damageType]} · ${parsed.projectileCount}× · ${['','slow','med','fast'][parsed.speed]} · ${parsed.special}`;
}

async function animateForgeTrace(w) {
  const steps = getTraceLines(w);
  const container = document.getElementById('trace-steps');
  container.innerHTML = '';

  for (let i = 0; i < steps.length; i++) {
    const div = document.createElement('div');
    div.className = 'trace-step';
    div.innerHTML = `<span class="trace-key">${steps[i].key}</span><span class="trace-arrow">→</span><span class="trace-val">${steps[i].val}</span>`;
    container.appendChild(div);
    await sleep(120);
    div.classList.add('visible');
    sfxTraceStep(i);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// UI
// ============================================================
function updateLivesUI() {
  for (let i = 0; i < 3; i++) {
    const pip = document.getElementById('life-' + i);
    pip.classList.toggle('empty', i >= lives);
  }
}

// ============================================================
// GAME STATE TRANSITIONS
// ============================================================
function triggerWin() {
  gameState = 'win'; // B2 — set FIRST
  const best = parseInt(localStorage.getItem('wf_best') || '0');
  if (score > best) localStorage.setItem('wf_best', score);
  sfxWin();
  setTimeout(() => {
    const overlay = document.getElementById('screen-overlay');
    overlay.innerHTML = `
      <h1>FORGED</h1>
      <div class="sub" id="result-label" style="color:#ffcc33">ALL 5 WAVES CLEARED</div>
      <div class="hint">Score: ${score} kills</div>
      <div id="best-display">Best: ${Math.max(score, best)}</div>
      <button id="restart-btn" onclick="location.reload()">FORGE AGAIN</button>
    `;
    overlay.style.display = 'flex';
  }, 500);
}

function triggerLose() {
  gameState = 'lose'; // B2 — set FIRST
  sfxGameOver();
  cameraShake(1.0);
  setTimeout(() => {
    const best = parseInt(localStorage.getItem('wf_best') || '0');
    const overlay = document.getElementById('screen-overlay');
    overlay.innerHTML = `
      <h1 style="color:#cc3300">SHATTERED</h1>
      <div class="sub" id="result-label">The forge went cold</div>
      <div class="hint">Score: ${score} kills · Wave ${waveNum}/5</div>
      <div id="best-display">Best: ${best}</div>
      <button id="restart-btn" onclick="location.reload()">TRY AGAIN</button>
    `;
    overlay.style.display = 'flex';
  }, 600);
}

// ============================================================
// MOUSE / INPUT
// ============================================================
function onMouseMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  mouseWorld.set(target.x, target.z);

  // Rotate player to face mouse
  if (playerMesh && gameState === 'playing') {
    const dx = target.x - playerMesh.position.x;
    const dz = target.z - playerMesh.position.z;
    playerMesh.rotation.y = -Math.atan2(dx, dz);
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  if (gameState === 'playing') {
    fireWeapon();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (useComposer) composer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
// CAMERA SHAKE
// ============================================================
function cameraShake(mag) {
  shakeMag = Math.max(shakeMag, mag);
}

// ============================================================
// AUDIO (Web Audio API)
// ============================================================
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, type, duration, gain, startDelay = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + startDelay;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.7, t + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch(e) {}
}

function sfxTraceStep(i) {
  const freqs = [330, 440, 550, 660];
  playTone(freqs[i] || 440, 'triangle', 0.08, 0.12);
}

function sfxForgeComplete(w) {
  // Hammer strike + rising tone based on weapon type
  const typeFreqs = { fire: 220, poison: 180, pierce: 330, wave: 260, magnet: 200 };
  const base = typeFreqs[w.damageType] || 220;
  // Metallic clank
  playTone(base * 2, 'sawtooth', 0.06, 0.25);
  playTone(base * 1.5, 'triangle', 0.15, 0.2, 0.05);
  playTone(base, 'sine', 0.35, 0.3, 0.1);
  // Speed-based rising chord
  if (w.speed >= 2) playTone(base * 3, 'sine', 0.2, 0.15, 0.15);
  if (w.speed >= 3) playTone(base * 4, 'sine', 0.15, 0.12, 0.2);
}

function sfxFire(w) {
  const typeFreqs = { fire: 180, poison: 120, pierce: 400, wave: 200, magnet: 150 };
  const base = typeFreqs[w.damageType] || 200;
  if (w.damageType === 'fire') {
    playTone(base, 'sawtooth', 0.06, 0.18);
  } else if (w.damageType === 'poison') {
    playTone(base, 'sine', 0.1, 0.15);
    playTone(base * 1.5, 'sine', 0.08, 0.1, 0.02);
  } else if (w.damageType === 'pierce') {
    playTone(base, 'square', 0.04, 0.2);
  } else if (w.damageType === 'wave') {
    playTone(base, 'sine', 0.12, 0.18);
    playTone(base * 2, 'sine', 0.1, 0.12, 0.03);
  } else {
    playTone(base, 'triangle', 0.1, 0.15);
  }
}

function sfxEnemyDie() {
  playTone(440, 'sine', 0.07, 0.15);
  playTone(330, 'triangle', 0.06, 0.12, 0.03);
}

function sfxPlayerHit() {
  playTone(120, 'sawtooth', 0.2, 0.35);
  playTone(80, 'sine', 0.3, 0.3, 0.05);
}

function sfxWaveSiren() {
  playTone(440, 'triangle', 0.2, 0.2);
  playTone(550, 'triangle', 0.2, 0.18, 0.2);
  playTone(660, 'triangle', 0.2, 0.16, 0.4);
}

function sfxWaveClear() {
  [330, 440, 550, 660, 880].forEach((f, i) => {
    playTone(f, 'sine', 0.18, 0.18, i * 0.1);
  });
}

function sfxWin() {
  const notes = [330, 440, 550, 660, 880, 1100];
  notes.forEach((f, i) => playTone(f, 'sine', 0.4, 0.22, i * 0.12));
}

function sfxGameOver() {
  [440, 330, 220, 165].forEach((f, i) => {
    playTone(f, 'sawtooth', 0.3, 0.25, i * 0.18);
  });
}

function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  try {
    const ctx = getAudioCtx();
    // Sub-bass forge drone
    scheduleBGM(ctx);
  } catch(e) {}
}

function scheduleBGM(ctx) {
  // Rhythmic forge hammer pattern — 120 BPM
  const bpm = 120;
  const beat = 60 / bpm;
  const loopLen = beat * 16;
  const startTime = ctx.currentTime + 0.1;

  function playBGMLoop(startT) {
    // Sub-bass drone
    playDrone(startT, loopLen);
    // Hammer hits on beats 1, 3, 5, 7...
    for (let b = 0; b < 16; b++) {
      const t = startT + b * beat;
      if (b % 2 === 0) {
        // Heavy beat
        playHammer(t, 80, 0.28);
      } else if (b % 4 === 1) {
        // Light off-beat
        playHammer(t, 120, 0.12);
      }
      // Metallic arpeggio on beats 2, 6, 10, 14
      if (b === 2 || b === 6 || b === 10 || b === 14) {
        playArpeggio(t, startT);
      }
    }
    // Glitch accent
    playToneAt(ctx, startT + beat * 7, 880, 'triangle', 0.04, 0.06);
    playToneAt(ctx, startT + beat * 11, 660, 'triangle', 0.04, 0.06);
    playToneAt(ctx, startT + beat * 15, 1100, 'triangle', 0.03, 0.05);

    // Schedule next loop
    const nextStart = startT + loopLen;
    const timeUntilNext = (nextStart - ctx.currentTime - 0.1) * 1000;
    if (bgmStarted) {
      setTimeout(() => {
        if (bgmStarted && gameState === 'playing') scheduleBGM(ctx);
      }, Math.max(0, timeUntilNext));
    }
  }

  playBGMLoop(startTime);
}

function playDrone(startT, dur) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 55;
    g.gain.setValueAtTime(0.12, startT);
    g.gain.setValueAtTime(0.09, startT + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.start(startT);
    osc.stop(startT + dur + 0.05);
  } catch(e) {}
}

function playHammer(t, freq, gain) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.7, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch(e) {}
}

function playArpeggio(t, baseT) {
  const notes = [220, 277, 330, 415];
  notes.forEach((f, i) => {
    playToneAt(getAudioCtx(), t + i * 0.06, f, 'triangle', 0.07, 0.1);
  });
}

function playToneAt(ctx, t, freq, type, gain, dur) {
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.7, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch(e) {}
}

// ============================================================
// MAIN UPDATE LOOP
// ============================================================
function update(dt) {
  if (gameState !== 'playing' && gameState !== 'waveclear') return;

  // Ember drift
  if (scene.userData.embers && scene.userData.emberPositions) {
    const pos = scene.userData.emberPositions;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] += dt * (0.3 + (i % 7) * 0.08);
      if (pos[i + 1] > 13) pos[i + 1] = 0;
    }
    scene.userData.embers.geometry.attributes.position.needsUpdate = true;
  }

  // Player pulse
  const t = clock.elapsedTime;
  const pulse = 1.0 + Math.sin(t * 3) * 0.06;
  playerMesh.scale.setScalar(pulse);
  playerMesh.rotation.y += dt * 1.2;
  playerForgeLight.intensity = 2.0 + Math.sin(t * 4) * 0.8;

  // Camera shake
  if (shakeMag > 0.01) {
    shakeX = (Math.random() - 0.5) * shakeMag;
    shakeY = (Math.random() - 0.5) * shakeMag;
    shakeMag *= 0.85;
  } else {
    shakeX = 0; shakeY = 0; shakeMag = 0;
  }
  camera.position.set(shakeX, 22 + shakeY, 14);
  camera.lookAt(0, 0, 0);

  // Cooldown
  if (cooldownActive) {
    cooldownTimer += dt;
    const pct = Math.min(cooldownTimer / FORGE_COOLDOWN, 1.0) * 100;
    document.getElementById('cooldown-bar').style.width = pct + '%';
    if (cooldownTimer >= FORGE_COOLDOWN) {
      cooldownActive = false;
      cooldownTimer = 0;
      document.getElementById('cooldown-bar').style.width = '0%';
      enableForge();
    }
  }

  // Waveclear state
  if (gameState === 'waveclear') {
    waveClearTimer += dt;
    if (waveClearTimer >= WAVE_PAUSE) {
      gameState = 'playing';
      startWave(waveNum + 1);
    }
    return;
  }

  // Spawn enemies
  if (spawnedThisWave < WAVE_CONFIG[waveNum - 1].count) {
    waveSpawnTimer += dt;
    if (waveSpawnTimer >= SPAWN_INTERVAL) {
      waveSpawnTimer = 0;
      spawnEnemy(WAVE_CONFIG[waveNum - 1].speed);
      spawnedThisWave++;
    }
  }

  // Update enemies
  enemies = enemies.filter(e => !e.dead);
  for (const enemy of enemies) {
    // Move toward center
    const dir = new THREE.Vector3(-enemy.mesh.position.x, 0, -enemy.mesh.position.z).normalize();
    enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
    enemy.mesh.rotation.x += enemy.rotSpeed * dt;
    enemy.mesh.rotation.z += enemy.rotSpeed * 0.7 * dt;

    // HP bar always faces camera
    // (already child of mesh, rotation fixed)

    // Check if reached center
    const distToCenter = Math.sqrt(enemy.mesh.position.x ** 2 + enemy.mesh.position.z ** 2);
    if (distToCenter < 2.0) {
      enemyReachesCenter(enemy);
    }
  }

  // Update projectiles
  projectiles = projectiles.filter(p => !p.dead);
  for (const proj of projectiles) {
    proj.life += dt;
    if (proj.life > proj.maxLife) {
      proj.dead = true;
      scene.remove(proj.mesh);
      continue;
    }

    // Homing: steer toward nearest enemy
    if (proj.weapon.special === 'homing') {
      let nearest = null;
      let nearDist = Infinity;
      for (const e of enemies) {
        if (!e.dead) {
          const d = proj.mesh.position.distanceTo(e.mesh.position);
          if (d < nearDist) { nearDist = d; nearest = e; }
        }
      }
      if (nearest) {
        const toTarget = nearest.mesh.position.clone().sub(proj.mesh.position).normalize();
        proj.dir.lerp(toTarget, dt * 4).normalize();
      }
    }

    proj.mesh.position.addScaledVector(proj.dir, proj.speed * dt);

    // Collision with enemies
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = proj.mesh.position.distanceTo(enemy.mesh.position);
      if (dist < 1.2) {
        damageEnemy(enemy, 1, proj);
        proj.dead = true;
        scene.remove(proj.mesh);
        break;
      }
    }
  }

  // Update particles
  particles = particles.filter(p => !p.dead);
  for (const p of particles) {
    p.life += dt;
    const ratio = p.life / p.maxLife;
    if (ratio >= 1) {
      p.dead = true;
      scene.remove(p.mesh);
      continue;
    }
    p.vel.y -= 9 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = 1.0 - ratio;
    p.mesh.rotation.x += dt * 3;
    p.mesh.rotation.y += dt * 2;
  }

  checkWaveComplete();
}

// ============================================================
// RENDER LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  if (useComposer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// ============================================================
// INIT & START
// ============================================================
function startGame() {
  document.getElementById('screen-overlay').style.display = 'none';
  document.getElementById('weapon-glow').style.opacity = '1';
  gameState = 'playing';
  score = 0;
  lives = 3;
  killCount = 0;
  waveNum = 0;
  enemies = [];
  projectiles = [];
  particles = [];
  updateLivesUI();
  document.getElementById('score-num').textContent = '0';

  // Set initial weapon
  currentWeapon = parseWord('BLAST');
  updatePlayerWeaponColor(currentWeapon.color);
  onForgeWord('BLAST');
  enableForge();
  startBGM();
  startWave(1);
}

// Setup UI events
document.getElementById('start-btn').addEventListener('click', e => {
  e.stopPropagation();
  if (audioCtx) audioCtx.resume();
  startGame();
});

document.getElementById('forge-btn').addEventListener('click', e => {
  e.stopPropagation();
  const input = document.getElementById('word-input');
  const word = input.value.trim();
  if (word.length >= 2) {
    onForgeWord(word);
    triggerCooldown();
    input.value = '';
  }
});

document.getElementById('word-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const word = e.target.value.trim();
    if (word.length >= 2) {
      onForgeWord(word);
      triggerCooldown();
      e.target.value = '';
    }
  }
  // Resume audio on first keypress
  if (audioCtx) audioCtx.resume();
});

// Init best display on title
const best = localStorage.getItem('wf_best');
if (best) document.getElementById('best-display').textContent = 'Best: ' + best + ' kills';

// Resume audio on any click
document.addEventListener('click', () => { if (audioCtx) audioCtx.resume(); }, { once: true });

// Initialize Three.js scene
initScene();
animate();
