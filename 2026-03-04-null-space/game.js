import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── MAZE ─────────────────────────────────────────────────────────
const COLS = 19, ROWS = 15, TILE = 2;
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,1,0,1,0,1,0,1,0,1],
  [1,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,1],
  [1,0,0,0,1,1,1,1,0,0,0,1,1,0,1,1,0,0,1],
  [1,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,1],
  [1,0,0,1,1,0,0,0,0,1,1,0,1,1,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,0,0,1,0,0,1,1,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,1,1,0,1,1,0,0,1],
  [1,1,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1],
  [1,0,0,1,1,0,1,1,1,0,1,1,0,1,1,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function isWall(col,row){if(col<0||col>=COLS||row<0||row>=ROWS)return true;return MAZE[row][col]===1;}
function tileCenter(col,row){return new THREE.Vector3((col-COLS/2+0.5)*TILE,0,(row-ROWS/2+0.5)*TILE);}
function worldToGrid(wx,wz){return{col:Math.floor(wx/TILE+COLS/2),row:Math.floor(wz/TILE+ROWS/2)};}

// ── STATE ────────────────────────────────────────────────────────
let scene,camera,renderer,composer,clock;
let playerGroup,playerMesh,playerLight;
let sentGroup,sentMesh,visionConeMesh;
let exitPortalMesh,exitGlow;
let shardMeshes=[],particles=[];
let gameState='menu';
let px=0,pz=0,sx=0,sz=0,sAngle=Math.PI;
let shardsCollected=0,exitActive=false;
let alertLevel=0,sentMode='patrol',sentTarget=null;
let heatmap=[],trail=[];
let screenShake=0,catchFlash=0,winFlash=0;
let catchTimer=0,stepTimer=0,portalPulse=0;
const keys={};
let audioCtx=null,masterGain=null,heartTO=null;

const shardCountEl=document.getElementById('shardCount');
const threatEl=document.getElementById('threat');
const alertEl=document.getElementById('alertMsg');
const flashEl=document.getElementById('flash');
const overlay=document.getElementById('overlay');
const startScreen=document.getElementById('startScreen');
const resultScreen=document.getElementById('resultScreen');
const resultTitle=document.getElementById('resultTitle');
const resultMsg=document.getElementById('resultMsg');
const mmCanvas=document.getElementById('minimap');
const mmCtx=mmCanvas.getContext('2d');

// ── AUDIO ────────────────────────────────────────────────────────
function ensureAudio(){
  if(audioCtx)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  masterGain=audioCtx.createGain();masterGain.gain.value=0.22;
  masterGain.connect(audioCtx.destination);
  startDrone();scheduleHeartbeat(600);
}
function startDrone(){
  const t=audioCtx.currentTime;
  [55,58,55].forEach((hz,i)=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();
    o.type='sawtooth';o.frequency.value=hz;f.type='lowpass';f.frequency.value=150;g.gain.value=0.04;
    o.connect(f);f.connect(g);g.connect(masterGain);o.start(t+i*0.5);
  });
  const lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();
  lfo.frequency.value=0.08;lg.gain.value=0.02;
  lfo.connect(lg);lg.connect(masterGain.gain);lfo.start();
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.018;
  const ns=audioCtx.createBufferSource();ns.buffer=buf;ns.loop=true;
  const nf=audioCtx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=850;nf.Q.value=0.7;
  const ng=audioCtx.createGain();ng.gain.value=0.055;
  ns.connect(nf);nf.connect(ng);ng.connect(masterGain);ns.start();
}
function scheduleHeartbeat(delay){
  if(heartTO)clearTimeout(heartTO);
  heartTO=setTimeout(()=>{
    if(gameState!=='playing'||!audioCtx)return;
    const t=audioCtx.currentTime;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='sine';o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(25,t+0.2);
    const vol=0.28*Math.max(0.12,alertLevel);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
    o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+0.28);
    const interval=THREE.MathUtils.lerp(1.2,0.28,alertLevel);
    scheduleHeartbeat(interval*1000);
  },delay);
}
function sfx(type){
  if(!audioCtx)return;
  const t=audioCtx.currentTime;
  if(type==='shard'){
    [700,1050,1400].forEach((hz,i)=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='square';o.frequency.value=hz;
      g.gain.setValueAtTime(0.12,t+i*0.07);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.07+0.3);
      o.connect(g);g.connect(masterGain);o.start(t+i*0.07);o.stop(t+i*0.07+0.35);
    });
  }else if(type==='caught'){
    for(let i=0;i<6;i++){
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='sawtooth';o.frequency.value=350+i*100;
      g.gain.setValueAtTime(0.3,t+i*0.07);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.07+0.35);
      o.connect(g);g.connect(masterGain);o.start(t+i*0.07);o.stop(t+i*0.07+0.4);
    }
  }else if(type==='win'){
    [523,659,784,1047,1319].forEach((hz,i)=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='triangle';o.frequency.value=hz;
      g.gain.setValueAtTime(0.2,t+i*0.12);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.12+0.6);
      o.connect(g);g.connect(masterGain);o.start(t+i*0.12);o.stop(t+i*0.12+0.7);
    });
  }else if(type==='portal'){
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='sine';o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(440,t+0.7);
    g.gain.setValueAtTime(0.2,t);g.gain.exponentialRampToValueAtTime(0.001,t+1.0);
    o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+1.1);
  }else if(type==='step'){
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='sine';o.frequency.value=55;
    g.gain.setValueAtTime(0.04,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.07);
    o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+0.09);
  }else if(type==='alert'){
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='square';o.frequency.value=220;
    g.gain.setValueAtTime(0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
    o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+0.18);
  }
}

