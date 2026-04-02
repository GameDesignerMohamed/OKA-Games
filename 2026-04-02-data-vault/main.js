// DATA VAULT — main game logic
// Three.js r169 CDN importmap, loaded from index.html

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── AUDIO ──────────────────────────────────────────────────────────────────
let AC=null;
const au=()=>{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;};
const tone=(f,t,d,v,dl=0)=>{try{const c=au(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type=t;o.frequency.value=f;const s=c.currentTime+dl;g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(0.001,s+d);o.start(s);o.stop(s+d);}catch(e){}};
const sfx={
  pickup:()=>{tone(440,'sine',0.12,0.25);tone(660,'sine',0.18,0.2,0.07);tone(880,'sine',0.2,0.15,0.14);},
  alert: ()=>{tone(200,'sawtooth',0.15,0.35);tone(180,'sawtooth',0.15,0.28,0.1);},
  escape:()=>{[330,440,550,660,880,1100].forEach((f,i)=>tone(f,'sine',0.35,0.28,i*0.1));},
  shatter:()=>{for(let i=0;i<8;i++)tone(200+Math.random()*400,'sawtooth',0.2,0.15,i*0.04);tone(100,'sine',0.6,0.4);},
  decoy: ()=>{tone(300,'triangle',0.1,0.2);tone(250,'triangle',0.1,0.15,0.1);},
  catch: ()=>{tone(220,'sawtooth',0.4,0.5);tone(180,'sawtooth',0.5,0.4,0.1);tone(140,'sawtooth',0.6,0.3,0.2);},
  step:  ()=>{tone(70+Math.random()*25,'sine',0.04,0.035);}
};
let bgmOn=false;
function bgmStart(){if(bgmOn)return;bgmOn=true;const ns=[110,98,110,98,82,98,110,130];let i=0;(function t(){if(!bgmOn)return;tone(ns[i++%ns.length],'triangle',0.45,0.07);setTimeout(t,490);})();}
function bgmStop(){bgmOn=false;}

// ── SCENE ──────────────────────────────────────────────────────────────────
const TILE=2,GW=20,GH=20;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x020408);
scene.fog=new THREE.FogExp2(0x020408,0.034);
const asp=window.innerWidth/window.innerHeight;
const CS=14;
const cam=new THREE.OrthographicCamera(-CS*asp,CS*asp,CS,-CS,0.1,200);
cam.position.set(0,50,0);cam.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
let composer=null;
try{
  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.55,0.4,0.82));
}catch(e){}
scene.add(new THREE.AmbientLight(0x112233,3));
const dl=new THREE.DirectionalLight(0x334466,2);dl.position.set(5,20,5);scene.add(dl);
window.addEventListener('resize',()=>{
  const a=innerWidth/innerHeight;
  renderer.setSize(innerWidth,innerHeight);
  cam.left=-CS*a;cam.right=CS*a;cam.top=CS;cam.bottom=-CS;cam.updateProjectionMatrix();
  if(composer)composer.setSize(innerWidth,innerHeight);
});

// ── DATA LABELS ────────────────────────────────────────────────────────────
const LABELS=['SESSION #4: replayed lvl2 × 7','QUERY: "how to win"','CLICK: skip tutorial',
  'LOCATION: Cairo, 02:04','PLAYTIME: 847 hrs total','PURCHASE: premium skin',
  'SEARCH: best build guide','IDLE: 4min 12sec','RAGE-QUIT: wave 8',
  'FIRST SESSION: Feb 26','TAB SWITCH: × 23','WIN RATE: 34%',
  'RETRY: pressed × 14','PREF: dark mode on'];

