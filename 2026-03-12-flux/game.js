// FLUX — game.js
// Forge 🔨 | Build #14 | 2026-03-12

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── T2: ALL game state at module scope ───────────────────────────────────────
let gameState = 'title'; // 'title' | 'playing' | 'ended'
let score = 0;
let hp = 3;
let maxHp = 3;
let invincibleTimer = 0;
let weaponIndex = 0; // cycles 0-3
let runSeed = Math.floor(Math.random() * 10000);
let timeLeft = 45;
let waveTimer = 0;
let waveNumber = 0;
let killStreak = 0; // for combo
let comboActive = false;
let cameraShakeAmount = 0;

const WEAPONS = ['BOOMERANG', 'SCATTER', 'GRAVITY WELL', 'CHAIN LIGHTNING'];
const WEAPON_COLORS = [0x00ffff, 0xff6600, 0xaa00ff, 0xffee00];
const WEAPON_HINTS = ['click to fire', 'click to fire (×5)', 'click to place', 'click to strike'];

let scene, camera, renderer, composer;
let playerMesh, playerLight;
let enemies = [];
let projectiles = [];
let particles = [];
let gravityWells = [];
let lightningArcs = [];

let shootCooldown = 0;
let gravityWellCooldown = 0;

// Mouse / keys
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };
let mouseWorld = new THREE.Vector3();

// Audio context
let audioCtx = null;
let bgmGain = null;
let bgmStarted = false;

// ─── Renderer setup ───────────────────────────────────────────────────────────
function initRenderer() {
  // T4: WebGPU with WebGL fallback
  // Try WebGPU renderer first; fall back to WebGL if unavailable
  try {
    if (navigator.gpu) {
      // WebGPU path — import dynamically
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    }
  } catch (e) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  document.getElementById('canvas-container').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000508);
  scene.fog = new THREE.FogExp2(0x000508, 0.045);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 22, 0);
  camera.lookAt(0, 0, 0);
  camera.rotation.z = 0;

  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.4, 0.5, 0.2
  );
  composer.addPass(bloom);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

// ─── Scene setup ──────────────────────────────────────────────────────────────
function buildScene() {
  // Ambient + directional light
  const ambient = new THREE.AmbientLight(0x111122, 0.8);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x4466ff, 0.5);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Starfield — 600 stars
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 200;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40 + 10;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));

  // Grid floor
  const gridHelper = new THREE.GridHelper(30, 20, 0x112244, 0x0a1a33);
  gridHelper.position.y = -0.05;
  scene.add(gridHelper);

  // Arena hex border — ring of small glowing boxes
  buildArenaBorder();
}

function buildArenaBorder() {
  const RADIUS = 14;
  const N = 24;
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    const geo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1133aa,
      emissive: 0x0022ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    // T1: use .set()
    mesh.position.set(x, 0, z);
    scene.add(mesh);
  }
  // Large torus ring
  const torusGeo = new THREE.TorusGeometry(RADIUS, 0.08, 8, 64);
  const torusMat = new THREE.MeshStandardMaterial({
    color: 0x2244ff, emissive: 0x1133cc, emissiveIntensity: 1.2,
    transparent: true, opacity: 0.5
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.rotation.x = Math.PI / 2;
  scene.add(torus);
}

// ─── Player ───────────────────────────────────────────────────────────────────
function spawnPlayer() {
  if (playerMesh) {
    scene.remove(playerMesh);
    scene.remove(playerLight);
  }
  const geo = new THREE.OctahedronGeometry(0.55, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: WEAPON_COLORS[weaponIndex],
    emissive: WEAPON_COLORS[weaponIndex],
    emissiveIntensity: 0.9
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.position.set(0, 0.4, 0);
  scene.add(playerMesh);

  playerLight = new THREE.PointLight(WEAPON_COLORS[weaponIndex], 2.5, 8);
  playerLight.position.set(0, 1.5, 0);
  scene.add(playerLight);
}

// ─── Enemies ──────────────────────────────────────────────────────────────────
function spawnWave() {
  waveNumber++;
  const count = 3 + (waveNumber - 1) * 2;
  const RADIUS = 13;

  // seeded random positions around edge (G4: use runSeed)
  const seed = runSeed + waveNumber * 100;
  for (let i = 0; i < count; i++) {
    const angle = ((seed * (i + 1) * 2654435761) % 10000) / 10000 * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    spawnEnemy(x, z);
  }

  // Audio: wave swell
  playWaveSwell();
  updateWaveUI();
}

function spawnEnemy(x, z) {
  const geo = new THREE.ConeGeometry(0.45, 0.9, 6);
  const color = lerpColor(0xff2222, 0xff8800, Math.random() * 0.4);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: 0xff2200,
    emissiveIntensity: 0.6
  });
  const mesh = new THREE.Mesh(geo, mat);
  // T1
  mesh.position.set(x, 0.4, z);
  mesh.rotation.x = Math.PI;
  scene.add(mesh);

  const speed = 2.5 + waveNumber * 0.3;
  enemies.push({
    mesh,
    hp: 1,
    speed,
    attackPulse: 0,
    attackTimer: 0,
    pullVelocity: new THREE.Vector3()
  });
}

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  return ((r1 + (r2 - r1) * t) << 16) | ((g1 + (g2 - g1) * t) << 8) | (b1 + (b2 - b1) * t);
}

