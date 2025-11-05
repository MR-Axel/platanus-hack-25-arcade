// Quantum Dash - Portal Runner - Arcade Edition
const W=800,H=600,STICK_H=40,STICK_W=4,WALL_SPACING=280,PORTAL_W=100,WALL_THICK=8,MIN_PORTAL=40,MAX_PORTAL=W-120,TROLL_PROB=0.025,TROLL_DIST=150;
let sc=0,m=0,gm=0,diff=1,p1,p2,walls=[],cam,g,spd=2,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={},baseSpeed=3.5,combo=0,maxCombo=0,lives=3,achv={},stats={},hs=0,em={},musicTime=0,deathSlowdown=0,mom=1,countdown=-1,achvShow=0,motivShow=0,trollsDodged=0;

const P1_COLOR=0x00ccff,P2_COLOR=0xff9900,UNIFIED_COLOR=0x9933ff;
const DIFF_MULTS=[0.7,1,1.4,2]; // Easy, Normal, Hard, Insane
const MODE_NAMES=['ENDLESS','TIME ATTACK','PERFECT RUN'];

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#000',scene:{create,update}};
new Phaser.Game(cfg);

function blendColor(c1,c2,f){
  const r1=(c1>>16)&0xff,g1=(c1>>8)&0xff,b1=c1&0xff;
  const r2=(c2>>16)&0xff,g2=(c2>>8)&0xff,b2=c2&0xff;
  const r=Math.round(r1+(r2-r1)*f),g=Math.round(g1+(g2-g1)*f),b=Math.round(b1+(b2-b1)*f);
  return(r<<16)|(g<<8)|b;
}

function getPortalSize(time){
  if(time>40&&Math.random()<0.05)return MAX_PORTAL;
  if(time>30&&Math.random()<0.25)return MIN_PORTAL+Math.random()*(PORTAL_W-MIN_PORTAL)*0.7;
  return PORTAL_W;
}

function getHelpMsg(time,mode){
  if(time<20)return mode===0?'Go through colored stripes!':'MATCH YOUR COLOR!';
  else if(time<30)return mode===0?'Watch out! Portals can move!':'Moving portals incoming!';
  else if(time<40)return mode===0?'Tiny portals appear!':'Small targets ahead!';
  else if(time<50)return mode===0?'Some portals play tricks...':'Troll portals active!';
  else return mode===0?'Chaos mode! Anything goes!':'SURVIVE THE MADNESS!';
}

function getMotivMsg(){
  if(combo>=10)return'UNSTOPPABLE!';
  if(combo>=5)return'COMBO!';
  if(combo>=3)return'Nice!';
  return'';
}

function loadData(){
  try{
    const saved=localStorage.getItem('qd_data');
    if(saved){
      const data=JSON.parse(saved);
      hs=data.hs||0;
      stats=data.stats||{};
      achv=data.achv||{};
    }
  }catch(e){}
  if(!stats.totalPortals)stats={totalPortals:0,totalTime:0,totalDeaths:0,bestTime:9999,trollsDodged:0};
}

function saveData(){
  try{
    localStorage.setItem('qd_data',JSON.stringify({hs,stats,achv}));
  }catch(e){}
}

function playSound(type,comboMult){
  if(!snd)return;
  const o=snd.createOscillator(),gn=snd.createGain();
  o.connect(gn);gn.connect(snd.destination);
  const pitchBoost=1+comboMult*0.05;
  if(type==='portal'){
    o.frequency.value=700*pitchBoost;
    gn.gain.setValueAtTime(0.08,snd.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+0.1);
    o.start();o.stop(snd.currentTime+0.1);
  }else if(type==='death'){
    o.frequency.value=120;
    o.type='sawtooth';
    gn.gain.setValueAtTime(0.06,snd.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+0.3);
    o.start();o.stop(snd.currentTime+0.3);
  }else if(type==='troll'){
    o.frequency.value=800;
    gn.gain.setValueAtTime(0.06,snd.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+0.08);
    o.start();o.stop(snd.currentTime+0.08);
  }else if(type==='achievement'){
    // Epic achievement sound
    for(let i=0;i<4;i++){
      const o2=snd.createOscillator(),gn2=snd.createGain();
      o2.connect(gn2);gn2.connect(snd.destination);
      o2.frequency.value=[400,500,650,800][i];
      gn2.gain.setValueAtTime(0.1,snd.currentTime+i*0.15);
      gn2.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+i*0.15+0.3);
      o2.start(snd.currentTime+i*0.15);o2.stop(snd.currentTime+i*0.15+0.3);
    }
  }else if(type==='combo'){
    o.frequency.value=900*pitchBoost;
    o.type='triangle';
    gn.gain.setValueAtTime(0.05,snd.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+0.15);
    o.start();o.stop(snd.currentTime+0.15);
  }
}