// ── HELPERS ────────────────────────────────────────────────────────────────
function rng32(s){let seed=s;return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function g2w(gx,gy){return[(gx-GW/2)*TILE+TILE/2,(gy-GH/2)*TILE+TILE/2];}
function w2g(wx,wz){return[Math.floor((wx+GW*TILE/2)/TILE),Math.floor((wz+GH*TILE/2)/TILE)];}
function d2(ax,ay,bx,by){return Math.sqrt((bx-ax)**2+(by-ay)**2);}
let grid=[];
function isWall(gx,gy){if(gx<0||gx>=GW||gy<0||gy>=GH)return true;return grid[gy][gx]===1;}

// ── MATERIALS ──────────────────────────────────────────────────────────────
const M={
  floor:new THREE.MeshStandardMaterial({color:0x0a1220,roughness:1}),
  player:new THREE.MeshStandardMaterial({color:0x00ffaa,emissive:new THREE.Color(0x00aa66),emissiveIntensity:1.5,roughness:0.3,metalness:0.7}),
  data:new THREE.MeshStandardMaterial({color:0x00aaff,emissive:new THREE.Color(0x0066cc),emissiveIntensity:2.5}),
  exit:new THREE.MeshStandardMaterial({color:0xffaa00,emissive:new THREE.Color(0xff6600),emissiveIntensity:2.5}),
  guard:new THREE.MeshStandardMaterial({color:0xff3344,emissive:new THREE.Color(0xcc0022),emissiveIntensity:1.5}),
  chain:new THREE.MeshStandardMaterial({color:0x00ffaa,emissive:new THREE.Color(0x00cc88),emissiveIntensity:1.8,transparent:true,opacity:0.75}),
  decoy:new THREE.MeshStandardMaterial({color:0xaa33ff,emissive:new THREE.Color(0x7700cc),emissiveIntensity:2.5,transparent:true,opacity:0.7}),
};

// ── STATE ──────────────────────────────────────────────────────────────────
let sceneObjs=[],guards=[],blocks=[],decoys=[],chainLinks=[],particles=[];
let pl={},exitMesh=null,pFlash=null,pFlashTgt=null;
let playerChain=[],level=1,gameState='menu',alertLvl=0;
let stepT=0,flashTO=null;

// ── LEVEL BUILD ────────────────────────────────────────────────────────────
function clearLevel(){
  sceneObjs.forEach(o=>scene.remove(o));sceneObjs=[];
  guards=[];blocks=[];decoys=[];chainLinks=[];
  particles.forEach(p=>scene.remove(p));particles=[];
  if(pl.mesh)scene.remove(pl.mesh);
  if(exitMesh)scene.remove(exitMesh);
  if(pFlash){scene.remove(pFlash);if(pFlashTgt)scene.remove(pFlashTgt);}
  playerChain=[];alertLvl=0;stepT=0;
}

function buildLevel(lvl){
  clearLevel();
  const rng=rng32(lvl*99991+1337);
  grid=Array.from({length:GH},()=>Array(GW).fill(0));
  for(let x=0;x<GW;x++){grid[0][x]=1;grid[GH-1][x]=1;}
  for(let y=0;y<GH;y++){grid[y][0]=1;grid[y][GW-1]=1;}
  for(let i=0;i<28+lvl*5;i++){
    const rx=2+Math.floor(rng()*(GW-4)),ry=2+Math.floor(rng()*(GH-4));
    if(rx<5&&ry<5)continue;if(rx>GW-6&&ry>GH-6)continue;
    grid[ry][rx]=1;
    if(rng()<0.5&&rx+1<GW-1)grid[ry][rx+1]=1;
    else if(ry+1<GH-1)grid[ry+1][rx]=1;
  }
  grid[2][2]=0;grid[GH-3][GW-3]=0;

  const fGeo=new THREE.BoxGeometry(TILE,0.1,TILE);
  const wGeo=new THREE.BoxGeometry(TILE,1.5,TILE);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const[wx,wz]=g2w(x,y);
    if(grid[y][x]===1){
      const m=new THREE.Mesh(wGeo,new THREE.MeshStandardMaterial({color:0x1a2233,roughness:0.8,metalness:0.3,emissive:new THREE.Color(0x001133),emissiveIntensity:0.2+rng()*0.7}));
      m.position.set(wx,0.75,wz);scene.add(m);sceneObjs.push(m);
    }else{
      const m=new THREE.Mesh(fGeo,M.floor);m.position.set(wx,0,wz);scene.add(m);sceneObjs.push(m);
    }
  }

  // Stars
  const sg=new THREE.BufferGeometry(),sp=new Float32Array(600);
  for(let i=0;i<200;i++){sp[i*3]=(rng()-0.5)*80;sp[i*3+1]=55+rng()*20;sp[i*3+2]=(rng()-0.5)*80;}
  sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const sm=new THREE.Points(sg,new THREE.PointsMaterial({color:0x334466,size:0.2}));
  scene.add(sm);sceneObjs.push(sm);

  // PLAYER
  const[spx,spz]=g2w(2,2);
  pl={wx:spx,wz:spz,mesh:null};
  const pm=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.8,8),M.player);
  pm.position.set(spx,0.4,spz);pm.add(new THREE.PointLight(0x00ffaa,2,6));
  scene.add(pm);pl.mesh=pm;
  pFlash=new THREE.SpotLight(0x00ffdd,5,11,Math.PI*0.22,0.5);
  pFlash.position.copy(pm.position);
  pFlashTgt=new THREE.Object3D();scene.add(pFlash);scene.add(pFlashTgt);pFlash.target=pFlashTgt;

  // EXIT
  const[exX,exZ]=g2w(GW-3,GH-3);grid[GH-3][GW-3]=0;
  exitMesh=new THREE.Mesh(new THREE.BoxGeometry(TILE*0.9,0.15,TILE*0.9),M.exit.clone());
  exitMesh.position.set(exX,0.08,exZ);exitMesh.add(new THREE.PointLight(0xffaa00,3,9));
  scene.add(exitMesh);sceneObjs.push(exitMesh);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.85,0.07,8,32),new THREE.MeshStandardMaterial({color:0xffaa00,emissive:new THREE.Color(0xff6600),emissiveIntensity:2}));
  ring.position.set(exX,0.2,exZ);ring.rotation.x=Math.PI/2;ring.userData.isRing=true;
  scene.add(ring);sceneObjs.push(ring);

  // BLOCKS
  const used=new Set(['2,2',`${GW-3},${GH-3}`]);
  const lbs=[...LABELS].sort(()=>rng()-0.5);
  for(let i=0,bc=8+lvl*2;i<bc;i++){
    let bx,by,tr=0;
    do{bx=2+Math.floor(rng()*(GW-4));by=2+Math.floor(rng()*(GH-4));tr++;}
    while((isWall(bx,by)||used.has(`${bx},${by}`))&&tr<150);
    if(tr>=150)continue;
    used.add(`${bx},${by}`);
    const[bwx,bwz]=g2w(bx,by);
    const bm=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.7),M.data.clone());
    bm.position.set(bwx,0.45,bwz);bm.add(new THREE.PointLight(0x00aaff,2.5,5));
    scene.add(bm);sceneObjs.push(bm);
    blocks.push({mesh:bm,gx:bx,gy:by,label:lbs[i%lbs.length],got:false});
  }

  // GUARDS
  for(let i=0,gc=Math.min(2+lvl,8);i<gc;i++){
    let gx,gy,tr=0;
    do{gx=2+Math.floor(rng()*(GW-4));gy=2+Math.floor(rng()*(GH-4));tr++;}
    while((isWall(gx,gy)||d2(gx,gy,2,2)<7||used.has(`${gx},${gy}`))&&tr<200);
    if(tr>=200)continue;
    used.add(`${gx},${gy}`);
    const[gwx,gwz]=g2w(gx,gy);
    const gm=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,0.9,6),M.guard.clone());
    gm.position.set(gwx,0.45,gwz);
    const sl=new THREE.SpotLight(0xff4455,3,10,Math.PI*0.2,0.6);
    sl.position.set(0,0.5,0);gm.add(sl);
    scene.add(gm);sceneObjs.push(gm);
    const ang=rng()*Math.PI*2;
    guards.push({mesh:gm,sl,wx:gwx,wz:gwz,ang,
      angSpd:(rng()>0.5?1:-1)*(0.7+rng()*0.8),
      pdx:Math.cos(ang),pdz:Math.sin(ang),mvT:0,mvD:1+rng()*2,
      alerted:false,alertT:0,sfxD:false});
  }
  updateHUD();
}