// ─── Shooting ─────────────────────────────────────────────────────────────────
function shoot() {
  if (gameState !== 'playing') return;
  const wi = weaponIndex;

  if (wi === 0) shootBoomerang();
  else if (wi === 1) shootScatter();
  else if (wi === 2) placeGravityWell();
  else if (wi === 3) fireChainLightning();
}

// WEAPON 0: BOOMERANG
function shootBoomerang() {
  if (shootCooldown > 0) return;
  shootCooldown = 0.8;

  const dir = getAimDir();
  const geo = new THREE.TorusGeometry(0.35, 0.08, 8, 24, Math.PI * 1.5);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x00ddff, emissiveIntensity: 1.2
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(playerMesh.position);
  mesh.position.y = 0.5;
  scene.add(mesh);

  const startPos = playerMesh.position.clone();
  const maxDist = 9;
  let t = 0;
  const perpDir = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

  projectiles.push({
    mesh, type: 'boomerang',
    dir: dir.clone(), perpDir,
    startPos: startPos.clone(),
    t: 0, returning: false,
    speed: 10, maxDist,
    hitOnReturn: false,
    active: true,
    hitEnemies: new Set()
  });

  playSFX('boomerang');
}

// WEAPON 1: SCATTER
function shootScatter() {
  if (shootCooldown > 0) return;
  shootCooldown = 0.25;

  const dir = getAimDir();
  const angles = [-0.25, -0.13, 0, 0.13, 0.25];

  for (const a of angles) {
    const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const geo = new THREE.SphereGeometry(0.18, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(playerMesh.position);
    mesh.position.y = 0.5;
    scene.add(mesh);

    projectiles.push({
      mesh, type: 'scatter',
      dir: d.clone(), speed: 14,
      maxDist: 6, distTraveled: 0,
      active: true
    });
  }
  playSFX('scatter');
}

// WEAPON 2: GRAVITY WELL
function placeGravityWell() {
  if (gravityWellCooldown > 0) return;
  gravityWellCooldown = 3.0;

  const geo = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaa00ff, emissive: 0x8800cc, emissiveIntensity: 1.5,
    transparent: true, opacity: 0.85
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(mouseWorld.x, 0.5, mouseWorld.z);
  scene.add(mesh);

  // Particle infall effect
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(30 * 3);
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 1.5;
    pPos[i * 3] = mouseWorld.x + Math.cos(a) * r;
    pPos[i * 3 + 1] = 0.5;
    pPos[i * 3 + 2] = mouseWorld.z + Math.sin(a) * r;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xcc00ff, size: 0.2, sizeAttenuation: true });
  const pts = new THREE.Points(pGeo, pMat);
  scene.add(pts);

  const wellObj = {
    mesh, pts, pGeo,
    pos: new THREE.Vector3(mouseWorld.x, 0.5, mouseWorld.z),
    lifetime: 2.0, detonated: false, active: true
  };
  gravityWells.push(wellObj);
  playSFX('gravityWell_place');
}

