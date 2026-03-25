import * as THREE from 'three';

// ── AUDIO ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
let bgmNodes = [];

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startBGM();
}
function tone(freq, type, dur, vol, delay=0) {
  if (!audioCtx) return;
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(vol, audioCtx.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+delay+dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(audioCtx.currentTime+delay);
  o.stop(audioCtx.currentTime+delay+dur+0.05);
}
const sfx = {
  shoot:     ()=>tone(700,'sine',0.06,0.12),
  enemyDie:  ()=>{ tone(300,'triangle',0.09,0.2); tone(180,'triangle',0.14,0.15,0.05); },
  playerHit: ()=>tone(110,'sawtooth',0.15,0.28),
  driftHit:  ()=>tone(500,'sine',0.09,0.22),
  driftDie:  ()=>{ for(let i=0;i<5;i++) tone(800-i*120,'sawtooth',0.1,0.3,i*0.08); },
  waveClear: ()=>{ [523,659,784,1047].forEach((f,i)=>tone(f,'triangle',0.18,0.25,i*0.1)); },
  win:       ()=>{ [523,659,784,880,1047].forEach((f,i)=>tone(f,'triangle',0.22,0.28,i*0.12)); },
  gameOver:  ()=>{ [440,330,220,165].forEach((f,i)=>tone(f,'sawtooth',0.2,0.3,i*0.1)); },
  mode:      ()=>tone(880,'sine',0.06,0.2),
  panic:     ()=>tone(1200,'sine',0.04,0.12),
};

function startBGM() {
  stopBGM();
  [110,138,165,138].forEach((f,i)=>{
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type='triangle'; o.frequency.value=f; g.gain.value=0.04;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    const lfo=audioCtx.createOscillator(), lg=audioCtx.createGain();
    lfo.frequency.value=0.12+i*0.05; lg.gain.value=0.015;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    bgmNodes.push(o,g,lfo,lg);
  });
}
function stopBGM() { bgmNodes.forEach(n=>{try{n.stop();}catch(e){}}); bgmNodes=[]; }

// ── SCENE ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030308);
scene.fog = new THREE.FogExp2(0x030308, 0.02);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0,28,20);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

window.addEventListener('resize', ()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0x8866ff, 2.0);
dirLight.position.set(10,20,10); scene.add(dirLight);
const pinkLight = new THREE.PointLight(0xff44aa, 1.5, 50);
pinkLight.position.set(-10,5,-10); scene.add(pinkLight);

// Grid
scene.add(new THREE.GridHelper(40,20,0x1a1a3a,0x0d0d1f));

// Stars
{
  const n=400, arr=new Float32Array(n*3);
  for(let i=0;i<n;i++){arr[i*3]=(Math.random()-.5)*120;arr[i*3+1]=Math.random()*60+5;arr[i*3+2]=(Math.random()-.5)*120;}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(arr,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:0.18,transparent:true,opacity:0.55})));
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown',e=>{ keys[e.code]=true; if(e.code==='KeyE') handleE(); });
window.addEventListener('keyup',  e=>keys[e.code]=false);
let mouseDown=false;
window.addEventListener('mousedown',e=>{ if(e.button===0){mouseDown=true; initAudio();} });
window.addEventListener('mouseup',  e=>{ if(e.button===0)mouseDown=false; });

const mouse2=new THREE.Vector2();
window.addEventListener('mousemove',e=>{ mouse2.x=(e.clientX/innerWidth)*2-1; mouse2.y=-(e.clientY/innerHeight)*2+1; });

const raycaster=new THREE.Raycaster();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const mouseWorld=new THREE.Vector3();
function updateMouse(){ raycaster.setFromCamera(mouse2,camera); raycaster.ray.intersectPlane(groundPlane,mouseWorld); }

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ARENA=17, P_MAX_HP=5, D_MAX_HP=8, TOTAL_WAVES=10;