// ── CHAIN LINK ─────────────────────────────────────────────────────────────
function addLink(x,z){
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,6),M.chain.clone());
  m.position.set(x,0.25,z);scene.add(m);chainLinks.push(m);
}

// ── PARTICLES ──────────────────────────────────────────────────────────────
function burst(x,y,z,col,n=12){
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.07+Math.random()*0.08,4,4),
      new THREE.MeshStandardMaterial({color:col,emissive:new THREE.Color(col),emissiveIntensity:2,transparent:true,opacity:1}));
    m.position.set(x,y,z);
    const th=Math.random()*Math.PI*2,r=1+Math.random()*3;
    m.userData.vx=Math.cos(th)*r;m.userData.vy=2+Math.random()*3;m.userData.vz=Math.sin(th)*r;
    m.userData.life=0.4+Math.random()*0.4;
    scene.add(m);particles.push(m);
  }
}

// ── INPUT ──────────────────────────────────────────────────────────────────
const keys={};
document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(gameState==='playing'){
    if(e.code==='KeyE')grab();
    if(e.code==='Space'){e.preventDefault();dropDecoy();}
  }
});
document.addEventListener('keyup',e=>{keys[e.code]=false;});
let mNDC={x:0,y:0};
document.addEventListener('mousemove',e=>{mNDC.x=(e.clientX/innerWidth)*2-1;mNDC.y=-(e.clientY/innerHeight)*2+1;});
function mWorld(){return new THREE.Vector3(mNDC.x*CS*asp,0,-mNDC.y*CS);}

