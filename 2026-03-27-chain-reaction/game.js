// Chain Reaction — Build #28 — 2026-03-28
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── AUDIO ────────────────────────────────────────────────────────────────────
let AC = null;
const ensureAC = () => { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); };

function tone(freq, type, dur, vol = 0.3, delay = 0) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = type; o.frequency.value = freq;
  const t = AC.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
}

function playShot()   { tone(420, 'sawtooth', 0.07, 0.3); tone(210, 'sine', 0.1, 0.15); }
function playHit(n)   { const f = 180 + n * 55; tone(f, 'sine', 0.14, 0.4); tone(f * 1.5, 'triangle', 0.08, 0.2); }
function playBoom()   { tone(65, 'sine', 0.28, 0.55); tone(50, 'triangle', 0.2, 0.3); }
function playPerfect(){ [523,659,784,1047,1319,1568].forEach((f,i) => tone(f,'sine',0.45,0.4,i*0.07)); }
function playFail()   { [200,175,155,125].forEach((f,i) => tone(f,'triangle',0.3,0.3,i*0.11)); }
function playWin()    { [392,494,587,740,880,1047].forEach((f,i) => tone(f,'sine',0.5,0.35,i*0.09)); }
function playWaveClear(){ [330,415,494,622].forEach((f,i) => tone(f,'sine',0.35,0.25,i*0.08)); }

let bgmId = null;
function startBGM() {
  if (bgmId) return;
  const pat = [165,131,165,196,165,131,110,131,165,196,220,196];
  let i = 0;
  bgmId = setInterval(() => { tone(pat[i++ % pat.length], 'triangle', 0.55, 0.04); }, 480);
}
function stopBGM() { clearInterval(bgmId); bgmId = null; }

// ─── SCENE ───────────────────────────────────────────────────────────────────
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x040812, 0.022);
scene.background = new THREE.Color(0x040812);

const cam = new THREE.PerspectiveCamera(58, W / H, 0.1, 200);
cam.position.set(0, 11, 25); cam.lookAt(0, 0, 0);

let composer;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.4, 0.82));
} catch (e) { composer = null; }

scene.add(new THREE.AmbientLight(0x223355, 2.2));
const dLight = new THREE.DirectionalLight(0xff8833, 1.4);
dLight.position.set(4, 12, 6); scene.add(dLight);

// Grid floor
const grid = new THREE.GridHelper(34, 34, 0x223344, 0x111b28);
grid.position.y = -2.5; scene.add(grid);

// Starfield
const sg = new THREE.BufferGeometry();
const sv = [];
for (let i = 0; i < 1200; i++) sv.push((Math.random()-.5)*200,(Math.random()-.5)*100,(Math.random()-.5)*200);
sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x6677aa, size: 0.09, transparent: true, opacity: 0.5 })));

// ─── CANNON ──────────────────────────────────────────────────────────────────
const cGroup = new THREE.Group();
const cBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.65, 1.3, 10),
  new THREE.MeshStandardMaterial({ color: 0x3399ff, emissive: 0x113355, roughness: 0.25, metalness: 0.5 })
);
cBody.rotation.x = -Math.PI / 2; cGroup.add(cBody);

const cBarrel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8),
  new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224466, roughness: 0.2, metalness: 0.7 })
);
cBarrel.rotation.x = -Math.PI / 2; cBarrel.position.z = -1.1; cGroup.add(cBarrel);

const cGlow = new THREE.PointLight(0x44aaff, 2.5, 5);
cGroup.add(cGlow);
cGroup.position.set(0, -1.5, 9.5);
scene.add(cGroup);

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let wave = 1, score = 0, shotsLeft = 1, chainCount = 0, shotsUsed = 0;
let failedWaves = 0, bestChain = parseInt(localStorage.getItem('cr_best') || '0');
let isPlaying = false, gameOver = false;
let slowMo = 0, camShake = 0, camShakeT = 0, chainFadeT = 0;

