import {IDLE, duration, type Session} from './time';

export function withLiveEnds<T extends {open?:boolean;start:number;last:number;end:number}>(sessions:T[], now:number):T[]{
 return sessions.map(session=>{
  if(!session.open)return session;
  return {...session,end:Math.max(session.start,Math.min(now,session.last+IDLE))};
 });
}

export function idleLeft(session:{open?:boolean;last:number}, now:number){
 return session.open?session.last+IDLE-now:null;
}

function plural(value:number, one:string, few:string, many:string){
 const n=Math.abs(value)%100, tail=n%10;
 if(n>10&&n<20)return many;
 if(tail===1)return one;
 if(tail>1&&tail<5)return few;
 return many;
}

export function relativeTime(at:number, now:number){
 const delta=now-at;
 if(Math.abs(delta)<45_000)return 'только что';
 const minutes=Math.round(Math.abs(delta)/60000);
 const ahead=delta<0;
 if(minutes<60){const word=plural(minutes,'минуту','минуты','минут');return ahead?`через ${minutes} ${word}`:`${minutes} ${word} назад`;}
 const hours=Math.round(minutes/60);
 if(hours<48){const word=plural(hours,'час','часа','часов');return ahead?`через ${hours} ${word}`:`${hours} ${word} назад`;}
 const days=Math.round(hours/24);
 const word=plural(days,'день','дня','дней');
 return ahead?`через ${days} ${word}`:`${days} ${word} назад`;
}

export function hourHeatmap(sessions:{start:number;end:number}[], tz='America/New_York'){
 const buckets=Array.from({length:24},()=>0);
 const format=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',hourCycle:'h23'});
 for(const session of sessions){
  if(!(session.end>session.start))continue;
  for(let at=session.start;at<session.end;at+=5*60000){
   const slice=Math.min(5*60000,session.end-at);
   const hour=Number(format.formatToParts(at).find(part=>part.type==='hour')?.value);
   if(hour>=0&&hour<=23)buckets[hour]+=slice;
  }
 }
 return buckets;
}

export function sessionStats(sessions:Session[]){
 if(!sessions.length)return {average:0,longest:0,count:0};
 const longest=sessions.reduce((max,session)=>Math.max(max,session.end-session.start),0);
 return {average:duration(sessions)/sessions.length,longest,count:sessions.length};
}

export function periodGoalMs(dailyMinutes:number, period:string){
 const days=period==='week'?5:period==='month'?22:period==='year'?260:1;
 return Math.round(dailyMinutes)*60000*days;
}

export function matchesSession(session:Session, query:string, reason:string, label:(session:Session)=>string){
 if(reason!=='all'&&session.reason!==reason)return false;
 const needle=query.trim().toLowerCase();
 return !needle||label(session).toLowerCase().includes(needle);
}

export type SortKey='start'|'duration'|'person'|'project';
export function sortSessions<T extends {start:number;end:number;person_id:string;project_id:string}>(sessions:T[], key:SortKey, person:(id:string)=>string, project:(id:string)=>string){
 const copy=[...sessions];
 copy.sort((a,b)=>{
  if(key==='duration')return (b.end-b.start)-(a.end-a.start);
  if(key==='person')return person(a.person_id).localeCompare(person(b.person_id),'ru')||b.start-a.start;
  if(key==='project')return project(a.project_id).localeCompare(project(b.project_id),'ru')||b.start-a.start;
  return b.start-a.start;
 });
 return copy;
}
