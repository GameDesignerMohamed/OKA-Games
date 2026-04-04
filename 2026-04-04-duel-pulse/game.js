import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── AUDIO ──────────────────────────────────────────────────────────────────
let AC=null, bgmT=null, bgmI=-1;
const initAudio=()=>{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();};
const tone=(f,t,d,v,dl=0)=>{
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.value=f;
  const s=AC.currentTime+dl;
  g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(v,s+.01);g.gain.exponentialRampToValueAtTime(.001,s+d);
  o.start(s);o.stop(s+d+.05);
};
const sfxShoot =()=>{ tone(520,'sawtooth',.07,.18); tone(780,'sine',.05,.12,.02); };
const sfxHit   =()=>{ tone(180,'sawtooth',.13,.44); tone(90,'sine',.16,.28); tone(900,'square',.04,.15,.03); };
const sfxDash  =()=>{ tone(700,'triangle',.08,.22); tone(1050,'sine',.05,.14,.04); };
const sfxKO    =()=>{ [0,.1,.25,.45,.7].forEach((dl,i)=>tone(440*Math.pow(1.25,i),'sine',.5,.45+i*.08,dl)); };
const sfxLose  =()=>{ [0,.14,.32,.55].forEach((dl,i)=>tone(440/Math.pow(1.2,i),'sawtooth',.42,.36,dl)); };
const sfxEF    =()=>{ tone(300,'sawtooth',.06,.11); };
const startBGM =(i)=>{
  stopBGM();if(!AC)return;bgmI=i;
  const n=[165,196,220,247,277,311];let x=0;
  bgmT=setInterval(()=>{tone(n[x%n.length]*(1+i*.05),'triangle',.11,.055);x++;},(310-i*65));
};
const stopBGM=()=>{if(bgmT){clearInterval(bgmT);bgmT=null;}};
const setBGMI=(ph,eh)=>{const m=Math.min(ph,eh),ni=m<=1?2:m<=2?1:0;if(ni!==bgmI)startBGM(ni);};

// ── SCENE ──────────────────────────────────────────────────────────────────
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x03030d);
scene.fog=new THREE.FogExp2(0x03030d,.030);
const cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,200);
cam.position.set(0,19,15);cam.lookAt(0,0,0);
const rend=new THREE.WebGLRenderer({antialias:true});
rend.setSize(innerWidth,innerHeight);rend.setPixelRatio(Math.min(devicePixelRatio,2));rend.shadowMap.enabled=true;
document.body.insertBefore(rend.domElement,document.body.firstChild);
let comp=null;
try{
  comp=new EffectComposer(rend);comp.addPass(new RenderPass(scene,cam));
  comp.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.52,.35,.85));
}catch(e){comp=null;}
window.addEventListener('resize',()=>{
  cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
  rend.setSize(innerWidth,innerHeight);if(comp)comp.setSize(innerWidth,innerHeight);
});

scene.add(new THREE.AmbientLight(0x1a0f2e,3.2));
const sun=new THREE.DirectionalLight(0xffffff,1.8);sun.position.set(6,12,6);sun.castShadow=true;scene.add(sun);
const pLt=new THREE.PointLight(0x00aaff,4,14),eLt=new THREE.PointLight(0xff3300,4,14);
scene.add(pLt,eLt);

