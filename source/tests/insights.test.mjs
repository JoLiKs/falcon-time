import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatDuration,shiftDate,IDLE} from '../lib/time.ts';
import {withLiveEnds,hourHeatmap,relativeTime,periodGoalMs,matchesSession,sortSessions} from '../lib/insights.ts';

test('Displayed minutes round instead of dropping a half minute',()=>{
 assert.equal(formatDuration(90_000),'0 ч 02 мин');
 assert.equal(formatDuration(59*60000+30_000),'1 ч 00 мин');
 assert.equal(formatDuration(-1000),'0 ч 00 мин');
});

test('Year navigation keeps February 29 inside February',()=>{
 assert.equal(shiftDate('2028-02-29','year',1),'2029-02-28');
 assert.equal(shiftDate('2028-02-29','year',-1),'2027-02-28');
 assert.equal(shiftDate('2028-02-29','year',4),'2032-02-29');
 assert.equal(shiftDate('2026-01-31','month',1),'2026-02-01');
 assert.equal(shiftDate('2026-03-08','week',1),'2026-03-15');
 assert.equal(shiftDate('2026-12-31','day',1),'2027-01-01');
});

test('An open session grows until the idle limit and then stops',()=>{
 const session={id:'s',person_id:'z',project_id:'p',device_id:'d',start:1_000,last:61_000,end:61_000,reason:'open',open:true};
 assert.equal(withLiveEnds([session],61_000+10*60000)[0].end,61_000+10*60000);
 assert.equal(withLiveEnds([session],61_000+IDLE+60000)[0].end,61_000+IDLE);
 assert.equal(withLiveEnds([{...session,open:false,end:90_000}],1_000_000)[0].end,90_000);
});

test('Heatmap credits New York morning hours',()=>{
 const start=Date.parse('2026-09-29T13:00:00Z');
 const buckets=hourHeatmap([{start,end:start+30*60000}]);
 assert.ok(buckets[9]>buckets[10]);
 assert.equal(buckets.reduce((sum,value)=>sum+value,0),30*60000);
});

test('Relative labels and report goals stay in range',()=>{
 assert.equal(relativeTime(0,30_000),'только что');
 assert.equal(relativeTime(0,5*60000),'5 минут назад');
 assert.equal(relativeTime(0,60*60000),'1 час назад');
 assert.equal(periodGoalMs(480,'day'),8*3600000);
 assert.equal(periodGoalMs(480,'week'),5*8*3600000);
});

test('Journal search, reason filter and sort',()=>{
 const rows=[
  {id:'a',person_id:'y',project_id:'homekept',start:2,end:10,reason:'idle'},
  {id:'b',person_id:'z',project_id:'falcon',start:5,end:6,reason:'stop'},
 ];
 const label=row=>`${row.person_id} ${row.project_id} ${row.reason}`;
 assert.equal(matchesSession(rows[0],'home','all',label),true);
 assert.equal(matchesSession(rows[0],'home','stop',label),false);
 assert.deepEqual(sortSessions(rows,'duration',id=>id,id=>id).map(row=>row.id),['a','b']);
 assert.deepEqual(sortSessions(rows,'person',id=>id==='y'?'Юра':'Зафар',id=>id).map(row=>row.id),['b','a']);
});
