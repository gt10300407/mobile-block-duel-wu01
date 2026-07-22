import {Bag,COLORS,COLS,ROWS,HIDDEN_ROWS,createBoard,makePiece,collides,mergePiece,clearLines,rotateMatrix,scoreFor,attackFor,isPerfectClear,isTSpin,ghostY} from './game-core.js?v=031';
import {classifyGesture,getSwipePreset,resolveAxis,stepsFromDistance} from './input-utils.js?v=031';
import {isSoundSupported,playSound,setSoundEnabled,unlockAudio} from './audio-engine.js?v=031';

const $=s=>document.querySelector(s);
const boardCanvas=$('#board'),ctx=boardCanvas.getContext('2d');
const holdCanvas=$('#hold'),hctx=holdCanvas.getContext('2d');
const nextCanvas=$('#next'),nctx=nextCanvas.getContext('2d');
const wrap=$('#board-wrap');
const SETTINGS_KEY='block-duel-wu031-settings';
const WEB_HAPTIC_SUPPORTED=typeof navigator.vibrate==='function';
const defaults={mode:'buttons',sensitivity:'normal',sound:true,haptic:true,shake:true};
let settings=loadSettings();
if(!WEB_HAPTIC_SUPPORTED)settings.haptic=false;
setSoundEnabled(settings.sound);

const freshState=()=>({
  board:createBoard(),bag:new Bag(),queue:[],piece:null,hold:null,holdUsed:false,
  score:0,lines:0,combo:-1,b2b:0,level:1,attack:0,paused:false,over:false,
  mode:settings.mode,elapsed:0,last:performance.now(),dropAcc:0,dropMs:700,
  lastActionWasRotate:false
});
const state=freshState();

