import test from 'node:test';
import assert from 'node:assert/strict';
import {Bag,COLS,ROWS,HIDDEN_ROWS,createBoard,makePiece,collides,mergePiece,clearLines,rotateMatrix,scoreFor,ghostY} from '../src/game-core.js';

test('board dimensions',()=>{const b=createBoard();assert.equal(b.length,ROWS+HIDDEN_ROWS);assert.equal(b[0].length,COLS);});
test('7-bag contains seven unique pieces',()=>{const bag=new Bag(()=>0.42);const got=Array.from({length:7},()=>bag.next());assert.equal(new Set(got).size,7);});
test('rotation keeps square matrix dimensions',()=>{const p=makePiece('T');const r=rotateMatrix(p.matrix);assert.equal(r.length,p.matrix.length);assert.equal(r[0].length,p.matrix[0].length);});
test('piece collides with left wall',()=>{const b=createBoard();const p=makePiece('O');p.x=-1;assert.equal(collides(b,p),true);});
test('piece merges and line clears',()=>{const b=createBoard();b[b.length-1].fill('I');assert.equal(clearLines(b),1);assert.ok(b[0].every(v=>v===null));});
test('ghost lands at bottom on empty board',()=>{const b=createBoard();const p=makePiece('O');assert.equal(ghostY(b,p),b.length-p.matrix.length);});
test('score increases with lines and combo',()=>{assert.ok(scoreFor(4,2)>scoreFor(4,0));});
test('merge writes piece cells',()=>{const b=createBoard();const p=makePiece('O');p.y=b.length-2;mergePiece(b,p);assert.ok(b[b.length-1].some(Boolean));});