// ── SCENE ────────────────────────────────────────────────────────
function initScene(){
  scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x000000,0.085);
  scene.background=new THREE.Color(0x000000);
  const asp=window.innerWidth/window.innerHeight,fr=13;
  camera=new THREE.OrthographicCamera(-fr*asp,fr*asp,fr,-fr,0.1,200);
  camera.position.set(0,60,0);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(window.innerWidth,window.innerHeight),1.5,0.38,0.80);
  composer.addPass(bloom);
  scene.add(new THREE.AmbientLight(0x000511,0.5));
  clock=new THREE.Clock();
  window.addEventListener('resize',()=>{
    const asp=window.innerWidth/window.innerHeight,fr=13;
    camera.left=-fr*asp;camera.right=fr*asp;camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
    composer.setSize(window.innerWidth,window.innerHeight);
  });
  window.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE')tryCollect();});
  window.addEventListener('keyup',e=>{keys[e.code]=false;});
}

// ── BUILD WORLD ──────────────────────────────────────────────────
function buildWorld(){
  const toRemove=[];
  scene.traverse(obj=>{if(obj!==scene&&!(obj instanceof THREE.AmbientLight))toRemove.push(obj);});
  toRemove.forEach(o=>scene.remove(o));
  particles=[];shardMeshes=[];
  const dummy=new THREE.Object3D();
  let wallCount=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(MAZE[r][c]===1)wallCount++;
  const wGeo=new THREE.BoxGeometry(TILE*0.97,TILE*1.15,TILE*0.97);
  const wMat=new THREE.MeshStandardMaterial({color:0x060610,emissive:0x010110,emissiveIntensity:0.8,roughness:0.88,metalness:0.25});
  const wallInst=new THREE.InstancedMesh(wGeo,wMat,wallCount);
  wallInst.receiveShadow=true;
  let wi=0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(MAZE[r][c]===1){
        const tc=tileCenter(c,r);dummy.position.set(tc.x,0,tc.z);dummy.updateMatrix();
        wallInst.setMatrixAt(wi++,dummy.matrix);
      }
    }
  }
  wallInst.instanceMatrix.needsUpdate=true;scene.add(wallInst);

  const fCount=ROWS*COLS-wallCount;
  const fGeo=new THREE.PlaneGeometry(TILE*0.98,TILE*0.98);
  const fMat=new THREE.MeshStandardMaterial({color:0x030309,roughness:1.0});
  const floorInst=new THREE.InstancedMesh(fGeo,fMat,fCount);
  floorInst.receiveShadow=true;let fi=0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(MAZE[r][c]===0){
        const tc=tileCenter(c,r);
        dummy.position.set(tc.x,-0.58,tc.z);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();
        floorInst.setMatrixAt(fi++,dummy.matrix);dummy.rotation.x=0;
      }
    }
  }
  floorInst.instanceMatrix.needsUpdate=true;scene.add(floorInst);

  // Player
  playerGroup=new THREE.Group();
  const pGeo=new THREE.CylinderGeometry(0.32,0.32,0.36,10);
  const pMat=new THREE.MeshStandardMaterial({color:0x00ddff,emissive:0x0099cc,emissiveIntensity:2.2,roughness:0.15});
  playerMesh=new THREE.Mesh(pGeo,pMat);playerMesh.castShadow=true;playerGroup.add(playerMesh);
  const rGeo=new THREE.RingGeometry(0.36,0.52,16);
  const rMat=new THREE.MeshBasicMaterial({color:0x00ffff,transparent:true,opacity:0.55,side:THREE.DoubleSide});
  const ring=new THREE.Mesh(rGeo,rMat);ring.rotation.x=-Math.PI/2;ring.position.y=-0.18;
  playerGroup.add(ring);
  playerLight=new THREE.PointLight(0x0077ff,2.5,10,2);playerLight.castShadow=true;
  playerGroup.add(playerLight);scene.add(playerGroup);
  const startTC=tileCenter(1,1);px=startTC.x;pz=startTC.z;
  playerGroup.position.set(px,0,pz);

  // Sentinel
  sentGroup=new THREE.Group();
  const sGeo=new THREE.OctahedronGeometry(0.44,0);
  const sMat=new THREE.MeshStandardMaterial({color:0xff2200,emissive:0xff1800,emissiveIntensity:2.8,roughness:0.08});
  sentMesh=new THREE.Mesh(sGeo,sMat);sentMesh.castShadow=true;sentGroup.add(sentMesh);
  const fanVerts=[];const sightDist=6.5*TILE;const halfFov=Math.PI/3.5;const fanSegs=16;
  for(let i=0;i<fanSegs;i++){
    const a1=-halfFov+(i/fanSegs)*halfFov*2;const a2=-halfFov+((i+1)/fanSegs)*halfFov*2;
    fanVerts.push(0,0.08,0);
    fanVerts.push(Math.sin(a1)*sightDist,0.08,-Math.cos(a1)*sightDist);
    fanVerts.push(Math.sin(a2)*sightDist,0.08,-Math.cos(a2)*sightDist);
  }
  const fanGeo=new THREE.BufferGeometry();
  fanGeo.setAttribute('position',new THREE.Float32BufferAttribute(fanVerts,3));
  const fanMat=new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.16,side:THREE.DoubleSide,depthWrite:false});
  visionConeMesh=new THREE.Mesh(fanGeo,fanMat);sentGroup.add(visionConeMesh);
  const sLight=new THREE.PointLight(0xff2200,1.8,7,2);sentGroup.add(sLight);
  scene.add(sentGroup);
  const sentTC=tileCenter(COLS-2,ROWS-2);sx=sentTC.x;sz=sentTC.z;sAngle=Math.PI;
  sentGroup.position.set(sx,0,sz);sentGroup.rotation.y=sAngle;

  // Shards
  const shardDefs=[[1,9],[5,1],[1,13],[9,9],[13,1]];
  const shGeo=new THREE.OctahedronGeometry(0.26,0);
  shardDefs.forEach(([c,r])=>{
    const tc=tileCenter(c,r);
    const mat=new THREE.MeshStandardMaterial({color:0x00ff88,emissive:0x00ee66,emissiveIntensity:3.0,roughness:0.1});
    const m=new THREE.Mesh(shGeo,mat);m.position.set(tc.x,0.18,tc.z);
    m.userData={col:c,row:r,wx:tc.x,wz:tc.z,collected:false};
    const sl=new THREE.PointLight(0x00ff88,1.0,3.5,2);m.add(sl);
    scene.add(m);shardMeshes.push(m);
  });

  // Exit portal
  const exitTC=tileCenter(COLS-2,1);
  const pGeo2=new THREE.TorusGeometry(0.65,0.1,8,24);
  const pMat2=new THREE.MeshStandardMaterial({color:0x222244,emissive:0x111133,emissiveIntensity:0.4,roughness:0.6});
  exitPortalMesh=new THREE.Mesh(pGeo2,pMat2);
  exitPortalMesh.position.set(exitTC.x,0.1,exitTC.z);exitPortalMesh.rotation.x=-Math.PI/2;
  exitPortalMesh.userData={wx:exitTC.x,wz:exitTC.z};
  exitGlow=new THREE.PointLight(0x5555ff,0.3,5,2);exitPortalMesh.add(exitGlow);
  scene.add(exitPortalMesh);

  // Reset
  heatmap=Array(ROWS).fill(null).map(()=>Array(COLS).fill(0));
  trail=[];sentMode='patrol';sentTarget=null;alertLevel=0;
  shardsCollected=0;exitActive=false;screenShake=0;catchFlash=0;winFlash=0;
  catchTimer=0;portalPulse=0;stepTimer=0;
  shardCountEl.textContent='0';threatEl.textContent='SEARCHING';
  threatEl.style.color='#00ffff';alertEl.style.opacity='0';flashEl.style.opacity='0';
}