// ── STATE ─────────────────────────────────────────────────────────────────────
let gameActive=false;
let playerHP=P_MAX_HP, driftHP=D_MAX_HP, driftAlive=true;
let score=0, wave=1;
let waveEnemiesLeft=0, wavePaused=false, wavePauseTimer=0;
let playerInvT=0, driftInvT=0;
let camShake=0;
let desatAmt=0;
let DRIFT_MODES=['AGGRESSIVE','DEFENSIVE','RETREAT'], driftModeIdx=0, driftMode='AGGRESSIVE';
let driftStress=0;
let driftVel=new THREE.Vector3(), driftTarget=new THREE.Vector3();
let driftShootT=1.0;
let playerShootT=0;
let waveAnnTimer=0, driftLostTimer=0, flashTimer=0;
let eHandled=false;

// ── MESHES ────────────────────────────────────────────────────────────────────

// Player
const playerMat=new THREE.MeshStandardMaterial({color:0x00ddee,emissive:0x005566,emissiveIntensity:0.7,metalness:0.3,roughness:0.4});
const playerMesh=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.4,6),playerMat);
playerMesh.rotation.x=Math.PI/2;
playerMesh.position.set(0,0.5,3);
scene.add(playerMesh);
const pLight=new THREE.PointLight(0x00ddee,1.8,9);
playerMesh.add(pLight);

// Drift
const driftMat=new THREE.MeshStandardMaterial({color:0xcc66ff,emissive:0x661199,emissiveIntensity:0.9,metalness:0.1,roughness:0.3,transparent:true,opacity:1.0});
const driftMesh=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12),driftMat);
driftMesh.position.set(-3,0.5,0);
scene.add(driftMesh);

const dRingMat=new THREE.MeshStandardMaterial({color:0xff44aa,emissive:0xaa0055,emissiveIntensity:1.0,transparent:true,opacity:0.85});
const dRing=new THREE.Mesh(new THREE.TorusGeometry(0.75,0.07,8,32),dRingMat);
driftMesh.add(dRing);

const dLight=new THREE.PointLight(0xcc66ff,2.2,11);
driftMesh.add(dLight);

// Nameplate sprite
{
  const c=document.createElement('canvas'); c.width=128; c.height=32;
  const cx=c.getContext('2d');
  cx.fillStyle='rgba(0,0,0,0)'; cx.fillRect(0,0,128,32);
  cx.fillStyle='#cc66ff'; cx.font='bold 17px Courier New'; cx.textAlign='center';
  cx.fillText('DRIFT',64,22);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  sp.scale.set(2.5,0.6,1); sp.position.set(0,1.7,0);
  driftMesh.add(sp);
}

// ── BULLETS ───────────────────────────────────────────────────────────────────
const bGeo=new THREE.SphereGeometry(0.11,6,4);
const mats={
  player:new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00aacc,emissiveIntensity:1.8}),
  drift: new THREE.MeshStandardMaterial({color:0xff44aa,emissive:0xaa0066,emissiveIntensity:1.8}),
  enemy: new THREE.MeshStandardMaterial({color:0xff4444,emissive:0xaa0000,emissiveIntensity:1.5}),
};
let bullets=[];

function spawnBullet(pos, dir, owner) {
  const m=new THREE.Mesh(bGeo, mats[owner]);
  m.position.copy(pos); m.position.y=0.5;
  const bl=new THREE.PointLight(owner==='player'?0x00ffff:owner==='drift'?0xff44aa:0xff4444,0.9,3.5);
  m.add(bl);
  scene.add(m);
  bullets.push({mesh:m, dir:dir.clone().normalize(), owner, life:2.2, speed:owner==='enemy'?10:22});
}

// ── ENEMIES ───────────────────────────────────────────────────────────────────
const eGeo=new THREE.IcosahedronGeometry(0.55,0);
let enemies=[];

function makeEMat(wv){
  const r=Math.min(1,0.55+wv*0.04), g=Math.max(0,0.28-wv*0.025);
  return new THREE.MeshStandardMaterial({color:new THREE.Color(r,g,0.08),emissive:new THREE.Color(r*0.5,g*0.2,0),emissiveIntensity:0.9,metalness:0.2,roughness:0.5});
}