const enemies = [], particles = [], projectiles = [], shockwaves = [];
let tLine = null;
const mouseWorld = new THREE.Vector3(0, 0, 0);

// Wave formations: {rows,cols,sx,sz,yz,diamond?,gap3?}
const WAVES = [
  { rows: 3, cols: 4, sx: 1.95, sz: 1.55, yz: 2.0 },
  { rows: 4, cols: 4, sx: 1.75, sz: 1.45, yz: 2.3, diamond: true },
  { rows: 4, cols: 5, sx: 1.55, sz: 1.4,  yz: 2.5 },
  { rows: 5, cols: 4, sx: 1.5,  sz: 1.35, yz: 2.7, gap3: true },
  { rows: 5, cols: 5, sx: 1.38, sz: 1.28, yz: 3.0 },
];

const CHAIN_COLS = [0xffffff, 0xffee44, 0xff9900, 0xff3300, 0xff0077];
function chainCol(n) {
  if (n <= 1) return CHAIN_COLS[0];
  if (n <= 3) return CHAIN_COLS[1];
  if (n <= 6) return CHAIN_COLS[2];
  if (n <= 10) return CHAIN_COLS[3];
  return CHAIN_COLS[4];
}

const ENEMY_GEOS = [
  new THREE.IcosahedronGeometry(0.48, 0),
  new THREE.OctahedronGeometry(0.50, 0),
  new THREE.TetrahedronGeometry(0.56, 0),
];

// ─── SPAWN ───────────────────────────────────────────────────────────────────
function spawnEnemy(x, y, z) {
  const geo = ENEMY_GEOS[Math.floor(Math.random() * 3)];
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3311, emissive: 0x440800, roughness: 0.4, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  scene.add(mesh);
  const pl = new THREE.PointLight(0xff2200, 1.0, 2.2); mesh.add(pl);
  enemies.push({ mesh, pl, pos: new THREE.Vector3(x, y, z), radius: 2.35,
    dead: false, exploding: false, explodeT: 0,
    rot: new THREE.Vector3((Math.random()-.5)*.04, (Math.random()-.5)*.04, (Math.random()-.5)*.04),
    floatPhase: Math.random()*Math.PI*2, baseY: y });
}

function spawnWave(w) {
  enemies.forEach(e => { if (!e.dead) scene.remove(e.mesh); });
  enemies.length = 0;
  const cfg = WAVES[w - 1];
  const ox = -(cfg.cols - 1) * cfg.sx / 2;
  const oz = -(cfg.rows - 1) * cfg.sz / 2;
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      if (cfg.diamond) {
        const dx = Math.abs(c - (cfg.cols-1)/2), dy = Math.abs(r - (cfg.rows-1)/2);
        if (dx + dy > cfg.cols/2 + 0.1) continue;
      }
      if (cfg.gap3 && (r + c) % 4 === 3) continue;
      spawnEnemy(ox + c * cfg.sx, cfg.yz, oz + r * cfg.sz);
    }
  }
  shotsLeft = w >= 4 ? 2 : 1; shotsUsed = 0; chainCount = 0;
  updateHUD(); clearChain();
}

// ─── TRAJECTORY ──────────────────────────────────────────────────────────────
function drawTraj(tgt) {
  if (tLine) { scene.remove(tLine); tLine = null; }
  if (!isPlaying || gameOver || shotsLeft <= 0) return;
  const start = cGroup.position.clone();
  const dir = tgt.clone().sub(start).normalize();
  const pts = [];
  for (let t = 0; t <= 1; t += 0.04) pts.push(start.clone().addScaledVector(dir, t * 27));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineDashedMaterial({ color: 0x44ffaa, dashSize: 0.28, gapSize: 0.18, opacity: 0.55, transparent: true });
  tLine = new THREE.Line(g, m); tLine.computeLineDistances();
  scene.add(tLine);
}