// Floor
const flr=new THREE.Mesh(new THREE.CircleGeometry(12,64),new THREE.MeshStandardMaterial({color:0x06061a,roughness:.9,metalness:.1}));
flr.rotation.x=-Math.PI/2;flr.receiveShadow=true;scene.add(flr);
// Grid
for(let i=-10;i<=10;i+=2){
  const m=new THREE.MeshStandardMaterial({color:0x0c0c28,emissive:0x030318});
  const h=new THREE.Mesh(new THREE.BoxGeometry(22,.012,.025),m);h.position.set(0,.01,i);scene.add(h);
  const v=new THREE.Mesh(new THREE.BoxGeometry(22,.012,.025),m.clone());v.rotation.y=Math.PI/2;v.position.set(i,.01,0);scene.add(v);
}
// Arena ring
const ar=new THREE.Mesh(new THREE.TorusGeometry(11.4,.28,8,64),new THREE.MeshStandardMaterial({color:0x001a33,emissive:0x001022,emissiveIntensity:1.3}));
ar.rotation.x=-Math.PI/2;scene.add(ar);
// Pillars
for(let i=0;i<8;i++){
  const a=(i/8)*Math.PI*2,r=10.7;
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,4,6),new THREE.MeshStandardMaterial({color:0x001530,emissive:0x000918,emissiveIntensity:.5}));
  p.position.set(Math.cos(a)*r,2,Math.sin(a)*r);scene.add(p);
  const pl=new THREE.PointLight(i%2===0?0x0033cc:0xcc0033,.9,5);pl.position.set(Math.cos(a)*r,3,Math.sin(a)*r);scene.add(pl);
}
// Stars
const sg=new THREE.BufferGeometry();const sp=new Float32Array(2000*3);for(let i=0;i<sp.length;i++)sp[i]=(Math.random()-.5)*210;
sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:.12,transparent:true,opacity:.5})));

// ── MESH BUILDERS ──────────────────────────────────────────────────────────
const mkP=()=>{
  const g=new THREE.Group();
  const bm=new THREE.MeshStandardMaterial({color:0x00ccff,emissive:0x002244,emissiveIntensity:.6,roughness:.2,metalness:.8});
  const body=new THREE.Mesh(new THREE.OctahedronGeometry(.7,1),bm);body.castShadow=true;g.add(body);
  const cm=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00aaff,emissiveIntensity:1.8});
  const crown=new THREE.Mesh(new THREE.ConeGeometry(.27,.48,6),cm);crown.position.y=.88;g.add(crown);
  const rm=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x0088ff,emissiveIntensity:2.5,transparent:true,opacity:.72});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.83,.06,6,24),rm);ring.rotation.x=Math.PI/2;g.add(ring);
  g.userData={body,bm,ring,rm,baseI:.6,baseE:0x002244};return g;
};
const mkE=()=>{
  const g=new THREE.Group();
  const bm=new THREE.MeshStandardMaterial({color:0xff2200,emissive:0x330000,emissiveIntensity:.6,roughness:.3,metalness:.7});
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.76,1),bm);body.castShadow=true;g.add(body);
  for(let i=0;i<4;i++){
    const a=(i/4)*Math.PI*2;
    const s=new THREE.Mesh(new THREE.ConeGeometry(.11,.52,4),new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff1100,emissiveIntensity:1.3}));
    s.position.set(Math.cos(a)*.83,0,Math.sin(a)*.83);s.rotation.z=Math.PI/2;s.rotation.y=-a;g.add(s);
  }
  const rm=new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff1100,emissiveIntensity:2.5,transparent:true,opacity:.72});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.88,.06,6,24),rm);ring.rotation.x=Math.PI/2;g.add(ring);
  g.userData={body,bm,ring,rm,baseI:.6,baseE:0x330000};return g;
};

// ── BULLETS & PARTICLES ───────────────────────────────────────────────────
const bullets=[],parts=[];
const bGeo=new THREE.SphereGeometry(.18,8,8);
const spawnB=(pos,dir,isP)=>{
  const col=isP?0x00ffff:0xff3300;
  const mat=new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:3.5,transparent:true,opacity:1});
  const m=new THREE.Mesh(bGeo,mat);m.position.copy(pos);
  const bl=new THREE.PointLight(col,3,6);m.add(bl);scene.add(m);
  bullets.push({mesh:m,dir:dir.clone().normalize(),isP,life:3.2});
};
const spawnPts=(pos,col,cnt,big)=>{
  const geo=new THREE.BufferGeometry();const pa=new Float32Array(cnt*3);const vs=[];
  for(let i=0;i<cnt;i++){
    pa[i*3]=pos.x;pa[i*3+1]=pos.y;pa[i*3+2]=pos.z;
    const a=Math.random()*Math.PI*2,e=(Math.random()-.5)*Math.PI,s=(big?5:2.5)+Math.random()*(big?11:7);
    vs.push(new THREE.Vector3(Math.cos(a)*Math.cos(e)*s,(Math.abs(Math.sin(e))*s)+1.2,Math.sin(a)*Math.cos(e)*s));
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pa,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:col,size:big?.28:.2,transparent:true,opacity:1}));
  scene.add(pts);parts.push({pts,vs,pa,life:big?1.4:.95});
};
const spawnKO=(pos,col)=>{for(let i=0;i<4;i++)setTimeout(()=>spawnPts(pos,col,38,true),i*55);};

