import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const LANE   = 70;
const LANE_W = 9;
const CORE_MAX  = 1000;
const CHAMP_MAX = 150;
const GAME_SECS = 300;

const ROLES = {
  tank:   { name:'TANK',   hex:'#44ff88', color:0x44ff88, hp:200, speed:3.8, atk:20, range:2.8, atkRate:0.85, qName:'SLAM',     qCd:5   },
  ranger: { name:'RANGER', hex:'#ff9900', color:0xff9900, hp:120, speed:6.2, atk:24, range:5.5, atkRate:0.55, qName:'ARROW',    qCd:3.5 },
  mage:   { name:'MAGE',   hex:'#aa55ff', color:0xaa55ff, hp:90,  speed:5.5, atk:32, range:4.5, atkRate:0.75, qName:'FIREBALL', qCd:4.5 }
};

// ── SCENE ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060610);
scene.fog = new THREE.FogExp2(0x060610, 0.018);

const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 300);
camera.position.set(0, 20, 22);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

let composer = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 0.65);
  composer.addPass(bloom);
} catch(e) {}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if(composer) composer.setSize(innerWidth, innerHeight);
});

// ── LIGHTING ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x112244, 2.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(8, 20, 8); sun.castShadow = true;
scene.add(sun);

// ── MAP ───────────────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(LANE_W, LANE),
  new THREE.MeshStandardMaterial({ color:0x0d1428, roughness:0.9 })
);
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;
scene.add(floor);

for(const s of [-1,1]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.4,1,LANE), new THREE.MeshStandardMaterial({ color:0x1a2b4a, emissive:0x0a1530 }));
  w.position.set(s*(LANE_W/2+0.2), 0.5, 0);
  scene.add(w);
}
for(let z=-LANE/2; z<=LANE/2; z+=5) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.06), new THREE.MeshBasicMaterial({ color:0x1a2855, transparent:true, opacity:0.4 }));
  g.rotation.x = -Math.PI/2; g.position.set(0,0.01,z);
  scene.add(g);
}
const ml = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W,0.2), new THREE.MeshBasicMaterial({ color:0x334466, transparent:true, opacity:0.7 }));
ml.rotation.x = -Math.PI/2; ml.position.set(0,0.015,0);
scene.add(ml);

// Stars
const sv = [];
for(let i=0;i<1200;i++) sv.push((Math.random()-.5)*250, 8+Math.random()*60, (Math.random()-.5)*250);
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.Float32BufferAttribute(sv,3));
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color:0x8899bb, size:0.22, transparent:true, opacity:0.5 })));

// ── CORE BUILDER ──────────────────────────────────────────────────────────────
function makeCore(zPos, isEnemy) {
  const g = new THREE.Group();
  g.position.set(0, 0, zPos);
  const pm = new THREE.MeshStandardMaterial({ color:isEnemy?0x2a1100:0x001133, roughness:0.85 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3,3.5,0.5,8), pm);
  plat.position.set(0,0.25,0); plat.receiveShadow=true;
  g.add(plat);
  const cm = new THREE.MeshStandardMaterial({ color:isEnemy?0xff5500:0x0088ff, emissive:isEnemy?0xff2200:0x0055dd, emissiveIntensity:0.9, roughness:0.2, metalness:0.6 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), cm);
  crystal.position.y = 2.0; crystal.castShadow = true;
  g.add(crystal);
  const rm = new THREE.MeshStandardMaterial({ color:isEnemy?0xff7733:0x33bbff, emissive:isEnemy?0xff3300:0x1188ff, emissiveIntensity:0.7, roughness:0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4,0.18,8,36), rm);
  ring.rotation.x = Math.PI/2; ring.position.y = 2.0;
  g.add(ring);
  const sm = new THREE.MeshStandardMaterial({ color:isEnemy?0xff4400:0x004488, transparent:true, opacity:0.12, side:THREE.BackSide });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(3.2,16,12), sm);
  shield.position.y = 1.5;
  g.add(shield);
  const light = new THREE.PointLight(isEnemy?0xff4400:0x0099ff, 2.5, 14);
  light.position.y = 2;
  g.add(light);
  scene.add(g);
  return { group:g, crystal, ring, light, shield };
}

// ── GAME STATE ────────────────────────────────────────────────────────────────
let running = false, over = false;
let role = 'ranger';
let timeLeft = GAME_SECS;
let kills = 0, coreDmg = 0;

let myCoreObj = null, enCoreObj = null;
let myCoreHP = CORE_MAX, enCoreHP = CORE_MAX;

// Player
let player = null, pBody = null, pLight = null;
let pHP = 100, pMaxHP = 100, pSpeed = 6, pAtk = 24, pRange = 5;
let pAtkRate = 0.55, pAtkTimer = 0;
let qCd = 0, qCdMax = 3.5;
let wCd = 0, wCdMax = 8; // mage blink

