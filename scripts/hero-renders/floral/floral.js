// Floral renderer, lifted from the Aethereal Glitch Flora generator (canvas port of make_cards.py).
// render(canvas, cfg, width): cfg.ratio = height/width (default 5/7).
(function(){
"use strict";
/* ───────── palettes ───────── */
const PALS={
  glacier:{bg:['#06182e','#1c7c94'],petal:['#7fe6ff','#dff8ff','#2fb7d8','#5aa9ff','#aef2e8'],core:'#ffffff',stem:'#2a8f8a',stamen:'#f4f1c8',def:{n:5,ls:1.6,bl:3.5,dots:1,motion:0,bokeh:0}},
  nightbloom:{bg:['#0b1814','#16302a'],petal:['#0d4fd0','#1a6bff','#0a2a78','#3a8dff','#0a3aa8'],core:'#ff9a4a',stem:'#0a1a12',stamen:'#ffb060',bk:['#ff7a2a','#ffb04a','#ff5a1a','#e8c070'],def:{n:6,ls:1.9,bl:16,dots:0,motion:1,bokeh:1}},
  pastel:{bg:['#8aa0e0','#c79bb6'],petal:['#e9a0b0','#f4c47a','#7d8de0','#f3a37a','#a9a0e8'],core:'#fff3a8',stem:'#c9a14a',stamen:'#f6b43a',def:{n:9,ls:1,bl:2.2,dots:0,motion:0,bokeh:0}},
  solar:{bg:['#7d9be8','#a45a8a'],petal:['#ff4a1c','#ff8a4a','#d8302a','#9a2f8a','#ffb08a'],core:'#ffd9c0',stem:'#ff5a2a',stamen:'#ffe0a0',def:{n:9,ls:1,bl:2.2,dots:0,motion:0,bokeh:0}},
  poppy:{bg:['#7aa0e0','#6e80c2'],petal:['#e2361e','#e8602c','#d8301f','#f07a44','#e84a24'],core:'#c9182c',shadow:'#6a1f6a',tip:['#fbe3c4','#d9e6ee','#ffd2b8','#c6d4f6'],stem:'#e8502a',stamen:'#ffd9a8',def:{n:8,ls:1.15,bl:2.4,dots:0,motion:0,bokeh:0,smear:6,fiber:.3,ascii:.35,kind:'fan'}},
  peony:{bg:['#2a6a60','#86d4bc'],petal:['#f0549c','#ff8fc0','#e0408a','#ff6aa8','#ffa8cc'],core:'#a01e68',shadow:'#4a1250',tip:['#fff0f6','#ffd6e8','#f2f7ee','#ffe4ee'],stem:'#2a7a58',stamen:'#fff3a8',def:{n:8,ls:1.15,bl:2.4,dots:0,motion:0,bokeh:0,smear:6,fiber:.28,ascii:.35,kind:'fan'}},
  azure:{bg:['#b4b2a6','#6b786a'],petal:['#1d56d6','#3fa0d8','#b9dff2','#2a7d7a','#2f6fe0'],core:'#eaf6ff',stem:'#5b7a55',stamen:'#efe6c0',def:{n:8,ls:1,bl:2.2,dots:0,motion:0,bokeh:0}},
  ember:{bg:['#c2a995','#26301f'],petal:['#0d4fd0','#1a2f66','#e0733a','#2f8fd0','#0a3aa8'],core:'#e9a56a',stem:'#2a3a22',stamen:'#f0b070',def:{n:8,ls:1,bl:2.2,dots:0,motion:0,bokeh:0}}
};
const KINDS={
  tear:{name:'Teardrop',desc:'Kelopak lonjong terpisah, tersebar acak.',L:[.18,.42],w:[.25,.5],m:1},
  poppy:{name:'Poppy',desc:'5 kelopak lebar membulat dalam satu bunga.',L:[.16,.26],w:[.45,.6],m:5},
  daisy:{name:'Daisy',desc:'16 kelopak tipis memancar seperti bintang.',L:[.12,.2],w:[.09,.09],m:16},
  lily:{name:'Lily',desc:'6 kelopak runcing yang melebar di tengah.',L:[.2,.32],w:[.28,.28],m:6},
  fan:{name:'Fan Poppy',desc:'Kelopak tinggi berserat yang mengipas ke atas dari bawah gambar. Gaya kartu poppy merah.',L:[.3,.5],w:[.3,.4],m:5},
  ruffle:{name:'Ruffle Poppy',desc:'7 kelopak raksasa bertumpuk dengan tepi bergelombang. Gaya kartu poppy merah.',L:[.26,.42],w:[.38,.5],m:7}
};
const SL={
  sliders:[['n','Jumlah',1,14,1],['ls','Ukuran',.5,2.2,.05],['bl','Blur',0,20,.5],['glitch','Glitch',0,24,1],['smear','Smear vertikal',0,30,1],['fiber','Serat kelopak',0,.6,.02],['ascii','ASCII',0,2,.05]],
  harmSliders:[['hbase','Hue dasar',0,360,1],['hbg','Latar terang',5,75,1],['hsat','Saturasi',20,100,1]],
  gradeSliders:[['hue','Geser hue',-180,180,1],['sat','Saturasi',0,2,.05],['bri','Kecerahan',-60,60,1],['con','Kontras',.5,1.6,.05],['tmp','Suhu',-60,60,1],['ang','Sudut latar',0,360,1]]
};
const SLIDERS=[].concat(SL.sliders,SL.harmSliders,SL.gradeSliders);
const SCHEMES={analog:[0,28,-28,56,-56],compl:[0,14,180,194,-14],triad:[0,120,240,24,144],split:[0,150,210,22,-22]};
const SCHEME_NAMES={analog:'Analog',compl:'Komplementer',triad:'Triadik',split:'Split'};
function hsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};return '#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}
function genHarm(c){const o=SCHEMES[c.scheme],b=c.hbase,s=c.hsat,L=c.hbg;
  return{bg:[hsl(b+o[2]*.3,Math.min(60,s*.7),L),hsl(b+o[1]*.6,Math.min(70,s*.8),Math.min(80,L+22))],
    petal:o.map((d,i)=>hsl(b+d,s,[55,70,48,62,40][i])),core:hsl(b+o[3],40,92),stem:hsl(b+o[4],45,32),stamen:hsl(b+o[3],85,70),
    bk:[hsl(b+o[2],85,58),hsl(b+o[1],80,66)]}}
function grade(px,c){
  if(!c.hue&&c.sat===1&&!c.bri&&c.con===1&&!c.tmp)return;
  const a=c.hue*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
  const m=[.213+cs*.787-sn*.213,.715-cs*.715-sn*.715,.072-cs*.072+sn*.928,
           .213-cs*.213+sn*.143,.715+cs*.285+sn*.140,.072-cs*.072-sn*.283,
           .213-cs*.213-sn*.787,.715-cs*.715+sn*.715,.072+cs*.928+sn*.072];
  for(let i=0;i<px.length;i+=3){
    const r=px[i],g=px[i+1],b=px[i+2];
    let R=m[0]*r+m[1]*g+m[2]*b,G=m[3]*r+m[4]*g+m[5]*b,B=m[6]*r+m[7]*g+m[8]*b;
    const l=.299*R+.587*G+.114*B;
    R=l+(R-l)*c.sat;G=l+(G-l)*c.sat;B=l+(B-l)*c.sat;
    R+=c.tmp*.6;B-=c.tmp*.6;
    px[i]=(R-128)*c.con+128+c.bri;px[i+1]=(G-128)*c.con+128+c.bri;px[i+2]=(B-128)*c.con+128+c.bri;
  }
}
const GL='XHMS#8I40/_';
const hex=h=>{h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

function putPx(ctx,px,W,H){const id=ctx.createImageData(W,H),d=id.data;for(let i=0,j=0;i<W*H;i++,j+=3){d[i*4]=px[j];d[i*4+1]=px[j+1];d[i*4+2]=px[j+2];d[i*4+3]=255}ctx.putImageData(id,0,0)}
function getPx(ctx,px,W,H){const d=ctx.getImageData(0,0,W,H).data;for(let i=0,j=0;i<W*H;i++,j+=3){px[j]=d[i*4];px[j+1]=d[i*4+1];px[j+2]=d[i*4+2]}}

function boxBlur(src,W,H,r){
  if(r<1)return;
  const tmp=new Float32Array(src.length),n=2*r+1,W3=W*3;
  for(let pass=0;pass<3;pass++){
    for(let y=0;y<H;y++)for(let c=0;c<3;c++){
      const row=y*W3+c;let sum=0;
      for(let x=-r;x<=r;x++)sum+=src[row+clamp(x,0,W-1)*3];
      for(let x=0;x<W;x++){tmp[row+x*3]=sum/n;sum+=src[row+Math.min(W-1,x+r+1)*3]-src[row+Math.max(0,x-r)*3]}
    }
    for(let x=0;x<W;x++)for(let c=0;c<3;c++){
      const col=x*3+c;let sum=0;
      for(let y=-r;y<=r;y++)sum+=tmp[clamp(y,0,H-1)*W3+col];
      for(let y=0;y<H;y++){src[y*W3+col]=sum/n;sum+=tmp[Math.min(H-1,y+r+1)*W3+col]-tmp[Math.max(0,y-r)*W3+col]}
    }
  }
}

function hwFn(kind,t,wd){
  if(t<=0||t>=1)return 0;
  const S=Math.sin(Math.PI*t);
  if(kind==='tear')return wd*Math.pow(S,.7)*(.6+.6*t);
  if(kind==='poppy'){const q=2*Math.pow(t,.8)-1;return wd*Math.sqrt(Math.max(0,1-q*q))}
  if(kind==='daisy')return wd*Math.pow(S,.5);
  if(kind==='fan'){const q=2*Math.pow(t,1.6)-1;return wd*Math.sqrt(Math.max(0,1-q*q))*(1+.1*Math.sin(t*15))}
  if(kind==='ruffle'){const q=2*Math.pow(t,.7)-1;return wd*Math.sqrt(Math.max(0,1-q*q))*(1+.12*Math.sin(t*17))}
  return wd*Math.pow(S,.9)*(.4+.8*t);
}

/* ───────── the renderer ───────── */
function render(cv,cfg,W){
  const H=Math.round(W*(cfg.ratio||5/7)),s=W/1680;
  cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  const P=cfg.col,K=KINDS[cfg.kind],r=mulberry(cfg.seed);
  const rnd=(a,b)=>a+(b-a)*r(),pick=a=>a[Math.floor(r()*a.length)];
  const px=new Float32Array(W*H*3);
  // 01 background
  const c0=hex(P.bg[0]),c1=hex(P.bg[1]);
  const ca=Math.cos(cfg.ang*Math.PI/180),sa=Math.sin(cfg.ang*Math.PI/180),nrm=Math.abs(ca)+Math.abs(sa)||1;
  for(let y=0,i=0;y<H;y++)for(let x=0;x<W;x++,i+=3){const t=((x/W-.5)*ca+(y/H-.5)*sa)/nrm+.5;px[i]=c0[0]*(1-t)+c1[0]*t;px[i+1]=c0[1]*(1-t)+c1[1]*t;px[i+2]=c0[2]*(1-t)+c1[2]*t}
  putPx(ctx,px,W,H);
  // stems
  ctx.lineCap='round';
  for(let k=0;k<4;k++){
    const x0=rnd(.1,.9)*W;
    ctx.strokeStyle='rgba('+hex(P.stem).join(',')+',.75)';ctx.lineWidth=Math.max(1.5,rnd(8,16)*s);
    ctx.beginPath();ctx.moveTo(x0,H+20*s);
    ctx.bezierCurveTo(x0+rnd(-200,200)*s,H*.65,x0+rnd(-300,300)*s,H*.35,rnd(0,W),rnd(0,H*.5));ctx.stroke();
  }
  getPx(ctx,px,W,H);
  // 02 petals
  const fan=cfg.kind==='fan',nf=K.m===1?cfg.n:Math.max(2,Math.round(cfg.n/(fan?2:3))),centres=[],core=hex(P.core);
  const shadow=P.shadow?hex(P.shadow):null,tips=P.tip&&P.tip.length?P.tip.map(hex):null,fiber=cfg.fiber||0;
  const tr=mulberry(cfg.seed^0xabcdef),nz=new Float32Array(256).map(()=>tr()*2-1);
  const n1=x=>{const i=Math.floor(x),f0=x-i,f=f0*f0*(3-2*f0);return nz[i&255]*(1-f)+nz[(i+1)&255]*f};
  const ss=(a,b,x)=>{const z=clamp((x-a)/(b-a),0,1);return z*z*(3-2*z)};
  for(let f=0;f<nf;f++){
    const cx=rnd(.1,.9)*W,cy=(fan?rnd(.8,1.05):rnd(.05,.95))*H,base=rnd(0,Math.PI*2),fcol=pick(P.petal),spread=rnd(1.1,1.7);
    const order=[...Array(K.m).keys()];
    if(fan)order.sort((a,b)=>Math.abs(b-(K.m-1)/2)-Math.abs(a-(K.m-1)/2));
    for(const i of order){
      const th=fan?-Math.PI/2+(i/(K.m-1)-.5)*spread+rnd(-.1,.1):base+i*2*Math.PI/K.m+(K.m>1?rnd(-.12,.12):0);
      const L=rnd(K.L[0],K.L[1])*1680*cfg.ls*s,wd=L*rnd(K.w[0],K.w[1]),soft=(18+.12*wd/s)*s;
      const col=hex((K.m===1||fan)?pick(P.petal):fcol),tcol=tips?pick(tips):null,alpha=rnd(fan?.8:.65,fan?1:.95),ct=Math.cos(th),st=Math.sin(th);
      const x0=Math.max(0,Math.floor(cx-L-soft)),x1=Math.min(W-1,Math.ceil(cx+L+soft));
      const y0=Math.max(0,Math.floor(cy-L-soft)),y1=Math.min(H-1,Math.ceil(cy+L+soft));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx=x-cx,dy=y-cy,u=dx*ct+dy*st,v=-dx*st+dy*ct,tt=u/L;
        if(tt<=0||tt>=1)continue;
        const hw=hwFn(cfg.kind,tt,wd),m=clamp((hw-Math.abs(v))/soft,0,1);
        if(m<=0)continue;
        const k=Math.pow(clamp(1-tt*1.3,0,1),1.5),a=m*alpha,j=(y*W+x)*3;
        let cr=col[0]*(1-k)+core[0]*k,cg=col[1]*(1-k)+core[1]*k,cb=col[2]*(1-k)+core[2]*k;
        if(tcol){const tk=ss(.68,1,tt)*.7;cr=cr*(1-tk)+tcol[0]*tk;cg=cg*(1-tk)+tcol[1]*tk;cb=cb*(1-tk)+tcol[2]*tk}
        if(shadow){const sk=Math.pow(clamp(1-tt*3.2,0,1),2)*.75;cr=cr*(1-sk)+shadow[0]*sk;cg=cg*(1-sk)+shadow[1]*sk;cb=cb*(1-sk)+shadow[2]*sk}
        let shade;
        if(fiber){const ang=Math.atan2(v,u);shade=1+fiber*(n1(ang*70)*.7+n1(ang*160+7)*.3)}
        else shade=1+.12*Math.sin(v/(hw+8*s)*5);
        px[j]=px[j]*(1-a)+cr*shade*a;px[j+1]=px[j+1]*(1-a)+cg*shade*a;px[j+2]=px[j+2]*(1-a)+cb*shade*a;
      }
      centres.push([cx,cy,th]);
    }
  }
  putPx(ctx,px,W,H);
  // 03 stamens
  const sc='rgba('+hex(P.stamen).join(',')+',.9)',pool=centres.slice().sort(()=>r()-.5).slice(0,Math.min(4,centres.length));
  ctx.strokeStyle=sc;ctx.fillStyle=sc;ctx.lineWidth=Math.max(1,3*s*1.4);
  for(const [cx,cy,th] of pool)for(let k=0;k<16;k++){
    const a0=th+rnd(-.7,.7),ln=rnd(90,260)*s,mx=cx+Math.cos(a0)*ln*.5+rnd(-20,20)*s,my=cy+Math.sin(a0)*ln*.5+rnd(-20,20)*s,ex=cx+Math.cos(a0)*ln,ey=cy+Math.sin(a0)*ln;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
    ctx.beginPath();ctx.arc(ex,ey,Math.max(1.5,7*s),0,7);ctx.fill();
  }
  if(cfg.bokeh){
    const bk=P.bk&&P.bk.length?P.bk:P.petal;
    for(let k=0;k<7;k++){
      const R=rnd(40,130)*s*1.6,x=rnd(0,W),y=rnd(0,H),c=hex(pick(bk)),al=rnd(.3,.6);
      const g=ctx.createRadialGradient(x,y,0,x,y,R);
      g.addColorStop(0,'rgba('+c.join(',')+','+al+')');g.addColorStop(.6,'rgba('+c.join(',')+','+al*.6+')');g.addColorStop(1,'rgba('+c.join(',')+',0)');
      ctx.fillStyle=g;ctx.fillRect(x-R,y-R,R*2,R*2);
    }
  }
  getPx(ctx,px,W,H);
  // 04 blur / motion / grain
  if(cfg.bl>0)boxBlur(px,W,H,Math.max(1,Math.round(cfg.bl*s*1.2)));
  if(cfg.motion){
    const y0=Math.floor(H*.3),y1=Math.floor(H*.75),kk=Math.max(2,Math.round(60*s)),step=Math.max(1,Math.round(6*s)),row=new Float32Array(W*3);
    for(let y=y0;y<y1;y++){
      const o=y*W*3;row.set(px.subarray(o,o+W*3));
      for(let x=0;x<W;x++)for(let c=0;c<3;c++){let sum=0,n=0;for(let k=-kk;k<=kk;k+=step){sum+=row[clamp(x+k,0,W-1)*3+c];n++}px[o+x*3+c]=sum/n}
    }
  }
  const gr=mulberry(cfg.seed^0x5bd1e995);   // grain punya rng sendiri, supaya layout tidak bergeser antar resolusi
  for(let i=0;i<px.length;i+=3){const g=(gr()+gr()+gr()-1.5)*9;px[i]+=g;px[i+1]+=g;px[i+2]+=g}
  grade(px,cfg);
  let mean=[0,0,0];
  for(let i=0;i<px.length;i+=3){mean[0]+=px[i];mean[1]+=px[i+1];mean[2]+=px[i+2]}
  mean=mean.map(v=>clamp(v/(W*H)*.3,0,255));
  if(cfg.dots){
    const sp=Math.max(3,Math.round(7*s*1.5));
    putPx(ctx,px,W,H);const d=ctx.getImageData(0,0,W,H).data;
    ctx.fillStyle='rgb('+mean.map(Math.round).join(',')+')';ctx.fillRect(0,0,W,H);
    for(let j=0,yy=0;yy<H;yy+=sp,j++)for(let xx=0;xx<W;xx+=sp){
      const x2=xx+(j%2?sp>>1:0);if(x2>=W)continue;const i=(yy*W+x2)*4;
      ctx.fillStyle='rgb('+d[i]+','+d[i+1]+','+d[i+2]+')';ctx.beginPath();ctx.arc(x2,yy,sp*.5,0,7);ctx.fill();
    }
  }else putPx(ctx,px,W,H);
  // 05 glitch
  ctx.imageSmoothingEnabled=false;
  for(let q2=0;q2<cfg.smear;q2++){const w=Math.max(6,rnd(60,260)*s),h=Math.max(10,rnd(150,520)*s),x=Math.floor(rnd(0,W-w)),y=Math.floor(rnd(0,H-h));ctx.drawImage(cv,x,y,w,1,x,y,w,h)}
  for(let k=0;k<cfg.glitch;k++){
    const w=Math.max(8,rnd(140,640)*s),h=Math.max(3,rnd(28,130)*s),x=Math.floor(rnd(0,W-w)),y=Math.floor(rnd(0,H-h)),q=r();
    if(q<.45){const sx=Math.floor(x+rnd(0,w-1));ctx.drawImage(cv,sx,y,1,h,x,y,w,h)}
    else if(q<.75){const sw=Math.max(2,Math.round(pick([10,14,20])*s)),jr=mulberry(cfg.seed*31+k);for(let i=0;i<w;i+=sw){const sx=clamp(Math.round(x+i+(jr()*12-6)*s),0,W-1);ctx.drawImage(cv,sx,y,1,h,x+i,y,Math.min(sw,w-i),h)}}
    else{const sx=clamp(x+Math.round(rnd(-200,200)*s),0,W-w);ctx.drawImage(cv,sx,y,w,h,x,y,w,h)}
  }
  ctx.imageSmoothingEnabled=true;
  // 06 ascii
  const CW=Math.max(6,Math.round(34*s)),CH=Math.max(9,Math.round(50*s)),cols=Math.floor(W/CW),rows=Math.floor(H/CH),cells=new Map();
  const put=(c,rw,ch)=>{if(c>=0&&c<cols&&rw>=0&&rw<rows)cells.set(c+','+rw,[c,rw,ch])};
  const A=cfg.ascii;
  for(let k=0;k<Math.round(8*A);k++){const c0=Math.floor(rnd(0,cols)),r0=Math.floor(rnd(0,rows)),w=Math.floor(rnd(4,15)),h=Math.floor(rnd(2,6)),dn=rnd(.4,.75);
    for(let i=0;i<w;i++)for(let j=0;j<h;j++)if(r()<dn)put(c0+i,r0+j,pick(GL))}
  for(let k=0;k<Math.round(10*A);k++){const c0=Math.floor(rnd(0,cols)),r0=Math.floor(rnd(0,rows)),h=Math.floor(rnd(2,7));for(let j=0;j<h;j++)put(c0,r0+j,pick(GL))}
  for(let k=0;k<Math.round(40*A);k++)put(Math.floor(rnd(0,cols)),Math.floor(rnd(0,rows)),pick(GL));
  ctx.font='700 '+CH*.98+'px "JetBrains Mono",ui-monospace,monospace';ctx.textBaseline='top';
  ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=Math.max(1,4*s);ctx.fillStyle='rgba(255,255,255,.96)';
  for(const [c,rw,ch] of cells.values())ctx.fillText(ch,c*CW+1,rw*CH+1);
  ctx.shadowBlur=0;
}
window.__floral={PALS,KINDS,genHarm,render,SCHEMES};
})();