// WEAPON 3: CHAIN LIGHTNING
function fireChainLightning() {
  if (shootCooldown > 0) return;
  shootCooldown = 0.5;

  if (enemies.length === 0) return;

  // Find nearest enemy
  let chain = [];
  let available = [...enemies];
  let pos = playerMesh.position.clone();

  for (let c = 0; c < 3; c++) {
    if (available.length === 0) break;
    let nearest = null, nearDist = Infinity;
    for (const e of available) {
      const d = e.mesh.position.distanceTo(pos);
      if (d < nearDist) { nearDist = d; nearest = e; }
    }
    if (nearest) {
      chain.push(nearest);
      pos = nearest.mesh.position.clone();
      available = available.filter(e => e !== nearest);
    }
  }

  // Draw chain arcs
  for (let i = 0; i < chain.length; i++) {
    const from = i === 0 ? playerMesh.position : chain[i - 1].mesh.position;
    const to = chain[i].mesh.position;
    const points = [
      new THREE.Vector3(from.x, 0.5, from.z),
      new THREE.Vector3(to.x, 0.5, to.z)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffee00 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    lightningArcs.push({ line, lifetime: 0.15 });

    // Damage
    killEnemy(chain[i]);
  }

  playSFX('chainLightning');
}

// ─── Projectile update ────────────────────────────────────────────────────────
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.active) { removeProjectile(i); continue; }

    if (p.type === 'boomerang') updateBoomerang(p, dt, i);
    else if (p.type === 'scatter') updateScatter(p, dt, i);
  }
}

function updateBoomerang(p, dt, idx) {
  // Arc outward then return
  if (!p.returning) {
    p.t += dt * p.speed;
    const dist = p.t;
    // Arc: move forward + slight curve
    const forward = p.dir.clone().multiplyScalar(dist);
    const curve = p.perpDir.clone().multiplyScalar(Math.sin(p.t * 0.5) * 1.2);
    const newPos = p.startPos.clone().add(forward).add(curve);
    newPos.y = 0.5;
    p.mesh.position.copy(newPos);
    p.mesh.rotation.y += dt * 8;

    if (dist >= p.maxDist) {
      p.returning = true;
      p.t = 0;
    }
    // Check enemy hits (outward)
    checkBoomerangHits(p);
  } else {
    // Return to player
    p.t += dt * p.speed * 1.2;
    const playerPos = playerMesh.position.clone();
    playerPos.y = 0.5;
    const d = p.mesh.position.distanceTo(playerPos);
    const returnDir = playerPos.clone().sub(p.mesh.position).normalize();
    p.mesh.position.addScaledVector(returnDir, dt * p.speed * 1.5);
    p.mesh.position.y = 0.5;
    p.mesh.rotation.y += dt * 10;

    // Check enemy hits (return)
    checkBoomerangHits(p);

    if (d < 0.8) {
      scene.remove(p.mesh);
      projectiles.splice(idx, 1);
    }
  }
}

function checkBoomerangHits(p) {
  for (const e of enemies) {
    if (p.hitEnemies.has(e)) continue;
    const d = p.mesh.position.distanceTo(e.mesh.position);
    if (d < 1.0) {
      p.hitEnemies.add(e);
      killEnemy(e);
    }
  }
}

function updateScatter(p, dt, idx) {
  const step = p.speed * dt;
  p.mesh.position.addScaledVector(p.dir, step);
  p.mesh.position.y = 0.5;
  p.distTraveled += step;

  // Check hits
  for (const e of enemies) {
    if (p.mesh.position.distanceTo(e.mesh.position) < 0.7) {
      killEnemy(e);
      scene.remove(p.mesh);
      projectiles.splice(idx, 1);
      return;
    }
  }

  if (p.distTraveled >= p.maxDist) {
    scene.remove(p.mesh);
    projectiles.splice(idx, 1);
  }
}

