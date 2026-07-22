import {Bag,COLORS,COLS,ROWS,HIDDEN_ROWS,createBoard,makePiece,collides,mergePiece,clearLines,rotateMatrix,scoreFor,ghostY} from './game-core.js';
import {classifyGesture,getSwipePreset,resolveAxis,stepsFromDistance} from './input-utils.js';

const $=s=>document.querySelector(s);
const boardCanvas=$('#board'), ctx=boardCanvas.getContext('2d');
const holdCanvas=$('#hold'), hctx=holdCanvas.getContext('2d');
const nextCanvas=$('#next'), nctx=nextCanvas.getContext('2d');
const wrap=$('#board-wrap');
const SETTINGS_KEY='block-duel-wu02-settings';
const defaults={mode:'buttons',sensitivity:'normal',haptic:true,shake:true};
let settings=loadSettings();
const state={board:createBoard(),bag:new Bag(),queue:[],piece:null,hold:null,holdUsed:false,score:0,lines:0,combo:-1,paused:false,over:false,mode:settings.mode,elapsed:0,last:performance.now(),dropAcc:0,dropMs:700};

function loadSettings(){
  try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}
  catch{return {...defaults};}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function fillQueue(){while(state.queue.length<5)state.queue.push(state.bag.next());}
function spawn(){fillQueue();state.piece=makePiece(state.queue.shift());state.holdUsed=false;fillQueue();if(collides(state.board,state.piece)){state.over=true;showOverlay('게임 오버');}drawAll();}
function reset(){Object.assign(state,{board:createBoard(),bag:new Bag(),queue:[],piece:null,hold:null,holdUsed:false,score:0,lines:0,combo:-1,paused:false,over:false,elapsed:0,last:performance.now(),dropAcc:0,dropMs:700});hideOverlay();spawn();updateHud();}
function move(dx,dy){if(state.paused||state.over)return false;if(!collides(state.board,state.piece,dx,dy)){state.piece.x+=dx;state.piece.y+=dy;drawAll();return true;}return false;}
function rotate(){if(state.paused||state.over)return;const m=rotateMatrix(state.piece.matrix);for(const k of [0,-1,1,-2,2]){if(!collides(state.board,state.piece,k,0,m)){state.piece.matrix=m;state.piece.x+=k;haptic('light');drawAll();return;}}}
function soft(){if(move(0,1)){state.score+=1;updateHud();}else lock();}
function hard(){if(state.paused||state.over)return;const y=ghostY(state.board,state.piece);state.score+=(y-state.piece.y)*2;state.piece.y=y;lock(true);}
function hold(){if(state.paused||state.over||state.holdUsed)return;const current=state.piece.type;if(state.hold){state.piece=makePiece(state.hold);state.hold=current;}else{state.hold=current;fillQueue();state.piece=makePiece(state.queue.shift());fillQueue();}state.holdUsed=true;haptic('medium');drawAll();}
function lock(strong=false){mergePiece(state.board,state.piece);const lines=clearLines(state.board);if(lines>0){state.combo++;state.score+=scoreFor(lines,state.combo);state.lines+=lines;showCombo(lines);effect(lines>=4?'strong':'small');haptic(lines>=4?'heavy':'medium');}else state.combo=-1;if(strong){effect('small');haptic('medium');}state.dropMs=Math.max(120,700-Math.floor(state.lines/10)*55);spawn();updateHud();}
function showCombo(lines){const el=$('#combo-pop');el.textContent=lines===4?'4 LINE!':state.combo>0?`COMBO ×${state.combo}`:`${lines} LINE`;setTimeout(()=>{el.textContent='';},550);}
function effect(level){if(!settings.shake)return;wrap.classList.remove('shake-small','shake-strong');void wrap.offsetWidth;wrap.classList.add(level==='strong'?'shake-strong':'shake-small');setTimeout(()=>wrap.classList.remove('shake-small','shake-strong'),200);}
function haptic(level){if(!settings.haptic)return;const ms={light:10,medium:25,heavy:55}[level]||10;if(navigator.vibrate)navigator.vibrate(ms);}
function showOverlay(title){$('#overlay-title').textContent=title;$('#overlay').classList.remove('hidden');}
function hideOverlay(){$('#overlay').classList.add('hidden');}
function togglePause(){if(state.over)return;state.paused=!state.paused;state.paused?showOverlay('일시정지'):hideOverlay();}
function updateHud(){$('#score').textContent=state.score.toLocaleString();$('#lines').textContent=state.lines;$('#combo').textContent=Math.max(0,state.combo);$('#time').textContent=`${String(Math.floor(state.elapsed/60)).padStart(2,'0')}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;}
function drawCell(c,x,y,size,alpha=1,context=ctx){context.globalAlpha=alpha;context.fillStyle=COLORS[c];context.fillRect(x*size+1,y*size+1,size-2,size-2);context.fillStyle='rgba(255,255,255,.22)';context.fillRect(x*size+2,y*size+2,size-4,2);context.globalAlpha=1;}
function drawBoard(){const cell=boardCanvas.width/COLS;ctx.clearRect(0,0,boardCanvas.width,boardCanvas.height);ctx.fillStyle='#05070b';ctx.fillRect(0,0,boardCanvas.width,boardCanvas.height);ctx.strokeStyle='#121727';ctx.lineWidth=1;for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,boardCanvas.height);ctx.stroke();}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(boardCanvas.width,y*cell);ctx.stroke();}
  for(let y=HIDDEN_ROWS;y<state.board.length;y++)for(let x=0;x<COLS;x++)if(state.board[y][x])drawCell(state.board[y][x],x,y-HIDDEN_ROWS,cell);
  if(!state.piece)return;const gy=ghostY(state.board,state.piece);state.piece.matrix.forEach((r,y)=>r.forEach((v,x)=>{if(v&&gy+y>=HIDDEN_ROWS)drawCell(state.piece.type,state.piece.x+x,gy+y-HIDDEN_ROWS,cell,.18);}));state.piece.matrix.forEach((r,y)=>r.forEach((v,x)=>{if(v&&state.piece.y+y>=HIDDEN_ROWS)drawCell(state.piece.type,state.piece.x+x,state.piece.y+y-HIDDEN_ROWS,cell);}));}
function drawPreview(context,canvas,type,slot=0,slotWidth=canvas.width){if(!type)return;const m=makePiece(type).matrix;const size=Math.min(15,Math.floor((slotWidth-8)/Math.max(4,m[0].length)),Math.floor((canvas.height-8)/Math.max(4,m.length)));const blockW=m[0].length*size,blockH=m.length*size;const ox=slot*slotWidth+(slotWidth-blockW)/2,oy=(canvas.height-blockH)/2;m.forEach((r,y)=>r.forEach((v,x)=>{if(v){context.fillStyle=COLORS[type];context.fillRect(ox+x*size+1,oy+y*size+1,size-2,size-2);}}));}
function drawAll(){drawBoard();hctx.clearRect(0,0,holdCanvas.width,holdCanvas.height);if(state.hold)drawPreview(hctx,holdCanvas,state.hold,0,holdCanvas.width);nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);const slot=nextCanvas.width/3;state.queue.slice(0,3).forEach((t,i)=>drawPreview(nctx,nextCanvas,t,i,slot));}

function action(name){({left:()=>move(-1,0),right:()=>move(1,0),soft,rotate,hard,hold}[name]||(()=>{}))();}
const activePresses=new Map();
function stopPress(pointerId){const press=activePresses.get(pointerId);if(!press)return;clearTimeout(press.delayTimer);clearInterval(press.repeatTimer);press.button.classList.remove('is-pressed');activePresses.delete(pointerId);}
document.querySelectorAll('[data-action]').forEach(btn=>{
  const a=btn.dataset.action;
  btn.addEventListener('pointerdown',e=>{
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add('is-pressed');
    action(a);
    haptic('light');
    const press={button:btn,delayTimer:null,repeatTimer:null};
    activePresses.set(e.pointerId,press);
    if(['left','right','soft'].includes(a)){
      const delay=a==='soft'?100:145;
      const interval=a==='soft'?42:58;
      press.delayTimer=setTimeout(()=>{press.repeatTimer=setInterval(()=>action(a),interval);},delay);
    }
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>btn.addEventListener(type,e=>stopPress(e.pointerId)));
});

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
  e.preventDefault();
  gesture={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,t:performance.now(),moved:false,axis:null,horizontalSteps:0,softSteps:0};
  wrap.setPointerCapture?.(e.pointerId);
});
wrap.addEventListener('pointermove',e=>{
  if(!gesture||gesture.pointerId!==e.pointerId||state.mode!=='swipe')return;
  e.preventDefault();
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
    while(gesture.softSteps<desired){soft();gesture.softSteps++;}
  }
  gesture.lastX=e.clientX;gesture.lastY=e.clientY;
});
function endGesture(e){
  if(!gesture||gesture.pointerId!==e.pointerId||state.mode!=='swipe')return;
  const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY,dt=performance.now()-gesture.t;
  const result=classifyGesture({dx,dy,dt,moved:gesture.moved,softSteps:gesture.softSteps},settings.sensitivity);
  if(result==='rotate')rotate();else if(result==='hold')hold();else if(result==='hard')hard();
  gesture=null;
}
wrap.addEventListener('pointerup',endGesture);
wrap.addEventListener('pointercancel',()=>{gesture=null;});

function openSettings(){
  $('#mode-select').value=state.mode;
  $('#sensitivity-select').value=settings.sensitivity;
  $('#haptic-toggle').checked=settings.haptic;
  $('#shake-toggle').checked=settings.shake;
  $('#settings-sheet').classList.remove('hidden');
}
function closeSettings(){$('#settings-sheet').classList.add('hidden');}
$('#settings-btn').addEventListener('click',openSettings);
$('#settings-close').addEventListener('click',closeSettings);
document.querySelector('[data-close-settings]').addEventListener('click',closeSettings);
$('#mode-select').addEventListener('change',e=>applyMode(e.target.value));
$('#sensitivity-select').addEventListener('change',e=>{settings.sensitivity=e.target.value;saveSettings();});
$('#haptic-toggle').addEventListener('change',e=>{settings.haptic=e.target.checked;saveSettings();haptic('medium');});
$('#shake-toggle').addEventListener('change',e=>{settings.shake=e.target.checked;saveSettings();});

function loop(now){const dt=Math.min(100,now-state.last);state.last=now;if(!state.paused&&!state.over){state.elapsed+=dt/1000;state.dropAcc+=dt;if(state.dropAcc>=state.dropMs){state.dropAcc=0;if(!move(0,1))lock();}updateHud();}requestAnimationFrame(loop);}
function updateViewportHeight(){const height=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);}
function resizeBoard(){const stage=$('#game-stage');const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;const availableWidth=Math.max(0,r.width-4);const availableHeight=Math.max(0,r.height-6);const tabletLimit=window.innerWidth>=700?420:360;const width=Math.max(120,Math.floor(Math.min(availableWidth,availableHeight/2,tabletLimit)));wrap.style.width=`${width}px`;wrap.style.height=`${width*2}px`;}
const resizeObserver=new ResizeObserver(resizeBoard);resizeObserver.observe($('#game-stage'));
const refreshLayout=()=>{updateViewportHeight();requestAnimationFrame(resizeBoard);};
window.visualViewport?.addEventListener('resize',refreshLayout);
window.visualViewport?.addEventListener('scroll',refreshLayout);
window.addEventListener('orientationchange',()=>setTimeout(refreshLayout,160));
window.addEventListener('resize',refreshLayout);

applyMode(settings.mode,{persist:false});
reset();refreshLayout();requestAnimationFrame(loop);