// ── GRAB / DECOY ───────────────────────────────────────────────────────────
function grab(){
  const[pgx,pgy]=w2g(pl.mesh.position.x,pl.mesh.position.z);
  for(const b of blocks){
    if(b.got)continue;
    if(d2(b.gx,b.gy,pgx,pgy)<1.6){
      b.got=true;burst(b.mesh.position.x,0.5,b.mesh.position.z,0x00aaff);
      scene.remove(b.mesh);playerChain.push(b.label);
      sfx.pickup();flash(`RECOVERED:\n"${b.label}"`, '#00ffaa',2);
      updateHUD();updateChainRow();
      addLink(pl.mesh.position.x+(Math.random()-0.5)*0.4,pl.mesh.position.z+(Math.random()-0.5)*0.4);
      return;
    }
  }
}

function dropDecoy(){
  if(playerChain.length<2)return;
  const dropped=playerChain.pop();
  if(chainLinks.length>0)scene.remove(chainLinks.pop());
  sfx.decoy();updateHUD();updateChainRow();
  const dm=new THREE.Mesh(new THREE.SphereGeometry(0.38,8,8),M.decoy.clone());
  dm.position.copy(pl.mesh.position);dm.position.y=0.35;
  dm.add(new THREE.PointLight(0xaa33ff,2,5));
  scene.add(dm);decoys.push({mesh:dm,life:9,label:dropped});
  flash(`DROPPED DECOY:\n"${dropped}"`, '#aa33ff',1.8);
}

// ── HUD ────────────────────────────────────────────────────────────────────
function updateHUD(){
  document.getElementById('lvl-txt').textContent=`LEVEL ${level}`;
  document.getElementById('grd-txt').textContent=`GUARDS: ${guards.length}`;
  document.getElementById('progress').textContent=`BLOCKS: ${playerChain.length} / 5`;
}
function updateChainRow(){
  document.getElementById('chain-row').innerHTML=playerChain.map(l=>`<div class="cblock">${l.split(':')[0].trim()}</div>`).join('');
}
function flash(txt,color,dur){
  const el=document.getElementById('flash');
  el.innerHTML=txt.replace(/\n/g,'<br>');el.style.color=color;el.style.textShadow=`0 0 20px ${color}`;el.style.opacity='1';
  if(flashTO)clearTimeout(flashTO);
  flashTO=setTimeout(()=>{el.style.opacity='0';},dur*1000);
}

