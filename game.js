// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=50,STICK_W=6,WALL_SPACING=280,PORTAL_W=100,WALL_THICK=8;
let sc=0,m=0,p1,p2,walls=[],cam,g,spd=2.5,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={},baseSpeed=4;

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
  txts.hint1=this.add.text(W/2,H/2+140,'Go through COLORED portal!',{fontSize:'18px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+165,'2P: BOTH must pass or other wins!',{fontSize:'16px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint3=this.add.text(W/2,H/2+190,'Hit wall = DEATH!',{fontSize:'18px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → | P2: A D',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1sc=this.add.text(20,20,'',{fontSize:'20px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  txts.p2sc=this.add.text(W-150,20,'',{fontSize:'20px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);
  txts.timer=this.add.text(W/2,20,'',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.help=this.add.text(W/2,50,'',{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.menu=this.add.text(W/2,H-20,'T: Menu',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.go=this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'52px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.win=this.add.text(W/2,H/2-10,'',{fontSize:'40px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1end=this.add.text(W/2,H/2+40,'',{fontSize:'26px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p2end=this.add.text(W/2,H/2+75,'',{fontSize:'26px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.restart=this.add.text(W/2,H/2+130,'SPACE: Back to Menu',{fontSize:'22px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  this.input.keyboard.on('keydown-ONE',()=>{if(sc===0)start(this,0)});
  this.input.keyboard.on('keydown-TWO',()=>{if(sc===0)start(this,1)});
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=2.5;baseSpeed=4;nextId=0;showMenu();}});
  this.input.keyboard.on('keydown-T',()=>{if(sc===1){sc=0;walls=[];t=0;spd=2.5;baseSpeed=4;nextId=0;showMenu();}});

  showMenu();
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=2.5;baseSpeed=4;walls=[];nextId=0;
  const x1=m===1?W/3:W/2;
  const x2=2*W/3;
  p1={x:x1,vx:0,y:H-80,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-80,path:[],alive:1,sc:0};
  else p2=null;

  // First wall
  walls.push({y:-100,portalX:W/2-PORTAL_W/2,portalW:PORTAL_W,col:colors[0],id:nextId,safe:1,p1hit:0,p2hit:0});
  nextId++;

  hideAll();
  showGame();
}

function update(_,dt){
  if(sc===0)return;
  if(sc===2)return;

  t+=dt*0.001;

  // Progressive difficulty - SLOWER acceleration
  if(t>10)spd=2.5+t*0.08;  // Reduced from 0.15
  if(spd>6)spd=6;  // Reduced max from 8

  // Player speed also increases SLOWER
  if(t>10)baseSpeed=4+t*0.05;  // Reduced from 0.1
  if(baseSpeed>7)baseSpeed=7;  // Reduced max from 9

  // Reduce wall spacing as game progresses SLOWER
  const currentSpacing=Math.max(220,WALL_SPACING-t*2);  // Reduced from 3

  if(walls.length===0||walls[walls.length-1].y>currentSpacing)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;
    if(walls[i].y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1&&p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-baseSpeed;
    else if(k.addKey('RIGHT').isDown)p1.vx=baseSpeed;
    else p1.vx*=0.85;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-baseSpeed;
    else if(k.addKey('D').isDown)p2.vx=baseSpeed;
    else p2.vx*=0.85;
  }

  upd(p1,1);
  if(p2)upd(p2,2);

  // Player collision (2P push mechanic)
  if(m===1&&p1.alive&&p2.alive){
    const dist=Math.abs(p1.x-p2.x);
    if(dist<STICK_W+2){
      if(p1.x<p2.x){
        p1.x-=1.5;
        p2.x+=1.5;
      }else{
        p1.x+=1.5;
        p2.x-=1.5;
      }
    }
  }

  // Check game over conditions
  if(m===0){
    // 1P: Just check if dead
    if(!p1.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }else{
    // 2P: If one dies, other wins
    if(!p1.alive||!p2.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }

  draw();

  if(m===0){
    // 1P: Show score
    if(p1)txts.p1sc.setText(`Score: ${p1.sc}`);
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
  }else{
    // 2P: Show status for each
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
    if(p1)txts.p1sc.setText(`P1: ${p1.alive?'ALIVE':'DEAD'}`);
    if(p2)txts.p2sc.setText(`P2: ${p2.alive?'ALIVE':'DEAD'}`);
  }
}

function spawnWall(){
  const minX=50;
  const maxX=W-PORTAL_W-50;
  const portalX=minX+Math.random()*(maxX-minX);

  const prevSafe=walls.length>0?walls.find(w=>w.safe):null;
  const col=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

  walls.push({y:-50,portalX,portalW:PORTAL_W,col,id:nextId,safe:1,p1hit:0,p2hit:0});
  nextId++;
}

function upd(p,playerNum){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  if(p.x<10)p.x=10;
  if(p.x>W-10)p.x=W-10;

  for(let w of walls){
    // Check which player hit this wall
    const alreadyHit=playerNum===1?w.p1hit:w.p2hit;

    if(Math.abs(w.y-p.y)<25&&!alreadyHit){
      // Check if passed through portal (safe)
      if(p.x>w.portalX&&p.x<w.portalX+w.portalW){
        // Mark this player as passed
        if(playerNum===1)w.p1hit=1;
        else w.p2hit=1;

        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.sc+=100;
          tone(700,100);
          cam.flash(80,255,255,255);
        }

        // In 2P mode, check if BOTH passed
        if(m===1){
          // If this player passed but other didn't, other player loses
          // Check after a delay to see if other player also passes
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

    // In 2P: Check if wall passed both players and only one went through
    if(m===1&&w.y>H-60){
      if((w.p1hit&&!w.p2hit&&p2.alive)||(w.p2hit&&!w.p1hit&&p1.alive)){
        // One passed, other didn't - kill the one who didn't pass
        if(!w.p1hit&&p1.alive){
          p1.alive=0;
          cam.shake(400,0.015);
          tone(120,300);
        }
        if(!w.p2hit&&p2.alive){
          p2.alive=0;
          cam.shake(400,0.015);
          tone(120,300);
        }
      }
    }
  }
}

function draw(){
  g.clear();

  // Draw walls with portal gaps
  for(let w of walls){
    const wallCol=0x666666;

    // Draw wall before portal
    if(w.portalX>0){
      g.fillStyle(wallCol);
      g.fillRect(0,w.y-WALL_THICK/2,w.portalX,WALL_THICK);
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
    if(endX<W){
      g.fillStyle(wallCol);
      g.fillRect(endX,w.y-WALL_THICK/2,W-endX,WALL_THICK);
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
  txts.hint3.setVisible(1);
  txts.ctrl.setVisible(1);
}

function showGame(){
  hideAll();
  if(m===0){
    txts.p1sc.setVisible(1);
    txts.help.setVisible(1).setText('WHITE DOT = SAFE!');
  }else{
    txts.p1sc.setVisible(1);
    txts.p2sc.setVisible(1);
    txts.help.setVisible(1).setText('BOTH MUST PASS!');
  }
  txts.timer.setVisible(1);
  txts.menu.setVisible(1);
}

function showEnd(){
  hideAll();

  g.fillStyle(0x000000,0.85);
  g.fillRect(0,0,W,H);

  txts.go.setVisible(1);
  txts.restart.setVisible(1);

  if(m===0){
    // 1P: Show score and time
    txts.p1end.setVisible(1).setText(`Score: ${p1.sc} pts | Time: ${t.toFixed(1)}s`);
  }else{
    // 2P: Show who won based on who survived
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
      // Both died at same time
      txts.win.setVisible(1).setText('DRAW!');
      txts.p1end.setVisible(1).setText('P1: Died');
      txts.p2end.setVisible(1).setText('P2: Died');
    }
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