// ─── FIRE ────────────────────────────────────────────────────────────────────
function fire(tgt) {
  if (!isPlaying || gameOver || shotsLeft <= 0) return;
  shotsLeft--; shotsUsed++;
  updateHUD(); playShot();
  if (tLine) { scene.remove(tLine); tLine = null; }

  const start = cGroup.position.clone();
  const vel = tgt.clone().sub(start).normalize().multiplyScalar(0.38);

  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),
    new THREE.MeshStandardMaterial({ color: 0x44ffcc, emissive: 0x22aa66, roughness: 0.1, metalness: 0.9 }));
  m.position.copy(start); scene.add(m);
  const pl = new THREE.PointLight(0x44ffcc, 4, 6); m.add(pl);

  const tg = new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]);
  const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0x22ffaa, transparent: true, opacity: 0.45 }));
  scene.add(trail);

  projectiles.push({ mesh: m, pl, trail, pos: start.clone(), vel, dead: false, trailPts: [start.clone()] });
  cGlow.intensity = 10;
}

// ─── EXPLODE ─────────────────────────────────────────────────────────────────
function explode(enemy, depth) {
  if (enemy.dead || enemy.exploding) return;
  enemy.exploding = true; chainCount++;
  playHit(chainCount); playBoom();

  const col = chainCol(chainCount);
  enemy.mesh.material.color.setHex(col); enemy.mesh.material.emissive.setHex(col);
  enemy.pl.color.setHex(col); enemy.pl.intensity = 10;

  camShake = Math.min(camShake + 0.2, 0.65); camShakeT = 0.35;

  // Shockwave
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.18, 20),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.position.copy(enemy.pos); ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  shockwaves.push({ mesh: ring, age: 0, maxAge: 0.55 });

  // Particles
  burst(enemy.pos, col, 14);

  // UI
  showChain(chainCount);
  score += chainCount * 10;
  if (chainCount > bestChain) { bestChain = chainCount; localStorage.setItem('cr_best', bestChain); }
  updateHUD();

  // Cascade
  const pos = enemy.pos.clone(), rad = enemy.radius;
  setTimeout(() => {
    enemies.forEach(e => { if (e !== enemy && !e.dead && !e.exploding && pos.distanceTo(e.pos) < rad) explode(e, depth+1); });
    checkAllDead();
  }, 90 + depth * 15);
}

function checkAllDead() {
  const alive = enemies.filter(e => !e.dead && !e.exploding);
  if (alive.length === 0 && shotsUsed === 1) {
    playPerfect(); slowMo = 3.0; score += 600 + wave * 120; updateHUD();
    const b = document.getElementById('perfect');
    b.style.opacity = '1'; setTimeout(() => { b.style.opacity = '0'; }, 2200);
  }
}

function burst(pos, col, n) {
  const g = new THREE.BufferGeometry();
  const v = [], vels = [];
  for (let i = 0; i < n; i++) {
    v.push(pos.x, pos.y, pos.z);
    const a = Math.random()*Math.PI*2, b = Math.random()*Math.PI, s = 0.1+Math.random()*0.22;
    vels.push(Math.sin(b)*Math.cos(a)*s, Math.cos(b)*s*0.5+0.04, Math.sin(b)*Math.sin(a)*s);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 0.13, transparent: true, opacity: 1 }));
  scene.add(pts);
  particles.push({ mesh: pts, vels, age: 0, maxAge: 1.0 });
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hs').textContent = score.toLocaleString();
  document.getElementById('hw').textContent = `${wave}/${WAVES.length}`;
  document.getElementById('hsh').textContent = shotsLeft;
  document.getElementById('hb').textContent = bestChain;
}

