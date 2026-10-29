document.addEventListener('DOMContentLoaded', () => {
 const route=location.pathname, required={'/daily':1,'/yesno':1,'/three':3,'/five':5}[route];
 if(!required)return;
 const form=document.querySelector('main form[method="POST"]');
 if(!form)return;
 // The result page already has its own flip/reveal animation; don't change it.
 const isResult=Boolean(document.querySelector('.daily-reveal,.yesno-reveal,.three-combined-reading,.five-reading-reveal'));
 if(isResult){
   const btn=form.querySelector('button[type="submit"]');
   if(btn){btn.type='button';btn.textContent='重新洗牌';btn.onclick=()=>location.assign(route);}
   return;
 }
 document.body.classList.add('fan-active');
 // Older three-card template accidentally has two forms. Hide the duplicate.
 const forms=[...document.querySelectorAll('main form[method="POST"]')];
 for(const f of forms.slice(1))f.style.display='none';
 const oldButton=form.querySelector('button[type="submit"]');
 if(oldButton)oldButton.style.display='none';
 const panel=document.createElement('section');panel.className='fan-panel';
 panel.innerHTML=`<div class="fan-eyebrow">MYSTIC LENORMAND · THE RITUAL</div><h2 class="fan-title">靜心洗牌</h2><p class="fan-subtitle">輕觸並按住桌面，讓卡牌隨心流轉。放開即停，節奏由你掌握。</p><div class="fan-table" role="button" tabindex="0" aria-label="按住桌面自由洗牌"><div class="fan-scatter" aria-hidden="true"></div><div class="fan-table-hint" aria-hidden="true">✦ &nbsp; 按住桌面，自由洗牌 &nbsp; ✦</div></div><div class="fan-deck" aria-label="從三十六張卡牌中自行選牌"></div><div class="fan-selected" aria-live="polite"></div><p class="fan-status" role="status">請按住桌面開始洗牌。</p><div class="fan-controls"><button type="button" class="draw-button fan-hold">按住洗牌 · HOLD</button><button type="button" class="draw-button fan-done" disabled>完成洗牌 · CONTINUE</button><button type="button" class="fan-reset" hidden>重新洗牌</button></div>`;
 if(route==='/yesno'){
   const input=form.querySelector('input[name="question"]');
   if(input)input.insertAdjacentElement('afterend',panel);
   else form.prepend(panel);
 }else form.parentNode.insertBefore(panel,form);
 const table=panel.querySelector('.fan-table'),scatter=panel.querySelector('.fan-scatter'),deck=panel.querySelector('.fan-deck'),slots=panel.querySelector('.fan-selected');
 const hold=panel.querySelector('.fan-hold'),done=panel.querySelector('.fan-done'),reset=panel.querySelector('.fan-reset'),status=panel.querySelector('.fan-status');
 const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const positions=route==='/three'?['過去','現在','未來']:route==='/five'?['起因','影響','核心','發展','結果']:['你的選牌'];
 const cards=[];let running=false,ever=false,complete=false,raf=0,last=0,selected=[],submitting=false;
 // 每張牌具有位置、速度與旋轉慣性；洗牌不是逐幀亂數跳躍。
 const pointer={x:0,y:0,px:0,py:0,dx:0,dy:0,active:false,inside:false};
 let cooling=false,energy=0;
 const dims=()=>({w:scatter.clientWidth,h:scatter.clientHeight});
 function render(c){c.el.style.transform=`translate3d(${c.x}px,${c.y}px,0) translate(-50%,-50%) rotate(${c.a}deg)`;}
 function populate(){
  const {w,h}=dims(),cols=9,rows=4;
  // 桌面上的 36 張牌形成寬幅、錯列的混洗區，不再集中成一團。
  const spreadX=Math.max(0,w-154),spreadY=Math.max(0,h-148);
  for(let i=0;i<36;i++){
   const el=document.createElement('div');el.className='fan-card';el.style.zIndex=i;scatter.append(el);
   const col=i%cols,row=Math.floor(i/cols);
   const offset=(row%2 ? .36 : -.36);
   const c={el,x:w/2+(col-(cols-1)/2+offset)*spreadX/(cols-1)+rand(-13,13),
    y:h/2+(row-(rows-1)/2)*spreadY/(rows-1)+rand(-12,12),
    a:rand(-18,18),vx:0,vy:0,va:0,mass:rand(.85,1.2)};
   cards.push(c);render(c);
  }
 }
 populate();
 const speedLimit=(v,max)=>clamp(v,-max,max);
 function tick(t){
  const dt=clamp((t-last)/16.7||1,.5,1.8);last=t;
  const {w,h}=dims();
  const active=running,decay=active?.974:.91;
  if(active)energy=Math.min(1,energy+.045);else energy*=.90;
  // 緩慢旋流：鄰近卡牌同向流動，避免各張卡牌毫無關聯地亂飄。
  const time=t*.00055;
  for(let i=0;i<cards.length;i++){
   const c=cards[i];
   const ox=c.x-w/2,oy=c.y-h/2;
   const radius=Math.max(90,Math.hypot(ox,oy));
   if(active){
    const phase=time+i*.12;
    const swirl=.12*Math.sin(phase)+.19;
    c.vx+=(-oy/radius*swirl + Math.sin(phase*1.3)*.065 - ox*.00042)*dt;
    c.vy+=(ox/radius*swirl + Math.cos(phase*.95)*.055 - oy*.00048)*dt;
    // 指尖拖曳附近牌群：施加方向性的力，並帶動相鄰卡牌。
    if(pointer.active){
     const d=Math.hypot(c.x-pointer.x,c.y-pointer.y);
     if(d<205){const falloff=(1-d/205)**1.4;
      c.vx+=pointer.dx*.36*falloff/c.mass;
      c.vy+=pointer.dy*.36*falloff/c.mass;
      c.va+=(pointer.dx*.016-pointer.dy*.012)*falloff;
     }
    }
   }
   c.vx=speedLimit(c.vx*decay,4.4);c.vy=speedLimit(c.vy*decay,4.4);
   c.va=speedLimit(c.va*(active?.94:.85),1.35);
  }
  // 簡易牌與牌的推擠：避免全部擠成同一堆，也保留適度重疊。
  if(active||energy>.015){
   for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    const a=cards[i],b=cards[j],dx=b.x-a.x,dy=b.y-a.y;
    const d2=dx*dx+dy*dy;
    if(d2>1&&d2<43*43){
     const d=Math.sqrt(d2),push=(43-d)*.008;
     const nx=dx/d,ny=dy/d;
     a.vx-=nx*push;a.vy-=ny*push;b.vx+=nx*push;b.vy+=ny*push;
    }
   }
  }
  for(const c of cards){
   c.x+=c.vx*dt;c.y+=c.vy*dt;c.a+=c.va*dt;
   const padX=43,padY=65;
   if(c.x<padX){c.x=padX;c.vx=Math.abs(c.vx)*.4}
   if(c.x>w-padX){c.x=w-padX;c.vx=-Math.abs(c.vx)*.4}
   if(c.y<padY){c.y=padY;c.vy=Math.abs(c.vy)*.4}
   if(c.y>h-padY){c.y=h-padY;c.vy=-Math.abs(c.vy)*.4}
   render(c);
  }
  pointer.dx*=.55;pointer.dy*=.55;
  if(active||energy>.015||cards.some(c=>Math.abs(c.vx)+Math.abs(c.vy)>.055))raf=requestAnimationFrame(tick);
  else {cooling=false;raf=0;status.textContent='可以繼續洗牌，或點選「完成洗牌」。';}
 }
 function start(e){
  if(complete||running)return;
  if(route==='/yesno'&&!form.querySelector('input[name="question"]').reportValidity())return;
  e?.preventDefault();running=true;ever=true;done.disabled=true;table.classList.add('is-running');
  status.textContent='正在混洗中……移動滑鼠或手指，可以推動牌群。';
  if(e?.clientX!==undefined){const r=table.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.px=pointer.x;pointer.py=pointer.y;pointer.active=e.currentTarget===table;}
  for(const c of cards){c.vx+=rand(-.65,.65);c.vy+=rand(-.65,.65);c.va+=rand(-.15,.15)}
  if(!raf){last=0;raf=requestAnimationFrame(tick)}
 }
 function stop(){
  if(!running)return;
  running=false;pointer.active=false;table.classList.remove('is-running');done.disabled=false;
  status.textContent='卡牌正在自然減速……可繼續洗牌或完成洗牌。';
 }
 function move(e){
  if(!running||!pointer.active)return;
  const r=table.getBoundingClientRect();
  const x=clamp(e.clientX-r.left,0,r.width),y=clamp(e.clientY-r.top,0,r.height);
  pointer.dx=speedLimit(x-pointer.px,25);pointer.dy=speedLimit(y-pointer.py,25);
  pointer.x=x;pointer.y=y;pointer.px=x;pointer.py=y;
 }
 table.addEventListener('pointermove',move);
 for(const target of [table,hold]){
  target.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;target.setPointerCapture?.(e.pointerId);start(e)});
  target.addEventListener('pointerup',stop);target.addEventListener('pointercancel',stop);target.addEventListener('lostpointercapture',stop);
  target.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)start(e)});
  target.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')stop()});
 }
 addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 function displaySlots(){slots.innerHTML='';for(let i=0;i<required;i++){
   const slot=document.createElement('div');slot.className='fan-slot'+(i<selected.length?' filled':'');slot.textContent=i<selected.length?`✦ ${positions[i]} · 已選第 ${selected[i]+1} 張`:positions[i];slots.append(slot);
 }}
 function displayFan(){deck.innerHTML='';const width=deck.clientWidth;
  const isSmall=innerWidth<600;const cardWidth=isSmall?53:Math.min(78,Math.max(55,width/14));
  const span=Math.min(width-cardWidth-14,780);const center=width/2;
  for(let i=0;i<36;i++){
   const b=document.createElement('button');b.type='button';b.className='fan-choice';b.setAttribute('aria-label',`選擇第 ${i+1} 張背面卡牌`);
   const x=center-span/2+(i/35)*span-cardWidth/2;
   const r=(i-17.5)*.95;const y=52+Math.pow((i-17.5)/17.5,2)*65;
   b.style.left=`${x}px`;b.style.top=`${y}px`;b.style.transform=`rotate(${r}deg)`;b.style.zIndex=String(i+1);
   b.addEventListener('mouseenter',()=>{if(!b.classList.contains('is-selected'))b.style.transform=`translateY(-20px) rotate(${r}deg)`});
   b.addEventListener('mouseleave',()=>b.style.transform=`rotate(${r}deg)`);
   b.addEventListener('focus',()=>b.style.transform=`translateY(-20px) rotate(${r}deg)`);
   b.addEventListener('blur',()=>b.style.transform=`rotate(${r}deg)`);
   b.addEventListener('click',()=>{
    if(submitting||selected.length>=required||selected.includes(i))return;
    selected.push(i);b.classList.add('is-selected');b.disabled=true;displaySlots();
    if(selected.length===required){panel.classList.add('is-ready');status.textContent='已選好所有卡牌，正在為你翻牌……';submitting=true;reset.disabled=true;setTimeout(submitSelection,650);}
    else status.textContent=`已選 ${selected.length} / ${required} 張，請繼續選牌。`;
   });deck.append(b);
  }
 }
 // 使用同一批 36 張視覺卡牌完成「散牌 → 牌堆 → 扇形」。
 // 所有動作共用一條 Web Animations 時間軸，不再在階段交界 cancel/reflow。
 let transitioning=false;
 done.addEventListener('click',async()=>{
  if(!ever||running||complete||transitioning)return;
  transitioning=true;complete=true;
  cancelAnimationFrame(raf);raf=0;
  done.disabled=true;hold.disabled=true;
  const starts=cards.map(c=>c.el.getBoundingClientRect());
  const tableRect=table.getBoundingClientRect();
  const pileX=tableRect.left+tableRect.width/2;
  const pileY=tableRect.top+tableRect.height/2;
  panel.classList.add('is-transitioning','is-choosing');
  displayFan();
  const choices=[...deck.querySelectorAll('.fan-choice')];
  // 讀取真實終點的 CSS left/top/width/height，而非旋轉後的 bounding box。
  // bounding box 會包含旋轉外擴，直接拿來當 left/top 會造成最後一幀跳動。
  const deckRect=deck.getBoundingClientRect();
  const ends=choices.map(el=>({
   x:deckRect.left+el.offsetLeft,y:deckRect.top+el.offsetTop,
   w:el.offsetWidth,h:el.offsetHeight,
   angle:parseFloat(el.style.transform.match(/rotate\((-?[\d.]+)deg\)/)?.[1]||'0')
  }));
  const layer=document.createElement('div');layer.className='fan-morph-layer';document.body.append(layer);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total=reduce?1:2700;
  const pileAt=.43, spreadAt=.51;
  const clones=starts.map((r,i)=>{
   const clone=document.createElement('div');clone.className='fan-morph-card';
   Object.assign(clone.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:String(i+1)});
   layer.append(clone);return clone;
  });
  status.textContent='✦ 卡牌正在收攏，隨後從牌堆展開……';
  panel.querySelector('.fan-title').textContent='月光儀式 · 收牌與展牌';
  const animations=clones.map((clone,i)=>{
   const r=starts[i],end=ends[i];
   const pw=Math.min(r.width,64),ph=pw*1.5;
   const px=pileX-pw/2+(i%3-1)*.32,py=pileY-ph/2-i*.24;
   const pile=`translate3d(${px-r.left}px,${py-r.top}px,0) scale(${pw/r.width},${ph/r.height}) rotate(0deg)`;
   const finish=`translate3d(${end.x-r.left}px,${end.y-r.top}px,0) scale(${end.w/r.width},${end.h/r.height}) rotate(${end.angle}deg)`;
   // 同一條動畫中設置短暫牌堆停留，完全不重建節點。
   return clone.animate([
    {offset:0,transform:'translate3d(0,0,0) scale(1) rotate(0deg)'},
    {offset:pileAt,transform:pile,easing:'cubic-bezier(.24,.65,.2,1)'},
    {offset:spreadAt,transform:pile,easing:'cubic-bezier(.18,.7,.18,1)'},
    {offset:1,transform:finish}
   ],{duration:total,easing:'linear',fill:'forwards'});
  });
  await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
  // 可點選卡牌已在同一位置準備好，先顯示，再移除視覺替身。
  // 保留一幀重疊，避免因合成層卸載造成閃白。
  panel.classList.remove('is-transitioning');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  layer.remove();
  reset.hidden=false;
  panel.querySelector('.fan-title').textContent='✦ 親自選擇你的卡牌 ✦';
  panel.querySelector('.fan-subtitle').textContent=`從背面朝上的牌中選擇 ${required} 張。`;
  displaySlots();
  status.textContent=`請選擇第 1 / ${required} 張卡牌。`;
 });
 reset.addEventListener('click',()=>location.assign(route));
 function submitSelection(){
  // 只提交使用者選取的扇形位置，後端以 session 中的牌序對應真正的卡牌。
  if(selected.length!==required)return;
  if(route==='/yesno'&&!form.querySelector('input[name="question"]').reportValidity()){
    submitting=false;reset.disabled=false;return;
  }
  let hidden=form.querySelector('input[name="selected_positions"]');
  if(!hidden){hidden=document.createElement('input');hidden.type='hidden';hidden.name='selected_positions';form.append(hidden)}
  hidden.value=selected.join(',');
  form.requestSubmit();
 }
});