function spawnWave(wv){
  const count=4+wv*2, hp=1+Math.floor(wv/3), spd=2.5+wv*0.2, shoots=wv>=4;
  for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2, r=ARENA*0.88;
    const m=new THREE.Mesh(eGeo,makeEMat(wv));
    m.position.set(Math.cos(a)*r,0.5,Math.sin(a)*r);
    scene.add(m);
    const el=new THREE.PointLight(0xff3300,0.7,4); m.add(el);
    enemies.push({mesh:m,hp,maxHp:hp,speed:spd,shoots,shootT:1.5+Math.random()*2,rotSpd:(Math.random()-.5)*3,wob:Math.random()*Math.PI*2,targetDrift:Math.random()<0.4});
  }
  waveEnemiesLeft=count;
}

// ── PARTICLES ─────────────────────────────────────────────────────────────────
let parts=[];

function spawnParts(pos, color, count=12){
  const arr=new Float32Array(count*3), vels=[];
  for(let i=0;i<count;i++){
    arr[i*3]=pos.x; arr[i*3+1]=pos.y; arr[i*3+2]=pos.z;
    vels.push(new THREE.Vector3((Math.random()-.5)*8,Math.random()*5+1,(Math.random()-.5)*8));
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(arr,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({color,size:0.2,transparent:true,opacity:1.0}));
  scene.add(pts);
  parts.push({pts,vels,arr,life:0.8,maxLife:0.8});
}

// ── SCREEN FLASH ──────────────────────────────────────────────────────────────
const flashDiv=document.createElement('div');
Object.assign(flashDiv.style,{position:'fixed',top:0,left:0,right:0,bottom:0,opacity:0,pointerEvents:'none',zIndex:5,transition:'opacity .05s'});
document.body.appendChild(flashDiv);
function doFlash(col){ flashDiv.style.background=col; flashDiv.style.opacity=0.5; flashTimer=0.12; }

// ── UI REFS ───────────────────────────────────────────────────────────────────
const UI={
  playerHPFill: document.getElementById('player-hp-fill'),
  driftHPFill:  document.getElementById('drift-hp-fill'),
  driftStatus:  document.getElementById('drift-status'),
  waveNum:      document.getElementById('wave-num'),
  score:        document.getElementById('score-display'),
  cmdState:     document.getElementById('cmd-state'),
  stressFill:   document.getElementById('stress-fill'),
  waveAnn:      document.getElementById('wave-announce'),
  driftLost:    document.getElementById('drift-lost-msg'),
  overlay:      document.getElementById('overlay'),
  resultOverlay:document.getElementById('result-overlay'),
  resultTitle:  document.getElementById('result-title'),
  resultDetail: document.getElementById('result-detail'),
};

function updateHUD(){
  UI.playerHPFill.style.width=(playerHP/P_MAX_HP*100)+'%';
  UI.driftHPFill.style.width=driftAlive?(driftHP/D_MAX_HP*100)+'%':'0%';
  UI.score.textContent=score;
  UI.waveNum.textContent='WAVE '+wave;
  UI.cmdState.textContent=driftMode;
  UI.stressFill.style.width=driftStress+'%';
  UI.stressFill.style.background=driftStress<40?'#cc66ff':driftStress<70?'#ff8844':'#ff4444';
  if(!driftAlive){ UI.driftStatus.textContent='OFFLINE'; UI.driftStatus.style.color='#ff4444'; }
  else if(driftStress>70){ UI.driftStatus.textContent='⚠ PANIC'; UI.driftStatus.style.color='#ff4444'; }
  else if(driftStress>40){ UI.driftStatus.textContent='TENSE'; UI.driftStatus.style.color='#ff8844'; }
  else{ UI.driftStatus.textContent='ONLINE'; UI.driftStatus.style.color='#cc66ff'; }
}

function showAnn(text){ UI.waveAnn.textContent=text; UI.waveAnn.style.opacity='1'; waveAnnTimer=2.0; }
function showDriftLost(){ UI.driftLost.style.opacity='1'; driftLostTimer=2.5; }

// ── DRIFT MODE ────────────────────────────────────────────────────────────────
function handleE(){
  if(!gameActive) return;
  driftModeIdx=(driftModeIdx+1)%3;
  driftMode=DRIFT_MODES[driftModeIdx];
  sfx.mode();
  updateHUD();
}

// ── GAME START ────────────────────────────────────────────────────────────────
function startGame(){
  initAudio();
  UI.overlay.style.display='none';
  UI.resultOverlay.style.display='none';
  playerHP=P_MAX_HP; driftHP=D_MAX_HP; driftAlive=true;
  score=0; wave=1; driftModeIdx=0; driftMode='AGGRESSIVE'; driftStress=0;
  wavePaused=false; wavePauseTimer=0;
  playerInvT=0; driftInvT=0; desatAmt=0;
  bullets.forEach(b=>scene.remove(b.mesh)); bullets=[];
  enemies.forEach(e=>scene.remove(e.mesh)); enemies=[];
  parts.forEach(p=>scene.remove(p.pts)); parts=[];
  playerMesh.position.set(0,0.5,3);
  driftMesh.position.set(-3,0.5,0);
  driftMat.opacity=1.0; driftMat.color.set(0xcc66ff); driftMat.emissive.set(0x661199);
  dLight.intensity=2.2; dLight.color.set(0xcc66ff);
  dRingMat.opacity=0.85;
  gameActive=true;
  spawnWave(1);
  showAnn('WAVE 1');
  sfx.waveClear();
  updateHUD();
}
window.startGame=startGame;
window.restartGame=startGame;

document.getElementById('start-btn').addEventListener('click',startGame);
document.getElementById('retry-btn').addEventListener('click',startGame);

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
const clock=new THREE.Clock();

function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(clock.getDelta(),0.05);

  if(!gameActive){ renderer.render(scene,camera); return; }

  updateMouse();
  const now=clock.elapsedTime;

  // ── Player input ──
  const pmove=new THREE.Vector3();
  if(keys['KeyW']||keys['ArrowUp'])    pmove.z-=1;
  if(keys['KeyS']||keys['ArrowDown'])  pmove.z+=1;
  if(keys['KeyA']||keys['ArrowLeft'])  pmove.x-=1;
  if(keys['KeyD']||keys['ArrowRight']) pmove.x+=1;
  if(pmove.length()>0){ pmove.normalize().multiplyScalar(dt*7); playerMesh.position.add(pmove); }
  playerMesh.position.x=THREE.MathUtils.clamp(playerMesh.position.x,-ARENA,ARENA);
  playerMesh.position.z=THREE.MathUtils.clamp(playerMesh.position.z,-ARENA,ARENA);

  // Rotate toward mouse
  if(mouseWorld.lengthSq()>0){
    const dx=mouseWorld.x-playerMesh.position.x, dz=mouseWorld.z-playerMesh.position.z;
    playerMesh.rotation.y=Math.atan2(dx,dz);
  }

  // Player shoot
  if(mouseDown){
    playerShootT-=dt;
    if(playerShootT<=0){
      playerShootT=0.14;
      const dx=mouseWorld.x-playerMesh.position.x, dz=mouseWorld.z-playerMesh.position.z;
      const dir=new THREE.Vector3(dx,0,dz).normalize();
      spawnBullet(playerMesh.position.clone().add(dir.clone().multiplyScalar(0.9)),dir,'player');
      sfx.shoot();
    }
  }

  // ── Drift AI ──
  if(driftAlive){
    // Compute stress
    let nearCount=0;
    for(const e of enemies) if(driftMesh.position.distanceTo(e.mesh.position)<9) nearCount++;
    const hpFrac=driftHP/D_MAX_HP;
    let rawStress=nearCount*15+(1-hpFrac)*55;
    if(driftMode==='AGGRESSIVE') rawStress=Math.max(0,rawStress-25);
    if(driftMode==='RETREAT')    rawStress=Math.min(100,rawStress+40);
    driftStress=rawStress;

    // Panic SFX
    if(driftStress>70 && Math.random()<0.008) sfx.panic();

    // Target position logic
    let dspd=4.5;
    if(driftStress<40 || driftMode==='AGGRESSIVE'){
      // Flank nearest enemy
      let nearE=null, nearD=Infinity;
      for(const e of enemies){
        const d=driftMesh.position.distanceTo(e.mesh.position);
        if(d<nearD){nearD=d; nearE=e;}
      }
      if(nearE){
        const toE=new THREE.Vector3().subVectors(nearE.mesh.position,playerMesh.position).normalize();
        const perp=new THREE.Vector3(-toE.z,0,toE.x);
        driftTarget.copy(nearE.mesh.position).addScaledVector(perp,3.5);
      } else {
        driftTarget.set(playerMesh.position.x+3,0,playerMesh.position.z);
      }
      dspd=4.5;
    } else if(driftStress<70 || driftMode==='DEFENSIVE'){
      // Stay close to player, erratic
      const erratic=new THREE.Vector3(Math.sin(now*2.1)*2, 0, Math.cos(now*1.7)*2);
      driftTarget.copy(playerMesh.position).add(erratic).addScaledVector(new THREE.Vector3(1,0,0),3);
      dspd=3.5;
    } else {
      // Panic: hide behind player
      const toPlayer=new THREE.Vector3().subVectors(playerMesh.position,driftMesh.position).normalize();
      let awayFromEnemies=new THREE.Vector3();
      for(const e of enemies){
        const d=driftMesh.position.distanceTo(e.mesh.position);
        if(d<12) awayFromEnemies.addScaledVector(new THREE.Vector3().subVectors(driftMesh.position,e.mesh.position).normalize(),1);
      }
      driftTarget.copy(playerMesh.position).addScaledVector(awayFromEnemies.normalize(),-2);
      dspd=5.5;
    }

    driftTarget.x=THREE.MathUtils.clamp(driftTarget.x,-ARENA,ARENA);
    driftTarget.z=THREE.MathUtils.clamp(driftTarget.z,-ARENA,ARENA);

    // Move toward target
    const toDrift=new THREE.Vector3().subVectors(driftTarget,driftMesh.position);
    const distToTarget=toDrift.length();
    if(distToTarget>0.5){
      driftVel.lerp(toDrift.normalize().multiplyScalar(dspd),dt*4);
      driftMesh.position.addScaledVector(driftVel,dt);
    }
    driftMesh.position.x=THREE.MathUtils.clamp(driftMesh.position.x,-ARENA,ARENA);
    driftMesh.position.z=THREE.MathUtils.clamp(driftMesh.position.z,-ARENA,ARENA);

    // Drift panic wobble
    if(driftStress>70){
      driftMesh.position.x+=Math.sin(now*18)*0.03;
      driftMesh.position.z+=Math.cos(now*15)*0.03;
    }

    // Drift shoot at nearest enemy
    driftShootT-=dt;
    const shootRate = driftMode==='AGGRESSIVE'?0.5 : driftStress>70?2.5 : 0.9;
    if(driftShootT<=0 && enemies.length>0 && (driftMode!=='RETREAT' || driftStress<70)){
      driftShootT=shootRate*(0.8+Math.random()*0.4);
      let target=null, nearD=Infinity;
      for(const e of enemies){
        const d=driftMesh.position.distanceTo(e.mesh.position);
        if(d<nearD){nearD=d; target=e;}
      }
      if(target){
        const dir=new THREE.Vector3().subVectors(target.mesh.position,driftMesh.position).normalize();
        spawnBullet(driftMesh.position.clone().addScaledVector(dir,0.8),dir,'drift');
      }
    }

    // Drift visuals per stress
    const sc=driftStress>70 ? 0.9+Math.sin(now*20)*0.1 : driftStress>40 ? 0.95+Math.sin(now*8)*0.05 : 1.0;
    driftMesh.scale.setScalar(sc);
    dLight.intensity=driftStress>70?1.0:2.2;
    dLight.color.set(driftStress>70?0xff4444:0xcc66ff);
    dRing.rotation.y+=dt*(driftStress>70?6:3);
  } else {
    // Drift dead — desaturate scene slightly
    desatAmt=Math.min(1,desatAmt+dt*0.3);
  }

  // ── Enemies ──
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.wob+=dt*2;
    e.mesh.rotation.x+=dt*e.rotSpd;
    e.mesh.rotation.z+=dt*e.rotSpd*0.7;
    e.mesh.position.y=0.5+Math.sin(e.wob)*0.1;

    // Target: drift or player
    const targetPos=e.targetDrift && driftAlive ? driftMesh.position : playerMesh.position;
    const toTarget=new THREE.Vector3().subVectors(targetPos, e.mesh.position);
    toTarget.y=0;
    const dist=toTarget.length();
    if(dist>0.8){
      e.mesh.position.addScaledVector(toTarget.normalize(), e.speed*dt);
    }
    e.mesh.position.x=THREE.MathUtils.clamp(e.mesh.position.x,-ARENA,ARENA);
    e.mesh.position.z=THREE.MathUtils.clamp(e.mesh.position.z,-ARENA,ARENA);

    // Enemy shoots (wave 4+)
    if(e.shoots){
      e.shootT-=dt;
      if(e.shootT<=0){
        e.shootT=2.0+Math.random()*2.0;
        const dir=new THREE.Vector3().subVectors(targetPos,e.mesh.position).normalize();
        spawnBullet(e.mesh.position.clone().addScaledVector(dir,0.9),dir,'enemy');
      }
    }

    // Melee vs player
    if(e.mesh.position.distanceTo(playerMesh.position)<1.1 && playerInvT<=0){
      playerHP--; playerInvT=1.0;
      sfx.playerHit(); doFlash('rgba(0,200,255,0.25)');
      camShake=0.25;
      if(playerHP<=0){ endGame(false); return; }
    }
    // Melee vs drift
    if(driftAlive && e.mesh.position.distanceTo(driftMesh.position)<1.1 && driftInvT<=0){
      driftHP--; driftInvT=0.8;
      sfx.driftHit(); doFlash('rgba(204,102,255,0.2)');
      if(driftHP<=0){ killDrift(); }
    }
  }

  // ── Bullets ──
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.mesh.position.addScaledVector(b.dir, b.speed*dt);
    b.life-=dt;
    if(b.life<=0 || Math.abs(b.mesh.position.x)>ARENA+2 || Math.abs(b.mesh.position.z)>ARENA+2){
      scene.remove(b.mesh); bullets.splice(i,1); continue;
    }

    if(b.owner==='player'||b.owner==='drift'){
      // Hit enemies
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        if(b.mesh.position.distanceTo(e.mesh.position)<0.7){
          e.hp--;
          spawnParts(e.mesh.position, b.owner==='player'?0x00ffff:0xff44aa, 8);
          sfx.enemyDie();
          if(e.hp<=0){
            score+=10*(b.owner==='drift'?2:1); // Drift kills = 2x score
            scene.remove(e.mesh); enemies.splice(j,1);
            waveEnemiesLeft--;
          }
          scene.remove(b.mesh); bullets.splice(i,1); break;
        }
      }
    } else {
      // Enemy bullet vs player
      if(b.mesh.position.distanceTo(playerMesh.position)<0.7 && playerInvT<=0){
        playerHP--; playerInvT=0.8;
        sfx.playerHit(); doFlash('rgba(0,200,255,0.25)'); camShake=0.2;
        scene.remove(b.mesh); bullets.splice(i,1);
        if(playerHP<=0){ endGame(false); return; }
        continue;
      }
      // Enemy bullet vs drift
      if(driftAlive && b.mesh.position.distanceTo(driftMesh.position)<0.7 && driftInvT<=0){
        driftHP--; driftInvT=0.6;
        sfx.driftHit(); doFlash('rgba(204,102,255,0.2)');
        scene.remove(b.mesh); bullets.splice(i,1);
        if(driftHP<=0){ killDrift(); }
        continue;
      }
    }
  }

  // ── Wave cleared? ──
  if(waveEnemiesLeft<=0 && enemies.length===0 && !wavePaused){
    wavePaused=true; wavePauseTimer=2.5;
    sfx.waveClear();
    score+=wave*100 + (driftAlive?driftHP*50:0);
    if(wave>=TOTAL_WAVES){ endGame(true); return; }
    showAnn('WAVE '+(wave+1)+' INCOMING');
  }

  if(wavePaused){
    wavePauseTimer-=dt;
    if(wavePauseTimer<=0){
      wavePaused=false;
      wave++;
      spawnWave(wave);
      sfx.waveClear();
    }
  }

  // ── Particles ──
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.life-=dt;
    if(p.life<=0){ scene.remove(p.pts); parts.splice(i,1); continue; }
    const frac=p.life/p.maxLife;
    p.pts.material.opacity=frac;
    const pos=p.pts.geometry.attributes.position.array;
    for(let j=0;j<p.vels.length;j++){
      pos[j*3]  +=p.vels[j].x*dt;
      pos[j*3+1]+=p.vels[j].y*dt;
      pos[j*3+2]+=p.vels[j].z*dt;
      p.vels[j].y-=9.8*dt;
    }
    p.pts.geometry.attributes.position.needsUpdate=true;
  }

  // ── Timers ──
  if(playerInvT>0){ playerInvT-=dt; playerMesh.visible=Math.sin(playerInvT*30)>0; }
  else playerMesh.visible=true;
  if(driftInvT>0) driftInvT-=dt;

  if(waveAnnTimer>0){ waveAnnTimer-=dt; if(waveAnnTimer<=0) UI.waveAnn.style.opacity='0'; }
  if(driftLostTimer>0){ driftLostTimer-=dt; if(driftLostTimer<=0) UI.driftLost.style.opacity='0'; }
  if(flashTimer>0){ flashTimer-=dt; if(flashTimer<=0) flashDiv.style.opacity=0; }

  // Camera shake
  if(camShake>0){
    camShake-=dt*3;
    camera.position.x=Math.sin(camShake*50)*camShake*0.8;
    camera.position.z=20+Math.cos(camShake*40)*camShake*0.8;
  } else {
    camera.position.x=0; camera.position.z=20;
  }

  // ── Animations ──
  const t=clock.elapsedTime;
  playerMesh.position.y=0.5+Math.sin(t*3)*0.05;
  if(driftAlive) driftMesh.position.y=0.5+Math.sin(t*2.3+1)*0.08;
  dRing.rotation.x=t*1.5;

  // Drift panic particles
  if(driftAlive && driftStress>70 && Math.random()<0.03) spawnParts(driftMesh.position,0xff44aa,4);

  updateHUD();
  renderer.render(scene, camera);
}

