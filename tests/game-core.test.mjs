import test from 'node:test';
import assert from 'node:assert/strict';
import {Bag,COLS,HIDDEN_ROWS,createBoard,makePiece,collides,mergePiece,clearLines,isPerfectClear,scoreFor,attackFor,isTSpin,rotateMatrix,ghostY} from '../src/game-core.js';

test('board dimensions',()=>{const b=createBoard();assert.equal(b.length,20+HIDDEN_ROWS);assert.equal(b[0].length,COLS);});
test('bag emits all seven before repeat',()=>{const bag=new Bag(()=>0.5);const values=Array.from({length:7},()=>bag.next());assert.equal(new Set(values).size,7);});
test('piece collides at wall',()=>{const b=createBoard();const p=makePiece('I');assert.equal(collides(b,p,-99,0),true);});
test('merge and clear one line',()=>{const b=createBoard();b[b.length-1].fill('I');assert.equal(clearLines(b),1);assert.ok(b[0].every(v=>v===null));});
test('perfect clear detection',()=>{const b=createBoard();assert.equal(isPerfectClear(b),true);b.at(-1)[0]='T';assert.equal(isPerfectClear(b),false);});
test('score applies b2b and perfect clear',()=>{assert.equal(scoreFor(4,0,{level:1}),800);assert.equal(scoreFor(4,0,{b2b:true,level:1}),1200);assert.equal(scoreFor(4,0,{perfectClear:true,level:1}),4300);});
test('attack calculation',()=>{assert.equal(attackFor(4,0),4);assert.equal(attackFor(4,0,{b2b:true}),5);assert.equal(attackFor(4,0,{perfectClear:true}),14);});
test('T spin uses occupied corners',()=>{const b=createBoard();const p=makePiece('T');p.x=3;p.y=5;b[5][3]='J';b[5][5]='J';b[7][3]='J';assert.equal(isTSpin(b,p,true),true);assert.equal(isTSpin(b,p,false),false);});
test('rotation preserves occupied cells',()=>{const p=makePiece('T');const r=rotateMatrix(p.matrix);assert.equal(r.flat().filter(Boolean).length,4);});
test('ghost lands above floor',()=>{const b=createBoard();const p=makePiece('O');assert.equal(ghostY(b,p),b.length-2);});
test('merge writes piece cells',()=>{const b=createBoard();const p=makePiece('O');p.y=b.length-2;mergePiece(b,p);assert.equal(b.at(-1).filter(Boolean).length,2);});