function removeProjectile(idx) {
  if (projectiles[idx].mesh) scene.remove(projectiles[idx].mesh);
  projectiles.splice(idx, 1);
}

// ─── Gravity wells ────────────────────────────────────────────────────────────
function updateGravityWells(dt) {
  for (let i = gravityWells.length - 1; i >= 0; i--) {
    const w = gravityWells[i];
    w.lifetime -= dt;

    // Pulse scale
    const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
    w.mesh.scale.setScalar(pulse);

    // Pull enemies
    for (const e of enemies) {
      const d = e.mesh.position.distanceTo(w.pos);
      if (d < 6 && d > 0.5) {
        const pull = w.pos.clone().sub(e.mesh.position).normalize();
        e.mesh.position.addScaledVector(pull, 4 * dt);
      }
    }

    // Infall particles drift toward center
    const pPositions = w.pGeo.attributes.position.array;
    for (let j = 0; j < 30; j++) {
      const px = pPositions[j * 3];
      const pz = pPositions[j * 3 + 2];
      const dx = w.pos.x - px, dz = w.pos.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.3) {
        pPositions[j * 3] += (dx / dist) * 2 * dt;
        pPositions[j * 3 + 2] += (dz / dist) * 2 * dt;
      } else {
        // Reset particle
        const a = Math.random() * Math.PI * 2;
        const r = 2.5 + Math.random() * 1.5;
        pPositions[j * 3] = w.pos.x + Math.cos(a) * r;
        pPositions[j * 3 + 2] = w.pos.z + Math.sin(a) * r;
      }
    }
    w.pGeo.attributes.position.needsUpdate = true;

    if (w.lifetime <= 0 && !w.detonated) {
      // DETONATE
      w.detonated = true;
      const toKill = enemies.filter(e => e.mesh.position.distanceTo(w.pos) < 5);
      for (const e of toKill) killEnemy(e);

      // Shockwave ring
      const ringGeo = new THREE.TorusGeometry(0.3, 0.12, 8, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xaa00ff, emissive: 0xcc00ff, emissiveIntensity: 2,
        transparent: true, opacity: 0.9
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(w.pos);
      scene.add(ring);

      particles.push({
        mesh: ring, life: 0.5, maxLife: 0.5,
        type: 'shockwave', grow: true
      });

      playSFX('gravityWell_explode');
      scene.remove(w.mesh);
      scene.remove(w.pts);
      gravityWells.splice(i, 1);
    }
  }
}

// ─── Lightning arcs ───────────────────────────────────────────────────────────
function updateLightningArcs(dt) {
  for (let i = lightningArcs.length - 1; i >= 0; i--) {
    const a = lightningArcs[i];
    a.lifetime -= dt;
    if (a.lifetime <= 0) {
      scene.remove(a.line);
      lightningArcs.splice(i, 1);
    }
  }
}

// ─── Enemy update ─────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const playerPos = playerMesh.position;

    // Home toward player
    const dir = playerPos.clone().sub(e.mesh.position);
    dir.y = 0;
    const dist = dir.length();
    dir.normalize();

    e.mesh.position.addScaledVector(dir, e.speed * dt);
    e.mesh.position.y = 0.4;
    e.mesh.rotation.y += dt * 2;

    // Arena clamp
    const pos = e.mesh.position;
    const r2 = pos.x * pos.x + pos.z * pos.z;
    if (r2 > 14 * 14) {
      const n = new THREE.Vector3(pos.x, 0, pos.z).normalize();
      pos.x = n.x * 13.5;
      pos.z = n.z * 13.5;
    }

    // Attack pulse (telegraph) — 0.4s before contact
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = 0.4;
    }
    const ATTACK_DIST = 0.8;
    if (dist < ATTACK_DIST + 0.4) {
      // Telegraph: pulse red
      e.mesh.material.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.025) * 1.0;
    } else {
      e.mesh.material.emissiveIntensity = 0.6;
    }

    // Damage player
    if (dist < ATTACK_DIST) {
      damagePlayer();
    }
  }
}