// ── GAME STATE ────────────────────────────────────────────────────────────
const AR=9.3,MHP=3,PS=7.2,ES=5.8,BS=19,DCD=1.5,FCD=.31,EF=1.3;
let pm,em,php,ehp;
const pp=new THREE.Vector3(),ep=new THREE.Vector3(),ad=new THREE.Vector3(0,0,-1),mw=new THREE.Vector3(0,.85,-5);
let dcd=0,dash=false,dv=new THREE.Vector3(),dt2=0,fcd=0,efcd=0,esd=1,est=0;
let gs='start',kv={},ko=0,shk=0,htt=0,hft=0,hfm=null;
const clk=new THREE.Clock();
const ryc=new THREE.Raycaster();
const gpl=new THREE.Plane(new THREE.Vector3(0,1,0),-.85);

// DOM refs
const H=document.getElementById('hud'),PH=document.getElementById('ph'),EH=document.getElementById('eh');
const HT=document.getElementById('ht'),OV=document.getElementById('ov'),DI=document.getElementById('di');
const SS=document.getElementById('ss'),WS=document.getElementById('ws'),LS=document.getElementById('ls');
const scr=id=>['ss','ws','ls'].forEach(s=>document.getElementById(s).classList.toggle('h',s!==id));

const startGame=()=>{
  bullets.forEach(b=>scene.remove(b.mesh));bullets.length=0;
  parts.forEach(p=>scene.remove(p.pts));parts.length=0;
  if(pm)scene.remove(pm);if(em)scene.remove(em);
  php=MHP;ehp=MHP;dcd=0;fcd=0;efcd=0;dash=false;shk=0;htt=0;hft=0;hfm=null;
  gs='playing';ko=0;bgmI=-1;esd=Math.random()>.5?1:-1;est=1.2;
  pp.set(0,.85,5.5);ep.set(0,.85,-5.5);ad.set(0,0,-1);mw.set(0,.85,-5);
  pm=mkP();pm.position.copy(pp);scene.add(pm);
  em=mkE();em.position.copy(ep);scene.add(em);
  updHP();H.classList.remove('h');DI.classList.remove('h');
  DI.textContent='DASH READY';DI.style.color='#0ff';
  document.getElementById('rd').textContent='VS';startBGM(0);
};
const updHP=()=>{
  PH.style.width=(php/MHP*100)+'%';EH.style.width=(ehp/MHP*100)+'%';
  PH.style.background=php===1?'linear-gradient(90deg,#f20,#f60)':'linear-gradient(90deg,#0ff,#06c)';setBGMI(php,ehp);
};
const fxMesh=(t,col,ei)=>{hfm=t;hft=.18;t.userData.bm.emissive.setHex(col);t.userData.bm.emissiveIntensity=ei;};
const showHT=(m,c)=>{HT.textContent=m;HT.style.color=c;HT.style.textShadow='0 0 26px '+c;HT.style.opacity='1';htt=.55;};
const flash=(r)=>{OV.style.background=r;setTimeout(()=>OV.style.background='rgba(0,0,0,0)',80);};