// Enemy champ
let echamp = null, ebody = null, elight = null;
let eHP = CHAMP_MAX, eAtkTimer = 0, eDead = false, eRespawnTimer = 0;

// Creeps
let creeps = [];
let creepTimer = 0;
const CREEP_INT = 10;

// Projectiles
let projs = [];

// Particles
let parts = [];

// Camera shake
let shakeMag = 0, shakeT = 0;

// Input
const keys = {};
const mouse = new THREE.Vector2();
const mouseW = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const laneFloorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);

// Clock
const clock = new THREE.Clock();

// ── AUDIO ─────────────────────────────────────────────────────────────────────
let actx = null;
function getCtx() {
  if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
  if(actx.state==='suspended') actx.resume();
  return actx;
}
function tone(freq,type,dur,vol=0.22,delay=0) {
  try {
    const c=getCtx(), o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol, c.currentTime+delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime+delay+dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+delay); o.stop(c.currentTime+delay+dur+0.05);
  } catch(e){}
}
const sfx = {
  shoot:     ()=>{ tone(200,'sawtooth',0.06,0.22); },
  hit:       ()=>{ tone(260,'sawtooth',0.07,0.28); tone(120,'sine',0.1,0.15); },
  kill:      ()=>{ tone(440,'sine',0.12,0.35); tone(660,'sine',0.15,0.28,0.08); },
  slam:      ()=>{ tone(80,'sawtooth',0.25,0.5); tone(130,'sine',0.28,0.4,0.05); },
  arrow:     ()=>{ tone(380,'sawtooth',0.08,0.3); tone(520,'triangle',0.12,0.22,0.04); },
  fireball:  ()=>{ tone(290,'sawtooth',0.15,0.4); tone(430,'sine',0.18,0.3,0.06); },
  blink:     ()=>{ tone(800,'sine',0.07,0.22); tone(400,'triangle',0.1,0.16,0.04); },
  coreHit:   ()=>{ tone(90,'sawtooth',0.2,0.45); tone(55,'sine',0.22,0.4); },
  playerHit: ()=>{ tone(140,'sawtooth',0.1,0.3); },
  win:       ()=>{ [440,550,660,880].forEach((f,i)=>tone(f,'sine',0.45,0.4,i*0.1)); },
  lose:      ()=>{ [220,175,150,110].forEach((f,i)=>tone(f,'triangle',0.45,0.28,i*0.13)); },
};

let bgmId = null;
const BGM = [110,130,147,165,196,220,196,165];
let bgmI = 0;
function startBGM() {
  if(bgmId) clearInterval(bgmId);
  bgmId = setInterval(()=>{
    if(!running){ clearInterval(bgmId); bgmId=null; return; }
    tone(BGM[bgmI%BGM.length],'triangle',0.35,0.07);
    bgmI++;
  }, 480);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function dist2D(a,b){ const dx=a.x-b.x, dz=a.z-b.z; return Math.sqrt(dx*dx+dz*dz); }

function floatNum(worldPos, txt, color) {
  const v = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'fn';
  el.style.left = ((v.x*.5+.5)*innerWidth) + 'px';
  el.style.top  = ((-.5*v.y+.5)*innerHeight - 20) + 'px';
  el.style.color = color;
  el.textContent = txt;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 800);
}

function flash(color='rgba(255,255,255,0.18)') {
  const f = document.getElementById('flash');
  f.style.transition='none'; f.style.background=color; f.style.opacity='1';
  setTimeout(()=>{ f.style.transition='opacity .15s'; f.style.opacity='0'; }, 50);
}

function notify(txt, dur=1400) {
  const n=document.getElementById('ntf');
  n.textContent=txt; n.style.opacity='1';
  setTimeout(()=>n.style.opacity='0', dur);
}

function camShake(mag) { shakeMag=mag; shakeT=0.28; }

// ── BUILD PLAYER ──────────────────────────────────────────────────────────────
function buildPlayer(r) {
  const cfg = ROLES[r];
  pMaxHP=pHP=cfg.hp; pSpeed=cfg.speed; pAtk=cfg.atk; pRange=cfg.range;
  pAtkRate=cfg.atkRate; qCdMax=cfg.qCd;

  if(player) { scene.remove(player); }
  player = new THREE.Group();

  let bodyGeo;
  if(r==='tank') bodyGeo = new THREE.BoxGeometry(1.1,1.5,1.1);
  else if(r==='ranger') bodyGeo = new THREE.CylinderGeometry(0.35,0.55,1.4,6);
  else bodyGeo = new THREE.OctahedronGeometry(0.65);

  pBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
    color:cfg.color, emissive:cfg.color, emissiveIntensity:0.3, roughness:0.4, metalness:0.5
  }));
  pBody.castShadow = true;
  pBody.position.y = r==='mage' ? 0.95 : 0.75;
  player.add(pBody);

  // Crown
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.5,6), new THREE.MeshStandardMaterial({ color:0xffdd00, emissive:0xffcc00, emissiveIntensity:0.9 }));
  crown.position.y = r==='mage' ? 1.75 : 1.65;
  player.add(crown);

  pLight = new THREE.PointLight(cfg.color, 2.5, 7);
  pLight.position.y = 1;
  player.add(pLight);

  player.position.set(0, 0, -LANE/2+8);
  scene.add(player);
}