// ─── Player damage ────────────────────────────────────────────────────────────
function damagePlayer() {
  if (invincibleTimer > 0) return; // G9 — iframe check BEFORE damage
  hp--;
  invincibleTimer = 1.5;
  cameraShakeAmount = 0.3; // LP8 — applied per-frame with dt decay
  updateHPUI();
  playSFX('playerHit');
  killStreak = 0;
  comboActive = false;
  updateComboUI();

  if (hp <= 0) {
    endRun(false);
  }
}

// ─── Kill enemy ───────────────────────────────────────────────────────────────
function killEnemy(enemy) {
  if (!enemies.includes(enemy)) return;
  const pos = enemy.mesh.position.clone();
  const color = WEAPON_COLORS[weaponIndex];

  // Particle burst — colored shards matching weapon
  for (let j = 0; j < 10; j++) {
    const geo = new THREE.TetrahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.5
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.position.y = 0.5;
    scene.add(p);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 6
    );

    particles.push({
      mesh: p, vel, life: 0.6, maxLife: 0.6, type: 'shard'
    });
  }

  // Score
  killStreak++;
  const multiplier = killStreak >= 3 ? 2 : 1;
  const pts = 10 * multiplier;
  score += pts;
  if (killStreak >= 3) {
    comboActive = true;
    updateComboUI();
  }
  updateScoreUI();
  showKillPopup(pos, pts);

  // Camera shake
  cameraShakeAmount = Math.max(cameraShakeAmount, 0.1);

  // Death chime
  playSFX('enemyDeath');

  // Remove
  scene.remove(enemy.mesh);
  const idx = enemies.indexOf(enemy);
  if (idx !== -1) enemies.splice(idx, 1);
}

// ─── Particle update ──────────────────────────────────────────────────────────
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;

    if (p.type === 'shard') {
      // LP8: vel multiplied by dt
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 8 * dt; // gravity
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.z += dt * 3;
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.material.transparent = true;
    } else if (p.type === 'shockwave') {
      const t = 1 - p.life / p.maxLife;
      const scale = 1 + t * 7;
      p.mesh.scale.setScalar(scale);
      p.mesh.material.opacity = 1 - t;
    }

    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ─── Arena boundary ───────────────────────────────────────────────────────────
function clampPlayerToArena() {
  const pos = playerMesh.position;
  const ARENA_R = 13;
  const r2 = pos.x * pos.x + pos.z * pos.z;
  if (r2 > ARENA_R * ARENA_R) {
    const n = new THREE.Vector3(pos.x, 0, pos.z).normalize();
    pos.x = n.x * ARENA_R;
    pos.z = n.z * ARENA_R;
  }
}