// ── DRIFT DEATH ───────────────────────────────────────────────────────────────
function killDrift(){
  driftAlive=false;
  driftHP=0;
  sfx.driftDie();
  doFlash('rgba(255,68,170,0.4)');
  spawnParts(driftMesh.position,0xcc66ff,20);
  driftMesh.visible=false;
  showDriftLost();
  // Tint scene slightly desaturated
  scene.background=new THREE.Color(0x080810);
  pinkLight.intensity=0.3;
}

// ── END GAME ──────────────────────────────────────────────────────────────────
function endGame(won){
  gameActive=false;
  if(won){ sfx.win(); } else { sfx.gameOver(); }
  const finalScore=won ? score + (driftAlive?driftHP*200:0) : score;
  UI.resultTitle.textContent = won ? 'MISSION COMPLETE' : 'SIGNAL LOST';
  UI.resultTitle.style.color = won ? '#cc66ff' : '#ff4444';
  UI.resultDetail.innerHTML = `
    <span class="hl">WAVES SURVIVED</span> ${wave}<br>
    <span class="hl">DRIFT</span> ${driftAlive?'SURVIVED':'LOST'}<br>
    <span class="hl">FINAL SCORE</span> ${finalScore}
  `;
  setTimeout(()=>{ UI.resultOverlay.style.display='flex'; },1200);
}

// ── START ─────────────────────────────────────────────────────────────────────
tick();