// ── BUILD ENEMY CHAMP ─────────────────────────────────────────────────────────
function buildEChamp() {
  if(echamp) scene.remove(echamp);
  echamp = new THREE.Group();

  ebody = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.62,1.3,8), new THREE.MeshStandardMaterial({
    color:0xff2244, emissive:0xcc0022, emissiveIntensity:0.4, roughness:0.5, metalness:0.3
  }));
  ebody.castShadow = true; ebody.position.y = 0.65;
  echamp.add(ebody);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,1), new THREE.MeshStandardMaterial({
    color:0xff4466, emissive:0xcc0033, emissiveIntensity:0.5
  }));
  head.position.y = 1.7;
  echamp.add(head);

  // Shoulder spikes
  for(const s of [-1,1]) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.5,5), new THREE.MeshStandardMaterial({ color:0xdd0022, emissive:0xaa0011 }));
    spike.position.set(s*0.6,1.1,0); spike.rotation.z = s*Math.PI/4;
    echamp.add(spike);
  }

  elight = new THREE.PointLight(0xff2200, 2.5, 7);
  elight.position.y = 1;
  echamp.add(elight);

  echamp.position.set((Math.random()-.5)*4, 0, LANE/2-12);
  eHP = CHAMP_MAX; eDead = false;
  scene.add(echamp);
}

// ── SPAWN CREEPS ──────────────────────────────────────────────────────────────
function spawnCreeps(fromEnemy) {
  for(let i=0;i<4;i++) {
    const xOff = (i-1.5)*1.5;
    const zPos = fromEnemy ? LANE/2-7 : -LANE/2+7;
    const color = fromEnemy ? 0xff6622 : 0x55ccff;
    const emissive = fromEnemy ? 0xcc3300 : 0x2299aa;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7,0.7,0.7),
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity:0.35, roughness:0.6 })
    );
    mesh.castShadow = true;
    mesh.position.set(clamp(xOff,-3,3), 0.35, zPos);
    scene.add(mesh);
    creeps.push({ mesh, hp:30, maxHp:30, isEnemy:fromEnemy, speed:3, atk:8, atkRange:1.2, atkTimer:0 });
  }
}

// ── SPAWN PROJECTILE ──────────────────────────────────────────────────────────
function spawnProj(from, to, dmg, color, speed=14, aoe=0) {
  const geo = new THREE.SphereGeometry(0.22, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:1.8, roughness:0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from); mesh.position.y = 0.9;
  const light = new THREE.PointLight(color, 2, 3.5);
  mesh.add(light);
  scene.add(mesh);

  const dir = new THREE.Vector3(to.x-from.x, 0, to.z-from.z).normalize();
  projs.push({ mesh, dir, speed, dmg, color, aoe, fromPlayer:true, dist:0, maxDist:18 });
  sfx.shoot();
}

// ── SPAWN PARTICLE BURST ──────────────────────────────────────────────────────
function burst(pos, color, count=14) {
  for(let i=0;i<count;i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1,5,5),
      new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:1.5, transparent:true, opacity:1 })
    );
    mesh.position.copy(pos); mesh.position.y = 0.6;
    const vel = new THREE.Vector3((Math.random()-.5)*6, Math.random()*4+1, (Math.random()-.5)*6);
    scene.add(mesh);
    parts.push({ mesh, vel, life:0.6 });
  }
}

// ── UPDATE HUD ────────────────────────────────────────────────────────────────
function updateHUD() {
  // Timer
  const m=Math.floor(timeLeft/60), s=Math.floor(timeLeft%60);
  const ts = m+':'+(s<10?'0':'')+s;
  document.getElementById('ttxt').textContent = ts;
  const tb = document.getElementById('tbox');
  tb.classList.toggle('urg', timeLeft<30);

  // Player HP
  const ppct = clamp(pHP/pMaxHP,0,1)*100;
  document.getElementById('fp').style.width = ppct+'%';
  document.getElementById('np').textContent = Math.ceil(pHP)+'/'+pMaxHP;

  // My Core
  const mcpct = clamp(myCoreHP/CORE_MAX,0,1)*100;
  document.getElementById('fmc').style.width = mcpct+'%';
  document.getElementById('nmc').textContent = Math.ceil(myCoreHP)+'/'+CORE_MAX;

  // Enemy Core
  const ecpct = clamp(enCoreHP/CORE_MAX,0,1)*100;
  document.getElementById('fec').style.width = ecpct+'%';
  document.getElementById('nec').textContent = Math.ceil(enCoreHP)+'/'+CORE_MAX;

  // Enemy champ
  const ehpct = eDead ? 0 : clamp(eHP/CHAMP_MAX,0,1)*100;
  document.getElementById('feh').style.width = ehpct+'%';
  document.getElementById('neh').textContent = eDead ? 'RESPAWNING...' : Math.ceil(eHP)+'/'+CHAMP_MAX;

  // Kills
  document.getElementById('knum').textContent = kills;

  // Ability CDs
  const qpct = clamp(qCd/qCdMax,0,1)*100;
  document.getElementById('qcd').style.height = qpct+'%';
}