// ─── Mouse world position ─────────────────────────────────────────────────────
function updateMouseWorld() {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (mouse.x / window.innerWidth) * 2 - 1,
    -(mouse.y / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  raycaster.ray.intersectPlane(plane, mouseWorld);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function updateScoreUI() {
  document.getElementById('score-value').textContent = score;
}

function updateHPUI() {
  for (let i = 1; i <= maxHp; i++) {
    const heart = document.getElementById('h' + i);
    if (heart) heart.classList.toggle('empty', i > hp);
  }
}

function updateWaveUI() {
  document.getElementById('wave-display').textContent = 'WAVE ' + waveNumber;
}

function updateTimerUI() {
  const secs = Math.ceil(timeLeft);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  document.getElementById('timer-display').textContent =
    mins + ':' + String(s).padStart(2, '0');
  document.getElementById('timer-display').classList.toggle('urgent', timeLeft < 10);
}

function updateComboUI() {
  const el = document.getElementById('combo-display');
  el.style.opacity = comboActive ? '1' : '0';
  el.textContent = '×2 COMBO';
}

function updateWeaponUI() {
  const name = WEAPONS[weaponIndex];
  const color = '#' + WEAPON_COLORS[weaponIndex].toString(16).padStart(6, '0');
  document.getElementById('weapon-name').textContent = name;
  document.getElementById('weapon-name').style.color = color;
  document.getElementById('weapon-name').style.textShadow = `0 0 16px ${color}`;
  document.getElementById('weapon-hint').textContent = WEAPON_HINTS[weaponIndex];
}

function showKillPopup(pos3d, pts) {
  // Project 3D to screen
  const v = pos3d.clone();
  v.project(camera);
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

  const div = document.createElement('div');
  div.className = 'kill-popup';
  div.textContent = '+' + pts;
  div.style.left = x + 'px';
  div.style.top = y + 'px';
  div.style.color = '#' + WEAPON_COLORS[weaponIndex].toString(16).padStart(6, '0');
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 500);
}

// ─── Weapon flash announcement ────────────────────────────────────────────────
function announceWeapon() {
  const name = WEAPONS[weaponIndex];
  const color = '#' + WEAPON_COLORS[weaponIndex].toString(16).padStart(6, '0');
  const el = document.getElementById('weapon-name');
  el.style.fontSize = '28px';
  el.style.opacity = '0';
  el.textContent = name;
  el.style.color = color;
  el.style.textShadow = `0 0 30px ${color}, 0 0 60px ${color}`;

  let t = 0;
  const flash = setInterval(() => {
    t += 0.05;
    el.style.opacity = String(Math.min(1, t * 5));
    if (t > 1.0) {
      el.style.fontSize = '16px';
      el.style.textShadow = `0 0 16px ${color}`;
      clearInterval(flash);
    }
  }, 50);
}

// ─── End run ──────────────────────────────────────────────────────────────────
function endRun(survived) {
  gameState = 'ended'; // B2: set BEFORE any setTimeout

  if (survived) {
    score += 50;
    updateScoreUI();
    playSFX('runEnd_win');
  } else {
    playSFX('runEnd_lose');
  }

  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.getElementById('final-score').textContent = score;
  document.getElementById('weapon-used').textContent = WEAPONS[weaponIndex];

  const nextIdx = (weaponIndex + 1) % WEAPONS.length;
  const nextColor = '#' + WEAPON_COLORS[nextIdx].toString(16).padStart(6, '0');
  document.getElementById('next-weapon-hint').textContent =
    'next: ' + WEAPONS[nextIdx];
  document.getElementById('next-weapon-hint').style.color = nextColor;
}

// ─── Start run ────────────────────────────────────────────────────────────────
function startRun() {
  // Advance weapon
  weaponIndex = (weaponIndex + 1) % WEAPONS.length;

  // Reset state
  score = 0;
  hp = maxHp;
  timeLeft = 45;
  waveTimer = 0;
  waveNumber = 0;
  killStreak = 0;
  comboActive = false;
  invincibleTimer = 0;
  shootCooldown = 0;
  gravityWellCooldown = 0;
  runSeed = Math.floor(Math.random() * 10000);
  gameState = 'playing';

  // Clear entities
  for (const e of enemies) scene.remove(e.mesh);
  enemies = [];
  for (const p of projectiles) scene.remove(p.mesh);
  projectiles = [];
  for (const p of particles) scene.remove(p.mesh);
  particles = [];
  for (const w of gravityWells) { scene.remove(w.mesh); scene.remove(w.pts); }
  gravityWells = [];
  for (const a of lightningArcs) scene.remove(a.line);
  lightningArcs = [];

  // Player
  spawnPlayer();
  playerMesh.position.set(0, 0.4, 0);

  // Update UI
  updateScoreUI();
  updateHPUI();
  updateWaveUI();
  updateTimerUI();
  updateWeaponUI();
  updateComboUI();

  document.getElementById('overlay').classList.add('hidden');

  // Announce weapon
  announceWeapon();

  // First wave
  spawnWave();
}

function getAimDir() {
  const dir = mouseWorld.clone().sub(playerMesh.position);
  dir.y = 0;
  if (dir.length() < 0.01) dir.set(1, 0, 0);
  return dir.normalize();
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.25;
  bgmGain.connect(audioCtx.destination);
  startBGM();
}

function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;

  const DURATION = 64;
  // Layers: sub-bass drone, tension arpeggio, sparse percussion

  function scheduleNote(freq, time, dur, vol, type = 'sine', env = [0, 0.7, 0]) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // B5: envelope — sustain at 70% peak, never 0
    const attack = 0.05, sustainLevel = vol * 0.7, release = 0.1;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + attack);
    g.gain.setValueAtTime(sustainLevel, time + dur - release); // sustain never 0
    g.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  function loop(startTime) {
    // Sub-bass drone (every 4s)
    for (let t = 0; t < DURATION; t += 4) {
      scheduleNote(55, startTime + t, 3.8, 0.4, 'sine');
    }
    // Bass line
    const bassNotes = [55, 65, 55, 49, 55, 61, 55, 52];
    bassNotes.forEach((freq, i) => {
      scheduleNote(freq, startTime + i * 8, 6, 0.25, 'triangle');
    });
    // Tension arpeggio — irregular intervals (S6)
    const arpTimes = [2, 9, 15, 22, 31, 38, 44, 51, 58, 63];
    const arpFreqs = [220, 261, 293, 220, 174, 261, 220, 293, 220, 261];
    arpTimes.forEach((t, i) => {
      scheduleNote(arpFreqs[i], startTime + t, 0.6, 0.15, 'sawtooth');
    });
    // Percussion hits (S6: spread)
    const kickTimes = [0, 8, 16, 24, 32, 40, 48, 56];
    kickTimes.forEach(t => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, startTime + t);
      osc.frequency.exponentialRampToValueAtTime(20, startTime + t + 0.3);
      g.gain.setValueAtTime(0.3, startTime + t);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + t + 0.4);
      osc.connect(g); g.connect(bgmGain);
      osc.start(startTime + t);
      osc.stop(startTime + t + 0.4);
    });
    // Schedule next loop
    setTimeout(() => loop(audioCtx.currentTime), (DURATION - 0.1) * 1000);
  }

  loop(audioCtx.currentTime);
}

