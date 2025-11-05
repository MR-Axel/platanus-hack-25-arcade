// Quantum Dash - 1P/2P Runner
const TWO_P='auto';const W=800,H=600,LW=100,LANES=3,PW=60,MIN_GAP=10;
let m=0,go=0,win='',p1,p2,pts=[],g,txt,spd=2,gap=80,t=0,dt=0,snd,cur,wasd,lastT=0;

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#000',scene:{create,update}};
new Phaser.Game(cfg);

function create(){
  const s=this;
  g=s.add.graphics();
  snd=s.sound.context;
  cur=s.input.keyboard.createCursorKeys();
  wasd={w:s.input.keyboard.addKey('W'),a:s.input.keyboard.addKey('A'),d:s.input.keyboard.addKey('D')};
  txt=s.add.text(W/2,20,'',{fontSize:'20px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  s.input.keyboard.on('keydown-T',()=>init(s,m===1?0:1));
  s.input.keyboard.on('keydown-SPACE',()=>{if(go)init(s,m)});

  if(TWO_P===1)init(s,1);
  else if(TWO_P===0)init(s,0);
  else init(s,0);
}

function init(s,mode){
  m=mode;go=0;win='';t=0;spd=2;gap=80;dt=0;pts=[];lastT=0;
  const cx1=m===1?W/4:W/2,cx2=3*W/4;
  p1={x:cx1,y:H-80,vy:0,ln:1,c:0,sc:0,d:0,j:0,cx:cx1};
  if(m===1)p2={x:cx2,y:H-80,vy:0,ln:1,c:0,sc:0,d:0,j:0,cx:cx2};
  else p2=null;
}

function update(_,delta){
  if(!p1)return;
  dt+=delta;
  if(dt<16)return;
  dt=0;

  // Auto switch to 2P
  if(m===0&&TWO_P==='auto'&&!go){
    if(wasd.a.isDown||wasd.d.isDown||wasd.w.isDown){init(this,1);return;}
  }

  if(go){draw();return;}

  t+=0.016;

  // Difficulty ramp
  if(t-lastT>5){lastT+=5;spd+=0.5;if(gap>MIN_GAP+20)gap-=5;}

  // Spawn portals
  if(pts.length===0||H-pts[pts.length-1].y>gap+80){
    const ln=Math.floor(Math.random()*LANES),y=-40,gp=gap+Math.random()*20-10;
    pts.push({ln,y,gp,h:0});
  }

  // Move portals
  for(let i=pts.length-1;i>=0;i--){
    pts[i].y+=spd;
    if(pts[i].y>H+40)pts.splice(i,1);
  }

  // P1 input
  if(cur.left.isDown&&p1.ln>0&&!p1.mv){p1.ln--;p1.mv=1;}
  if(cur.right.isDown&&p1.ln<LANES-1&&!p1.mv){p1.ln++;p1.mv=1;}
  if(!cur.left.isDown&&!cur.right.isDown)p1.mv=0;
  if(Phaser.Input.Keyboard.JustDown(cur.up)&&!p1.j){p1.vy=-12;p1.j=1;tone(300,80);}

  upd(p1);

  // P2 input
  if(p2){
    if(wasd.a.isDown&&p2.ln>0&&!p2.mv){p2.ln--;p2.mv=1;}
    if(wasd.d.isDown&&p2.ln<LANES-1&&!p2.mv){p2.ln++;p2.mv=1;}
    if(!wasd.a.isDown&&!wasd.d.isDown)p2.mv=0;
    if(Phaser.Input.Keyboard.JustDown(wasd.w)&&!p2.j){p2.vy=-12;p2.j=1;tone(300,80);}
    upd(p2);
  }

  // Check end
  if(p1.d&&(!p2||p2.d)){
    go=1;
    if(!p2)win='';
    else if(p1.d&&p2.d){
      if(p1.sc>p2.sc)win='P1';
      else if(p2.sc>p1.sc)win='P2';
      else if(p1.c>p2.c)win='P1';
      else if(p2.c>p1.c)win='P2';
      else win='DRAW';
    }else if(p1.d)win='P2';
    else win='P1';
  }

  draw();
}

function upd(p){
  if(p.d)return;

  // Lane position
  const lx=p.cx-LW+p.ln*LW;
  p.x+=(lx-p.x)*0.2;

  // Gravity
  p.vy+=0.6;
  p.y+=p.vy;
  if(p.y>=H-80){p.y=H-80;p.vy=0;p.j=0;}

  // Portal collision
  for(let pt of pts){
    if(pt.h)continue;
    const px=p.cx-LW+pt.ln*LW;
    if(Math.abs(p.x-px)<PW/2&&Math.abs(p.y-pt.y)<40){
      if(p.ln===pt.ln){
        const dst=Math.abs(p.y-pt.y);
        if(dst<15){p.sc+=100;p.c++;tone(600,80);this.cameras.main.flash(100,255,255,255);}
        else{p.sc+=50;p.c++;}
        pt.h=1;
      }else{
        p.d=1;this.cameras.main.shake(200,0.01);tone(150,200);
      }
    }
  }
}

function draw(){
  g.clear();

  // Lanes P1
  const cx1=p1.cx;
  for(let i=0;i<LANES;i++){
    g.lineStyle(2,0x333);
    const lx=cx1-LW+i*LW;
    g.strokeRect(lx-PW/2,0,PW,H);
  }

  // Lanes P2
  if(p2){
    const cx2=p2.cx;
    for(let i=0;i<LANES;i++){
      g.lineStyle(2,0x333);
      const lx=cx2-LW+i*LW;
      g.strokeRect(lx-PW/2,0,PW,H);
    }
    g.lineStyle(3,0xffff00);
    g.lineBetween(W/2,0,W/2,H);
  }

  // Portals P1
  for(let pt of pts){
    const px=cx1-LW+pt.ln*LW;
    g.lineStyle(4,pt.h?0x00ff00:0x00ffff);
    g.strokeCircle(px,pt.y,PW/2-5);
    g.lineStyle(2,pt.h?0x00ff00:0x00ffff);
    g.strokeCircle(px,pt.y,PW/2-15);
  }

  // Portals P2
  if(p2){
    const cx2=p2.cx;
    for(let pt of pts){
      const px=cx2-LW+pt.ln*LW;
      g.lineStyle(4,pt.h?0x00ff00:0xff9900);
      g.strokeCircle(px,pt.y,PW/2-5);
      g.lineStyle(2,pt.h?0x00ff00:0xff9900);
      g.strokeCircle(px,pt.y,PW/2-15);
    }
  }

  // Player P1
  g.fillStyle(p1.d?0x444:0x0099ff);
  g.fillCircle(p1.x,p1.y,20);
  g.lineStyle(2,0xffffff);
  g.strokeCircle(p1.x,p1.y,20);

  // Player P2
  if(p2){
    g.fillStyle(p2.d?0x444:0xff6600);
    g.fillCircle(p2.x,p2.y,20);
    g.lineStyle(2,0xffffff);
    g.strokeCircle(p2.x,p2.y,20);
  }

  // UI
  if(p2){
    txt.setText(`P1: ${p1.sc} x${p1.c}    P2: ${p2.sc} x${p2.c}`);
  }else{
    txt.setText(`Score: ${p1.sc}  Combo: x${p1.c}`);
  }

  if(go){
    g.fillStyle(0x000000,0.7);
    g.fillRect(0,0,W,H);
    const msg=p2?`WIN: ${win}`:'GAME OVER';
    this.add.text(W/2,H/2-40,msg,{fontSize:'48px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
    this.add.text(W/2,H/2+20,'SPACE: Restart  T: Toggle Mode',{fontSize:'20px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  }
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