// ── GAME OVER ─────────────────────────────────────────────────────────────────
function endGame(won) {
  running = false; over = true;
  if(bgmId) { clearInterval(bgmId); bgmId=null; }

  const secs = GAME_SECS - Math.floor(timeLeft);
  const mm = Math.floor(secs/60), ss = secs%60;

  document.getElementById('hud').style.display='none';
  const se = document.getElementById('screen-end');
  se.style.display = 'flex';

  document.getElementById('etitle').textContent = won ? 'VICTORY!' : 'DEFEAT';
  document.getElementById('etitle').style.color = won ? '#44ff88' : '#ff4455';
  document.getElementById('esub').textContent   = won ? 'You destroyed the enemy Core!' : (timeLeft<=0 ? 'Time ran out!' : 'Your Core was destroyed!');

  document.getElementById('scr').textContent = ROLES[role].name;
  document.getElementById('sck').textContent = kills;
  document.getElementById('scd').textContent = coreDmg;
  document.getElementById('sct').textContent = mm+'m '+(ss<10?'0':'')+ss+'s';

  if(won) { sfx.win(); flash('rgba(68,255,136,0.25)'); }
  else    { sfx.lose(); flash('rgba(255,50,50,0.25)'); }
}

// ── MAIN GAME START ───────────────────────────────────────────────────────────
window.startGame = function(r) {
  role = r;
  const cfg = ROLES[r];

  document.getElementById('screen-role').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('rtxt').textContent = cfg.name;
  document.getElementById('rtxt').style.color = cfg.hex;
  document.getElementById('qn').textContent = cfg.qName;
  document.getElementById('qn').style.color = cfg.hex;

  // Build scene objects
  myCoreObj  = makeCore(-LANE/2+3, false);
  enCoreObj  = makeCore(LANE/2-3,  true);
  myCoreHP   = CORE_MAX;
  enCoreHP   = CORE_MAX;

  buildPlayer(r);
  buildEChamp();
  spawnCreeps(true);
  spawnCreeps(false);

  running  = true;
  timeLeft = GAME_SECS;
  kills    = 0;
  coreDmg  = 0;

  startBGM();
  clock.start();
};

// ── INPUT ─────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e=>{ keys[e.code]=true; });
window.addEventListener('keyup',   e=>{ keys[e.code]=false; });

window.addEventListener('mousemove', e=>{
  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  if(!running) return;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(laneFloorPlane, mouseW);
});

window.addEventListener('click', e=>{
  if(!running || over) return;
  getCtx(); // resume audio context
  // Auto-attack fires in update loop; click triggers immediately
  if(pAtkTimer<=0) {
    doPlayerAttack();
    pAtkTimer = pAtkRate;
  }
});

window.addEventListener('keydown', e=>{
  if(!running || over) return;
  if(e.code==='KeyQ' && qCd<=0) { doAbility(); }
  if(e.code==='KeyW' && role==='mage' && wCd<=0) { doBlink(); }
});

// ── PLAYER ATTACK ─────────────────────────────────────────────────────────────
function doPlayerAttack() {
  // Find nearest enemy target
  let target = null;
  let best = Infinity;
  const cfg = ROLES[role];

  // Check enemy champ
  if(!eDead && echamp) {
    const d = dist2D(player.position, echamp.position);
    if(d < pRange && d < best) { best=d; target=echamp.position; }
  }

  // Check creeps
  for(const c of creeps) {
    if(!c.isEnemy) continue;
    const d = dist2D(player.position, c.mesh.position);
    if(d < pRange && d < best) { best=d; target=c.mesh.position; }
  }

  // Check enemy core if no other target
  if(!target) {
    const d = dist2D(player.position, enCoreObj.group.position);
    if(d < pRange+2) { target=enCoreObj.group.position; }
  }

  if(target) {
    spawnProj(player.position.clone(), target, pAtk, cfg.color);
    sfx.shoot();
  }
}