// ── GUARD AI ───────────────────────────────────────────────────────────────
function updateGuards(dt){
  const pw=pl.mesh.position;
  for(const g of guards){
    g.ang+=g.angSpd*dt;g.mvT+=dt;
    const dtp=d2(g.wx,g.wz,pw.x,pw.z);
    const toP=new THREE.Vector2(pw.x-g.wx,pw.z-g.wz).normalize();
    const gD=new THREE.Vector2(Math.cos(g.ang),Math.sin(g.ang));
    const inCone=toP.dot(gD)>Math.cos(0.32)&&dtp<8;
    const sprinting=keys['ShiftLeft']||keys['ShiftRight'];
    const hears=dtp<(sprinting?9:3.5);
    let decoyDistract=false;
    for(const d of decoys){
      if(d2(g.wx,g.wz,d.mesh.position.x,d.mesh.position.z)<6){
        decoyDistract=true;
        g.ang=Math.atan2(d.mesh.position.z-g.wz,d.mesh.position.x-g.wx);
      }
    }
    if((inCone||hears)&&!decoyDistract){
      if(!g.alerted){sfx.alert();g.sfxD=true;}
      g.alerted=true;g.alertT=3;
    }else if(g.alertT>0){g.alertT-=dt;if(g.alertT<=0){g.alerted=false;g.sfxD=false;}}
    if(g.alerted){
      const dx=pw.x-g.wx,dz=pw.z-g.wz,len=Math.sqrt(dx*dx+dz*dz);
      if(len>0.1){
        g.ang=Math.atan2(dz,dx);
        const nx=g.wx+(dx/len)*4.5*dt,nz=g.wz+(dz/len)*4.5*dt;
        const[ngx,ngy]=w2g(nx,nz);
        if(!isWall(ngx,ngy)){g.wx=nx;g.wz=nz;}
      }
    }else{
      if(g.mvT>g.mvD){
        g.mvT=0;g.mvD=1+Math.random()*2;
        g.angSpd=(Math.random()>0.5?1:-1)*(0.5+Math.random()*1);
        const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
        const dr=dirs[Math.floor(Math.random()*4)];g.pdx=dr[0];g.pdz=dr[1];
      }
      const nx=g.wx+g.pdx*2.8*dt,nz=g.wz+g.pdz*2.8*dt;
      const[ngx,ngy]=w2g(nx,nz);
      if(!isWall(ngx,ngy)){g.wx=nx;g.wz=nz;}
      else{g.pdx*=-1;g.pdz*=-1;g.mvT=g.mvD;}
    }
    g.mesh.position.set(g.wx,0.45,g.wz);
    // Flashlight direction
    if(g.sl&&g.sl.target){
      const fd=new THREE.Vector3(Math.cos(g.ang),0,Math.sin(g.ang));
      g.sl.target.position.copy(g.mesh.position).add(fd.multiplyScalar(8));
      g.sl.target.updateMatrixWorld();
    }
    g.mesh.material.emissiveIntensity=g.alerted?2+Math.sin(Date.now()*0.012)*1:1;
    g.mesh.material.emissive.set(g.alerted?0xff0022:0xcc0022);
    // Catch
    if(d2(g.wx,g.wz,pw.x,pw.z)<0.9&&g.alerted){
      caught();return;
    }
  }
}

// ── WIN / LOSE / NEXT LEVEL ────────────────────────────────────────────────
function caught(){
  if(gameState!=='playing')return;
  gameState='dead';bgmStop();sfx.catch();
  chainLinks.forEach(m=>scene.remove(m));chainLinks=[];
  burst(pl.mesh.position.x,0.5,pl.mesh.position.z,0xff0022,18);
  flash(`DATA RETURNED TO GOOGLE\nYour chain: ${playerChain.length} blocks lost`,'#ff3366',999);
  setTimeout(()=>{showOverlay('dead');},2200);
}