function playMusic(time){
  if(!snd||time-musicTime<0.3)return;
  musicTime=time;
  const bass=snd.createOscillator(),gn=snd.createGain();
  bass.connect(gn);gn.connect(snd.destination);
  const notes=[130,110,98,146]; // C, A, G, D# (electro progression)
  const noteIdx=Math.floor((time*2)%4);
  bass.frequency.value=notes[noteIdx]*(1+spd*0.02); // Speed modulation
  bass.type='sawtooth';
  gn.gain.setValueAtTime(0.02,snd.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.001,snd.currentTime+0.28);
  bass.start();bass.stop(snd.currentTime+0.28);
}

function checkAchv(){
  if(!achv.survivor30&&t>=30){achv.survivor30=1;showAchv('30s Survivor!');saveData();}
  if(!achv.survivor60&&t>=60){achv.survivor60=1;showAchv('60s Legend!');saveData();}
  if(!achv.combo10&&combo>=10){achv.combo10=1;showAchv('x10 Combo Master!');saveData();}
  if(!achv.chaos&&t>=50){achv.chaos=1;showAchv('Chaos Mode!');saveData();}
  if(!achv.troll5&&trollsDodged>=5){achv.troll5=1;showAchv('Troll Dodger!');saveData();}
}

function showAchv(text){
  txts.achv.setText(text).setVisible(1);
  achvShow=3; // 3 seconds
  playSound('achievement');
  cam.flash(300,100,200,100);
}

