// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=40,STICK_W=8,WALL_GAP=150,PORTAL_W=80;
let scene=0,m=0,p1,p2,walls=[],cam,g,spd=3,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd;

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#111',scene:{create,update}};
new Phaser.Game(cfg);

function create(){
  const s=this;
  g=s.add.graphics();
  cam=s.cameras.main;
  snd=s.sound.context;

  s.input.keyboard.on('keydown-ONE',()=>{if(scene===0)start(s,0)});
  s.input.keyboard.on('keydown-TWO',()=>{if(scene===0)start(s,1)});
  s.input.keyboard.on('keydown-SPACE',()=>{if(scene===2){scene=0;walls=[];t=0;spd=3;nextId=0;}});
  s.input.keyboard.on('keydown-T',()=>{if(scene===1){scene=0;walls=[];t=0;spd=3;nextId=0;}});
}

function start(s,mode){
  m=mode;scene=1;t=0;spd=3;walls=[];nextId=0;
  const x1=m===1?W/4-STICK_W/2:W/2-STICK_W/2;
  const x2=3*W/4-STICK_W/2;
  p1={x:x1,vx:0,y:H-100,path:[],alive:1,sc:0,stickX:m===1?W/4:W/2};
  if(m===1)p2={x:x2,vx:0,y:H-100,path:[],alive:1,sc:0,stickX:3*W/4};
  else p2=null;

  // Initial safe path
  const col=colors[0];
  walls.push({y:-200,portals:[{x:W/2-PORTAL_W/2,w:PORTAL_W,col,id:nextId,safe:1}]});
  nextId++;
}

function update(_,dt){
  if(scene===0){drawMenu();return;}
  if(scene===2){drawEnd();return;}

  t+=dt*0.001;

  // Difficulty
  if(t>10&&spd<8)spd=3+t*0.08;

  // Spawn walls
  if(walls.length===0||walls[walls.length-1].y>-WALL_GAP){
    spawnWall();
  }

  // Move walls
  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;
    if(walls[i].y>H+50)walls.splice(i,1);
  }

  // Input P1
  const k1=this.input.keyboard;
  if(p1.alive){
    if(k1.addKey('LEFT').isDown)p1.vx=-5;
    else if(k1.addKey('RIGHT').isDown)p1.vx=5;
    else p1.vx*=0.8;
  }

  // Input P2
  if(p2&&p2.alive){
    if(k1.addKey('A').isDown)p2.vx=-5;
    else if(k1.addKey('D').isDown)p2.vx=5;
    else p2.vx*=0.8;
  }

  upd(p1);
  if(p2)upd(p2);

  // Check end
  if(!p1.alive&&(!p2||!p2.alive)){
    scene=2;
    tone(150,300);
  }

  draw();
}

function spawnWall(){
  const numPortals=Math.min(2+Math.floor(t/15),4);
  const portals=[];
  const safeIdx=Math.floor(Math.random()*numPortals);
  const prevSafe=walls.length>0?walls[walls.length-1].portals.find(p=>p.safe):null;
  const safeCol=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

  for(let i=0;i<numPortals;i++){
    const x=(W/numPortals)*i+(W/numPortals-PORTAL_W)/2;
    const col=i===safeIdx?safeCol:colors[Math.floor(Math.random()*colors.length)];
    portals.push({x,w:PORTAL_W,col,id:nextId,safe:i===safeIdx?1:0});
    nextId++;
  }

  walls.push({y:-50,portals});
}

function upd(p){
  if(!p.alive)return;

  p.x+=p.vx;
  const minX=m===1?(p===p1?20:W/2+20):20;
  const maxX=m===1?(p===p1?W/2-20:W-20):W-20;
  if(p.x<minX)p.x=minX;
  if(p.x>maxX-STICK_W)p.x=maxX-STICK_W;

  // Check portal collision
  for(let w of walls){
    if(Math.abs(w.y-p.y)<30){
      let hit=null;
      for(let pt of w.portals){
        if(p.x+STICK_W/2>pt.x&&p.x+STICK_W/2<pt.x+pt.w){
          hit=pt;
          break;
        }
      }

      if(hit){
        if(p.path.indexOf(hit.id)===-1){
          p.path.push(hit.id);
          if(hit.safe){
            p.sc+=100;
            tone(600,80);
            cam.flash(50,255,255,255);
          }else{
            p.alive=0;
            cam.shake(300,0.02);
            tone(150,200);
          }
        }
      }else{
        // Missed all portals = hit wall
        if(p.path.indexOf('wall_'+w.y)===-1){
          p.path.push('wall_'+w.y);
          p.alive=0;
          cam.shake(300,0.02);
          tone(150,200);
        }
      }
    }
  }
}

