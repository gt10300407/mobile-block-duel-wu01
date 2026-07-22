import {Bag,COLORS,COLS,ROWS,HIDDEN_ROWS,createBoard,makePiece,collides,mergePiece,clearLines,rotateMatrix,scoreFor,ghostY} from './game-core.js';

const $=s=>document.querySelector(s);
const boardCanvas=$('#board'), ctx=boardCanvas.getContext('2d');
const holdCanvas=$('#hold'), hctx=holdCanvas.getContext('2d');
const nextCanvas=$('#next'), nctx=nextCanvas.getContext('2d');
const wrap=$('#board-wrap');
const state={board:createBoard(),bag:new Bag(),queue:[],piece:null,hold:null,holdUsed:false,score:0,lines:0,combo:-1,paused:false,over:false,mode:'buttons',elapsed:0,last:performance.now(),dropAcc:0,dropMs:700};

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
function effect(level){wrap.classList.remove('shake-small','shake-strong');void wrap.offsetWidth;wrap.classList.add(level==='strong'?'shake-strong':'shake-small');setTimeout(()=>wrap.classList.remove('shake-small','shake-strong'),200);}
function haptic(level){const ms={light:10,medium:25,heavy:55}[level]||10;if(navigator.vibrate)navigator.vibrate(ms);}
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
let repeatTimer=null;document.querySelectorAll('[data-action]').forEach(btn=>{const a=btn.dataset.action;const start=e=>{e.preventDefault();action(a);if(['left','right','soft'].includes(a)){clearInterval(repeatTimer);repeatTimer=setInterval(()=>action(a),a==='soft'?45:85);}};const end=()=>{clearInterval(repeatTimer);repeatTimer=null;};btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);btn.addEventListener('pointerleave',end);});
$('#hold-btn').addEventListener('click',hold);$('#pause-btn').addEventListener('click',togglePause);$('#resume-btn').addEventListener('click',()=>{state.paused=false;hideOverlay();});$('#restart-btn').addEventListener('click',reset);
$('#mode-btn').addEventListener('click',()=>{state.mode=state.mode==='buttons'?'swipe':'buttons';$('#controls').classList.toggle('hidden',state.mode==='swipe');$('#mode-label').textContent=state.mode==='buttons'?'버튼':'스와이프';$('#mode-btn').textContent=state.mode==='buttons'?'스와이프 모드로 전환':'버튼 모드로 전환';$('#hint').textContent=state.mode==='buttons'?'버튼을 눌러 조작':'탭 회전 · 좌우 이동 · 아래 드래그 · 빠른 플릭';});
let gesture=null;wrap.addEventListener('pointerdown',e=>{if(state.mode!=='swipe'||state.paused||state.over)return;gesture={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,t:performance.now(),moved:false,lastStep:0};wrap.setPointerCapture(e.pointerId);});
wrap.addEventListener('pointermove',e=>{if(!gesture||state.mode!=='swipe')return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;const ax=Math.abs(dx),ay=Math.abs(dy);if(Math.max(ax,ay)>8)gesture.moved=true;if(ax>ay*1.25&&ax>24){const step=Math.trunc(dx/24);if(step!==gesture.lastStep){move(step>gesture.lastStep?1:-1,0);gesture.lastStep=step;}}else if(ay>ax*1.25&&dy>20){soft();gesture.y=e.clientY;gesture.x=e.clientX;}});
wrap.addEventListener('pointerup',e=>{if(!gesture||state.mode!=='swipe')return;const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY,dt=performance.now()-gesture.t;const speed=Math.abs(dy)/Math.max(1,dt);if(!gesture.moved)rotate();else if(dy<-45&&Math.abs(dy)>Math.abs(dx)*1.2)hold();else if(dy>35&&speed>.65)hard();gesture=null;});

function loop(now){const dt=Math.min(100,now-state.last);state.last=now;if(!state.paused&&!state.over){state.elapsed+=dt/1000;state.dropAcc+=dt;if(state.dropAcc>=state.dropMs){state.dropAcc=0;if(!move(0,1))lock();}updateHud();}requestAnimationFrame(loop);}
function resizeBoard(){const stage=$('#game-stage');const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;const width=Math.max(120,Math.floor(Math.min(r.width,r.height/2)));wrap.style.width=`${width}px`;wrap.style.height=`${width*2}px`;}
const resizeObserver=new ResizeObserver(resizeBoard);resizeObserver.observe($('#game-stage'));window.addEventListener('orientationchange',()=>setTimeout(resizeBoard,120));window.addEventListener('resize',resizeBoard);
reset();resizeBoard();requestAnimationFrame(loop);
