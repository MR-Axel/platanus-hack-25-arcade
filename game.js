// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=50,STICK_W=6,WALL_SPACING=300,PORTAL_W=120,PORTAL_H=60;
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
  txts.hint1=this.add.text(W/2,H/2+140,'Choose portal with WHITE DOT!',{fontSize:'18px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+170,'Wrong portal = DEATH!',{fontSize:'18px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
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
  walls.push({y:-100,portals:[{x:W/2-PORTAL_W/2,col:colors[0],id:nextId,safe:1}]});
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
    if(walls[i].y>H+100)walls.splice(i,1);
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
  const num=Math.min(2+Math.floor(t/20),3);
  const portals=[];
  const safeIdx=Math.floor(Math.random()*num);
  const prevSafe=walls.length>0?walls[walls.length-1].portals.find(p=>p.safe):null;
  const safeCol=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

  // Distribute portals with spacing
  const totalW=m===1?W/2:W;
  const startX=m===1&&p2?0:0;
  const spacing=totalW/(num+1);

  for(let i=0;i<num;i++){
    const x=startX+spacing*(i+1)-PORTAL_W/2;
    const col=i===safeIdx?safeCol:colors[Math.floor(Math.random()*colors.length)];
    portals.push({x,col,id:nextId,safe:i===safeIdx?1:0});
    nextId++;
  }

  walls.push({y:-80,portals});
}

function upd(p){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  const minX=m===1?(p===p1?10:W/2+10):10;
  const maxX=m===1?(p===p1?W/2-10:W-10):W-10;
  if(p.x<minX)p.x=minX;
  if(p.x>maxX)p.x=maxX;

  for(let w of walls){
    if(Math.abs(w.y-p.y)<40){
      let hit=null;
      for(let pt of w.portals){
        if(p.x>pt.x&&p.x<pt.x+PORTAL_W){
          hit=pt;
          break;
        }
      }

      if(hit){
        if(p.path.indexOf(hit.id)===-1){
          p.path.push(hit.id);
          if(hit.safe){
            p.sc+=100;
            tone(700,100);
            cam.flash(80,255,255,255);
          }else{
            p.alive=0;
            cam.shake(400,0.015);
            tone(120,300);
          }
        }
      }else{
        // Missed all portals
        if(p.path.indexOf('miss_'+w.y)===-1){
          p.path.push('miss_'+w.y);
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
    g.lineStyle(3,0x444);
    g.lineBetween(W/2,0,W/2,H);
  }

  // Draw walls with portals
  for(let w of walls){
    for(let pt of w.portals){
      // Portal glow
      g.fillStyle(pt.col,0.2);
      g.fillRect(pt.x-5,w.y-PORTAL_H/2-5,PORTAL_W+10,PORTAL_H+10);

      // Portal frame
      g.lineStyle(4,pt.col);
      g.strokeRect(pt.x,w.y-PORTAL_H/2,PORTAL_W,PORTAL_H);

      // Inner portal
      g.fillStyle(pt.col,0.5);
      g.fillRect(pt.x+4,w.y-PORTAL_H/2+4,PORTAL_W-8,PORTAL_H-8);

      // Safe indicator
      if(pt.safe){
        g.fillStyle(0xffffff);
        g.fillCircle(pt.x+PORTAL_W/2,w.y,8);
        g.fillCircle(pt.x+PORTAL_W/2,w.y,4);
      }
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