function create(){
  this.g=this.add.graphics();
  cam=this.cameras.main;
  snd=this.sound.context;
  g=this.g;
  loadData();

  txts.title=this.add.text(W/2,H/2-150,'QUANTUM DASH',{fontSize:'56px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  txts.sub=this.add.text(W/2,H/2-90,'Portal Runner - Arcade Edition',{fontSize:'20px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.mode=this.add.text(W/2,H/2-50,'Mode: E)ndless T)imeAttack P)erfect',{fontSize:'16px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.diff=this.add.text(W/2,H/2-30,'Difficulty: 3)Easy 4)Normal 5)Hard 6)Insane',{fontSize:'16px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt1=this.add.text(W/2,H/2+20,'Press 1 for ONE PLAYER',{fontSize:'28px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt2=this.add.text(W/2,H/2+55,'Press 2 for TWO PLAYERS',{fontSize:'28px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint1=this.add.text(W/2,H/2+100,'Go through COLORED portal!',{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+120,'2P: Each color for each player!',{fontSize:'14px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → ↑ ↓ | P2: A D W S',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hs=this.add.text(W/2,H-20,'High Score: '+hs,{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.stats=this.add.text(W/2,H-60,'S: Stats',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1sc=this.add.text(20,20,'',{fontSize:'18px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  txts.p2sc=this.add.text(W-150,20,'',{fontSize:'18px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);
  txts.timer=this.add.text(W/2,20,'',{fontSize:'22px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.help=this.add.text(W/2,50,'',{fontSize:'15px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.combo=this.add.text(W-20,50,'',{fontSize:'24px',color:'#f0f',fontFamily:'monospace'}).setOrigin(1,0.5);
  txts.motiv=this.add.text(W/2,H/2,'',{fontSize:'42px',color:'#0ff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.lives=this.add.text(20,50,'',{fontSize:'16px',color:'#f55',fontFamily:'monospace'}).setOrigin(0);
  txts.momentum=this.add.text(W-20,H-30,'',{fontSize:'14px',color:'#0f0',fontFamily:'monospace'}).setOrigin(1);
  txts.menu=this.add.text(W/2,H-20,'T: Menu',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.go=this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'48px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.newrec=this.add.text(W/2,H/2-130,'NEW RECORD!',{fontSize:'38px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.win=this.add.text(W/2,H/2-10,'',{fontSize:'36px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1end=this.add.text(W/2,H/2+35,'',{fontSize:'22px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p2end=this.add.text(W/2,H/2+65,'',{fontSize:'22px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.restart=this.add.text(W/2,H/2+110,'SPACE: Back to Menu',{fontSize:'20px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.countdown=this.add.text(W/2,H/2,'',{fontSize:'80px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  txts.achv=this.add.text(W/2,H-80,'',{fontSize:'24px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.modeInfo=this.add.text(W/2,H-50,'',{fontSize:'14px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  txts.diffInfo=this.add.text(W/2,H-30,'',{fontSize:'14px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  txts.statsView=this.add.text(W/2,H/2,'',{fontSize:'16px',color:'#fff',fontFamily:'monospace',align:'center'}).setOrigin(0.5);

  this.input.keyboard.on('keydown-ONE',()=>{if(sc===0)start(this,0)});
  this.input.keyboard.on('keydown-TWO',()=>{if(sc===0)start(this,1)});
  this.input.keyboard.on('keydown-E',()=>{if(sc===0)gm=0});
  this.input.keyboard.on('keydown-T',()=>{if(sc===0&&m===0)gm=1}); // Time attack only 1P
  this.input.keyboard.on('keydown-P',()=>{if(sc===0)gm=2});
  this.input.keyboard.on('keydown-THREE',()=>{if(sc===0)diff=0});
  this.input.keyboard.on('keydown-FOUR',()=>{if(sc===0)diff=1});
  this.input.keyboard.on('keydown-FIVE',()=>{if(sc===0)diff=2});
  this.input.keyboard.on('keydown-SIX',()=>{if(sc===0)diff=3});
  this.input.keyboard.on('keydown-S',()=>{if(sc===0)toggleStats()});
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=2;baseSpeed=3.5;nextId=0;combo=0;lives=3;showMenu();}});
  this.input.keyboard.on('keydown',e=>{if(sc===1&&e.key.toLowerCase()==='t'){sc=0;walls=[];t=0;spd=2;baseSpeed=3.5;nextId=0;combo=0;lives=3;showMenu();}});

  showMenu();
}

function toggleStats(){
  if(txts.statsView.visible){
    txts.statsView.setVisible(0);
    showMenu();
  }else{
    hideAll();
    const txt=`=== STATISTICS ===\n\nPortals Passed: ${stats.totalPortals}\nTotal Time: ${(stats.totalTime/60).toFixed(1)}min\nTotal Deaths: ${stats.totalDeaths}\nBest Time: ${stats.bestTime===9999?'--':stats.bestTime.toFixed(1)+'s'}\nTrolls Dodged: ${stats.trollsDodged}\n\n=== ACHIEVEMENTS ===\n${achv.survivor30?'✓':'✗'} 30s Survivor\n${achv.survivor60?'✓':'✗'} 60s Legend\n${achv.combo10?'✓':'✗'} x10 Combo Master\n${achv.chaos?'✓':'✗'} Chaos Mode\n${achv.troll5?'✓':'✗'} Troll Dodger\n\nSPACE: Back`;
    txts.statsView.setText(txt).setVisible(1);
  }
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=2;baseSpeed=3.5;walls=[];nextId=0;combo=0;mom=1;deathSlowdown=0;trollsDodged=0;
  lives=gm===2?1:3; // Perfect run = 1 life
  const x1=m===1?W/3:W/2,x2=2*W/3;
  p1={x:x1,vx:0,y:H-80,vy:0,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-80,vy:0,path:[],alive:1,sc:0};
  else p2=null;

  countdown=3;
  hideAll();
  txts.countdown.setVisible(1).setText('3');
  setTimeout(()=>{txts.countdown.setText('2')},1000);
  setTimeout(()=>{txts.countdown.setText('1')},2000);
  setTimeout(()=>{txts.countdown.setText('GO!');playSound('combo',5)},3000);
  setTimeout(()=>{txts.countdown.setVisible(0);countdown=-1;showGame();spawnWall();},3500);
}

function update(_,dt){
  if(sc===0||countdown>=0)return;
  if(sc===2)return;

  t+=dt*0.001;
  const dm=DIFF_MULTS[diff];

  // Death slowdown recovery
  if(deathSlowdown>0){
    deathSlowdown-=dt*0.0005;
    if(deathSlowdown<0)deathSlowdown=0;
  }
  const slowMult=1-deathSlowdown*0.5;

  // Progressive difficulty with slowdown
  const realSpd=spd*slowMult*dm;
  const realBase=baseSpeed*slowMult*dm;
  if(t>20){
    spd=2+Math.min((t-20)*0.03,3);
    baseSpeed=3.5+Math.min((t-20)*0.02,2.5);
  }

  // Momentum system
  mom=1+Math.min(t*0.01,2); // Max x3

  // Camera shake after 50s
  if(t>50&&Math.random()<0.1){
    cam.shake(50,0.002*((t-50)*0.01));
  }

  // Variable wall spacing
  const minSpacing=(realBase+realSpd)*45;
  const maxSpacing=minSpacing*2.5;
  const currentSpacing=minSpacing+Math.random()*(maxSpacing-minSpacing);

  if(walls.length===0||walls[walls.length-1].y>currentSpacing)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=realSpd;
    const w=walls[i];

    for(let pt of w.portals){
      if(pt.vx){
        pt.x+=pt.vx*slowMult;
        if(pt.x<50||pt.x>W-pt.w-50)pt.vx*=-1;
      }
      if(pt.troll&&!pt.trollActive){
        const distY=Math.abs(w.y-p1.y);
        const distX=Math.abs(pt.x+pt.w/2-p1.x);
        if(distY<TROLL_DIST&&distX<80){
          pt.trollActive=1;
          const direction=(p1.x<pt.x?1:-1);
          const moveDistance=80+Math.random()*60;
          const targetX=pt.x+direction*moveDistance;
          pt.targetX=Math.max(60,Math.min(W-pt.w-60,targetX));
          pt.vx=direction*realBase*1.5;
          playSound('troll');
          trollsDodged++;
        }
      }
      if(pt.trollActive&&pt.targetX){
        if((pt.vx>0&&pt.x>=pt.targetX)||(pt.vx<0&&pt.x<=pt.targetX)){
          pt.x=pt.targetX;
          pt.vx=0;
          pt.targetX=null;
        }
      }
    }

    if(m===1&&w.portals.length===2&&!w.portals[0].unified){
      const p1p=w.portals[0],p2p=w.portals[1];
      const overlap=Math.max(0,Math.min(p1p.x+p1p.w,p2p.x+p2p.w)-Math.max(p1p.x,p2p.x));
      if(overlap>0){
        const collisionType=Math.random();
        if(collisionType<0.5){
          if(p1p.vx&&p2p.vx){p1p.vx*=-1;p2p.vx*=-1;}
        }else{
          const blendFactor=Math.min(overlap/p1p.w,1);
          if(blendFactor>0.3){
            p1p.col=blendColor(P1_COLOR,UNIFIED_COLOR,blendFactor);
            p2p.col=blendColor(P2_COLOR,UNIFIED_COLOR,blendFactor);
          }
        }
      }else if(overlap===0){
        if(p1p.col!==P1_COLOR)p1p.col=P1_COLOR;
        if(p2p.col!==P2_COLOR)p2p.col=P2_COLOR;
      }
    }
    if(w.y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1&&p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-realBase;
    else if(k.addKey('RIGHT').isDown)p1.vx=realBase;
    else p1.vx*=0.85;
    if(k.addKey('UP').isDown)p1.vy=-realBase;
    else if(k.addKey('DOWN').isDown)p1.vy=realBase;
    else p1.vy*=0.85;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-realBase;
    else if(k.addKey('D').isDown)p2.vx=realBase;
    else p2.vx*=0.85;
    if(k.addKey('W').isDown)p2.vy=-realBase;
    else if(k.addKey('S').isDown)p2.vy=realBase;
    else p2.vy*=0.85;
  }

  upd(p1,1);
  if(p2)upd(p2,2);

  if(m===1&&p1.alive&&p2.alive){
    const dist=Math.abs(p1.x-p2.x);
    if(dist<STICK_W+4){
      const pushForce=3.5;
      if(p1.x<p2.x){p1.x-=pushForce;p2.x+=pushForce;}
      else{p1.x+=pushForce;p2.x-=pushForce;}
    }
  }

  // Lives system
  if(m===0&&!p1.alive){
    lives--;
    if(lives>0){
      p1.alive=1;
      p1.x=W/2;
      p1.y=H-80;
      combo=0;
      deathSlowdown=1;
      cam.shake(200,0.02);
      playSound('death');
    }else{
      sc=2;
      stats.totalDeaths++;
      stats.totalTime+=t;
      saveData();
      showEnd();
    }
  }

  if(m===1&&(!p1.alive||!p2.alive)){
    sc=2;
    stats.totalDeaths++;
    stats.totalTime+=t;
    saveData();
    showEnd();
  }

  // Check achievements
  checkAchv();

  // Music
  playMusic(t);

  draw();

  // Update UI
  txts.help.setText(getHelpMsg(t,m));
  const motivMsg=getMotivMsg();
  if(motivMsg){
    txts.motiv.setText(motivMsg).setAlpha(1).setVisible(1);
    motivShow=1;
  }
  if(motivShow>0){
    motivShow-=dt*0.001;
    txts.motiv.setAlpha(Math.max(0,motivShow));
    if(motivShow<=0)txts.motiv.setVisible(0);
  }
  if(achvShow>0){
    achvShow-=dt*0.001;
    if(achvShow<=0)txts.achv.setVisible(0);
  }

  if(m===0){
    const finalScore=Math.floor(p1.sc*mom);
    txts.p1sc.setText(`Score: ${finalScore}`);
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
    txts.combo.setText(combo>0?`x${combo}`:'');
    txts.lives.setText(`Lives: ${'❤'.repeat(lives)}`);
    txts.momentum.setText(`x${mom.toFixed(1)}`);
  }else{
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
    txts.p1sc.setText(`P1: ${p1.alive?'ALIVE':'DEAD'}`);
    txts.p2sc.setText(`P2: ${p2.alive?'ALIVE':'DEAD'}`);
    txts.combo.setText(combo>0?`x${combo}`:'');
  }
}

function spawnWall(){
  let portalSize=getPortalSize(t);
  if(t>40&&portalSize===PORTAL_W){
    const shrinkFactor=Math.min((t-40)*0.6,PORTAL_W-20);
    portalSize=Math.max(20,PORTAL_W-shrinkFactor);
  }

  const moveProb=t>20?Math.min(0.15+(t-20)*0.005,0.4)*DIFF_MULTS[diff]:0;
  const shouldMove=Math.random()<moveProb;
  const moveSpeed=shouldMove?(Math.random()*1.2+0.4)*(Math.random()<0.5?1:-1):0;
  const isTroll=t>40&&portalSize===PORTAL_W&&Math.random()<TROLL_PROB*DIFF_MULTS[diff];

  if(m===0){
    const minX=60,maxX=W-portalSize-60;
    const portalX=minX+Math.random()*(maxX-minX);
    const prevSafe=walls.length>0?walls.find(w=>w.safe):null;
    const col=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];
    walls.push({y:-50,portals:[{x:portalX,w:portalSize,col,forP1:1,forP2:0,vx:moveSpeed,troll:isTroll,trollActive:0}],id:nextId,p1hit:0,p2hit:0});
  }else{
    const minX=80,maxX=W-portalSize-80;
    const spacingMode=Math.random();
    let p1X,p2X;
    if(spacingMode<0.3){p1X=minX+Math.random()*(maxX-minX);p2X=p1X;}
    else if(spacingMode<0.6){p1X=minX+Math.random()*(maxX-minX);const offset=(Math.random()*40+10)*(Math.random()<0.5?1:-1);p2X=Math.max(minX,Math.min(maxX,p1X+offset));}
    else{do{p1X=minX+Math.random()*(maxX-minX);p2X=minX+Math.random()*(maxX-minX);}while(Math.abs(p1X-p2X)<portalSize+60);}

    if(p1X===p2X){
      walls.push({y:-50,portals:[{x:p1X,w:portalSize,col:UNIFIED_COLOR,forP1:1,forP2:1,vx:moveSpeed,unified:1,troll:isTroll,trollActive:0}],id:nextId,p1hit:0,p2hit:0});
    }else{
      walls.push({y:-50,portals:[{x:p1X,w:portalSize,col:P1_COLOR,forP1:1,forP2:0,vx:moveSpeed,unified:0,troll:isTroll,trollActive:0},{x:p2X,w:portalSize,col:P2_COLOR,forP1:0,forP2:1,vx:moveSpeed,unified:0,troll:isTroll,trollActive:0}],id:nextId,p1hit:0,p2hit:0});
    }
  }
  nextId++;
}

function upd(p,playerNum){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  p.y+=p.vy;
  if(p.x<10)p.x=10;
  if(p.x>W-10)p.x=W-10;
  if(p.y<60)p.y=60;
  if(p.y>H-40)p.y=H-40;

  for(let w of walls){
    const alreadyHit=playerNum===1?w.p1hit:w.p2hit;
    if(Math.abs(w.y-p.y)<25&&!alreadyHit){
      let hitCorrectPortal=0;
      for(let pt of w.portals){
        if(p.x>pt.x&&p.x<pt.x+pt.w){
          if((playerNum===1&&pt.forP1)||(playerNum===2&&pt.forP2)){
            hitCorrectPortal=1;
          }
          break;
        }
      }

      if(hitCorrectPortal){
        if(playerNum===1)w.p1hit=1;
        else w.p2hit=1;
        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          combo++;
          if(combo>maxCombo)maxCombo=combo;
          const comboBonus=Math.min(combo,10);
          p.sc+=100*comboBonus*mom;
          stats.totalPortals++;
          playSound('portal',combo);
          // Particles
          cam.flash(50,pt.col>>16,(pt.col>>8)&0xff,pt.col&0xff,false,0.2);
        }
      }else{
        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.alive=0;
          combo=0;
          cam.shake(400,0.015);
          playSound('death');
        }
      }
    }

    if(m===1&&w.y>H-60){
      if(!w.p1hit&&p1.alive){p1.alive=0;combo=0;cam.shake(400,0.015);playSound('death');}
      if(!w.p2hit&&p2.alive){p2.alive=0;combo=0;cam.shake(400,0.015);playSound('death');}
    }
  }
}

function draw(){
  g.clear();

  // Draw walls with portal gaps
  for(let w of walls){
    const wallCol=0x666666;
    const sortedPortals=[...w.portals].sort((a,b)=>a.x-b.x);
    const isFullWidth=sortedPortals[0].w>=MAX_PORTAL;

    if(isFullWidth){
      g.fillStyle(sortedPortals[0].col);
      g.fillRect(60,w.y-WALL_THICK/2,W-120,WALL_THICK);
    }else{
      if(sortedPortals[0].x>0){
        g.fillStyle(wallCol);
        g.fillRect(0,w.y-WALL_THICK/2,sortedPortals[0].x,WALL_THICK);
      }

      for(let i=0;i<sortedPortals.length;i++){
        const portal=sortedPortals[i];
        g.fillStyle(portal.col);
        g.fillRect(portal.x,w.y-WALL_THICK/2,portal.w,WALL_THICK);

        if(portal.vx){
          g.fillStyle(0xffffff,0.7);
          const arrowSize=5;
          const cx=portal.x+portal.w/2;
          const cy=w.y;
          if(portal.vx>0)g.fillTriangle(cx+10,cy,cx+10+arrowSize,cy+arrowSize,cx+10+arrowSize,cy-arrowSize);
          else g.fillTriangle(cx-10,cy,cx-10-arrowSize,cy+arrowSize,cx-10-arrowSize,cy-arrowSize);
        }

        if(i<sortedPortals.length-1){
          const nextPortal=sortedPortals[i+1];
          const segStart=portal.x+portal.w;
          const segWidth=nextPortal.x-segStart;
          if(segWidth>0){
            g.fillStyle(wallCol);
            g.fillRect(segStart,w.y-WALL_THICK/2,segWidth,WALL_THICK);
          }
        }
      }

      const lastPortal=sortedPortals[sortedPortals.length-1];
      const endX=lastPortal.x+lastPortal.w;
      if(endX<W){
        g.fillStyle(wallCol);
        g.fillRect(endX,w.y-WALL_THICK/2,W-endX,WALL_THICK);
      }
    }
  }

  // Draw player trails
  if(p1&&p1.alive){
    g.fillStyle(P1_COLOR,0.3);
    g.fillCircle(p1.x,p1.y-STICK_H/2,3);
  }
  if(p2&&p2.alive){
    g.fillStyle(P2_COLOR,0.3);
    g.fillCircle(p2.x,p2.y-STICK_H/2,3);
  }

  // Players
  if(p1){
    const col=p1.alive?P1_COLOR:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p1.x,p1.y,p1.x,p1.y-STICK_H);
  }
  if(p2){
    const col=p2.alive?P2_COLOR:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p2.x,p2.y,p2.x,p2.y-STICK_H);
  }
}

function showMenu(){
  hideAll();
  g.clear();
  txts.title.setVisible(1);
  txts.sub.setVisible(1);
  txts.mode.setVisible(1);
  txts.diff.setVisible(1);
  txts.opt1.setVisible(1);
  txts.opt2.setVisible(1);
  txts.hint1.setVisible(1);
  txts.hint2.setVisible(1);
  txts.ctrl.setVisible(1);
  txts.hs.setText('High Score: '+hs).setVisible(1);
  txts.stats.setVisible(1);
  const diffNames=['EASY','NORMAL','HARD','INSANE'];
  txts.modeInfo.setText(`Mode: ${MODE_NAMES[gm]}`).setVisible(1);
  txts.diffInfo.setText(`Difficulty: ${diffNames[diff]}`).setVisible(1);
}

function showGame(){
  hideAll();
  if(m===0){
    txts.p1sc.setVisible(1);
    txts.help.setVisible(1);
    txts.lives.setVisible(1);
    txts.momentum.setVisible(1);
  }else{
    txts.p1sc.setVisible(1);
    txts.p2sc.setVisible(1);
    txts.help.setVisible(1);
  }
  txts.timer.setVisible(1);
  txts.combo.setVisible(1);
  txts.menu.setVisible(1);
  txts.motiv.setAlpha(0).setVisible(0);
}

function showEnd(){
  hideAll();
  cam.fade(300,0,0,0);
  setTimeout(()=>{
    g.fillStyle(0x000000,0.85);
    g.fillRect(0,0,W,H);
    txts.go.setVisible(1);
    txts.restart.setVisible(1);

    if(m===0){
      const finalScore=Math.floor(p1.sc*mom);
      const isNewRecord=finalScore>hs;
      if(isNewRecord){
        hs=finalScore;
        txts.newrec.setVisible(1);
        playSound('achievement');
      }
      if(gm===1&&t<stats.bestTime){
        stats.bestTime=t;
      }
      saveData();
      txts.p1end.setVisible(1).setText(`Score: ${finalScore} pts | Time: ${t.toFixed(1)}s | Max Combo: x${maxCombo}`);
    }else{
      txts.timer.setVisible(1);
      if(p1.alive&&!p2.alive){
        txts.win.setVisible(1).setText('P1 WINS!');
        txts.p1end.setVisible(1).setText('P1: Survived');
        txts.p2end.setVisible(1).setText('P2: Died');
      }else if(p2.alive&&!p1.alive){
        txts.win.setVisible(1).setText('P2 WINS!');
        txts.p1end.setVisible(1).setText('P1: Died');
        txts.p2end.setVisible(1).setText('P2: Survived');
      }else{
        txts.win.setVisible(1).setText('DRAW!');
        txts.p1end.setVisible(1).setText('P1: Died');
        txts.p2end.setVisible(1).setText('P2: Died');
      }
    }
  },300);
}

function hideAll(){
  for(let k in txts)txts[k].setVisible(0);
}
