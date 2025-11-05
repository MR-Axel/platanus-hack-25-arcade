// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=40,STICK_W=8,WALL_GAP=150,PORTAL_W=80;
let sc=0,m=0,p1,p2,walls=[],cam,g,spd=3,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={};

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#111',scene:{create,update}};
new Phaser.Game(cfg);

function create(){
  this.g=this.add.graphics();
  cam=this.cameras.main;
  snd=this.sound.context;
  g=this.g;

  // Create text objects once
  txts.title=this.add.text(W/2,H/2-120,'QUANTUM DASH',{fontSize:'56px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  txts.sub=this.add.text(W/2,H/2-40,'Portal Runner',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt1=this.add.text(W/2,H/2+40,'Press 1 for ONE PLAYER',{fontSize:'28px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt2=this.add.text(W/2,H/2+80,'Press 2 for TWO PLAYERS',{fontSize:'28px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint1=this.add.text(W/2,H/2+140,'Choose portals with WHITE DOT!',{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+165,'Wrong portal = death!',{fontSize:'16px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → | P2: A D',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1sc=this.add.text(20,20,'',{fontSize:'18px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  txts.p2sc=this.add.text(W-120,20,'',{fontSize:'18px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);
  txts.help=this.add.text(W/2,20,'',{fontSize:'16px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.menu=this.add.text(W/2,H-20,'T: Menu',{fontSize:'14px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.go=this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'48px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.win=this.add.text(W/2,H/2-20,'',{fontSize:'36px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1end=this.add.text(W/2,H/2+30,'',{fontSize:'24px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p2end=this.add.text(W/2,H/2+60,'',{fontSize:'24px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.restart=this.add.text(W/2,H/2+120,'SPACE: Back to Menu',{fontSize:'20px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  this.input.keyboard.on('keydown-ONE',()=>{if(sc===0)start(this,0)});
  this.input.keyboard.on('keydown-TWO',()=>{if(sc===0)start(this,1)});
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=3;nextId=0;}});
  this.input.keyboard.on('keydown-T',()=>{if(sc===1){sc=0;walls=[];t=0;spd=3;nextId=0;}});

  showMenu();
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=3;walls=[];nextId=0;
  const x1=m===1?W/4-STICK_W/2:W/2-STICK_W/2;
  const x2=3*W/4-STICK_W/2;
  p1={x:x1,vx:0,y:H-100,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-100,path:[],alive:1,sc:0};
  else p2=null;

  walls.push({y:-200,portals:[{x:W/2-PORTAL_W/2,w:PORTAL_W,col:colors[0],id:nextId,safe:1}]});
  nextId++;

  hideMenu();
  showGame();
}

function update(_,dt){
  if(sc===0)return;
  if(sc===2)return;

  t+=dt*0.001;
  if(t>10&&spd<8)spd=3+t*0.08;

  if(walls.length===0||walls[walls.length-1].y>-WALL_GAP)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;
    if(walls[i].y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-5;
    else if(k.addKey('RIGHT').isDown)p1.vx=5;
    else p1.vx*=0.8;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-5;
    else if(k.addKey('D').isDown)p2.vx=5;
    else p2.vx*=0.8;
  }

  upd(p1);
  if(p2)upd(p2);

  if(!p1.alive&&(!p2||!p2.alive)){
    sc=2;
    tone(150,300);
    showEnd();
  }

  draw();
  txts.p1sc.setText(`P1: ${p1.sc}`);
  if(p2)txts.p2sc.setText(`P2: ${p2.sc}`);
}

function spawnWall(){
  const n=Math.min(2+Math.floor(t/15),4);
  const portals=[];
  const si=Math.floor(Math.random()*n);
  const ps=walls.length>0?walls[walls.length-1].portals.find(p=>p.safe):null;
  const sc=ps?ps.col:colors[Math.floor(Math.random()*colors.length)];

  for(let i=0;i<n;i++){
    const x=(W/n)*i+(W/n-PORTAL_W)/2;
    const col=i===si?sc:colors[Math.floor(Math.random()*colors.length)];
    portals.push({x,w:PORTAL_W,col,id:nextId,safe:i===si?1:0});
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
        if(p.path.indexOf('w_'+w.y)===-1){
          p.path.push('w_'+w.y);
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

  if(m===1){
    g.lineStyle(2,0x555);
    g.lineBetween(W/2,0,W/2,H);
  }

  for(let w of walls){
    g.fillStyle(0x666666);
    let lx=m===1&&p2?W/2:0;

    for(let pt of w.portals){
      if(pt.x>lx)g.fillRect(lx,w.y-20,pt.x-lx,40);

      g.fillStyle(pt.col,0.3);
      g.fillRect(pt.x,w.y-20,pt.w,40);
      g.lineStyle(3,pt.col);
      g.strokeRect(pt.x,w.y-20,pt.w,40);

      if(pt.safe){
        g.fillStyle(0xffffff);
        g.fillCircle(pt.x+pt.w/2,w.y,5);
      }

      lx=pt.x+pt.w;
    }

    const mx=m===1?(w.portals[0].x<W/2?W/2:W):W;
    if(lx<mx){
      g.fillStyle(0x666666);
      g.fillRect(lx,w.y-20,mx-lx,40);
    }
  }

  if(p1)drawStick(p1.x,p1.y,p1.alive?0x00aaff:0x555);
  if(p2)drawStick(p2.x,p2.y,p2.alive?0xff9900:0x555);
}

function drawStick(x,y,col){
  g.fillStyle(col);
  g.fillRect(x,y-STICK_H,STICK_W,STICK_H);
  g.fillCircle(x+STICK_W/2,y-STICK_H-8,8);
  g.lineStyle(3,col);
  g.lineBetween(x+STICK_W/2,y-STICK_H+10,x-5,y-STICK_H+25);
  g.lineBetween(x+STICK_W/2,y-STICK_H+10,x+STICK_W+5,y-STICK_H+25);
}

function showMenu(){
  hideAll();
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
  txts.help.setVisible(1).setText('Choose SAFE portal (white dot)!');
  txts.menu.setVisible(1);
  if(p2)txts.p2sc.setVisible(1);
}

function showEnd(){
  hideAll();
  g.fillStyle(0x000000,0.8);
  g.fillRect(0,0,W,H);

  txts.go.setVisible(1);
  txts.restart.setVisible(1);
  txts.p1end.setVisible(1).setText(`P1 Score: ${p1.sc}`);

  if(p2){
    txts.p2end.setVisible(1).setText(`P2 Score: ${p2.sc}`);
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
  gn.gain.setValueAtTime(0.08,snd.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+d/1000);
  o.start();o.stop(snd.currentTime+d/1000);
}