// ── COLLISION ────────────────────────────────────────────────────
function canMove(wx,wz){
  const m=0.3;
  const g1=worldToGrid(wx-m,wz-m),g2=worldToGrid(wx+m,wz-m),
        g3=worldToGrid(wx-m,wz+m),g4=worldToGrid(wx+m,wz+m);
  return !isWall(g1.col,g1.row)&&!isWall(g2.col,g2.row)&&
         !isWall(g3.col,g3.row)&&!isWall(g4.col,g4.row);
}
function canMoveSent(wx,wz){
  const m=0.35;
  const g1=worldToGrid(wx-m,wz-m),g2=worldToGrid(wx+m,wz-m),
        g3=worldToGrid(wx-m,wz+m),g4=worldToGrid(wx+m,wz+m);
  return !isWall(g1.col,g1.row)&&!isWall(g2.col,g2.row)&&
         !isWall(g3.col,g3.row)&&!isWall(g4.col,g4.row);
}

// ── PLAYER ───────────────────────────────────────────────────────
function updatePlayer(dt){
  const creep=keys['ShiftLeft']||keys['ShiftRight'];
  const speed=creep?2.0:5.0;
  let dx=0,dz=0;
  if(keys['KeyW']||keys['ArrowUp'])dz-=1;
  if(keys['KeyS']||keys['ArrowDown'])dz+=1;
  if(keys['KeyA']||keys['ArrowLeft'])dx-=1;
  if(keys['KeyD']||keys['ArrowRight'])dx+=1;
  let moved=false;
  if(dx!==0||dz!==0){
    const len=Math.sqrt(dx*dx+dz*dz);dx/=len;dz/=len;
    const nx=px+dx*speed*dt,nz=pz+dz*speed*dt;
    if(canMove(nx,pz))px=nx;if(canMove(px,nz))pz=nz;
    moved=true;
  }
  playerGroup.position.set(px,0,pz);
  playerMesh.position.y=Math.sin(Date.now()*0.003)*0.06;
  const ring=playerGroup.children[1];
  ring.material.opacity=0.35+Math.sin(Date.now()*0.004)*0.2;
  if(moved&&!creep){
    const g=worldToGrid(px,pz);
    if(!isWall(g.col,g.row)){
      heatmap[g.row][g.col]=Math.min(heatmap[g.row][g.col]+0.4,1.0);
      if(trail.length===0||(trail[trail.length-1].col!==g.col||trail[trail.length-1].row!==g.row)){
        trail.push({col:g.col,row:g.row});if(trail.length>8)trail.shift();
      }
    }
    stepTimer-=dt;if(stepTimer<=0){sfx('step');stepTimer=0.32;}
  }
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(heatmap[r][c]>0)heatmap[r][c]=Math.max(0,heatmap[r][c]-0.0012);
}

