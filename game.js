// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=50,STICK_W=6,WALL_SPACING=300,PORTAL_W=100,WALL_THICK=8;
let sc=0,m=0,p1,p2,walls=[],cam,g,spd=2,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={};

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#000',scene:{create,update}};
new Phaser.Game(cfg);

function create(){
  this.g=this.add.graphics();
  cam=this.cameras.main;
  snd=this.sound.context;
  g=this.g;

  txts.title=this.add.text(W/2,H/2-120,'QUANTUM DASH',{fontSize:'56px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  txts.sub=this.add.text(W/2,H/2-40,'Portal Runner',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt1=this.add.text(W/2,H/2+40,'Press 1 for ONE PLAYER',{fontSize:'28px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt2=this.add.text(W/2,H/2+80,'Press 2 for TWO PLAYERS',{fontSize:'28px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint1=this.add.text(W/2,H/2+140,'Go through COLORED portal (white dot)!',{fontSize:'18px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+170,'Hit wall = DEATH!',{fontSize:'18px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → | P2: A D',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1sc=this.add.text(20,20,'',{fontSize:'20px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  txts.p2sc=this.add.text(W-120,20,'',{fontSize:'20px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);
  txts.help=this.add.text(W/2,20,'',{fontSize:'18px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.menu=this.add.text(W/2,H-20,'T: Menu',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.go=this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'52px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.win=this.add.text(W/2,H/2-10,'',{fontSize:'40px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1end=this.add.text(W/2,H/2+40,'',{fontSize:'26px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p2end=this.add.text(W/2,H/2+75,'',{fontSize:'26px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.restart=this.add.text(W/2,H/2+130,'SPACE: Back to Menu',{fontSize:'22px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  this.input.keyboard.on('keydown-ONE',()=>{if(sc===0)start(this,0)});
  this.input.keyboard.on('keydown-TWO',()=>{if(sc===0)start(this,1)});
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=2;nextId=0;showMenu();}});
  this.input.keyboard.on('keydown-T',()=>{if(sc===1){sc=0;walls=[];t=0;spd=2;nextId=0;showMenu();}});

  showMenu();
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=2;walls=[];nextId=0;
  const x1=m===1?W/4:W/2;
  const x2=3*W/4;
  p1={x:x1,vx:0,y:H-80,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-80,path:[],alive:1,sc:0};
  else p2=null;

  // First wall
  const area=m===1?W/2:W;
  walls.push({y:-100,portalX:area/2-PORTAL_W/2,portalW:PORTAL_W,col:colors[0],id:nextId,safe:1,hit:0});
  nextId++;

  hideAll();
  showGame();
}

function update(_,dt){
  if(sc===0)return;
  if(sc===2)return;

  t+=dt*0.001;
  if(t>15&&spd<5)spd=2+t*0.05;

  if(walls.length===0||walls[walls.length-1].y>WALL_SPACING)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;
    if(walls[i].y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1&&p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-4;
    else if(k.addKey('RIGHT').isDown)p1.vx=4;
    else p1.vx*=0.85;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-4;
    else if(k.addKey('D').isDown)p2.vx=4;
    else p2.vx*=0.85;
  }

  upd(p1);
  if(p2)upd(p2);

  if(!p1.alive&&(!p2||!p2.alive)){
    sc=2;
    tone(150,400);
    showEnd();
  }

  draw();
  if(p1)txts.p1sc.setText(`P1: ${p1.sc}`);
  if(p2)txts.p2sc.setText(`P2: ${p2.sc}`);
}

function spawnWall(){
  const area=m===1?W/2:W;
  const minX=50;
  const maxX=area-PORTAL_W-50;
  const portalX=minX+Math.random()*(maxX-minX);

  const prevSafe=walls.length>0?walls.find(w=>w.safe):null;
  const col=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

  // Add decoy portals (different colors) with low probability
  const hasDecoy=Math.random()>0.7&&t>10;

  walls.push({y:-50,portalX,portalW:PORTAL_W,col,id:nextId,safe:1,hit:0,hasDecoy});
  nextId++;
}

function upd(p){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  const minX=m===1?(p===p1?10:W/2+10):10;
  const maxX=m===1?(p===p1?W/2-10:W-10):W-10;
  if(p.x<minX)p.x=minX;
  if(p.x>maxX)p.x=maxX;

  for(let w of walls){
    if(Math.abs(w.y-p.y)<25&&!w.hit){
      // Check if passed through portal (safe)
      if(p.x>w.portalX&&p.x<w.portalX+w.portalW){
        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.sc+=100;
          w.hit=1;
          tone(700,100);
          cam.flash(80,255,255,255);
        }
      }else{
        // Hit wall!
        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.alive=0;
          cam.shake(400,0.015);
          tone(120,300);
        }
      }
    }
  }
}

function draw(){
  g.clear();

  // Split line for 2P
  if(m===1){
    g.lineStyle(3,0x333);
    g.lineBetween(W/2,0,W/2,H);
  }

  // Draw walls with portal gaps
  for(let w of walls){
    const areaW=m===1?W/2:W;
    const startX=0;

    // Wall color (gray)
    const wallCol=0x666666;

    // Draw wall before portal
    if(w.portalX>startX){
      g.fillStyle(wallCol);
      g.fillRect(startX,w.y-WALL_THICK/2,w.portalX-startX,WALL_THICK);
    }

    // Draw portal gap with colored outline
    g.lineStyle(4,w.col);
    g.strokeRect(w.portalX,w.y-WALL_THICK/2-4,w.portalW,WALL_THICK+8);

    // Portal inner glow
    g.fillStyle(w.col,0.3);
    g.fillRect(w.portalX,w.y-WALL_THICK/2,w.portalW,WALL_THICK);

    // Safe indicator (white dot)
    if(w.safe){
      g.fillStyle(0xffffff);
      g.fillCircle(w.portalX+w.portalW/2,w.y,6);
    }

    // Wall after portal
    const endX=w.portalX+w.portalW;
    if(endX<startX+areaW){
      g.fillStyle(wallCol);
      g.fillRect(endX,w.y-WALL_THICK/2,startX+areaW-endX,WALL_THICK);
    }
  }

  // Player 1 (simple stick)
  if(p1){
    const col=p1.alive?0x00ccff:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p1.x,p1.y,p1.x,p1.y-STICK_H);
  }

  // Player 2
  if(p2){
    const col=p2.alive?0xff9900:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p2.x,p2.y,p2.x,p2.y-STICK_H);
  }
}

function showMenu(){
  hideAll();
  g.clear();
  txts.title.setVisible(1);
  txts.sub.setVisible(1);
  txts.opt1.setVisible(1);
  txts.opt2.setVisible(1);
  txts.hint1.setVisible(1);
  txts.hint2.setVisible(1);
  txts.ctrl.setVisible(1);
}

function showGame(){
  hideAll();
  txts.p1sc.setVisible(1);
  txts.help.setVisible(1).setText('WHITE DOT = SAFE!');
  txts.menu.setVisible(1);
  if(p2)txts.p2sc.setVisible(1);
}

function showEnd(){
  hideAll();

  g.fillStyle(0x000000,0.85);
  g.fillRect(0,0,W,H);

  txts.go.setVisible(1);
  txts.restart.setVisible(1);
  txts.p1end.setVisible(1).setText(`P1: ${p1.sc} pts`);

  if(p2){
    txts.p2end.setVisible(1).setText(`P2: ${p2.sc} pts`);
    const w=p1.sc>p2.sc?'P1 WINS!':p2.sc>p1.sc?'P2 WINS!':'DRAW!';
    txts.win.setVisible(1).setText(w);
  }
}

function hideAll(){
  for(let k in txts)txts[k].setVisible(0);
}

function tone(f,d){
  if(!snd)return;
  const o=snd.createOscillator(),gn=snd.createGain();
  o.connect(gn);gn.connect(snd.destination);
  o.frequency.value=f;o.type='square';
  gn.gain.setValueAtTime(0.06,snd.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+d/1000);
  o.start();o.stop(snd.currentTime+d/1000);
}