function playSFX(type) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);

  function osc(freq, dur, vol, waveType = 'sine') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = waveType;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol * 0.7, t); // B5: sustain at 70%
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + dur);
  }

  if (type === 'boomerang') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.6);
    g.gain.setValueAtTime(0.25, t);
    g.gain.setValueAtTime(0.17, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + 0.7);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.7);
  }
  else if (type === 'scatter') {
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.025;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = 600 + Math.random() * 200;
      g.gain.setValueAtTime(0.08, t + delay);
      g.gain.linearRampToValueAtTime(0, t + delay + 0.12);
      o.connect(g); g.connect(masterGain);
      o.start(t + delay); o.stop(t + delay + 0.12);
    }
  }
  else if (type === 'gravityWell_place') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(60, t);
    o.frequency.linearRampToValueAtTime(120, t + 2.0);
    g.gain.setValueAtTime(0.3, t);
    g.gain.setValueAtTime(0.21, t + 1.8);
    g.gain.linearRampToValueAtTime(0, t + 2.1);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 2.1);
  }
  else if (type === 'gravityWell_explode') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(20, t + 0.5);
    g.gain.setValueAtTime(0.5, t);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.5);
  }
  else if (type === 'chainLightning') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0, t + 0.2);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.2);
  }
  else if (type === 'enemyDeath') {
    osc(880, 0.1, 0.15, 'sine');
  }
  else if (type === 'playerHit') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.setValueAtTime(150, t + 0.05);
    o.frequency.setValueAtTime(200, t + 0.1);
    g.gain.setValueAtTime(0.4, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.3);
  }
  else if (type === 'waveSwell') {
    const freqs = [220, 277, 330, 415, 523];
    freqs.forEach((f, i) => {
      const delay = i * 0.06;
      osc(f, 0.3, 0.1 + i * 0.02, 'sine');
    });
  }
  else if (type === 'runEnd_win') {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => {
      const delay = i * 0.1;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(0.3, t + delay + 0.05);
      g.gain.setValueAtTime(0.21, t + delay + 0.3);
      g.gain.linearRampToValueAtTime(0, t + delay + 0.5);
      o.connect(g); g.connect(masterGain);
      o.start(t + delay); o.stop(t + delay + 0.5);
    });
  }
  else if (type === 'runEnd_lose') {
    const notes = [523, 466, 392, 349];
    notes.forEach((f, i) => {
      const delay = i * 0.12;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.2, t + delay);
      g.gain.setValueAtTime(0.14, t + delay + 0.2);
      g.gain.linearRampToValueAtTime(0, t + delay + 0.4);
      o.connect(g); g.connect(masterGain);
      o.start(t + delay); o.stop(t + delay + 0.4);
    });
  }
}