function checkExit(){
  if(playerChain.length<5)return;
  const ep=exitMesh.position;
  const pp=pl.mesh.position;
  if(d2(pp.x,pp.z,ep.x,ep.z)<1.5){
    gameState='win';bgmStop();sfx.escape();
    burst(pp.x,0.5,pp.z,0xffaa00,20);burst(pp.x,0.5,pp.z,0x00ffaa,20);
    flash(`ESCAPED!\nYour data is yours now.`,'#ffaa00',999);
    setTimeout(()=>showOverlay('win'),2200);
  }
}

function showOverlay(state){
  const ov=document.getElementById('overlay');
  const h1=ov.querySelector('h1');
  const sub=ov.querySelector('.sub');
  const desc=ov.querySelector('.desc');
  const ctrl=ov.querySelector('.ctrl');
  const btn=document.getElementById('startBtn');
  const wc=document.getElementById('win-chain');
  const wb=document.getElementById('win-chain-blocks');
  if(state==='dead'){
    h1.textContent='CAPTURED';h1.style.color='#ff3366';h1.style.textShadow='0 0 30px #ff3366';
    sub.textContent='your data remains theirs';sub.style.color='rgba(255,51,102,0.45)';
    desc.innerHTML=`You were detected with <strong style="color:#ff3366">${playerChain.length}</strong> data blocks.<br>The chain shattered. Your behavioral record<br>belongs to the platform once more.`;
    ctrl.style.display='none';btn.textContent='Try Again';btn.style.borderColor='#ff3366';btn.style.color='#ff3366';
    wc.style.display='none';
  }else if(state==='win'){
    h1.textContent='ESCAPED';h1.style.color='#ffaa00';h1.style.textShadow='0 0 30px #ffaa00';
    sub.textContent='your data is yours now';sub.style.color='rgba(255,170,0,0.45)';
    desc.innerHTML=`You recovered <strong style="color:#ffaa00">${playerChain.length}</strong> data blocks<br>from Google's vault. Your chain is intact.<br>These decisions belong to you — not them.`;
    ctrl.style.display='none';
    btn.textContent=`Level ${level+1}: Deeper Vault`;btn.style.borderColor='#ffaa00';btn.style.color='#ffaa00';
    // Show recovered chain
    wb.innerHTML=playerChain.map(l=>`<div class="wblock">${l}</div>`).join('');
    wc.style.display='flex';
  }else{
    h1.textContent='DATA VAULT';h1.style.color='#00ffaa';h1.style.textShadow='0 0 30px #00ffaa';
    sub.textContent='reclaim what\'s yours';sub.style.color='rgba(0,255,170,0.45)';
    desc.innerHTML='Your behavioral data is locked in Google\'s servers.<br>Every click, every session, every choice — catalogued.<br>Infiltrate the vault. Steal it back. Carry the chain out alive.';
    ctrl.style.display='block';btn.textContent='Begin Infiltration';btn.style.borderColor='#00ffaa';btn.style.color='#00ffaa';
    wc.style.display='none';
  }
  ov.style.display='flex';
}

window.startGame=function(){
  const ov=document.getElementById('overlay');
  ov.style.display='none';
  if(gameState==='win'){level++;}else{level=1;}
  gameState='playing';
  buildLevel(level);bgmStart();updateHUD();updateChainRow();
};
window.startGame2=window.startGame;

// ── PLAYER MOVEMENT ────────────────────────────────────────────────────────
function movePlayer(dt){
  const sprinting=keys['ShiftLeft']||keys['ShiftRight'];
  const speed=sprinting?9:5.5;
  let dx=0,dz=0;
  if(keys['KeyW']||keys['ArrowUp'])dz-=1;
  if(keys['KeyS']||keys['ArrowDown'])dz+=1;
  if(keys['KeyA']||keys['ArrowLeft'])dx-=1;
  if(keys['KeyD']||keys['ArrowRight'])dx+=1;
  if(dx||dz){
    const len=Math.sqrt(dx*dx+dz*dz);
    dx/=len;dz/=len;
    const nx=pl.mesh.position.x+dx*speed*dt;
    const nz=pl.mesh.position.z+dz*speed*dt;
    const[ngx,ngy]=w2g(nx,nz);
    if(!isWall(ngx,ngy)){pl.mesh.position.x=nx;pl.mesh.position.z=nz;}
    stepT+=dt;
    if(stepT>0.28){stepT=0;sfx.step();}
  }
  // Footstep noise indicator
  const noiseEl=document.getElementById('noise-tag');
  if(noiseEl) noiseEl.style.opacity=sprinting&&(dx||dz)?'1':'0';
}