// ── SENTINEL ─────────────────────────────────────────────────────
function updateSentinel(dt){
  sentMesh.rotation.y+=dt*1.8;sentMesh.rotation.z+=dt*0.9;
  const dx=px-sx,dz=pz-sz,dist=Math.sqrt(dx*dx+dz*dz);
  const sightDist=6.5*TILE,halfFov=Math.PI/3.5;
  let inCone=false;
  if(dist<sightDist){
    const toPA=Math.atan2(dx,-dz);let ad=toPA-sAngle;
    while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;
    if(Math.abs(ad)<halfFov)inCone=true;
  }
  const prevAlert=alertLevel;
  if(inCone){alertLevel=Math.min(1.0,alertLevel+dt*2.2);sentMode='chase';}
  else{alertLevel=Math.max(0.0,alertLevel-dt*0.4);if(alertLevel<0.08)sentMode='patrol';}
  const isAlerted=alertLevel>0.3;
  alertEl.style.opacity=isAlerted?'1':'0';
  if(isAlerted&&prevAlert<=0.3)sfx('alert');
  threatEl.textContent=alertLevel>0.7?'DETECTED!':alertLevel>0.3?'ALERT':'SEARCHING';
  threatEl.style.color=alertLevel>0.7?'#ff3333':alertLevel>0.3?'#ff8800':'#00ffff';
  visionConeMesh.material.color.setRGB(1.0,alertLevel*0.3,0);
  visionConeMesh.material.opacity=0.14+alertLevel*0.18;

  let targetX=sx,targetZ=sz;
  if(sentMode==='chase'){targetX=px;targetZ=pz;}
  else{
    if(sentTarget){
      const tc=tileCenter(sentTarget.col,sentTarget.row);
      const dd=Math.sqrt((tc.x-sx)**2+(tc.z-sz)**2);
      if(dd<0.3)sentTarget=null;
      else{targetX=tc.x;targetZ=tc.z;}
    }
    if(!sentTarget){
      let best=-1,bestC=-1,bestR=-1;
      if(trail.length>0&&Math.random()<0.7){
        const tr=trail[Math.floor(Math.random()*trail.length)];bestC=tr.col;bestR=tr.row;best=1;
      }else{
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
          if(!isWall(c,r)&&heatmap[r][c]>best){best=heatmap[r][c];bestC=c;bestR=r;}
      }
      if(best>0){sentTarget={col:bestC,row:bestR};}
      else{
        let att=0;
        do{const rc=Math.floor(Math.random()*COLS),rr=Math.floor(Math.random()*ROWS);
           if(!isWall(rc,rr)){sentTarget={col:rc,row:rr};break;}att++;}while(att<20);
      }
    }
    if(sentTarget){const tc=tileCenter(sentTarget.col,sentTarget.row);targetX=tc.x;targetZ=tc.z;}
  }

  const mdx=targetX-sx,mdz=targetZ-sz,md=Math.sqrt(mdx*mdx+mdz*mdz);
  const speed=sentMode==='chase'?4.5:3.0;
  if(md>0.05){
    const nx=sx+(mdx/md)*speed*dt,nz=sz+(mdz/md)*speed*dt;
    if(canMoveSent(nx,sz))sx=nx;if(canMoveSent(sx,nz))sz=nz;
    sAngle=Math.atan2(mdx/md,-(mdz/md));
  }else if(sentMode==='patrol'){sAngle+=dt*1.2;}
  sentGroup.position.set(sx,0,sz);sentGroup.rotation.y=sAngle;

  const catchDist=Math.sqrt((px-sx)**2+(pz-sz)**2);
  if(catchDist<0.72||(inCone&&alertLevel>0.88&&dist<1.8)){
    catchTimer+=dt;if(catchTimer>0.12)triggerCaught();
  }else{catchTimer=0;}
}