function loadSettings(){try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return {...defaults}}}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function fillQueue(){while(state.queue.length<5)state.queue.push(state.bag.next());}
function spawn(){
  fillQueue();
  state.piece=makePiece(state.queue.shift());
  state.holdUsed=false;
  state.lastActionWasRotate=false;
  fillQueue();
  if(collides(state.board,state.piece)){
    state.over=true;
    showOverlay('게임 오버');
    void playSound('gameOver');
  }
  drawAll();
}
function reset(){Object.assign(state,freshState());hideOverlay();spawn();updateHud();}
function move(dx,dy){
  if(state.paused||state.over)return false;
  if(!collides(state.board,state.piece,dx,dy)){
    state.piece.x+=dx;state.piece.y+=dy;state.lastActionWasRotate=false;drawAll();return true;
  }
  return false;
}
function rotate(){
  if(state.paused||state.over)return;
  const m=rotateMatrix(state.piece.matrix);
  for(const k of [0,-1,1,-2,2]){
    if(!collides(state.board,state.piece,k,0,m)){
      state.piece.matrix=m;
      state.piece.x+=k;
      state.piece.rotation=(state.piece.rotation+1)%4;
      state.lastActionWasRotate=true;
      haptic('light');
      void playSound('rotate');
      drawAll();
      return;
    }
  }
}
function soft(){if(move(0,1)){state.score+=1;updateHud();}else lock();}
function gestureSoftStep(){
  if(move(0,1)){
    state.score+=1;
    updateHud();
    return true;
  }
  return false;
}
function hard(){
  if(state.paused||state.over)return;
  const y=ghostY(state.board,state.piece);
  state.score+=(y-state.piece.y)*2;
  state.piece.y=y;
  state.lastActionWasRotate=false;
  void playSound('hard');
  lock(true);
}
function hold(){
  if(state.paused||state.over||state.holdUsed)return;
  const current=state.piece.type;
  if(state.hold){state.piece=makePiece(state.hold);state.hold=current;}
  else{state.hold=current;fillQueue();state.piece=makePiece(state.queue.shift());fillQueue();}
  state.holdUsed=true;
  state.lastActionWasRotate=false;
  haptic('medium');
  void playSound('hold');
  drawAll();
}
function lock(strong=false){
  const tSpin=isTSpin(state.board,state.piece,state.lastActionWasRotate);
  mergePiece(state.board,state.piece);
  const lines=clearLines(state.board);
  const perfectClear=lines>0&&isPerfectClear(state.board);
  const difficult=tSpin||lines===4;
  const b2bBonus=difficult&&state.b2b>0;
  if(lines>0){
    state.combo++;
    state.score+=scoreFor(lines,state.combo,{tSpin,b2b:b2bBonus,perfectClear,level:state.level});
    state.attack+=attackFor(lines,state.combo,{tSpin,b2b:b2bBonus,perfectClear});
    state.lines+=lines;
    if(difficult)state.b2b++;else state.b2b=0;
    state.level=1+Math.floor(state.lines/10);
    showClearLabel({lines,tSpin,perfectClear,b2b:b2bBonus});
    lineFlash(lines);
    effect(lines>=4||perfectClear?'strong':'small');
    haptic(lines>=4||perfectClear?'heavy':'medium');
    void playSound(perfectClear?'perfect':`line${Math.min(4,lines)}`);
  }else{
    state.combo=-1;
  }
  if(strong){effect('small');haptic('medium');}
  state.dropMs=Math.max(90,700-(state.level-1)*58);
  spawn();
  updateHud();
}
function showClearLabel({lines,tSpin,perfectClear,b2b}){
  const el=$('#combo-pop');
  let title=perfectClear?'PERFECT CLEAR':tSpin?`T-SPIN${lines?` ${lines}`:''}`:lines===4?'QUAD':`${lines} LINE`;
  if(b2b)title=`B2B · ${title}`;
  if(state.combo>0)title+=` · COMBO ×${state.combo}`;
  el.textContent=title;
  setTimeout(()=>{el.textContent='';},850);
}
function lineFlash(lines){
  const el=$('#clear-flash');
  el.style.setProperty('--flash-strength',String(Math.min(1,.32+lines*.14)));
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),180);
}
function effect(level){
  if(!settings.shake)return;
  wrap.classList.remove('shake-small','shake-strong');
  void wrap.offsetWidth;
  wrap.classList.add(level==='strong'?'shake-strong':'shake-small');
  setTimeout(()=>wrap.classList.remove('shake-small','shake-strong'),240);
}
function haptic(level){
  if(!settings.haptic||!WEB_HAPTIC_SUPPORTED)return;
  const pattern={light:12,medium:[18,18,28],heavy:[35,20,60]}[level]||12;
  navigator.vibrate(pattern);
}
function showOverlay(title){$('#overlay-title').textContent=title;$('#overlay').classList.remove('hidden');}
function hideOverlay(){$('#overlay').classList.add('hidden');}
function togglePause(){if(state.over)return;state.paused=!state.paused;state.paused?showOverlay('일시정지'):hideOverlay();}
function updateHud(){
  $('#score').textContent=state.score.toLocaleString();
  $('#lines').textContent=state.lines;
  $('#level').textContent=state.level;
  $('#b2b').textContent=state.b2b;
  $('#time').textContent=`${String(Math.floor(state.elapsed/60)).padStart(2,'0')}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;
}
function drawCell(c,x,y,size,alpha=1,context=ctx){
  context.globalAlpha=alpha;
  context.fillStyle=COLORS[c];
  context.fillRect(x*size+1,y*size+1,size-2,size-2);
  context.fillStyle='rgba(255,255,255,.22)';
  context.fillRect(x*size+2,y*size+2,size-4,2);
  context.globalAlpha=1;
}
function drawBoard(){
  const cell=boardCanvas.width/COLS;
  ctx.clearRect(0,0,boardCanvas.width,boardCanvas.height);
  ctx.fillStyle='#05070b';ctx.fillRect(0,0,boardCanvas.width,boardCanvas.height);
  ctx.strokeStyle='#121727';ctx.lineWidth=1;
  for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,boardCanvas.height);ctx.stroke();}
  for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(boardCanvas.width,y*cell);ctx.stroke();}
  for(let y=HIDDEN_ROWS;y<state.board.length;y++)for(let x=0;x<COLS;x++)if(state.board[y][x])drawCell(state.board[y][x],x,y-HIDDEN_ROWS,cell);
  if(!state.piece)return;
  const gy=ghostY(state.board,state.piece);
  state.piece.matrix.forEach((r,y)=>r.forEach((v,x)=>{if(v&&gy+y>=HIDDEN_ROWS)drawCell(state.piece.type,state.piece.x+x,gy+y-HIDDEN_ROWS,cell,.18);}));
  state.piece.matrix.forEach((r,y)=>r.forEach((v,x)=>{if(v&&state.piece.y+y>=HIDDEN_ROWS)drawCell(state.piece.type,state.piece.x+x,state.piece.y+y-HIDDEN_ROWS,cell);}));
}
function drawPreview(context,canvas,type,slot=0,slotWidth=canvas.width){
  if(!type)return;
  const m=makePiece(type).matrix;
  const size=Math.min(15,Math.floor((slotWidth-8)/Math.max(4,m[0].length)),Math.floor((canvas.height-8)/Math.max(4,m.length)));
  const blockW=m[0].length*size,blockH=m.length*size;
  const ox=slot*slotWidth+(slotWidth-blockW)/2,oy=(canvas.height-blockH)/2;
  m.forEach((r,y)=>r.forEach((v,x)=>{if(v){context.fillStyle=COLORS[type];context.fillRect(ox+x*size+1,oy+y*size+1,size-2,size-2);}}));
}
function drawAll(){
  drawBoard();
  hctx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
  if(state.hold)drawPreview(hctx,holdCanvas,state.hold,0,holdCanvas.width);
  nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  const slot=nextCanvas.width/3;
  state.queue.slice(0,3).forEach((t,i)=>drawPreview(nctx,nextCanvas,t,i,slot));
}
function action(name){({left:()=>move(-1,0),right:()=>move(1,0),soft,rotate,hard,hold}[name]||(()=>{}))();}

const activePresses=new Map();
function stopPress(pointerId){
  const press=activePresses.get(pointerId);if(!press)return;
  clearTimeout(press.delayTimer);clearInterval(press.repeatTimer);
  press.button.classList.remove('is-pressed');activePresses.delete(pointerId);
}
document.querySelectorAll('[data-action]').forEach(btn=>{
  const a=btn.dataset.action;
  btn.addEventListener('pointerdown',e=>{
    e.preventDefault();void unlockAudio();
    btn.setPointerCapture?.(e.pointerId);btn.classList.add('is-pressed');
    action(a);haptic('light');
    const press={button:btn,delayTimer:null,repeatTimer:null};activePresses.set(e.pointerId,press);
    if(['left','right','soft'].includes(a)){
      const delay=a==='soft'?100:145;const interval=a==='soft'?42:58;
      press.delayTimer=setTimeout(()=>{press.repeatTimer=setInterval(()=>action(a),interval);},delay);
    }
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>btn.addEventListener(type,e=>stopPress(e.pointerId)));
});

$('#hold-btn').addEventListener('pointerdown',()=>void unlockAudio(),{passive:true});
$('#hold-btn').addEventListener('click',hold);
$('#pause-btn').addEventListener('click',togglePause);
$('#resume-btn').addEventListener('click',()=>{state.paused=false;hideOverlay();});
$('#restart-btn').addEventListener('click',reset);

function applyMode(mode,{persist=true}={}){
  state.mode=mode==='swipe'?'swipe':'buttons';
  settings.mode=state.mode;
  $('#controls').classList.toggle('hidden',state.mode==='swipe');
  $('#mode-label').textContent=state.mode==='buttons'?'버튼':'스와이프';
  $('#mode-btn').textContent=state.mode==='buttons'?'스와이프 전환':'버튼 전환';
  $('#hint').textContent=state.mode==='buttons'?'버튼 조작':'보드 전체 스와이프';
  $('#mode-select').value=state.mode;
  if(persist)saveSettings();
  refreshLayout();
}
$('#mode-btn').addEventListener('click',()=>applyMode(state.mode==='buttons'?'swipe':'buttons'));

let gesture=null;
wrap.addEventListener('pointerdown',e=>{
  if(state.mode!=='swipe'||state.paused||state.over)return;
  e.preventDefault();void unlockAudio();
  const now=performance.now();
  gesture={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,lastT:now,t:now,moved:false,axis:null,horizontalSteps:0,softSteps:0,peakDownSpeed:0,blockedDown:false};
  wrap.setPointerCapture?.(e.pointerId);
});
wrap.addEventListener('pointermove',e=>{
  if(!gesture||gesture.pointerId!==e.pointerId||state.mode!=='swipe')return;
  e.preventDefault();
  const now=performance.now();
  const segmentDy=e.clientY-gesture.lastY;
  const segmentDt=Math.max(1,now-gesture.lastT);
  if(segmentDy>0)gesture.peakDownSpeed=Math.max(gesture.peakDownSpeed,segmentDy/segmentDt);

  const p=getSwipePreset(settings.sensitivity);
  const totalDx=e.clientX-gesture.startX,totalDy=e.clientY-gesture.startY;
  gesture.axis=resolveAxis(totalDx,totalDy,gesture.axis,p.axisLockPx);
  if(gesture.axis)gesture.moved=true;

  if(gesture.axis==='x'){
    const desired=stepsFromDistance(totalDx,p.stepPx);
    while(gesture.horizontalSteps<desired){move(1,0);gesture.horizontalSteps++;}
    while(gesture.horizontalSteps>desired){move(-1,0);gesture.horizontalSteps--;}
  }else if(gesture.axis==='y'&&totalDy>0){
    const desired=Math.max(0,stepsFromDistance(totalDy,p.stepPx));
    while(gesture.softSteps<desired){
      if(!gestureSoftStep()){gesture.blockedDown=true;break;}
      gesture.softSteps++;
    }
  }

  gesture.lastX=e.clientX;gesture.lastY=e.clientY;gesture.lastT=now;
});
function endGesture(e){
  if(!gesture||gesture.pointerId!==e.pointerId||state.mode!=='swipe')return;
  const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY,dt=performance.now()-gesture.t;
  const result=classifyGesture({dx,dy,dt,moved:gesture.moved,softSteps:gesture.softSteps,peakDownSpeed:gesture.peakDownSpeed},settings.sensitivity);
  if(result==='rotate')rotate();
  else if(result==='hold')hold();
  else if(result==='hard')hard();
  else if(result==='soft'&&gesture.blockedDown)lock();
  gesture=null;
}
wrap.addEventListener('pointerup',endGesture);
wrap.addEventListener('pointercancel',()=>{gesture=null;});

function updatePlatformCapabilities(){
  const hapticToggle=$('#haptic-toggle');
  hapticToggle.disabled=!WEB_HAPTIC_SUPPORTED;
  hapticToggle.checked=settings.haptic&&WEB_HAPTIC_SUPPORTED;
  $('#haptic-label').textContent=WEB_HAPTIC_SUPPORTED?'진동':'진동 (iPhone 웹 미지원)';
  const notes=[];
  if(isSoundSupported())notes.push('효과음은 첫 터치 후 활성화돼.');
  else notes.push('이 브라우저는 효과음을 지원하지 않아.');
  if(!WEB_HAPTIC_SUPPORTED)notes.push('GitHub Pages로 연 iPhone Safari에서는 진동이 안 되고, 추후 설치형 앱에서 지원돼.');
  $('#platform-note').textContent=notes.join(' ');
}
function openSettings(){
  $('#mode-select').value=state.mode;
  $('#sensitivity-select').value=settings.sensitivity;
  $('#sound-toggle').checked=settings.sound;
  $('#shake-toggle').checked=settings.shake;
  updatePlatformCapabilities();
  $('#settings-sheet').classList.remove('hidden');
}
function closeSettings(){$('#settings-sheet').classList.add('hidden');}
$('#settings-btn').addEventListener('click',openSettings);
$('#settings-close').addEventListener('click',closeSettings);
document.querySelector('[data-close-settings]').addEventListener('click',closeSettings);
$('#mode-select').addEventListener('change',e=>applyMode(e.target.value));
$('#sensitivity-select').addEventListener('change',e=>{settings.sensitivity=e.target.value;saveSettings();});
$('#sound-toggle').addEventListener('change',e=>{settings.sound=e.target.checked;setSoundEnabled(settings.sound);saveSettings();if(settings.sound)void playSound('confirm');});
$('#haptic-toggle').addEventListener('change',e=>{settings.haptic=WEB_HAPTIC_SUPPORTED&&e.target.checked;saveSettings();haptic('medium');});
$('#shake-toggle').addEventListener('change',e=>{settings.shake=e.target.checked;saveSettings();if(settings.shake)effect('small');});

function loop(now){
  const dt=Math.min(100,now-state.last);state.last=now;
  if(!state.paused&&!state.over){
    state.elapsed+=dt/1000;state.dropAcc+=dt;
    if(state.dropAcc>=state.dropMs){state.dropAcc=0;if(!move(0,1))lock();}
    updateHud();
  }
  requestAnimationFrame(loop);
}
function updateViewportHeight(){
  const height=window.visualViewport?.height||window.innerHeight;
  document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);
}
function resizeBoard(){
  const stage=$('#game-stage');const r=stage.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const availableWidth=Math.max(0,r.width-4);
  const availableHeight=Math.max(0,r.height-6);
  const tabletLimit=window.innerWidth>=700?420:360;
  const width=Math.max(120,Math.floor(Math.min(availableWidth,availableHeight/2,tabletLimit)));
  wrap.style.width=`${width}px`;wrap.style.height=`${width*2}px`;
}
const resizeObserver=new ResizeObserver(resizeBoard);
resizeObserver.observe($('#game-stage'));
const refreshLayout=()=>{updateViewportHeight();requestAnimationFrame(resizeBoard);};
window.visualViewport?.addEventListener('resize',refreshLayout);
window.visualViewport?.addEventListener('scroll',refreshLayout);
window.addEventListener('orientationchange',()=>setTimeout(refreshLayout,160));
window.addEventListener('resize',refreshLayout);
window.addEventListener('pointerdown',()=>void unlockAudio(),{capture:true,once:true});

updatePlatformCapabilities();
applyMode(settings.mode,{persist:false});
reset();
refreshLayout();
requestAnimationFrame(loop);
