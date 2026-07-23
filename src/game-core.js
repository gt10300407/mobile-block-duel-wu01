export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2;
export const PIECES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};
export const COLORS = {I:'#26d9ff',J:'#4e6cff',L:'#ff9b31',O:'#ffe640',S:'#48ef77',T:'#b45cff',Z:'#ff4868',8:'#555a66'};

export function createBoard(){return Array.from({length:ROWS+HIDDEN_ROWS},()=>Array(COLS).fill(null));}
export function rotateMatrix(matrix){const n=matrix.length;return Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>matrix[n-1-x][y]));}
export function collides(board,piece,dx=0,dy=0,matrix=piece.matrix){
  for(let y=0;y<matrix.length;y++) for(let x=0;x<matrix[y].length;x++) if(matrix[y][x]){
    const bx=piece.x+x+dx, by=piece.y+y+dy;
    if(bx<0||bx>=COLS||by>=board.length) return true;
    if(by>=0&&board[by][bx]) return true;
  }
  return false;
}
export function mergePiece(board,piece){
  piece.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v){const by=piece.y+y;if(by>=0&&by<board.length) board[by][piece.x+x]=piece.type;}}));
}
export function fullLineIndexes(board){
  const indexes=[];
  for(let y=0;y<board.length;y++)if(board[y].every(Boolean))indexes.push(y);
  return indexes;
}
export function clearLines(board){
  const indexes=fullLineIndexes(board);
  for(const y of indexes.reverse()){board.splice(y,1);board.unshift(Array(COLS).fill(null));}
  return indexes.length;
}
export function isPerfectClear(board){return board.every(row=>row.every(cell=>!cell));}
export function scoreFor(lines,combo,{tSpin=false,b2b=false,perfectClear=false,level=1}={}){
  let base;
  if(tSpin)base=[400,800,1200,1600][lines]??0;
  else base=[0,100,300,500,800][lines]??0;
  if(b2b&&(tSpin||lines===4))base=Math.floor(base*1.5);
  if(lines>0)base+=Math.max(0,combo)*50;
  if(perfectClear)base+=3500;
  return base*Math.max(1,level);
}
export function attackFor(lines,combo,{tSpin=false,b2b=false,perfectClear=false}={}){
  let attack=tSpin?([0,2,4,6][lines]??0):([0,0,1,2,4][lines]??0);
  if(b2b&&(tSpin||lines===4))attack+=1;
  if(combo>1)attack+=Math.min(4,Math.floor(combo/2));
  if(perfectClear)attack+=10;
  return attack;
}
export function isTSpin(board,piece,lastActionWasRotate=false){
  if(!lastActionWasRotate||piece.type!=='T')return false;
  const cx=piece.x+1,cy=piece.y+1;
  const corners=[[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]];
  let occupied=0;
  for(const [x,y] of corners){
    if(x<0||x>=COLS||y>=board.length||y<0||board[y][x])occupied++;
  }
  return occupied>=3;
}
export class Bag {
  constructor(random=Math.random){this.random=random;this.queue=[];}
  refill(){const a=Object.keys(PIECES);for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}this.queue.push(...a);}
  next(){if(this.queue.length<7)this.refill();return this.queue.shift();}
}
export function makePiece(type){const matrix=PIECES[type].map(r=>[...r]);return{type,matrix,x:Math.floor((COLS-matrix.length)/2),y:0,rotation:0};}
export function ghostY(board,piece){let d=0;while(!collides(board,piece,0,d+1))d++;return piece.y+d;}