// ── FLASHLIGHT ─────────────────────────────────────────────────────────────
function updateFlashlight(){
  if(!pFlash||!pFlashTgt)return;
  pFlash.position.copy(pl.mesh.position);pFlash.position.y=0.5;
  const mw=mWorld();
  const dir=new THREE.Vector3(mw.x-pl.mesh.position.x,0,mw.z-pl.mesh.position.z).normalize();
  pFlashTgt.position.copy(pl.mesh.position).add(dir.multiplyScalar(8));
  pFlashTgt.updateMatrixWorld();
}

// ── CAMERA FOLLOW ──────────────────────────────────────────────────────────
function updateCamera(){
  cam.position.x=pl.mesh.position.x;
  cam.position.z=pl.mesh.position.z;
  cam.lookAt(pl.mesh.position.x,0,pl.mesh.position.z);
}

// ── ANIMATE OBJECTS ────────────────────────────────────────────────────────
function animateWorld(t,dt){
  // Spinning data blocks
  for(const b of blocks){
    if(!b.got)b.mesh.rotation.y+=dt*2;
  }
  // Pulsing exit ring
  sceneObjs.forEach(o=>{
    if(o.userData.isRing){o.rotation.z+=dt*1.5;o.scale.setScalar(1+0.05*Math.sin(t*3));}
  });
  // Decoy pulse + expire
  for(let i=decoys.length-1;i>=0;i--){
    const d=decoys[i];
    d.life-=dt;d.mesh.position.y=0.35+0.15*Math.sin(t*4);
    d.mesh.material.opacity=Math.max(0.2,d.life/9);
    if(d.life<=0){scene.remove(d.mesh);decoys.splice(i,1);}
  }
  // Chain link trail update (follow player loosely)
  for(let i=chainLinks.length-1;i>=0;i--){
    const cl=chainLinks[i];
    const target=i===chainLinks.length-1?pl.mesh.position:chainLinks[i+1].position;
    cl.position.x+=(target.x-cl.position.x)*dt*4;
    cl.position.z+=(target.z-cl.position.z)*dt*4;
    cl.position.y=0.25+0.1*Math.sin(t*3+i);
  }
  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.userData.life-=dt;
    p.position.x+=p.userData.vx*dt;
    p.position.y+=p.userData.vy*dt;
    p.position.z+=p.userData.vz*dt;
    p.userData.vy-=8*dt;
    p.material.opacity=Math.max(0,p.userData.life/0.6);
    if(p.userData.life<=0){scene.remove(p);particles.splice(i,1);}
  }
  // Alert bar
  if(gameState==='playing'){
    const sprinting=keys['ShiftLeft']||keys['ShiftRight'];
    const nearGuard=guards.some(g=>d2(g.wx,g.wz,pl.mesh.position.x,pl.mesh.position.z)<8&&g.alerted);
    alertLvl=nearGuard?Math.min(1,alertLvl+dt*0.6):Math.max(0,alertLvl-dt*0.3);
    const af=document.getElementById('alert-fill');
    if(af)af.style.width=(alertLvl*100)+'%';
  }
}

// ── MAIN LOOP ──────────────────────────────────────────────────────────────
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  const t=clock.getElapsedTime();
  if(gameState==='playing'){
    movePlayer(dt);
    updateGuards(dt);
    updateFlashlight();
    updateCamera();
    animateWorld(t,dt);
    checkExit();
  }else{
    animateWorld(t,dt);
  }
  if(composer)composer.render();
  else renderer.render(scene,cam);
}
animate();
