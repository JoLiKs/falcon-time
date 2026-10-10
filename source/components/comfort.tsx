'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Clock3,Command,Keyboard,Moon,Pencil,Printer,Search,SunMedium,TimerReset} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {NativeSelect as Select} from '@/components/ui/native-select';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {clipSessions,duration,formatDuration,localDate,periodBounds,shiftDate,type Session} from '@/lib/time';
import {hourHeatmap,idleLeft,matchesSession,periodGoalMs,relativeTime,sessionStats,sortSessions,withLiveEnds,type SortKey} from '@/lib/insights';

export const timePrefs={local:false};
type Any=Record<string,any>;
type Api=(path:string, body?:unknown)=>Promise<any>;
const PREFS='falcon-time-workspace';
const sections=[['overview','Обзор','1'],['sessions','Сессии','2'],['people','Команда','3'],['projects','Проекты','4'],['connect','Подключение','5']] as const;
const sortLabels:Record<SortKey,string>={start:'Сначала новые',duration:'По длительности',person:'По сотруднику',project:'По проекту'};

function loadPrefs(){
 try{return JSON.parse(localStorage.getItem(PREFS)||'{}') as Any;}catch{return {};}
}

export function useComfort({demo,data,period,date,person,project,screen,admin,rows,people,projects,reasons,personName,projectName,setScreen,setPeriod,setDate,setPerson,setProject,setNotice,onCorrect,api}:{
 demo:boolean;data:Any|null;period:string;date:string;person:string;project:string;screen:string;admin:boolean;
 rows:Session[];people:Any[];projects:Any[];reasons:Any;personName:(id:string)=>string;projectName:(id:string)=>string;
 setScreen:(value:string)=>void;setPeriod:(value:string)=>void;setDate:(value:string)=>void;setPerson:(value:string)=>void;setProject:(value:string)=>void;setNotice:(value:string)=>void;
 onCorrect:(session:Session)=>void;api:Api;
}){
 const [clock,setClock]=useState(0);
 const [theme,setTheme]=useState<'dark'|'light'>('dark');
 const [showLocal,setShowLocal]=useState(false);
 const [goal,setGoal]=useState(480);
 const [query,setQuery]=useState('');
 const [reason,setReason]=useState('all');
 const [sort,setSort]=useState<SortKey>('start');
 const [palette,setPalette]=useState(false);
 const [help,setHelp]=useState(false);
 const [detail,setDetail]=useState<Session|null>(null);
 const [paletteQuery,setPaletteQuery]=useState('');
 const [active,setActive]=useState(0);
 const [previous,setPrevious]=useState<Session[]|null>(null);
 const [ready,setReady]=useState(false);
 const searchRef=useRef<HTMLInputElement>(null);
 const now=clock||Date.now();
 timePrefs.local=showLocal;

 useEffect(()=>{const tick=()=>setClock(Date.now());tick();const id=setInterval(tick,1000);return()=>clearInterval(id);},[]);
 useEffect(()=>{
  const saved=loadPrefs();
  if(['overview','sessions','people','projects','connect'].includes(saved.screen))setScreen(saved.screen);
  if(['day','week','month','year'].includes(saved.period))setPeriod(saved.period);
  if(typeof saved.person==='string')setPerson(saved.person);
  if(typeof saved.project==='string')setProject(saved.project);
  if(saved.theme==='light'||saved.theme==='dark')setTheme(saved.theme);
  if(saved.local===true)setShowLocal(true);
  if(Number.isInteger(saved.goal)&&saved.goal>=30&&saved.goal<=24*60)setGoal(saved.goal);
  if(['start','duration','person','project'].includes(saved.sort))setSort(saved.sort);
  setReady(true);
 },[setDate,setPeriod,setPerson,setProject,setScreen]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{
  if(!ready)return;
  localStorage.setItem(PREFS,JSON.stringify({screen,period,person,project,theme,local:showLocal,goal,sort}));
 },[ready,screen,period,person,project,theme,showLocal,goal,sort]);
 useEffect(()=>{
  if(!data)return;
  if(person!=='all'&&!people.some(item=>item.id===person))setPerson('all');
  if(project!=='all'&&!projects.some(item=>item.id===project))setProject('all');
  if(!admin&&screen==='people')setScreen('overview');
 },[admin,data,people,person,project,projects,screen,setPerson,setProject,setScreen]);

 const live=useMemo(()=>withLiveEnds(rows,now),[rows,now]);
 const label=(session:Session)=>`${personName(session.person_id)} ${projectName(session.project_id)} ${reasons[session.reason]||session.reason||''}`;
 const sessions=useMemo(()=>screen==='sessions'?sortSessions(live.filter(session=>matchesSession(session,query,reason,label)),sort,personName,projectName):live,[live,screen,query,reason,sort,personName,projectName]);
 const stats=sessionStats(live);
 const heat=hourHeatmap(live);
 const heatMax=Math.max(1,...heat);
 const heads=person==='all'?Math.max(1,people.filter(item=>item.active).length):1;
 const target=periodGoalMs(goal,period)*heads;
 const spent=duration(live);
 const openNow=((data?.current||[]) as Session[]).filter(session=>(person==='all'||session.person_id===person)&&(project==='all'||session.project_id===project));
 const presence=withLiveEnds(openNow,now);

 useEffect(()=>{
  if(!data){setPrevious(null);return;}
  const prevDate=shiftDate(date,period,-1);
  let stop=false;
  if(demo){
   const range=periodBounds(period,prevDate);
   setPrevious(clipSessions(data.sessions||[],range.from,range.to).filter((session:Session)=>(person==='all'||session.person_id===person)&&(project==='all'||session.project_id===project)));
   return;
  }
  api(`data?period=${encodeURIComponent(period)}&date=${prevDate}`).then(result=>{
   if(!stop)setPrevious((result.sessions||[]).filter((session:Session)=>(person==='all'||session.person_id===person)&&(project==='all'||session.project_id===project)));
  }).catch(()=>{if(!stop)setPrevious(null);});
  return()=>{stop=true;};
 },[api,data,date,demo,period,person,project]);

 const commands=useMemo(()=>{
  const list:{id:string;title:string;hint:string;run:()=>void}[]=[
   ...sections.filter(([key])=>admin||key!=='people').map(([key,title,digit])=>({id:'screen-'+key,title,hint:'Раздел · '+digit,run:()=>setScreen(key)})),
   ...([['day','День'],['week','Неделя'],['month','Месяц'],['year','Год']] as const).map(([key,title])=>({id:'period-'+key,title,hint:'Период',run:()=>{setPeriod(key);setScreen('overview');}})),
   {id:'today',title:'Сегодня',hint:'Дата отчёта',run:()=>setDate(localDate(Date.now()))},
   {id:'theme',title:theme==='light'?'Тёмная тема':'Светлая тема',hint:'Оформление',run:()=>setTheme(value=>value==='light'?'dark':'light')},
   {id:'local',title:showLocal?'Только Нью-Йорк':'Показать местное время',hint:'Часы',run:()=>setShowLocal(value=>!value)},
   {id:'print',title:'Печать отчёта',hint:'Экран',run:()=>window.print()},
   {id:'help',title:'Горячие клавиши',hint:'Справка',run:()=>setHelp(true)},
   ...people.map(item=>({id:'person-'+item.id,title:item.name,hint:'Сотрудник',run:()=>{setPerson(item.id);setScreen('overview');}})),
   ...projects.map(item=>({id:'project-'+item.id,title:item.name,hint:'Проект',run:()=>{setProject(item.id);setScreen('overview');}})),
  ];
  const needle=paletteQuery.trim().toLowerCase();
  return needle?list.filter(item=>(item.title+' '+item.hint).toLowerCase().includes(needle)):list;
 },[admin,paletteQuery,people,projects,setDate,setPeriod,setPerson,setProject,setScreen,showLocal,theme]);

 useEffect(()=>{setActive(0);},[paletteQuery,palette]);
 useEffect(()=>{
  function onKey(event:KeyboardEvent){
   const target=event.target as HTMLElement|null;
   const typing=!!target&&(target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.tagName==='SELECT'||target.isContentEditable);
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setPalette(value=>!value);return;}
   if(event.key==='Escape'){setPalette(false);setHelp(false);setDetail(null);return;}
   if(palette){
    if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>Math.min(commands.length-1,value+1));}
    if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(0,value-1));}
    if(event.key==='Enter'&&commands[active]){event.preventDefault();commands[active].run();setPalette(false);setPaletteQuery('');}
    return;
   }
   if(typing||!data||help||detail)return;
   if(event.key==='?'){setHelp(true);return;}
   if(event.key==='['){setDate(shiftDate(date,period,-1));return;}
   if(event.key===']'){setDate(shiftDate(date,period,1));return;}
   if(event.key==='t'){setDate(localDate(Date.now()));return;}
   if(event.key==='/'){event.preventDefault();setScreen('sessions');setTimeout(()=>searchRef.current?.focus(),0);return;}
   const index=Number(event.key);
   const next=sections[index-1];
   if(next&&(admin||next[0]!=='people'))setScreen(next[0]);
  }
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[active,admin,commands,data,date,detail,help,palette,period,setDate,setScreen]);

 function toggleTheme(){setTheme(value=>value==='light'?'dark':'light');}
 const themeButton=<Button variant="ghost" size="icon" className="no-print" aria-label={theme==='light'?'Включить тёмную тему':'Включить светлую тему'} onClick={toggleTheme}>{theme==='light'?<Moon/>:<SunMedium/>}</Button>;
 const previousMs=previous?duration(previous):null;
 const delta=previousMs==null?null:spent-previousMs;
 const deltaPct=previousMs?Math.round(delta!/previousMs*100):null;

 const tools=<div className="comfort-tools no-print">
  <Button variant="outline" onClick={()=>setDate(localDate(Date.now()))}><TimerReset/>Сегодня</Button>
  <Button variant="outline" aria-pressed={showLocal} onClick={()=>setShowLocal(value=>!value)}>{showLocal?'Местное время':'Нью-Йорк'}</Button>
  <Button variant="outline" onClick={()=>{setPalette(true);setPaletteQuery('');}}><Command/>Поиск</Button>
  <Button variant="outline" onClick={()=>setHelp(true)}><Keyboard/>Клавиши</Button>
  <Button variant="outline" onClick={()=>window.print()}><Printer/>Печать</Button>
 </div>;

 const urgent=presence.filter(session=>{const left=idleLeft(session,now);return left!=null&&left<=10*60000;});
 const overview=<div className="comfort-stack">
  <section className="comfort-card" aria-label="Сейчас в сессии">
   <div className="section-head"><h2>Сейчас</h2><span className="section-caption">{presence.length?`${presence.length} открыто`:'Никто не в сессии'}</span></div>
   {presence.length?<div className="presence-list">{presence.map(session=>{
    const left=idleLeft(session,now);
    return <button className="presence-chip" key={session.id} onClick={()=>{setPerson(session.person_id);setScreen('sessions');}}><strong>{personName(session.person_id)}</strong><span>{projectName(session.project_id)}</span><small>{left!=null&&left>0?`до автовыхода ${formatDuration(left)}`:'пора закрывать по правилу 30 минут'} · действие {relativeTime(session.last,now)}</small></button>;
   })}</div>:<p className="muted">Открытых сессий нет. Связь устройства сама по себе время не начисляет.</p>}
   {urgent.length>0&&<p className="comfort-warn" role="status">Скоро сработает автовыход: {urgent.map(session=>personName(session.person_id)).join(', ')}.</p>}
  </section>
  <div className="comfort-grid">
   <section className="comfort-card">
    <div className="section-head"><h2>К прошлому периоду</h2></div>
    <p className="comfort-delta">{previousMs==null?'Считаем предыдущий период…':delta===0?'Столько же, сколько в прошлом периоде':`${delta!>0?'+':'−'}${formatDuration(Math.abs(delta!))}${deltaPct==null?'':' ('+(delta!>0?'+':'−')+Math.abs(deltaPct)+'%)'}`}</p>
    <p className="muted">{previousMs==null?'Сравнение появится рядом с итогом.':`Прошлый период: ${formatDuration(previousMs)}`}</p>
   </section>
   <section className="comfort-card">
    <div className="section-head"><h2>Цель</h2><label className="goal-label">Часов в день<Input aria-label="Цель в часах на день" type="number" min={0.5} max={24} step={0.5} value={goal/60} onChange={event=>{const hours=Number(event.target.value);if(Number.isFinite(hours))setGoal(Math.min(24*60,Math.max(30,Math.round(hours*60))));}}/></label></div>
    <div className="goal-track" aria-hidden="true"><span style={{width:`${Math.min(100,target?spent/target*100:0)}%`}}/></div>
    <p className="muted">{formatDuration(spent)} из {formatDuration(target)} · {period==='day'?(heads>1?`на сегодня, ${heads} сотрудников`:'на сегодня'):(heads>1?`${heads} сотрудников, только будни`:'только будни')}</p>
   </section>
   <section className="comfort-card">
    <div className="section-head"><h2>Срез периода</h2></div>
    <dl className="stat-list"><div><dt>Средняя сессия</dt><dd>{formatDuration(stats.average)}</dd></div><div><dt>Самая длинная</dt><dd>{formatDuration(stats.longest)}</dd></div><div><dt>Сессий</dt><dd>{stats.count}</dd></div></dl>
   </section>
  </div>
  <section className="comfort-card">
   <div className="section-head"><h2>Часы суток</h2><span className="section-caption">America/New_York</span></div>
   <div className="heatmap" aria-hidden="true">{heat.map((value,hour)=><span key={hour} style={{height:`${Math.max(4,value/heatMax*72)}px`}} title={`${hour}:00`}/>)}</div>
   <div className="heatmap-axis"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
  </section>
 </div>;

 const journal=<div className="session-journal">
  <div className="journal-tools no-print">
   <label className="journal-search"><Search size={16} aria-hidden="true"/><Input ref={searchRef} aria-label="Поиск по журналу" placeholder="Сотрудник, проект или причина" value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <label>Причина<Select aria-label="Фильтр по причине" value={reason} onChange={event=>setReason(event.target.value)}><option value="all">Все причины</option>{Object.entries(reasons).map(([key,name])=><option key={key} value={key}>{String(name)}</option>)}</Select></label>
   <label>Порядок<Select aria-label="Сортировка журнала" value={sort} onChange={event=>setSort(event.target.value as SortKey)}>{Object.entries(sortLabels).map(([key,name])=><option key={key} value={key}>{name}</option>)}</Select></label>
  </div>
  <div className="session-list"><div className="session-table-head"><span>Сотрудник / проект</span><span>Период сессии</span><span>Время</span></div>{sessions.map(session=><article className="session-row" key={session.id}><button className="session-open" onClick={()=>setDetail(session)}><div className="session-marker"><Clock3 size={18}/></div><div><strong>{personName(session.person_id)}</strong><small>{projectName(session.project_id)}</small><span className="session-reason">{reasons[session.reason]||session.reason}{session.conflict?' · конфликт, время не удвоено':''}</span></div><div className="session-times"><strong>{formatStamp(session.start)} — {formatStamp(session.end)}</strong><small>Последнее действие {formatStamp(session.last)} · {relativeTime(session.last,now)}</small>{session.originalStart&&session.originalStart<session.start&&<small>Началась до периода</small>}{session.originalEnd!=null&&session.originalEnd>session.end&&<small>Продолжается за пределами периода</small>}</div><div className="session-duration">{formatDuration(session.end-session.start)}</div></button>{admin&&!session.open&&(!session.conflict||session.corrected)&&<Button size="icon" variant="ghost" aria-label="Исправить сессию" onClick={()=>onCorrect(session)}><Pencil/></Button>}</article>)}{!sessions.length&&<div className="empty"><Clock3/><h3>Нет сессий за этот период</h3><p>Измените дату, фильтр или подключите устройство.</p></div>}</div>
 </div>;

 const overlays=<>
  {palette&&<div className="comfort-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setPalette(false);}}><div className="comfort-palette" role="dialog" aria-modal="true" aria-label="Командная палитра"><input autoFocus placeholder="Раздел, сотрудник, проект…" value={paletteQuery} onChange={event=>setPaletteQuery(event.target.value)} aria-label="Команда"/><div className="palette-list">{commands.length?commands.map((item,index)=><button key={item.id} className={index===active?'hit active':'hit'} onMouseEnter={()=>setActive(index)} onClick={()=>{item.run();setPalette(false);setPaletteQuery('');}}><span>{item.title}</span><small>{item.hint}</small></button>):<p className="muted">Ничего не найдено</p>}</div><p className="palette-foot">Enter открывает · Esc закрывает · Ctrl/⌘ K</p></div></div>}
  <Dialog open={help} onOpenChange={setHelp}><DialogContent className="dialog-surface"><DialogTitle>Горячие клавиши</DialogTitle><DialogDescription>Работают вне полей ввода.</DialogDescription><ul className="shortcut-list"><li><kbd>Ctrl</kbd>+<kbd>K</kbd> командная палитра</li><li><kbd>1</kbd>–<kbd>5</kbd> разделы</li><li><kbd>[</kbd> <kbd>]</kbd> предыдущий и следующий период</li><li><kbd>T</kbd> сегодня</li><li><kbd>/</kbd> поиск по журналу</li><li><kbd>?</kbd> эта справка</li></ul></DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null);}}><DialogContent className="dialog-surface">{detail&&<><DialogTitle>{personName(detail.person_id)}</DialogTitle><DialogDescription>{projectName(detail.project_id)} · {reasons[detail.reason]||detail.reason}</DialogDescription><dl className="stat-list"><div><dt>Начало</dt><dd>{formatStamp(detail.start)}</dd></div><div><dt>Конец</dt><dd>{formatStamp(detail.end)}</dd></div><div><dt>Последнее действие</dt><dd>{formatStamp(detail.last)} · {relativeTime(detail.last,now)}</dd></div><div><dt>Длительность</dt><dd>{formatDuration(detail.end-detail.start)}</dd></div></dl>{detail.correction_reason&&<p className="muted">Причина правки: {detail.correction_reason}</p>}{detail.person_id===data?.me?.id&&!detail.open&&<form className="form-stack" onSubmit={async event=>{event.preventDefault();const reason=String(new FormData(event.currentTarget).get('reason')||'');try{await api('dispute',{sessionId:detail.id,reason});setNotice('Спор отправлен. Время само не меняется — его смотрит администратор.');setDetail(null);}catch(error:any){setNotice(error.message||'Спор не отправлен');}}}><label>Почему время неверное<Input name="reason" required maxLength={500}/></label><Button type="submit" variant="outline">Оспорить свою сессию</Button></form>}{admin&&!detail.open&&<Button onClick={()=>{onCorrect(detail);setDetail(null);}}>Исправить интервал</Button>}</>}</DialogContent></Dialog>
 </>;

 return {sessions,showLocal,themeButton,tools,overview,journal,overlays};
}

function formatStamp(value:number|null){
 if(!value)return '—';
 const format=(timeZone?:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone,...(timePrefs.local?{day:'2-digit',month:'2-digit'}: {day:'2-digit',month:'2-digit'}),hour:'2-digit',minute:'2-digit'}).format(value);
 const ny=format('America/New_York');
 if(!timePrefs.local)return ny;
 const local=format(undefined);
 return local===ny?ny:`${ny} · ${local}`;
}