// ── SHARDS / EXIT ────────────────────────────────────────────────
function tryCollect(){
  if(gameState!=='playing')return;
  for(const s of shardMeshes){
    if(s.userData.collected)continue;
    const dx=px-s.userData.wx,dz=pz-s.userData.wz;
    if(Math.sqrt(dx*dx+dz*dz)<1.2){
      s.userData.collected=true;scene.remove(s);shardsCollected++;      shardCountEl.textContent=shardsCollected;sfx('shard');
      spawnParticles(s.userData.wx,s.userData.wz,0x00ff88,22,1.0);
      screenShake=0.15;if(shardsCollected>=5)activateExit();break;
    }
  }
}
function checkProximity(){
  for(const s of shardMeshes){
    if(s.userData.collected)continue;
    const dx=px-s.userData.wx,dz=pz-s.userData.wz;
    if(Math.sqrt(dx*dx+dz*dz)<0.9){tryCollect();break;}
  }
  if(exitActive){
    const dx=px-exitPortalMesh.userData.wx,dz=pz-exitPortalMesh.userData.wz;
    if(Math.sqrt(dx*dx+dz*dz)<1.0)triggerWin();
  }
}
function activateExit(){
  exitActive=true;
  exitPortalMesh.material.color.setHex(0x00ffff);
  exitPortalMesh.material.emissive.setHex(0x00aaff);
  exitPortalMesh.material.emissiveIntensity=3.5;
  exitGlow.intensity=2.5;exitGlow.color.setHex(0x00ffff);
  sfx('portal');spawnParticles(exitPortalMesh.userData.wx,exitPortalMesh.userData.wz,0x00ffff,30,1.5);
}
function updateShards(dt){
  const time=Date.now()*0.001;
  shardMeshes.forEach((s,i)=>{
    if(s.userData.collected)return;
    s.rotation.y+=dt*2.0;s.position.y=0.18+Math.sin(time*1.8+i*1.2)*0.12;
    s.material.emissiveIntensity=2.5+Math.sin(time*2.5+i)*0.6;
  });
  if(exitActive){
    portalPulse+=dt*3.0;exitPortalMesh.rotation.z=portalPulse;
    exitGlow.intensity=2.2+Math.sin(portalPulse*2)*0.5;
  }
}