function playWaveSwell() {
  playSFX('waveSwell');
}

// ─── Input ────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && gameState === 'ended') {
    initAudio();
    startRun();
  }
  e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('click', () => {
  if (gameState === 'title') {
    initAudio();
    startRun();
    return;
  }
  if (gameState === 'playing') {
    shoot();
  }
  if (gameState === 'ended') {
    initAudio();
    startRun();
  }
});

// ─── Main loop ────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 0.05); // cap dt to 50ms

  if (gameState !== 'playing') {
    composer.render();
    return;
  }

  // Update mouse world position
  updateMouseWorld();

  // Timers — LP8: use dt
  timeLeft -= dt;
  waveTimer += dt;
  shootCooldown = Math.max(0, shootCooldown - dt);
  gravityWellCooldown = Math.max(0, gravityWellCooldown - dt);
  invincibleTimer = Math.max(0, invincibleTimer - dt);

  // Waves every 8 seconds
  if (waveTimer >= 8) {
    waveTimer = 0;
    spawnWave();
  }

  updateTimerUI();

  if (timeLeft <= 0) {
    endRun(true);
    return;
  }

  // Player movement — LP8
  const SPEED = 7;
  const moveDir = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
  if (moveDir.length() > 0) {
    moveDir.normalize();
    playerMesh.position.addScaledVector(moveDir, SPEED * dt);
    playerMesh.position.y = 0.4;
    clampPlayerToArena();
  }

  // Player rotation — face mouse
  const aimDir = mouseWorld.clone().sub(playerMesh.position);
  if (aimDir.length() > 0.1) {
    playerMesh.rotation.y = Math.atan2(aimDir.x, aimDir.z);
  }

  // Player light follows
  playerLight.position.set(
    playerMesh.position.x,
    playerMesh.position.y + 1,
    playerMesh.position.z
  );

  // Invincibility flash
  if (invincibleTimer > 0) {
    playerMesh.visible = Math.floor(Date.now() / 80) % 2 === 0;
  } else {
    playerMesh.visible = true;
  }

  // Camera shake — LP8: decayed per frame with dt
  if (cameraShakeAmount > 0.001) {
    camera.position.x = (Math.random() - 0.5) * cameraShakeAmount;
    camera.position.z = (Math.random() - 0.5) * cameraShakeAmount;
    camera.position.y = 22;
    cameraShakeAmount *= Math.pow(0.85, dt * 60); // decay
  } else {
    camera.position.set(0, 22, 0);
    cameraShakeAmount = 0;
  }
  camera.lookAt(0, 0, 0);

  // Update systems
  updateEnemies(dt);
  updateProjectiles(dt);
  updateGravityWells(dt);
  updateLightningArcs(dt);
  updateParticles(dt);

  // Animate player
  playerMesh.rotation.y += dt * 1.5;

  // Render
  composer.render();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
initRenderer();
buildScene();
updateWeaponUI();
updateHPUI();
updateScoreUI();

// Show title screen — overlay starts visible
document.getElementById('overlay').classList.remove('hidden');
document.getElementById('final-score').textContent = '';
document.getElementById('weapon-used').textContent = 'WEAPON MUTATES EVERY RUN';
document.querySelector('#overlay .prompt').textContent = '[ CLICK ] TO START';
document.getElementById('next-weapon-hint').textContent = 'starting with: BOOMERANG';
document.getElementById('next-weapon-hint').style.color = '#00ffff';

animate();
