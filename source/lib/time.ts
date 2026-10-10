export const IDLE=30*60*1000;
export type Event={id:string;person_id:string;project_id:string;device_id:string;kind:string;at:number;received:number};
export type Session={id:string;person_id:string;project_id:string;device_id:string;start:number;last:number;end:number;reason:string;open:boolean;corrected?:boolean;correction_reason?:string;conflict?:boolean;originalStart?:number;originalEnd?:number;event_ids?:string[]};
export type DeriveOptions={idle?:number;countIdle?:boolean};
export function deriveSessions(events:Event[],now=Date.now(),options?:DeriveOptions):Session[]{
 const idle=options?.idle??IDLE;const countIdle=options?.countIdle!==false;
 const ordered=[...new Map(events.map(e=>[e.id,e])).values()].sort((a,b)=>a.at-b.at||a.received-b.received||a.id.localeCompare(b.id));
 const states=new Map<string,{enabled:boolean;current:Session|null}>();const result:Session[]=[];
 function close(st:{current:Session|null},end:number,reason:string){if(st.current){const cap=countIdle?st.current.last+idle:st.current.last;st.current.end=Math.max(st.current.start,Math.min(end,cap,now));st.current.reason=reason;st.current.open=false;result.push(st.current);st.current=null;}}
 for(const e of ordered){if(e.at>now)continue;let st=states.get(e.person_id);if(!st){st={enabled:true,current:null};states.set(e.person_id,st);}if(st.current&&e.at>=st.current.last+idle)close(st,st.current.last+idle,'idle');
 if(e.kind==='device-stop'){if(st.current?.device_id===e.device_id)close(st,e.at,'device-stop');continue;}if(e.kind==='stop'||e.kind==='revoke'){close(st,e.at,e.kind);st.enabled=false;continue;}if(e.kind==='resume'){st.enabled=true;continue;}if(e.kind!=='activity'||!st.enabled)continue;
 if(st.current&&st.current.project_id!==e.project_id)close(st,e.at,'project');
 if(!st.current)st.current={id:e.id,person_id:e.person_id,project_id:e.project_id,device_id:e.device_id,start:e.at,last:e.at,end:e.at,reason:'open',open:true,event_ids:[e.id]};else {st.current.event_ids?.push(e.id);st.current.last=e.at;st.current.device_id=e.device_id;}
 }
 for(const st of states.values()){if(!st.current)continue;if(st.current.last+idle<=now)close(st,st.current.last+idle,'idle');else {st.current.end=countIdle?now:Math.min(now,st.current.last);result.push(st.current);}}
 return result.sort((a,b)=>a.start-b.start);
}
export function clipSessions(sessions:Session[],from:number,to:number){return sessions.filter(s=>s.end>from&&s.start<to).map(s=>({...s,originalStart:s.start,originalEnd:s.end,start:Math.max(s.start,from),end:Math.min(s.end,to)}));}
export const duration=(sessions:Session[])=>sessions.reduce((a,s)=>a+Math.max(0,s.end-s.start),0);
export function sessionParts(session:Session){const confirmedEnd=Math.min(session.end,Math.max(session.start,session.last));const confirmed=Math.max(0,confirmedEnd-session.start);return {confirmed,tail:Math.max(0,session.end-confirmedEnd)};}
export function localDate(at:number,tz='America/New_York'){const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);const g=(k:string)=>p.find(x=>x.type===k)?.value;return `${g('year')}-${g('month')}-${g('day')}`;}
export function localMidnight(date:string,tz='America/New_York'){const [y,m,d]=date.split('-').map(Number);let guess=Date.UTC(y,m-1,d);for(let n=0;n<5;n++){const ps=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(guess);const g=(k:string)=>Number(ps.find(x=>x.type===k)?.value);const rendered=Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'),g('second'));guess+=Date.UTC(y,m-1,d)-rendered;}return guess;}
export function periodBounds(period:string,date:string,tz='America/New_York'){const [y,m,d]=date.split('-').map(Number);const base=new Date(Date.UTC(y,m-1,d));let start=new Date(base),end=new Date(base);if(period==='week'){start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));end=new Date(start);end.setUTCDate(end.getUTCDate()+7);}else if(period==='month'){start=new Date(Date.UTC(y,m-1,1));end=new Date(Date.UTC(y,m,1));}else if(period==='year'){start=new Date(Date.UTC(y,0,1));end=new Date(Date.UTC(y+1,0,1));}else end.setUTCDate(end.getUTCDate()+1);return {from:localMidnight(start.toISOString().slice(0,10),tz),to:localMidnight(end.toISOString().slice(0,10),tz),label:start.toISOString().slice(0,10)};}
export function formatDuration(ms:number){const minutes=Math.max(0,Math.round(ms/60000));return `${Math.floor(minutes/60)} ч ${String(minutes%60).padStart(2,'0')} мин`;}
function isLeap(year:number){return year%4===0&&(year%100!==0||year%400===0);}
function isoDate(year:number,month:number,day:number){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
// Moves a calendar date by one report step. February 29 clamps to February 28
// in a non-leap year instead of overflowing into March.
export function shiftDate(date:string,period:string,direction:number){
 const [year,month,day]=date.split('-').map(Number);
 if(period==='year'){const next=year+direction;return isoDate(next,month,month===2&&day===29&&!isLeap(next)?28:day);}
 if(period==='month')return new Date(Date.UTC(year,month-1+direction,1)).toISOString().slice(0,10);
 const cursor=new Date(Date.UTC(year,month-1,day));
 cursor.setUTCDate(cursor.getUTCDate()+direction*(period==='week'?7:1));
 return cursor.toISOString().slice(0,10);
}