// ── WIN/LOSE ─────────────────────────────────────────────────────
function triggerCaught(){
  if(gameState!=='playing')return;gameState='lose';
  sfx('caught');spawnParticles(px,pz,0xff2200,30,1.5);catchFlash=1.0;
  flashEl.style.backgroundColor='#ff0000';
  setTimeout(()=>showResult(false),1200);
}
function triggerWin(){
  if(gameState!=='playing')return;gameState='win';
  sfx('win');spawnParticles(px,pz,0x00ffff,35,1.8);winFlash=1.0;
  flashEl.style.backgroundColor='#00ffff';
  setTimeout(()=>showResult(true),1500);
}
function showResult(won){
  overlay.style.display='flex';startScreen.style.display='none';
  resultScreen.style.display='flex';
  resultTitle.textContent=won?'ESCAPED':'CAUGHT';
  resultTitle.style.color=won?'#00ff88':'#ff3333';
  resultTitle.style.textShadow=won?'0 0 30px #00ff88':'0 0 30px #ff0000';
  resultMsg.textContent=won?`// FRAGMENT EXTRACTED — SHARDS: ${shardsCollected}/5 //`
                            :`// TERMINATION SEQUENCE — SHARDS: ${shardsCollected}/5 //`;
}

// ── PARTICLES ────────────────────────────────────────────────────
function spawnParticles(wx,wz,color,count=20,spread=1.0){
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3),vel=[];
  for(let i=0;i<count;i++){
    pos[i*3]=wx;pos[i*3+1]=0.2;pos[i*3+2]=wz;
    vel.push((Math.random()-0.5)*spread*5,Math.random()*3+0.5,(Math.random()-0.5)*spread*5);
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color,size:0.2,transparent:true,opacity:1.0});
  const ps=new THREE.Points(geo,mat);ps.userData={vel,life:1.0};
  scene.add(ps);particles.push(ps);
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const ps=particles[i];ps.userData.life-=dt*1.6;
    if(ps.userData.life<=0){scene.remove(ps);particles.splice(i,1);continue;}
    ps.material.opacity=ps.userData.life;
    const pos=ps.geometry.attributes.position.array,vel=ps.userData.vel;
    for(let j=0;j<pos.length/3;j++){
      pos[j*3]+=vel[j*3]*dt;pos[j*3+1]+=vel[j*3+1]*dt;
      vel[j*3+1]-=4.5*dt;pos[j*3+2]+=vel[j*3+2]*dt;
    }
    ps.geometry.attributes.position.needsUpdate=true;
  }
}