// ── INPUT ─────────────────────────────────────────────────────────────────
window.addEventListener('keydown',e=>{
  kv[e.key.toLowerCase()]=true;
  if(e.code==='Space'){e.preventDefault();if(gs==='playing')doFire();}
  if(e.key==='Shift'&&gs==='playing')doDash();
});
window.addEventListener('keyup',e=>kv[e.key.toLowerCase()]=false);
window.addEventListener('mousemove',e=>{
  ryc.setFromCamera(new THREE.Vector2((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1),cam);
  const t=new THREE.Vector3();ryc.ray.intersectPlane(gpl,t);if(t&&!isNaN(t.x))mw.copy(t);
});
window.addEventListener('mousedown',e=>{if(e.button===0&&gs==='playing')doFire();});
document.getElementById('sb').addEventListener('click',()=>{initAudio();startGame();scr('');});
document.getElementById('wb').addEventListener('click',()=>{initAudio();startGame();scr('');});
document.getElementById('lb').addEventListener('click',()=>{initAudio();startGame();scr('');});

const doFire=()=>{
  if(fcd>0)return;
  const d=new THREE.Vector3().subVectors(mw,pp).setY(0);if(d.lengthSq()<.01)return;
  d.normalize();spawnB(pp.clone().addScaledVector(d,.85),d,true);sfxShoot();fcd=FCD;
};
const doDash=()=>{
  if(dcd>0||dash)return;
  let dx=0,dz=0;
  if(kv['a']||kv['arrowleft'])dx-=1;if(kv['d']||kv['arrowright'])dx+=1;
  if(kv['w']||kv['arrowup'])dz-=1;if(kv['s']||kv['arrowdown'])dz+=1;
  if(!dx&&!dz){dx=ad.x;dz=ad.z;}
  const l=Math.sqrt(dx*dx+dz*dz);if(l){dx/=l;dz/=l;}
  dv.set(dx*17,0,dz*17);dash=true;dt2=.21;dcd=DCD;sfxDash();
};
const doKO=(w)=>{
  gs='ko_anim';ko=1.2;
  const pos=w==='p'?ep:pp,col=w==='p'?0xff3300:0x00ffff;
  spawnKO(pos,col);showHT('PULSE KO',w==='p'?'#f40':'#0ff');
  flash(w==='p'?'rgba(255,80,0,.22)':'rgba(0,100,255,.25)');shk=.35;stopBGM();
};

// ── AI ────────────────────────────────────────────────────────────────────
const aiUpd=(dt)=>{
  const tp=new THREE.Vector3().subVectors(pp,ep),dist=tp.length();
  est-=dt;if(est<=0){esd*=-1;est=1.2+Math.random()*.8;}
  const pr=new THREE.Vector3(-tp.z,0,tp.x);if(pr.lengthSq()>0)pr.normalize();
  let mv=pr.clone().multiplyScalar(esd*ES*dt);
  if(dist<4.5)mv.addScaledVector(tp.clone().normalize(),-ES*.65*dt);
  else if(dist>6.5)mv.addScaledVector(tp.clone().normalize(),ES*.45*dt);
  ep.add(mv);
  const er=new THREE.Vector2(ep.x,ep.z);if(er.length()>AR){er.normalize().multiplyScalar(AR);ep.x=er.x;ep.z=er.y;}
  ep.y=.85;
  efcd-=dt;
  if(efcd<=0&&dist<12){
    efcd=EF+(Math.random()-.5)*.55;
    const d=new THREE.Vector3().subVectors(pp,ep).setY(0).normalize();
    d.x+=(Math.random()-.5)*.2;d.z+=(Math.random()-.5)*.2;d.normalize();
    spawnB(ep.clone().addScaledVector(d,.88),d,false);sfxEF();
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────
const update=(dt)=>{
  if(gs==='ko_anim'){
    ko-=dt;if(ko<=0){
      stopBGM();
      if(php<=0){scr('ls');sfxLose();}else{scr('ws');sfxKO();}
      H.classList.add('h');DI.classList.add('h');gs='over';
    }
    return;
  }
  if(gs!=='playing')return;
  fcd=Math.max(0,fcd-dt);dcd=Math.max(0,dcd-dt);
  if(dcd>0){DI.textContent='DASH '+dcd.toFixed(1)+'s';DI.style.color='#333';}
  else{DI.textContent='DASH READY';DI.style.color='#0ff';}

  // player move
  if(dash){pp.addScaledVector(dv,dt);dt2-=dt;if(dt2<=0)dash=false;}
  else{
    let dx=0,dz=0;
    if(kv['a']||kv['arrowleft'])dx-=1;if(kv['d']||kv['arrowright'])dx+=1;
    if(kv['w']||kv['arrowup'])dz-=1;if(kv['s']||kv['arrowdown'])dz+=1;
    const l=Math.sqrt(dx*dx+dz*dz);if(l){dx/=l;dz/=l;pp.x+=dx*PS*dt;pp.z+=dz*PS*dt;}
  }
  const pr2=new THREE.Vector2(pp.x,pp.z);if(pr2.length()>AR){pr2.normalize().multiplyScalar(AR);pp.x=pr2.x;pp.z=pr2.y;}
  pp.y=.85;
  const d2=new THREE.Vector3().subVectors(mw,pp).setY(0);if(d2.lengthSq()>.01){d2.normalize();ad.copy(d2);}

  aiUpd(dt);

  // bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.life-=dt;
    b.mesh.position.addScaledVector(b.dir,BS*dt);
    if(b.life<=0){scene.remove(b.mesh);bullets.splice(i,1);continue;}
    const bp=b.mesh.position;
    if(b.isP&&bp.distanceTo(ep)<1.1&&ehp>0){
      ehp--;updHP();sfxHit();scene.remove(b.mesh);bullets.splice(i,1);
      spawnPts(bp,0xff3300,20,false);fxMesh(em,0xff4400,5);
      showHT('HIT!','#f40');flash('rgba(255,80,0,.18)');shk=.16;
      if(ehp<=0)doKO('p');continue;
    }
    if(!b.isP&&bp.distanceTo(pp)<1.0&&php>0&&!dash){
      php--;updHP();sfxHit();scene.remove(b.mesh);bullets.splice(i,1);
      spawnPts(bp,0x00ccff,16,false);fxMesh(pm,0xffffff,6);
      showHT('HIT!','#0cf');flash('rgba(0,100,255,.22)');shk=.2;
      if(php<=0)doKO('e');continue;
    }
    if(bp.distanceTo(new THREE.Vector3(0,.85,0))>AR+2){scene.remove(b.mesh);bullets.splice(i,1);}
  }

  // particles
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=dt;
    if(p.life<=0){scene.remove(p.pts);parts.splice(i,1);continue;}
    p.pts.material.opacity=Math.min(p.life/.4,1);
    for(let j=0;j<p.vs.length;j++){
      p.pa[j*3]+=p.vs[j].x*dt;p.pa[j*3+1]+=p.vs[j].y*dt;p.pa[j*3+2]+=p.vs[j].z*dt;p.vs[j].y-=9.8*dt;
    }
    p.pts.geometry.attributes.position.needsUpdate=true;
  }

  // hit text
  if(htt>0){htt-=dt;HT.style.opacity=Math.min(htt/.2,1).toString();if(htt<=0)HT.style.opacity='0';}

  // flash reset
  if(hft>0){
    hft-=dt;if(hft<=0&&hfm){
      hfm.userData.bm.emissive.setHex(hfm.userData.baseE);
      hfm.userData.bm.emissiveIntensity=hfm.userData.baseI;hfm=null;
    }
  }

  // screen shake
  if(shk>0){
    shk-=dt*4;const s=Math.max(0,shk);
    cam.position.set((Math.random()-.5)*s*.3,19+(Math.random()-.5)*s*.2,15+(Math.random()-.5)*s*.2);
  } else cam.position.set(0,19,15);

  // animate meshes
  const t=clk.elapsedTime;
  if(pm){
    pm.position.copy(pp);pm.position.y=.85+Math.sin(t*2.2)*.06;
    pm.userData.body.rotation.y=t*1.1;pm.userData.ring.rotation.z=t*2.5;
    // face aim direction
    if(ad.lengthSq()>.01)pm.rotation.y=Math.atan2(ad.x,ad.z);
    pLt.position.copy(pp);
  }
  if(em){
    em.position.copy(ep);em.position.y=.85+Math.sin(t*1.9+1.5)*.07;
    em.userData.body.rotation.y=-t*1.3;em.userData.ring.rotation.z=-t*2.8;
    const toP2=new THREE.Vector3().subVectors(pp,ep);if(toP2.lengthSq()>.01)em.rotation.y=Math.atan2(toP2.x,toP2.z);
    eLt.position.copy(ep);
  }
  ar.rotation.z=t*.08;
};

// ── RENDER LOOP ───────────────────────────────────────────────────────────
const animate=()=>{
  requestAnimationFrame(animate);
  const dt=Math.min(clk.getDelta(),.05);
  update(dt);
  if(comp)comp.render();else rend.render(scene,cam);
};
animate();