function showChain(n) {
  const el = document.getElementById('chain');
  const col = chainCol(n), hex = '#' + col.toString(16).padStart(6, '0');
  el.style.color = hex; el.style.textShadow = `0 0 50px ${hex}`;
  if      (n >= 12) { el.textContent = `×${n} INFERNO!`;   el.style.fontSize = '56px'; }
  else if (n >= 8)  { el.textContent = `×${n} MEGA!`;      el.style.fontSize = '50px'; }
  else if (n >= 5)  { el.textContent = `×${n} CHAIN!`;     el.style.fontSize = '44px'; }
  else if (n >= 2)  { el.textContent = `×${n}`;            el.style.fontSize = '38px'; }
  else              { el.textContent = '';                  el.style.fontSize = '0'; }
  chainFadeT = 1.8;
}
function clearChain() { const el=document.getElementById('chain'); el.textContent=''; el.style.fontSize='0'; chainFadeT=0; }

// ─── WAVE / GAME ──────────────────────────────────────────────────────────────
function checkWaveDone() {
  if (enemies.some(e => !e.dead)) return;
  if (chainCount < 3) failedWaves++;
  playWaveClear();
  setTimeout(() => {
    if (failedWaves >= 3) { endGame(false); return; }
    wave++;
    if (wave > WAVES.length) { endGame(true); return; }
    spawnWave(wave);
  }, 1600);
}

function endGame(won) {
  isPlaying = false; gameOver = true; stopBGM();
  if (won) playWin(); else playFail();
  const ol = document.getElementById('overlay');
  const h = ol.querySelector('h1'), sub = document.getElementById('sub'), btn = document.getElementById('btn');
  h.textContent = won ? '⛓ CHAIN COMPLETE' : '💥 CHAIN BROKEN';
  h.style.color = won ? '#44ff88' : '#ff4422';
  h.style.textShadow = won ? '0 0 60px #44ff88' : '0 0 60px #ff4422';
  sub.innerHTML = won
    ? `FINAL SCORE: <b style="color:#ffaa44">${score.toLocaleString()}</b><br>BEST CHAIN: <b style="color:#ff6600">×${bestChain}</b><br>ALL 5 WAVES CLEARED!`
    : `SCORE: <b style="color:#ffaa44">${score.toLocaleString()}</b><br>BEST CHAIN: <b style="color:#ff6600">×${bestChain}</b><br>${failedWaves} WAVES WITH CHAIN &lt; 3`;
  btn.textContent = 'PLAY AGAIN';
  ol.style.display = 'flex';
}

function startGame() {
  ensureAC();
  wave=1; score=0; chainCount=0; shotsLeft=1; shotsUsed=0; failedWaves=0;
  gameOver=false; isPlaying=true;
  enemies.forEach(e => scene.remove(e.mesh)); enemies.length=0;
  particles.forEach(p => scene.remove(p.mesh)); particles.length=0;
  projectiles.forEach(p => { scene.remove(p.mesh); scene.remove(p.trail); }); projectiles.length=0;
  shockwaves.forEach(s => scene.remove(s.mesh)); shockwaves.length=0;
  if (tLine) { scene.remove(tLine); tLine=null; }
  clearChain(); document.getElementById('perfect').style.opacity='0';
  spawnWave(1); startBGM();
  document.getElementById('overlay').style.display='none';
}

// ─── INPUT ───────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mNDC = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.8);

window.addEventListener('mousemove', e => {
  mNDC.x = (e.clientX/W)*2-1; mNDC.y = -(e.clientY/H)*2+1;
  const xh = document.getElementById('xhair'); xh.style.left=e.clientX+'px'; xh.style.top=e.clientY+'px';
  raycaster.setFromCamera(mNDC, cam);
  const tgt = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(aimPlane, tgt)) {
    mouseWorld.copy(tgt);
    drawTraj(tgt);
    const d = tgt.clone().sub(cGroup.position);
    cGroup.rotation.y = Math.atan2(d.x, d.z);
  }
});