function draw(){
  g.clear();

  // Split line for 2P
  if(m===1){
    g.lineStyle(2,0x555);
    g.lineBetween(W/2,0,W/2,H);
  }

  // Walls with portals
  for(let w of walls){
    // Draw wall sections (between portals)
    g.fillStyle(0x666666);
    let lastX=m===1&&p2?W/2:0;

    for(let pt of w.portals){
      // Wall before portal
      if(pt.x>lastX){
        g.fillRect(lastX,w.y-20,pt.x-lastX,40);
      }

      // Portal
      g.fillStyle(pt.col,0.3);
      g.fillRect(pt.x,w.y-20,pt.w,40);
      g.lineStyle(3,pt.col);
      g.strokeRect(pt.x,w.y-20,pt.w,40);

      // Portal indicator
      if(pt.safe){
        g.fillStyle(0xffffff);
        g.fillCircle(pt.x+pt.w/2,w.y,5);
      }

      lastX=pt.x+pt.w;
    }

    // Wall after last portal
    const maxX=m===1?(w.portals[0].x<W/2?W/2:W):W;
    if(lastX<maxX){
      g.fillStyle(0x666666);
      g.fillRect(lastX,w.y-20,maxX-lastX,40);
    }
  }

  // Player 1 (stick figure)
  if(p1){
    const col=p1.alive?0x00aaff:0x555;
    g.fillStyle(col);
    g.fillRect(p1.x,p1.y-STICK_H,STICK_W,STICK_H);
    g.fillCircle(p1.x+STICK_W/2,p1.y-STICK_H-8,8);
    g.lineStyle(3,col);
    g.lineBetween(p1.x+STICK_W/2,p1.y-STICK_H+10,p1.x-5,p1.y-STICK_H+25);
    g.lineBetween(p1.x+STICK_W/2,p1.y-STICK_H+10,p1.x+STICK_W+5,p1.y-STICK_H+25);
  }

  // Player 2
  if(p2){
    const col=p2.alive?0xff9900:0x555;
    g.fillStyle(col);
    g.fillRect(p2.x,p2.y-STICK_H,STICK_W,STICK_H);
    g.fillCircle(p2.x+STICK_W/2,p2.y-STICK_H-8,8);
    g.lineStyle(3,col);
    g.lineBetween(p2.x+STICK_W/2,p2.y-STICK_H+10,p2.x-5,p2.y-STICK_H+25);
    g.lineBetween(p2.x+STICK_W/2,p2.y-STICK_H+10,p2.x+STICK_W+5,p2.y-STICK_H+25);
  }

  // UI
  this.add.text(20,20,`P1: ${p1.sc}`,{fontSize:'18px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  if(p2)this.add.text(W-120,20,`P2: ${p2.sc}`,{fontSize:'18px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);

  this.add.text(W/2,20,'Choose SAFE portal (white dot)!',{fontSize:'16px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  this.add.text(W/2,H-20,'T: Menu',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
}

function drawMenu(){
  g.clear();
  g.fillStyle(0x000000);
  g.fillRect(0,0,W,H);

  this.add.text(W/2,H/2-120,'QUANTUM DASH',{fontSize:'56px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  this.add.text(W/2,H/2-40,'Portal Runner',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  this.add.text(W/2,H/2+40,'Press 1 for ONE PLAYER',{fontSize:'28px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  this.add.text(W/2,H/2+80,'Press 2 for TWO PLAYERS',{fontSize:'28px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);

  this.add.text(W/2,H/2+140,'Choose portals with WHITE DOT to survive!',{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  this.add.text(W/2,H/2+165,'Wrong portals = death! Think fast!',{fontSize:'16px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);

  this.add.text(W/2,H-40,'P1: ← → | P2: A D',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
}

function drawEnd(){
  g.clear();

  const win=!p2?'':p1.sc>p2.sc?'P1 WINS!':p2.sc>p1.sc?'P2 WINS!':'DRAW!';

  g.fillStyle(0x000000,0.8);
  g.fillRect(0,0,W,H);

  this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'48px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  if(win)this.add.text(W/2,H/2-20,win,{fontSize:'36px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);

  this.add.text(W/2,H/2+30,`P1 Score: ${p1.sc}`,{fontSize:'24px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  if(p2)this.add.text(W/2,H/2+60,`P2 Score: ${p2.sc}`,{fontSize:'24px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);

  this.add.text(W/2,H/2+120,'SPACE: Back to Menu',{fontSize:'20px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
}

function tone(f,d){
  if(!snd)return;
  const o=snd.createOscillator(),gn=snd.createGain();
  o.connect(gn);gn.connect(snd.destination);
  o.frequency.value=f;o.type='square';
  gn.gain.setValueAtTime(0.08,snd.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+d/1000);
  o.start();o.stop(snd.currentTime+d/1000);
}
