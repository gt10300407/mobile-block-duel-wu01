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
export const COLORS = {I:'#26d9ff',J:'#4e6cff',L:'#ff9b31',O:'#ffe640',S:'#48ef77',T:'#b45cff',Z:'#ff4868'};

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
export function clearLines(board){
  let count=0;
  for(let y=board.length-1;y>=0;y--){
    if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(COLS).fill(null));count++;y++;}
  }
  return count;
}
export function scoreFor(lines,combo){
  const base=[0,100,300,500,800][lines]??0;
  return base+(lines>0?Math.max(0,combo)*50:0);
}
export class Bag {
  constructor(random=Math.random){this.random=random;this.queue=[];}
  refill(){const a=Object.keys(PIECES);for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}this.queue.push(...a);}
  next(){if(this.queue.length<7)this.refill();return this.queue.shift();}
}
export function makePiece(type){const matrix=PIECES[type].map(r=>[...r]);return{type,matrix,x:Math.floor((COLS-matrix.length)/2),y:0};}
export function ghostY(board,piece){let d=0;while(!collides(board,piece,0,d+1))d++;return piece.y+d;}
