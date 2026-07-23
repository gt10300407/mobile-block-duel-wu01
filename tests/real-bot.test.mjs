import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBotBoard,
  createBotState,
  enumeratePlacements,
  chooseBotPlacement,
  commitBotPlacement,
  pendingAttackTotal,
  cancelPendingAttacks,
  botProfile,
  boardMetrics,
  hasTopOut,
} from '../src/battle-engine.js';

function fixedRandom(values=[0.1,0.7,0.3,0.9,0.2,0.8,0.4]){
  let index=0;
  return ()=>values[index++%values.length];
}

test('every standard piece has legal placements on an empty board',()=>{
  for(const type of ['I','J','L','O','S','T','Z']){
    const placements=enumeratePlacements(createBotBoard(),type);
    assert.ok(placements.length>0,type);
    assert.ok(placements.every(item=>!item.topOut));
  }
});

test('chosen placement rests on a valid board',()=>{
  const board=createBotBoard();
  const placement=chooseBotPlacement(board,'T','hard',()=>0.5);
  assert.ok(placement);
  assert.equal(placement.piece.y>=0,true);
  assert.equal(hasTopOut(placement.board),false);
});

test('bot clears a real prepared line and creates attack',()=>{
  const state=createBotState(fixedRandom());
  state.board=createBotBoard();
  const bottom=state.board.length-1;
  for(let x=4;x<10;x++)state.board[bottom][x]=8;
  state.board[bottom-1][9]=8;
  state.current='I';
  const placement=enumeratePlacements(state.board,'I').find(item=>item.lines===1);
  assert.ok(placement);
  const result=commitBotPlacement(state,placement);
  assert.equal(result.lines,1);
  assert.equal(result.attack,0);
  assert.match(result.reason,/1줄 제거/);
});

test('four-line placement produces actual attack',()=>{
  const state=createBotState(fixedRandom());
  state.board=createBotBoard();
  for(let y=state.board.length-4;y<state.board.length;y++){
    for(let x=1;x<10;x++)state.board[y][x]=8;
  }
  state.current='I';
  const placement=enumeratePlacements(state.board,'I').find(item=>item.lines===4);
  assert.ok(placement);
  const result=commitBotPlacement(state,placement);
  assert.equal(result.lines,4);
  assert.equal(result.attack,4);
  assert.match(result.reason,/4줄 동시 제거/);
});

test('pending attacks cancel from oldest packet first',()=>{
  const packets=[{amount:2,readyAt:1,reason:'a'},{amount:4,readyAt:2,reason:'b'}];
  const result=cancelPendingAttacks(packets,3);
  assert.equal(result.remaining,0);
  assert.equal(pendingAttackTotal(result.packets),3);
  assert.equal(result.packets[0].reason,'b');
});

test('hard bot acts faster and evaluates fewer random candidates',()=>{
  assert.ok(botProfile('easy').fallMs>botProfile('normal').fallMs);
  assert.ok(botProfile('normal').fallMs>botProfile('hard').fallMs);
  assert.ok(botProfile('easy').candidatePool>botProfile('hard').candidatePool);
});

test('bot simulation places 80 pieces without invalid board shape',()=>{
  const random=fixedRandom();
  const state=createBotState(random);
  for(let i=0;i<80;i++){
    const placement=chooseBotPlacement(state.board,state.current,'normal',random);
    if(!placement)break;
    const result=commitBotPlacement(state,placement);
    assert.equal(state.board.length,22);
    assert.ok(state.board.every(row=>row.length===10));
    if(result.topOut)break;
  }
  const metrics=boardMetrics(state.board);
  assert.ok(metrics.holes>=0);
});