// ── MINIMAP ──────────────────────────────────────────────────────
function updateMinimap(){
  const cw=mmCanvas.width,ch=mmCanvas.height,tw=cw/COLS,th=ch/ROWS;
  mmCtx.clearRect(0,0,cw,ch);mmCtx.fillStyle='#000';mmCtx.fillRect(0,0,cw,ch);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(MAZE[r][c]===1){mmCtx.fillStyle='#0a0a1e';}
      else{
        const h=heatmap[r][c];
        mmCtx.fillStyle=h>0?`rgb(${Math.floor(20+h*60)},${Math.floor(5+h*12)},${Math.floor(5+h*8)})`:'#040411';
      }
      mmCtx.fillRect(c*tw,r*th,tw,th);
    }
  }
  shardMeshes.forEach(s=>{
    if(s.userData.collected)return;
    mmCtx.fillStyle='#00ff88';
    mmCtx.fillRect(s.userData.col*tw+tw*0.2,s.userData.row*th+th*0.2,tw*0.6,th*0.6);
  });
  {const ec=COLS-2,er=1;mmCtx.fillStyle=exitActive?'#00ffff':'#333355';
   mmCtx.fillRect(ec*tw+tw*0.1,er*th+th*0.1,tw*0.8,th*0.8);}
  {const sg=worldToGrid(sx,sz);mmCtx.fillStyle='#ff2200';
   mmCtx.beginPath();mmCtx.arc(sg.col*tw+tw/2,sg.row*th+th/2,Math.max(tw,th)*0.6,0,Math.PI*2);mmCtx.fill();}
  {const pg=worldToGrid(px,pz);mmCtx.fillStyle='#00ddff';
   mmCtx.beginPath();mmCtx.arc(pg.col*tw+tw/2,pg.row*th+th/2,Math.max(tw,th)*0.55,0,Math.PI*2);mmCtx.fill();}
}

// ── FX & CAMERA ─────────────────────────────────────────────────
function updateFX(dt){
  if(catchFlash>0){
    catchFlash-=dt*2.5;flashEl.style.opacity=Math.max(0,catchFlash).toFixed(3);
    screenShake=Math.max(screenShake,catchFlash*0.5);
  }else if(winFlash>0){
    winFlash-=dt*2.0;flashEl.style.opacity=Math.max(0,winFlash).toFixed(3);
  }else{flashEl.style.opacity='0';}
}
function updateCamera(){
  const shakeAmt=Math.max(0,screenShake)*0.4;
  camera.position.x+=(px-camera.position.x)*0.08+(Math.random()-0.5)*shakeAmt;
  camera.position.z+=(pz-camera.position.z)*0.08+(Math.random()-0.5)*shakeAmt;
  screenShake=Math.max(0,screenShake-0.06);
  camera.lookAt(camera.position.x,0,camera.position.z);
}

// ── LOOP ─────────────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),0.05);
  if(gameState==='playing'){
    updatePlayer(dt);updateSentinel(dt);updateShards(dt);
    checkProximity();updateFX(dt);updateCamera();updateMinimap();
  }
  updateParticles(dt);composer.render();
}

// ── PUBLIC ───────────────────────────────────────────────────────
window.startGame=function(){
  ensureAudio();
  overlay.style.display='none';
  startScreen.style.display='flex';resultScreen.style.display='none';
  buildWorld();gameState='playing';
  clock.getDelta();scheduleHeartbeat(800);
};

initScene();buildWorld();loop();