window.addEventListener('click', () => {
  if (!isPlaying || gameOver) return;
  ensureAC();
  if (shotsLeft <= 0) {
    const w = document.getElementById('warn'); w.style.opacity='1';
    setTimeout(() => { w.style.opacity='0'; }, 1400);
    return;
  }
  fire(mouseWorld.clone());
});

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && isPlaying && !gameOver && shotsLeft > 0) { ensureAC(); fire(mouseWorld.clone()); }
});

document.getElementById('btn').addEventListener('click', startGame);

// ─── LOOP ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = rawDt * (slowMo > 0 ? 0.2 : 1.0);
  if (slowMo > 0) slowMo -= rawDt;
  const t = clock.getElapsedTime();

  // Camera shake
  if (camShakeT > 0) {
    camShakeT -= rawDt;
    const s = camShake * (camShakeT / 0.35);
    cam.position.set(Math.sin(t * 30)*s, 11 + Math.cos(t * 25)*s*0.5, 25);
    if (camShakeT <= 0) { cam.position.set(0, 11, 25); camShake = 0; }
  }

  // Chain display fade
  if (chainFadeT > 0) {
    chainFadeT -= rawDt;
    if (chainFadeT <= 0) clearChain();
  }

  // Cannon glow decay
  cGlow.intensity = Math.max(2.5, cGlow.intensity * 0.92);

  // Enemies
  enemies.forEach(e => {
    if (e.dead) return;
    e.mesh.rotation.x += e.rot.x; e.mesh.rotation.y += e.rot.y; e.mesh.rotation.z += e.rot.z;
    e.mesh.position.y = e.baseY + Math.sin(t * 1.2 + e.floatPhase) * 0.12;
    if (e.exploding) {
      e.explodeT += dt;
      e.mesh.scale.setScalar(1 + e.explodeT * 5);
      e.pl.intensity = Math.max(0, 10 - e.explodeT * 35);
      if (e.explodeT > 0.16) { scene.remove(e.mesh); e.dead = true; checkWaveDone(); }
    }
  });

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.dead) continue;
    p.pos.add(p.vel);
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y += 0.12;

    // Trail update
    p.trailPts.push(p.pos.clone());
    if (p.trailPts.length > 14) p.trailPts.shift();
    p.trail.geometry.setFromPoints(p.trailPts);

    // Hit detection
    let hit = false;
    for (const e of enemies) {
      if (e.dead || e.exploding) continue;
      if (p.pos.distanceTo(e.pos) < 0.65) { explode(e, 0); hit = true; break; }
    }

    // Out of bounds
    if (hit || p.pos.z < -18 || p.pos.z > 15 || Math.abs(p.pos.x) > 18) {
      scene.remove(p.mesh); scene.remove(p.trail); p.dead = true;
      // If no hit and all shots used, check wave
      if (!hit && shotsLeft === 0) checkWaveDone();
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += rawDt;
    if (p.age >= p.maxAge) { scene.remove(p.mesh); particles.splice(i,1); continue; }
    const pct = p.age / p.maxAge;
    const pos = p.mesh.geometry.attributes.position;
    for (let j = 0; j < p.vels.length/3; j++) {
      pos.setX(j, pos.getX(j) + p.vels[j*3]);
      pos.setY(j, pos.getY(j) + p.vels[j*3+1] - 0.012);
      pos.setZ(j, pos.getZ(j) + p.vels[j*3+2]);
    }
    pos.needsUpdate = true;
    p.mesh.material.opacity = 1 - pct;
  }

  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.age += rawDt;
    if (s.age >= s.maxAge) { scene.remove(s.mesh); shockwaves.splice(i,1); continue; }
    const pct = s.age / s.maxAge;
    s.mesh.scale.setScalar(1 + pct * 12);
    s.mesh.material.opacity = 0.9 * (1 - pct);
  }

  if (composer) composer.render();
  else renderer.render(scene, cam);
}

updateHUD();
animate();