// ── ABILITY ───────────────────────────────────────────────────────────────────
function doAbility() {
  qCd = qCdMax;
  if(role==='tank') {
    // Ground Slam: AOE damage around player
    sfx.slam();
    flash('rgba(68,255,136,0.2)');
    camShake(0.4);
    burst(player.position.clone(), ROLES.tank.color, 20);
    // Ring expansion
    const ringGeo = new THREE.TorusGeometry(0.5,0.15,8,32);
    const ringMat = new THREE.MeshStandardMaterial({ color:0x44ff88, emissive:0x44ff88, emissiveIntensity:1.5, transparent:true, opacity:0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(player.position); ring.position.y=0.2;
    ring.rotation.x = Math.PI/2;
    scene.add(ring);
    let t=0;
    const expandRing = setInterval(()=>{
      t+=0.04;
      ring.scale.setScalar(1+t*8);
      ring.material.opacity = clamp(0.8-t*2,0,0.8);
      if(t>0.4){ clearInterval(expandRing); scene.remove(ring); }
    }, 16);

    // Damage all enemies in 4 units
    applyAoE(player.position, 4, 50);

  } else if(role==='ranger') {
    // Pierce Arrow: fast projectile that passes through
    sfx.arrow();
    const dir = new THREE.Vector3(mouseW.x-player.position.x, 0, mouseW.z-player.position.z).normalize();
    const target = player.position.clone().add(dir.clone().multiplyScalar(20));
    const geo = new THREE.CylinderGeometry(0.08,0.08,1.5,6);
    const mat = new THREE.MeshStandardMaterial({ color:0xffaa00, emissive:0xff8800, emissiveIntensity:2 });
    const arrow = new THREE.Mesh(geo, mat);
    arrow.position.copy(player.position); arrow.position.y=0.9;
    arrow.rotation.z = Math.PI/2;
    const al = new THREE.PointLight(0xff9900,2.5,4);
    arrow.add(al);
    scene.add(arrow);
    projs.push({ mesh:arrow, dir:dir.clone(), speed:22, dmg:pAtk*1.8, color:0xffaa00, aoe:0, fromPlayer:true, dist:0, maxDist:25, pierce:true });

  } else if(role==='mage') {
    // Fireball: explosive AOE
    sfx.fireball();
    const target = mouseW.clone();
    const geo2 = new THREE.SphereGeometry(0.35,10,10);
    const mat2 = new THREE.MeshStandardMaterial({ color:0xff6600, emissive:0xff3300, emissiveIntensity:2 });
    const ball = new THREE.Mesh(geo2, mat2);
    ball.position.copy(player.position); ball.position.y=0.9;
    const fl = new THREE.PointLight(0xff5500,3,5);
    ball.add(fl);
    scene.add(ball);
    const dir2 = new THREE.Vector3(target.x-player.position.x,0,target.z-player.position.z).normalize();
    projs.push({ mesh:ball, dir:dir2, speed:15, dmg:pAtk*1.5, color:0xff6600, aoe:3.5, fromPlayer:true, dist:0, maxDist:20 });
  }
}

function doBlink() {
  if(role!=='mage') return;
  wCd = wCdMax;
  sfx.blink();
  burst(player.position.clone(), 0xaa55ff, 10);
  // Teleport toward mouse
  const dx = mouseW.x - player.position.x;
  const dz = mouseW.z - player.position.z;
  const len = Math.sqrt(dx*dx+dz*dz);
  const dist = Math.min(len, 6);
  const nx = player.position.x + (dx/len)*dist;
  const nz = player.position.z + (dz/len)*dist;
  player.position.x = clamp(nx, -LANE_W/2+0.5, LANE_W/2-0.5);
  player.position.z = clamp(nz, -LANE/2+1, LANE/2-1);
  burst(player.position.clone(), 0xaa55ff, 10);
}

// ── AOE DAMAGE ────────────────────────────────────────────────────────────────
function applyAoE(pos, radius, dmg) {
  // Damage enemy champ
  if(!eDead && echamp) {
    const d = dist2D(pos, echamp.position);
    if(d < radius) {
      eHP -= dmg;
      floatNum(echamp.position.clone().add(new THREE.Vector3(0,2,0)), '-'+Math.round(dmg), '#ff4455');
      sfx.hit();
      if(eHP <= 0) killEChamp();
    }
  }
  // Damage enemy creeps
  const toRemove = [];
  for(let i=0;i<creeps.length;i++) {
    const c = creeps[i];
    if(!c.isEnemy) continue;
    const d = dist2D(pos, c.mesh.position);
    if(d < radius) {
      c.hp -= dmg;
      floatNum(c.mesh.position.clone().add(new THREE.Vector3(0,1.5,0)), '-'+Math.round(dmg), '#ff8844');
      sfx.hit();
      if(c.hp<=0) {
        burst(c.mesh.position.clone(), 0xff8844, 10);
        scene.remove(c.mesh);
        toRemove.push(i);
        kills++;
        sfx.kill();
        document.getElementById('knum').textContent = kills;
      }
    }
  }
  for(let i=toRemove.length-1;i>=0;i--) creeps.splice(toRemove[i],1);
}

// ── KILL ENEMY CHAMP ─────────────────────────────────────────────────────────
function killEChamp() {
  eDead = true;
  burst(echamp.position.clone(), 0xff2244, 22);
  burst(echamp.position.clone().add(new THREE.Vector3(0,1,0)), 0xffaa00, 14);
  scene.remove(echamp);
  echamp = null;
  kills += 3;
  coreDmg += 0;
  document.getElementById('knum').textContent = kills;
  sfx.kill(); sfx.kill();
  flash('rgba(255,80,30,0.22)');
  camShake(0.5);
  notify('CHAMPION SLAIN! +3 KILLS', 2000);
  eRespawnTimer = 15; // respawn after 15s
}

// ── MAIN UPDATE ───────────────────────────────────────────────────────────────
function update(dt) {
  if(!running || over) return;

  // Timer
  timeLeft -= dt;
  if(timeLeft <= 0) { timeLeft=0; endGame(false); return; }

  // Player movement (WASD)
  const spd = pSpeed * dt;
  let moved = false;
  if(keys['KeyW']||keys['ArrowUp'])    { player.position.z -= spd; moved=true; }
  if(keys['KeyS']||keys['ArrowDown'])  { player.position.z += spd; moved=true; }
  if(keys['KeyA']||keys['ArrowLeft'])  { player.position.x -= spd; moved=true; }
  if(keys['KeyD']||keys['ArrowRight']) { player.position.x += spd; moved=true; }
  player.position.x = clamp(player.position.x, -LANE_W/2+0.5, LANE_W/2-0.5);
  player.position.z = clamp(player.position.z, -LANE/2+1, LANE/2-1);

  // Face mouse direction
  if(mouseW.lengthSq() > 0) {
    const angle = Math.atan2(mouseW.x-player.position.x, mouseW.z-player.position.z);
    player.rotation.y = angle;
  }

  // Camera follow
  const camTarget = new THREE.Vector3(player.position.x*0.3, 20, player.position.z*0.4+10);
  camera.position.lerp(camTarget, 4*dt);
  camera.lookAt(player.position.x*0.3, 0, player.position.z*0.3);

  // Camera shake
  if(shakeT > 0) {
    shakeT -= dt;
    const s = shakeMag * (shakeT/0.28);
    camera.position.x += (Math.random()-.5)*s;
    camera.position.y += (Math.random()-.5)*s;
  }

  // Auto attack timer
  pAtkTimer -= dt;
  if(pAtkTimer <= 0 && !eDead) {
    // Auto find target in range
    let target = null, best = Infinity;
    if(echamp) {
      const d=dist2D(player.position, echamp.position);
      if(d<pRange && d<best){ best=d; target=echamp.position; }
    }
    for(const c of creeps) {
      if(!c.isEnemy) continue;
      const d=dist2D(player.position,c.mesh.position);
      if(d<pRange && d<best){ best=d; target=c.mesh.position; }
    }
    if(!target) {
      const d=dist2D(player.position, enCoreObj.group.position);
      if(d<pRange+1.5) target=enCoreObj.group.position;
    }
    if(target) {
      spawnProj(player.position.clone(), target, pAtk, ROLES[role].color);
      pAtkTimer = pAtkRate;
    }
  }

  // Ability cooldowns
  if(qCd>0) qCd = Math.max(0, qCd-dt);
  if(wCd>0) wCd = Math.max(0, wCd-dt);

  // ── ENEMY CHAMP AI ───────────────────────────────────────────────────────
  if(eDead) {
    eRespawnTimer -= dt;
    if(eRespawnTimer <= 0) buildEChamp();
  } else if(echamp) {
    const distToPlayer = dist2D(echamp.position, player.position);
    const atkRange = 3.5;
    const champSpeed = 4.0 * dt;

    if(distToPlayer > atkRange) {
      // Chase player
      const dir = new THREE.Vector3(player.position.x-echamp.position.x, 0, player.position.z-echamp.position.z).normalize();
      echamp.position.x = clamp(echamp.position.x + dir.x*champSpeed, -LANE_W/2+0.5, LANE_W/2-0.5);
      echamp.position.z += dir.z*champSpeed;
    }

    // Attack player
    eAtkTimer -= dt;
    if(eAtkTimer <= 0 && distToPlayer < atkRange) {
      eAtkTimer = 1.2;
      const dmg = 10 + Math.random()*5;
      pHP -= dmg;
      sfx.playerHit();
      flash('rgba(255,50,50,0.15)');
      camShake(0.25);
      floatNum(player.position.clone().add(new THREE.Vector3(0,2,0)), '-'+Math.round(dmg), '#ff4455');
      if(pHP <= 0) {
        pHP = pMaxHP * 0.5; // respawn with half HP at base
        player.position.set((Math.random()-.5)*3, 0, -LANE/2+8);
        notify('YOU DIED — Respawned', 1800);
        camShake(0.8); flash('rgba(255,0,0,0.4)');
      }
    }

    // Champ bobbing
    ebody.position.y = 0.65 + Math.sin(Date.now()*0.003)*0.12;

    // Champ also attacks our creeps
    for(const c of creeps) {
      if(c.isEnemy) continue;
      const d=dist2D(echamp.position, c.mesh.position);
      if(d<2 && Math.random()<0.01) {
        c.hp -= 15;
        if(c.hp<=0) { burst(c.mesh.position.clone(), 0x55ccff, 8); scene.remove(c.mesh); creeps.splice(creeps.indexOf(c),1); break; }
      }
    }
  }

  // ── CREEP SPAWN ──────────────────────────────────────────────────────────
  creepTimer -= dt;
  if(creepTimer <= 0) {
    creepTimer = CREEP_INT;
    spawnCreeps(true);
    spawnCreeps(false);
  }

  // ── CREEP UPDATE ─────────────────────────────────────────────────────────
  const creepDead = [];
  for(let i=0;i<creeps.length;i++) {
    const c = creeps[i];
    const spd2 = c.speed * dt;
    const dir = c.isEnemy ? -1 : 1;

    // Move toward enemy core
    let targetZ = c.isEnemy ? (-LANE/2+3) : (LANE/2-3);

    // Attack opposing creeps nearby
    let fighting = false;
    for(const oc of creeps) {
      if(oc.isEnemy === c.isEnemy) continue;
      const d = dist2D(c.mesh.position, oc.mesh.position);
      if(d < c.atkRange) {
        fighting = true;
        c.atkTimer -= dt;
        if(c.atkTimer <= 0) {
          c.atkTimer = 1.0;
          oc.hp -= c.atk;
          sfx.hit();
          floatNum(oc.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)), '-'+c.atk, c.isEnemy?'#ff8844':'#44aaff');
          if(oc.hp<=0) {
            burst(oc.mesh.position.clone(), oc.isEnemy?0xff6622:0x55ccff, 9);
            scene.remove(oc.mesh);
            creepDead.push(creeps.indexOf(oc));
            if(!oc.isEnemy) kills++;
          }
        }
        break;
      }
    }

    // Attack player if near (enemy creeps only)
    if(c.isEnemy && !fighting) {
      const pd = dist2D(c.mesh.position, player.position);
      if(pd < 1.8) {
        fighting = true;
        c.atkTimer -= dt;
        if(c.atkTimer <= 0) {
          c.atkTimer = 1.0;
          pHP -= c.atk * 0.7;
          sfx.playerHit();
          if(pHP<=0) {
            pHP = pMaxHP*0.5;
            player.position.set(0,0,-LANE/2+8);
            notify('YOU DIED — Respawned', 1800);
            flash('rgba(255,0,0,0.4)'); camShake(0.8);
          }
        }
      }
    }

    if(!fighting) {
      c.mesh.position.z += dir * spd2;
    }

    // Creep rotation animation
    c.mesh.rotation.y += (c.isEnemy?1:-1)*dt*2;

    // Check if creep reached enemy core
    if(c.isEnemy && c.mesh.position.z < -LANE/2+5) {
      const dmg = 40;
      myCoreHP -= dmg;
      sfx.coreHit();
      flash('rgba(50,120,255,0.2)');
      floatNum(myCoreObj.group.position.clone().add(new THREE.Vector3(0,3,0)), '-'+dmg, '#ff4455');
      burst(myCoreObj.group.position.clone(), 0x0088ff, 10);
      creepDead.push(i);
      if(myCoreHP<=0) { myCoreHP=0; endGame(false); return; }
    }
    if(!c.isEnemy && c.mesh.position.z > LANE/2-5) {
      const dmg = 40;
      enCoreHP -= dmg; coreDmg += dmg;
      sfx.coreHit();
      flash('rgba(255,120,50,0.2)');
      floatNum(enCoreObj.group.position.clone().add(new THREE.Vector3(0,3,0)), '-'+dmg, '#ff8800');
      burst(enCoreObj.group.position.clone(), 0xff5500, 10);
      creepDead.push(i);
      if(enCoreHP<=0) { enCoreHP=0; endGame(true); return; }
    }
  }
  // Remove dead creeps (unique, reverse order)
  [...new Set(creepDead)].sort((a,b)=>b-a).forEach(i=>{ if(creeps[i]) { scene.remove(creeps[i].mesh); creeps.splice(i,1); } });

  // ── PROJECTILE UPDATE ────────────────────────────────────────────────────
  const projDead = [];
  for(let i=0;i<projs.length;i++) {
    const p = projs[i];
    const step = p.speed * dt;
    p.mesh.position.x += p.dir.x * step;
    p.mesh.position.z += p.dir.z * step;
    p.dist += step;

    if(p.dist > p.maxDist) { projDead.push(i); continue; }

    let hit = false;

    if(p.fromPlayer) {
      // Hit enemy champ
      if(!eDead && echamp && dist2D(p.mesh.position, echamp.position) < 1.0) {
        eHP -= p.dmg;
        sfx.hit();
        floatNum(echamp.position.clone().add(new THREE.Vector3(0,2,0)), '-'+Math.round(p.dmg), '#ff4455');
        if(p.aoe>0) applyAoE(p.mesh.position, p.aoe, p.dmg*0.6);
        else { burst(p.mesh.position.clone(), p.color, 10); }
        if(eHP<=0) killEChamp();
        if(!p.pierce) hit=true;
      }

      // Hit enemy creeps
      if(!hit) {
        for(let j=creeps.length-1;j>=0;j--) {
          const c=creeps[j];
          if(!c.isEnemy) continue;
          if(dist2D(p.mesh.position, c.mesh.position)<0.9) {
            c.hp -= p.dmg;
            sfx.hit();
            floatNum(c.mesh.position.clone().add(new THREE.Vector3(0,1.5,0)), '-'+Math.round(p.dmg), '#ff8844');
            burst(c.mesh.position.clone(), p.color, 8);
            if(c.hp<=0) { scene.remove(c.mesh); creeps.splice(j,1); kills++; sfx.kill(); document.getElementById('knum').textContent=kills; }
            if(!p.pierce) { hit=true; break; }
          }
        }
      }

      // Hit enemy core
      if(!hit && dist2D(p.mesh.position, enCoreObj.group.position)<3.2) {
        const dmg = p.dmg*0.6;
        enCoreHP -= dmg; coreDmg += Math.round(dmg);
        sfx.coreHit();
        floatNum(enCoreObj.group.position.clone().add(new THREE.Vector3(0,3,0)), '-'+Math.round(dmg), '#ff8800');
        flash('rgba(255,120,50,0.12)');
        burst(p.mesh.position.clone(), p.color, 8);
        hit=true;
        if(enCoreHP<=0) { enCoreHP=0; endGame(true); return; }
      }

    } else {
      // Enemy projectile — hit player
      if(dist2D(p.mesh.position, player.position)<0.8) {
        pHP -= p.dmg;
        sfx.playerHit();
        flash('rgba(255,50,50,0.14)');
        camShake(0.2);
        floatNum(player.position.clone().add(new THREE.Vector3(0,2,0)), '-'+Math.round(p.dmg), '#ff4455');
        burst(p.mesh.position.clone(), 0xff2244, 7);
        if(pHP<=0) { pHP=pMaxHP*0.5; player.position.set(0,0,-LANE/2+8); notify('YOU DIED',1500); flash('rgba(255,0,0,0.4)'); camShake(0.8); }
        hit=true;
      }
    }

    if(hit) projDead.push(i);
  }
  projDead.sort((a,b)=>b-a).forEach(i=>{ scene.remove(projs[i].mesh); projs.splice(i,1); });

  // ── PARTICLES ────────────────────────────────────────────────────────────
  const partDead=[];
  for(let i=0;i<parts.length;i++) {
    const p=parts[i];
    p.life -= dt;
    p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
    p.vel.y -= 9.8*dt;
    p.mesh.material.opacity = clamp(p.life/0.6, 0, 1);
    if(p.life<=0) { scene.remove(p.mesh); partDead.push(i); }
  }
  partDead.sort((a,b)=>b-a).forEach(i=>parts.splice(i,1));

  // ── CORE ANIMATIONS ──────────────────────────────────────────────────────
  const t=Date.now()*0.001;
  if(myCoreObj) {
    myCoreObj.crystal.rotation.y += dt*1.2;
    myCoreObj.ring.rotation.z    += dt*0.8;
    myCoreObj.light.intensity = 2 + Math.sin(t*2)*0.5;
  }
  if(enCoreObj) {
    enCoreObj.crystal.rotation.y -= dt*1.2;
    enCoreObj.ring.rotation.z    -= dt*0.8;
    enCoreObj.light.intensity = 2 + Math.sin(t*2.3)*0.5;
    // Pulse when low HP
    if(enCoreHP < CORE_MAX*0.3) {
      enCoreObj.crystal.scale.setScalar(1 + Math.sin(t*8)*0.1);
    }
  }

  // Player body pulse when low HP
  if(pHP < pMaxHP*0.3 && pBody) {
    pBody.material.emissiveIntensity = 0.5 + Math.sin(t*8)*0.4;
  }

  // Update HUD
  updateHUD();
}

// ── RENDER LOOP ───────────────────────────────────────────────────────────────
function animate(ts) {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  if(composer) composer.render();
  else renderer.render(scene, camera);
}
animate();
