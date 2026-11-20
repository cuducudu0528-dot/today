/* 브리핑 앱 — 건강 중심 개편 (2026-11-19)
   데이터: Apps Script 웹 앱 → { days, briefings, health }
   점수 계산식: docs/scoring.md 와 아래 SCORE 모듈이 같아야 한다. */
(function(){
"use strict";
const APP_VER="2026-11-20-2";
const DEF_URL="https://script.google.com/macros/s/AKfycbxgoPMdod-SPlKH4gcsmEH5bg1GVYMmRDgropKc4qbqLEBAKAQlR95xIzrz75Zfh2o9dg/exec";
const WEEK=["일","월","화","수","목","금","토"];
const COND=[[1,"😫","지침"],[2,"😮‍💨","피곤"],[3,"🙂","보통"],[4,"😊","좋음"],[5,"🤩","최고"]];
const WORK=["등","팔","어깨","가슴","하체","유산소","스트레칭"];
const MOOD=["평온","좋음","피곤","스트레스","우울","예민"];
const BRIEF_KINDS=["아침","저녁","주간","월간","마감"];
const KIND_ICON={"아침":"☀️","저녁":"🌙","주간":"🗓️","월간":"📆","마감":"⏰","알림":"🔔","질문":"📝","일본어":"🇯🇵","출발":"🚶","기타":"💬"};
const SYNC_LATE_H=14;   // 이 시간 넘게 새 건강 데이터가 없으면 '동기화 지연'

/* ---------- 아이콘 (한 가지 라인 세트, 24 그리드, 선 1.8) ---------- */
const P={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  foot:'<path d="M7 16.5c-1.7 0-3-1.2-3-3.2C4 9.7 5.4 6 7.6 6c1.6 0 2.4 1.6 2.4 3.7 0 3.4-1.2 6.8-3 6.8z"/><path d="M5 19.5h4"/><path d="M16.5 12.5c1.7 0 3-1.2 3-3.2 0-3.6-1.4-7.3-3.6-7.3-1.6 0-2.4 1.6-2.4 3.7 0 3.4 1.2 6.8 3 6.8z"/><path d="M14.5 15.5h4"/>',
  pulse:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud:'<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 14 6 8z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  spark:'<path d="M12 3l1.8 4.9L19 9.7l-4.6 2.9L15.5 18 12 14.9 8.5 18l1.1-5.4L5 9.7l5.2-1.8z"/>',
  drop:'<path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.8a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6.2 5.5-9.8z"/>',
  lungs:'<path d="M12 4v8M12 12c-1 1-2 1.2-3 1"/><path d="M12 12c1 1 2 1.2 3 1"/><path d="M8.5 8.5C6 8.5 4 12 4 16c0 2 1 3.5 3 3.5s3-1.5 3-4V9.5"/><path d="M15.5 8.5C18 8.5 20 12 20 16c0 2-1 3.5-3 3.5s-3-1.5-3-4V9.5"/>',
  run:'<circle cx="14" cy="4.5" r="1.8"/><path d="M6 20l3.5-5 3 2.5 1.5-5.5 3 3.5h3"/><path d="M9.5 11.5 12 8l3 1"/>',
  bed:'<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  shield:'<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  watch:'<rect x="6.5" y="6.5" width="11" height="11" rx="3"/><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5"/>',
  monitor:'<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>',
  wind:'<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/>',
  coffee:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>'
};
function ico(n,cls){return '<svg class="ico '+(cls||"")+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[n]||"")+'</svg>';}

/* ---------- 유틸 ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
function parseYmd(s){const[y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1);}
function addDays(s,n){const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d);}
function korDate(s){const d=parseYmd(s);return(d.getMonth()+1)+"월 "+d.getDate()+"일 "+WEEK[d.getDay()]+"요일";}
function shortDate(s){const d=parseYmd(s);return(d.getMonth()+1)+"/"+d.getDate()+"("+WEEK[d.getDay()]+")";}
const str=v=>typeof v==="string"?v:(v==null?"":String(v));
const arr=v=>Array.isArray(v)?v:[];
const num=v=>{if(v===""||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function hhmm(x){const t=x instanceof Date?x:new Date(x);return isNaN(t)?"":pad(t.getHours())+":"+pad(t.getMinutes());}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
const avg=a=>{a=a.filter(x=>x!=null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;};
const median=a=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);if(!a.length)return null;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lin=(x,x0,x1)=>clamp((x-x0)/(x1-x0),0,1);   // x0→0, x1→1
function hm(min){if(min==null)return"—";min=Math.round(min);const h=Math.floor(min/60),m=min%60;return h?(h+"시간 "+(m?m+"분":"")).trim():m+"분";}
function hmHTML(min){if(min==null)return"—";min=Math.round(min);const h=Math.floor(min/60),m=min%60;return(h?h+"<small>시간</small> ":"")+(m||!h?m+"<small>분</small>":"");}
const fmtN=n=>n==null?"—":Math.round(n).toLocaleString("ko-KR");
function deltaHTML(d,unit,goodUp,digits){if(d==null||!isFinite(d))return"";const r=digits?Math.round(d*10)/10:Math.round(d);
  if(r===0)return '<span class="delta flat">– 0'+(unit||"")+'</span>';
  const good=goodUp===undefined?null:(r>0)===goodUp;const cls=good===null?"flat":good?"up":"down";
  return '<span class="delta '+cls+'">'+(r>0?"▲ +":"▼ ")+Math.abs(r).toLocaleString("ko-KR")+(unit||"")+'</span>';}
function minOfDay(t){if(!t)return null;const m=String(t).match(/(\d{1,2}):(\d{2})/);if(!m)return null;return(+m[1])*60+(+m[2]);}
function bedMin(t){const v=minOfDay(t);if(v==null)return null;return v<12*60?v+1440:v;} // 밤 12시 넘어 잠들어도 이어지게

/* ---------- 상태 ---------- */
let TODAY=ymd(new Date());
const S={days:{},briefs:[],health:null,healthErr:"",loadedAt:null,online:null};
let today=blankDay(TODAY),filter="전체",sleepRange=7,healthRange=14;
function blankDay(id){return{date:id,water:0,coffee:0,workout:[],condition:[],mood:[],supplement:false,alcohol:false,breakfast:"",lunch:"",dinner:"",memo:"",reflected:false};}
function normDay(id,d){d=d||{};const b=v=>v===true||String(v).toUpperCase()==="TRUE";
  return{date:id,water:num(d.water)||0,coffee:num(d.coffee)||0,workout:(Array.isArray(d.workout)?d.workout:str(d.workout).split(",")).map(s=>str(s).trim()).filter(w=>WORK.includes(w)),
  condition:str(d.condition).split(",").map(x=>num(x.trim())).filter(x=>x>=1&&x<=5),mood:str(d.mood).split(",").map(x=>x.trim()).filter(x=>MOOD.includes(x)),supplement:b(d.supplement),alcohol:b(d.alcohol),breakfast:str(d.breakfast),lunch:str(d.lunch),dinner:str(d.dinner),memo:str(d.memo),reflected:b(d.reflected)};}
const CFG={url:DEF_URL,key:(ls("ys_key")||"").trim()};

/* ---------- 테마: 시스템(기본)/라이트/다크 ---------- */
const mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
const themePref=()=>ls("ys_theme")||"system";
function applyTheme(){const p=themePref();const dark=p==="dark"||(p==="system"&&mq&&mq.matches);
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  $("themeColor").setAttribute("content",dark?"#14171C":"#F4F6F8");
  refreshCharts();}
if(mq){const f=()=>{if(themePref()==="system")applyTheme();};mq.addEventListener?mq.addEventListener("change",f):mq.addListener(f);}
function setTheme(p){ls("ys_theme",p);applyTheme();renderMe();}

/* =====================================================================
   SCORE — 점수 계산식 (docs/scoring.md)
   · 수면 점수 100 = 길이 40 + 효율 20 + 회복 수면(깊은+렘) 20 + 연속성 10 + 규칙성 10
   · 컨디션 점수 100 = 수면 점수 35% + HRV(개인 기준 대비) 25% + 안정심박(개인 기준 대비) 25% + 최근 3일 수면 15%
   · 없는 항목은 빼고 나머지 비율로 다시 나눈다. 필수 항목이 없으면 점수를 만들지 않는다.
   ===================================================================== */
const SCORE={
  sleep(n,prev){ // n: 수면 기록, prev: 그 전 날짜들의 기록(최근 것부터)
    if(!n||n.asleep==null||n.asleep<60)return null;
    const parts=[];
    parts.push({k:"길이",w:40,v:n.asleep>600?1-lin(n.asleep,600,720)*0.25:lin(n.asleep,240,420)});
    if(n.inBed)parts.push({k:"효율",w:20,v:lin(n.asleep/n.inBed,0.75,0.92)});
    const st=(n.deep||0)+(n.rem||0);if(n.deep!=null&&n.rem!=null)parts.push({k:"회복 수면",w:20,v:lin(st/n.asleep,0.15,0.38)});
    if(n.awakeCount!=null)parts.push({k:"연속성",w:10,v:1-lin(n.awakeCount,3,12)*0.7-lin(n.awakeMin||0,10,60)*0.3});
    else if(n.awakeMin!=null)parts.push({k:"연속성",w:10,v:1-lin(n.awakeMin,10,60)});
    const beds=arr(prev).slice(0,7).map(x=>bedMin(x.bed)).filter(x=>x!=null);
    const b=bedMin(n.bed);
    if(beds.length>=3&&b!=null)parts.push({k:"규칙성",w:10,v:1-lin(Math.abs(b-median(beds)),30,120)});
    const W=parts.reduce((a,p)=>a+p.w,0);
    return{score:Math.round(parts.reduce((a,p)=>a+p.w*clamp(p.v,0,1),0)/W*100),parts};
  },
  condition(date){ // date 아침 기준
    const H=S.health;if(!H)return{missing:"건강 데이터 연결 필요"};
    const n=sleepOn(date);const ss=n?SCORE.sleep(n,sleepsBefore(date)):null;
    if(!ss)return{missing:"지난밤 수면 기록이 아직 없어요"};
    const ref=addDays(date,-1);              // HRV·안정심박은 하루를 다 채운 '어제' 값
    const base=k=>{const v=[];for(let i=2;i<=31;i++){const x=metric(addDays(date,-i),k);if(x!=null)v.push(x);}return v;};
    const parts=[{k:"수면",w:35,v:ss.score/100}];
    const hrv=metric(ref,"HRV"),hb=base("HRV");
    if(hrv!=null&&hb.length>=7)parts.push({k:"HRV",w:25,v:lin(hrv/median(hb),0.75,1.05),raw:hrv,base:median(hb)});
    const rhr=metric(ref,"안정심박"),rb=base("안정심박");
    if(rhr!=null&&rb.length>=7)parts.push({k:"안정심박",w:25,v:1-lin(rhr-median(rb),-1,8),raw:rhr,base:median(rb)});
    const last3=[0,1,2].map(i=>sleepOn(addDays(date,-i))).filter(Boolean).map(x=>x.asleep);
    if(last3.length>=2)parts.push({k:"최근 3일 수면",w:15,v:lin(avg(last3),300,420),raw:avg(last3)});
    if(parts.length<2)return{missing:"분석 데이터 부족 (HRV·안정심박 기록이 더 필요해요)"};
    const W=parts.reduce((a,p)=>a+p.w,0);
    return{score:Math.round(parts.reduce((a,p)=>a+p.w*clamp(p.v,0,1),0)/W*100),parts,sleep:ss,night:n};
  },
  label(s){return s>=85?["아주 좋음",""]:s>=70?["좋은 상태",""]:s>=55?["보통","gray"]:s>=40?["회복 필요","warn"]:["충분한 휴식 필요","bad"];}
};

/* ---------- 건강 데이터 접근 ---------- */
function sleepOn(date){const H=S.health;return H?arr(H.sleep).find(x=>x.date===date)||null:null;}
function sleepsBefore(date){const H=S.health;return H?arr(H.sleep).filter(x=>x.date<date).sort((a,b)=>b.date.localeCompare(a.date)):[];}
function metric(date,k){const H=S.health;const d=H&&H.daily&&H.daily[date];return d&&d[k]!=null?num(d[k]):null;}
function latestSleep(){const H=S.health;if(!H)return null;const a=arr(H.sleep).slice().sort((a,b)=>b.date.localeCompare(a.date));return a[0]||null;}
function lastHealthAt(){const H=S.health;if(!H)return"";return[H.healthAt,H.haeAt].filter(Boolean).sort().pop()||"";}
function healthAge(){const a=lastHealthAt();if(!a)return null;const t=new Date(String(a).replace(" ","T")+":00+09:00");return isNaN(t)?null:(Date.now()-t)/36e5;}
function syncState(){
  if(!CFG.key)return["연결되지 않음","bad","앱 비밀번호를 넣어 주세요"];
  if(S.healthErr)return/아직 없어요/.test(S.healthErr)?["동기화 대기","warn","Health Auto Export 첫 전송을 기다리는 중이에요"]:["오류","bad",S.healthErr];
  if(!S.health)return S.loadedAt?["데이터 없음","gray","서버가 아직 건강 데이터를 보내지 않아요"]:["동기화 대기","warn","불러오는 중이에요"];
  const age=healthAge();
  if(age!=null&&age>SYNC_LATE_H)return["동기화 지연","warn","마지막 건강 데이터 "+lastHealthAt()+" · 폰 잠금을 풀거나 뒤를 톡톡해 주세요"];
  return["연결됨","","마지막 건강 데이터 "+(lastHealthAt()||"—")];
}

/* ---------- 토스트·시트 ---------- */
let toastT=null;
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove("on"),1800);}
function setStatus(t,state){$("status").textContent=t;$("sDot").className="sd"+(state==="off"?" off":state==="wait"?" wait":"");}
function openSheet(title,html){$("sheetTitle").textContent=title;$("sheetBody").innerHTML=html;$("sheetBody").scrollTop=0;$("scrim").classList.add("on");$("sheet").classList.add("on");}
function closeSheet(){$("scrim").classList.remove("on");$("sheet").classList.remove("on");}
$("sheetClose").innerHTML=ico("x","ico-sm");$("scrim").onclick=closeSheet;$("sheetClose").onclick=closeSheet;

/* ---------- 라우팅 (탭 6개) ---------- */
const TABS=[["home","홈","home"],["sleep","수면","moon"],["health","건강","heart"],["brief","브리핑","doc"],["plan","일정","cal"],["me","내 정보","user"]];
const ALIAS={today:"home",inbox:"brief",archive:"brief",log:"health",stats:"health"};
$("tabs").innerHTML=TABS.map(([id,l,i])=>'<a href="#'+id+'" data-tab="'+id+'">'+ico(i)+l+(id==="brief"?'<span class="badge-n" id="badge"></span>':"")+'</a>').join("");
function curTab(){let t=(location.hash||"").replace("#","");t=ALIAS[t]||t;return TABS.some(x=>x[0]===t)?t:"home";}
function route(keepScroll){const t=curTab();
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id==="v-"+t));
  document.querySelectorAll(".tabbar a").forEach(a=>a.classList.toggle("on",a.dataset.tab===t));
  $("fab").style.display=(t==="home")?"flex":"none";
  if(!keepScroll)window.scrollTo(0,0);renderTab(t);if(t==="brief")markSeen();}
window.addEventListener("hashchange",()=>route(false));
$("fab").innerHTML=ico("plus");$("fab").onclick=()=>{location.hash="#health";setTimeout(()=>{const e=$("logCard");if(e)e.scrollIntoView({behavior:"smooth",block:"start"});},150);};

/* ---------- 읽음 표시 ---------- */
const seenAt=()=>Number(ls("ys_seen")||0);
const isUnread=b=>{const t=new Date(b.createdAt).getTime();return!!t&&t>seenAt();};
function renderBadge(){const n=S.briefs.filter(isUnread).length;const b=$("badge");if(!b)return;b.textContent=n>9?"9+":n;b.style.display=n?"flex":"none";}
function markSeen(){const m=S.briefs.reduce((x,b)=>Math.max(x,new Date(b.createdAt).getTime()||0),0);if(m>seenAt())ls("ys_seen",String(m));renderBadge();}

/* ---------- 브리핑에서 꺼내 쓰는 값 ---------- */
function morningBrief(){return S.briefs.find(b=>str(b.date)===TODAY&&b.kind==="아침")||null;}
function heroBrief(){const t=S.briefs.filter(b=>str(b.date)===TODAY&&BRIEF_KINDS.includes(str(b.kind)));const h=new Date().getHours();
  return(h>=18&&t.find(b=>b.kind==="저녁"))||t.find(b=>b.kind==="아침")||t[0]||null;}
function briefAI(field){const b=morningBrief();if(!b)return"";const a=b.ai||{};return str(a[field]);}
function weatherTile(){const b=morningBrief()||heroBrief();if(!b)return null;return arr(b.tiles).find(t=>/날씨/.test(str(t.label)))||null;}

/* ---------- 자동 요약 문장 (AI가 아닌 규칙, 'AI 해석'과 구분해 표시) ---------- */
function condSummary(c){
  const p=k=>c.parts.find(x=>x.k===k);const out=[];
  const n=c.night;const prev=sleepsBefore(n.date).slice(0,7);const pa=avg(prev.map(x=>x.asleep));
  if(pa!=null){const d=n.asleep-pa;out.push("지난밤 "+hm(n.asleep)+" 잤어요"+(Math.abs(d)>=15?" (최근 평균보다 "+hm(Math.abs(d))+" "+(d>0?"더":"덜")+")":"")+".");}
  else out.push("지난밤 "+hm(n.asleep)+" 잤어요.");
  const h=p("HRV"),r=p("안정심박");
  if(h&&r){const good=h.v>=0.6&&r.v>=0.6,bad=h.v<0.35||r.v<0.35;out.push(good?"HRV·안정심박이 평소 범위라 회복 지표는 안정적이에요.":bad?"HRV나 안정심박이 평소보다 좋지 않아 몸이 아직 회복 중일 수 있어요.":"회복 지표는 평소와 비슷한 편이에요.");}
  const l3=p("최근 3일 수면");if(l3&&l3.raw<360)out.push("최근 3일 평균 수면이 "+hm(l3.raw)+"로 짧아요. 오늘은 무리하지 않는 게 좋아요.");
  return out.slice(0,2).join(" ");
}
function sleepSummary(n){
  const prev=sleepsBefore(n.date).slice(0,7);const pa=avg(prev.map(x=>x.asleep));const out=[];
  if(pa!=null&&prev.length>=3){const d=n.asleep-pa;out.push(Math.abs(d)<15?"평소와 비슷하게 잤어요.":"평소보다 "+hm(Math.abs(d))+" "+(d>0?"더 잤어요.":"덜 잤어요."));}
  if(n.inBed){const e=n.asleep/n.inBed;out.push(e>=0.9?"잠든 뒤 거의 깨지 않았어요.":e<0.85?"누워서 깨어 있던 시간이 "+hm(n.inBed-n.asleep)+"로 길었어요.":"");}
  if(n.awakeCount>=10)out.push("밤사이 "+n.awakeCount+"번 깼어요.");
  return out.filter(Boolean).join(" ")||"수면 기록이 쌓이면 더 자세히 알려 드릴게요.";
}
function aiBlock(text,isAI){return '<div class="ai-tag'+(isAI?"":" rule")+'">'+ico(isAI?"spark":"list","ico-sm")+(isAI?"AI 해석":"자동 요약")+'</div><div class="ai">'+esc(text)+'</div>';}

/* =====================================================================
   홈
   ===================================================================== */
function greeting(){const h=new Date().getHours();return h<5?["늦은 밤이에요","moon"]:h<11?["오늘도 좋은 아침이에요","sun"]:h<17?["좋은 오후예요","sun"]:h<21?["좋은 저녁이에요","moon"]:["오늘도 수고했어요","moon"];}
const WAVE='<svg class="wave" viewBox="0 0 260 150" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--wave-b)" stop-opacity="0"/><stop offset=".55" stop-color="var(--wave-b)"/><stop offset="1" stop-color="var(--wave-a)"/></linearGradient><linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--wave-a)" stop-opacity="0"/><stop offset="1" stop-color="var(--wave-a)"/></linearGradient><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="wm"><rect width="260" height="150" fill="url(#wf)"/></mask></defs><g mask="url(#wm)"><path d="M0 120C60 120 90 70 140 62S220 30 260 8V150H0Z" fill="url(#wg1)"/><path d="M40 150C90 120 130 104 175 92S235 60 260 46V150Z" fill="url(#wg2)" opacity=".7"/></g></svg>';
function ring(pct,color){const r=30,c=2*Math.PI*r,off=c*(1-clamp(pct,0,1));
  return '<div class="ring"><svg viewBox="0 0 72 72"><circle class="trk" cx="36" cy="36" r="'+r+'" fill="none" stroke-width="8"/><circle class="val" cx="36" cy="36" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg></div>';}
function stageBar(n){const tot=(n.deep||0)+(n.core||0)+(n.rem||0)+(n.awakeMin||0);if(!tot)return"";
  const seg=(v,c)=>v?'<i style="flex:'+v+';background:'+c+'"></i>':"";
  return '<div class="stagebar" title="단계별 비율">'+seg(n.deep,"var(--deep)")+seg(n.core,"var(--core)")+seg(n.rem,"var(--rem)")+seg(n.awakeMin,"var(--awake)")+'</div>'+
  '<div class="legend4"><div><span class="dot" style="background:var(--deep)"></span>깊은 수면<b>'+hm(n.deep)+'</b></div><div><span class="dot" style="background:var(--core)"></span>얕은 수면<b>'+hm(n.core)+'</b></div><div><span class="dot" style="background:var(--rem)"></span>REM 수면<b>'+hm(n.rem)+'</b></div><div><span class="dot" style="background:var(--awake)"></span>깨어 있음<b>'+hm(n.awakeMin)+'</b></div></div>';}

function condCard(){
  const c=SCORE.condition(TODAY);let h='<div class="card cond">'+WAVE+'<div class="row"><h3 style="margin:0;font-size:var(--fs-h3);font-weight:750">오늘의 컨디션</h3>';
  if(c.missing){return h+'<span class="badge gray">대기</span></div><div class="empty"><b>'+esc(c.missing)+'</b>아침에 폰 뒤를 톡톡해 건강 백업을 보내면 점수가 계산돼요.</div></div>';}
  const[lab,cls]=SCORE.label(c.score);const y=SCORE.condition(addDays(TODAY,-1));
  h+='<span class="badge '+cls+'">'+lab+'</span></div><div class="score"><span class="num">'+c.score+'</span><span class="of">/100</span>'+(y.score!=null?deltaHTML(c.score-y.score,"",true):"")+'</div>';
  const hp=c.parts.find(p=>p.k==="HRV"),rp=c.parts.find(p=>p.k==="안정심박");
  h+='<div class="recov">'+(hp?'<span class="chip">HRV <b>'+Math.round(hp.raw)+'</b>ms · 평소 '+Math.round(hp.base)+'</span>':"")+(rp?'<span class="chip">안정심박 <b>'+Math.round(rp.raw)+'</b> · 평소 '+Math.round(rp.base)+'</span>':"")+'</div>';
  const ai=briefAI("condition");h+=aiBlock(ai||condSummary(c),!!ai);
  return h+'</div>';
}
function sleepCard(link){
  let n=sleepOn(TODAY),stale=false;if(!n){n=latestSleep();stale=!!n;}
  let h='<div class="card"><div class="card-hd">'+ico("moon","c-blue")+'<h3>수면 분석</h3>'+(link?'<a class="more" href="#sleep">더보기'+ico("chev","ico-sm")+'</a>':"")+'</div>';
  if(!n)return h+'<div class="empty"><b>수면 기록이 없어요</b>Apple Watch를 차고 자고, 아침에 폰 뒤를 톡톡해 주세요.</div></div>';
  const s=SCORE.sleep(n,sleepsBefore(n.date));const p=sleepsBefore(n.date)[0];const ps=p?SCORE.sleep(p,sleepsBefore(p.date)):null;
  const eff=n.inBed?n.asleep/n.inBed:null;
  if(stale)h+='<div class="cap" style="margin:-4px 0 10px">'+shortDate(n.date)+' 아침 기준 · 오늘 기록은 아침 백업 후 반영돼요</div>';
  h+='<div class="sleep-top"><div class="l"><div class="big">'+hmHTML(n.asleep)+'</div><div class="sc">수면 점수 <b>'+(s?s.score+"점":"—")+'</b> '+(s&&ps?deltaHTML(s.score-ps.score,"",true):"")+'</div></div><div class="vdiv"></div>'+
     '<div class="eff">'+ring(eff||0,"var(--accent)")+'<div class="t"><small>수면 효율</small><b>'+(eff?Math.round(eff*100)+"%":"—")+'</b></div></div></div>';
  h+=stageBar(n);
  const ai=stale?"":briefAI("sleep");
  h+='<div class="insight"><span class="bulb">'+ico("bulb")+'</span><div>'+(ai?'<div class="ai-tag">'+ico("spark","ico-sm")+'AI 해석</div>':"")+esc(ai||sleepSummary(n))+'</div></div>';
  return h+'</div>';
}
function minisRow(){
  const ref=metric(TODAY,"걸음")!=null&&new Date().getHours()>=20?TODAY:addDays(TODAY,-1);const pre=addDays(ref,-1);
  const lab=ref===TODAY?"오늘":"어제";
  const m=(icon,cls,name,k,unit,goodUp)=>{const v=metric(ref,k),pv=metric(pre,k);
    return '<div class="mini"><div class="lb"><span class="'+cls+'">'+ico(icon,"ico-sm")+'</span>'+name+'</div><div class="v">'+(v==null?"—":fmtN(v))+(v!=null&&unit?'<small>'+unit+'</small>':"")+'</div>'+(v!=null&&pv!=null?deltaHTML(v-pv,"",goodUp):'<span class="cap">'+lab+'</span>')+'</div>';};
  return '<div><div class="cap" style="margin:0 4px 6px">'+lab+' 기준 · 그 전날 대비</div><div class="minis">'+m("foot","c-step","걸음 수","걸음","",true)+m("heart","c-heart","안정심박","안정심박","bpm",false)+m("zap","c-zap","활동량","활동에너지","kcal",true)+'</div></div>';
}
function briefCard(){
  const b=heroBrief();const w=weatherTile();
  let h='<div class="card"><div class="card-hd">'+ico("doc","c-accent")+'<h3>오늘의 브리핑</h3><a class="more" href="#brief">더보기'+ico("chev","ico-sm")+'</a></div>';
  const tx=b?'<b>'+esc(str(b.headline)||"오늘의 브리핑")+'</b>'+esc(str(b.sub))+'<div class="cap" style="margin-top:6px">'+(KIND_ICON[b.kind]||"")+" "+esc(b.kind)+" · "+hhmm(b.createdAt)+'</div>'
    :'<b>'+(new Date().getHours()<7?"아침 7시에 브리핑이 도착해요":"아직 오늘 브리핑이 없어요")+'</b>도착하면 여기에 바로 떠요.';
  const wx='<div class="wx">'+ico(w&&/비|눈|흐/.test(str(w.value)+str(w.note))?"cloud":"sun")+'<b>'+esc(w?str(w.value):"날씨")+'</b><small>'+esc(w?str(w.note):"브리핑 대기")+'</small></div>';
  h+='<div class="brief"><div class="tx">'+tx+'</div>'+wx+'</div>';
  if(b)h+='';
  return h+'</div>';
}
function todayPlanCard(){
  const items=planItems(TODAY);const b=morningBrief();const prep=[];
  if(b){arr(b.sections).forEach(s=>{if(/챙길|준비/.test(str(s.title)))arr(s.items).forEach(i=>prep.push(str(i)));});}
  let h='<div class="card"><div class="card-hd">'+ico("cal","c-blue")+'<h3>오늘 일정 · 준비</h3><a class="more" href="#plan">일정'+ico("chev","ico-sm")+'</a></div>';
  if(!items.length&&!prep.length)return h+'<div class="empty" style="padding-top:0">오늘 등록된 일정이 없어요.</div></div>';
  h+='<div class="list">'+items.slice(0,5).map(i=>'<div class="li"><div class="time">'+esc(i.time||"종일")+'</div><div class="m"><div class="t">'+esc(i.title)+'</div>'+(i.sub?'<div class="s">'+esc(i.sub)+'</div>':"")+'</div></div>').join("")+'</div>';
  if(prep.length)h+='<div class="lbl" style="margin-left:0">🎒 준비할 것</div><ul class="tips">'+prep.slice(0,4).map(p=>'<li>'+esc(p)+'</li>').join("")+'</ul>';
  return h+'</div>';
}
function alertsCard(){
  const b=morningBrief();const al=b?arr(b.alerts).map(str):[];
  const notes=S.briefs.filter(x=>str(x.date)===TODAY&&!BRIEF_KINDS.includes(str(x.kind))).slice(0,3);
  if(!al.length&&!notes.length)return"";
  let h='<div class="card"><div class="card-hd">'+ico("bell","c-zap")+'<h3>중요한 알림</h3><a class="more" href="#brief">모두'+ico("chev","ico-sm")+'</a></div>';
  h+=al.map(a=>'<div class="alert" style="margin:0 0 8px">'+esc(a)+'</div>').join("");
  h+='<div class="list">'+notes.map(noticeRow).join("")+'</div>';
  return h+'</div>';
}
function renderHome(){
  const[g,gi]=greeting();
  let h='<div class="hdr"><div class="av">'+ico("user")+'</div><div class="hi"><small>안녕하세요, 연서 씨</small><b>'+g+'<span class="c-zap gi">'+ico(gi,"ico-sm")+'</span></b></div><a class="iconbtn" href="#me" aria-label="설정">'+ico("gear")+'</a></div>';
  h+='<div class="home-grid"><div class="col stack">'+condCard()+sleepCard(true)+'</div><div class="col stack">'+minisRow()+briefCard()+alertsCard()+todayPlanCard()+'</div></div>';
  $("v-home").innerHTML=h;
  bindNoticeRows($("v-home"));
}

/* =====================================================================
   수면
   ===================================================================== */
let sleepView=null; // 수면 탭에서 보고 있는 날짜(null = 가장 최근)
function sleepDates(){const H=S.health;return H?arr(H.sleep).map(x=>x.date).sort():[];}
function renderSleep(){
  const H=S.health;let h='<div class="page-title">수면</div><div class="page-sub">Apple Watch 수면 기록 · 점수는 앱이 계산해요</div>';
  if(!H||!arr(H.sleep).length){$("v-sleep").innerHTML=h+'<div class="card"><div class="empty"><b>수면 데이터가 없어요</b>'+esc(syncState()[2])+'</div></div>';return;}
  const D=sleepDates();const latest=D[D.length-1];
  if(!sleepView||!D.includes(sleepView))sleepView=latest;
  const n=sleepOn(sleepView);const s=SCORE.sleep(n,sleepsBefore(n.date));const i=D.indexOf(sleepView);
  h+='<div class="stack">';
  // 오늘 기록이 아직 없을 때
  if(latest!==TODAY&&sleepView===latest)h+='<div class="notice">'+ico("clock","ico-sm")+'<div><b>오늘 수면이 아직 안 들어왔어요</b>'+esc(shortDate(addDays(latest,-1)))+' 밤 기록을 보여 줘요. 폰 잠금을 풀고 Health Auto Export를 열면 보내져요.</div></div>';
  // 날짜 이동 + 점수
  const prev=sleepsBefore(n.date).slice(0,7);const pa=avg(prev.map(x=>x.asleep));
  h+='<div class="card"><div class="dnav"><button id="sPrev" aria-label="이전 밤"'+(i<=0?" disabled":"")+'>'+ico("chev","ico-sm flip")+'</button><b>'+(n.date===TODAY?"어젯밤":shortDate(addDays(n.date,-1))+" 밤")+'</b><button id="sNext" aria-label="다음 밤"'+(i>=D.length-1?" disabled":"")+'>'+ico("chev","ico-sm")+'</button></div>'+
     '<div class="sleep-hero"><div class="rwrap">'+ring(s?s.score/100:0,"var(--blue)")+'<div class="sc-in"><b>'+(s?s.score:"—")+'</b><small>수면 점수</small></div></div>'+
     '<div class="r"><div class="big">'+hmHTML(n.asleep)+'</div>'+(pa!=null&&prev.length>=3?'<div class="cap">최근 평균 '+hm(pa)+' '+deltaHTML((n.asleep-pa),"분",true)+'</div>':"")+
     '<div class="cap">'+esc(hhmmStr(n.bed))+' 잠듦 → '+esc(hhmmStr(n.wake))+' 기상</div>'+(s?'<span class="badge '+SCORE.label(s.score)[1]+'">'+SCORE.label(s.score)[0]+'</span>':"")+'</div></div>'+
     stageBar(n)+stagePct(n)+'</div>';
  // 수면 부채·오늘 밤 목표
  const R7=lastSleeps(7);const debt=R7.reduce((a,x)=>a+Math.max(0,420-(x.asleep||0)),0);const tb=targetBed(debt);
  h+='<div class="card"><div class="card-hd">'+ico("moon","c-blue")+'<h3>오늘 밤 목표</h3></div><div class="kv">'+
     '<div><small>목표 취침</small><b>'+tb.bed+'</b></div><div><small>내일 예상 기상</small><b>'+tb.wake+'</b></div>'+
     '<div><small>최근 7일 수면 부채</small><b>'+(R7.length?hm(debt):"—")+'</b></div><div><small>7시간 넘게 잔 날</small><b>'+R7.filter(x=>x.asleep>=420).length+' / '+R7.length+'일</b></div></div>'+
     '<div class="cap" style="margin-top:12px">'+esc(tb.why)+'</div></div>';
  // 시간·효율
  const eff=n.inBed?n.asleep/n.inBed:null;
  h+='<div class="card"><div class="card-hd">'+ico("clock","c-blue")+'<h3>시간과 효율</h3></div><div class="kv">'+
    '<div><small>침대에 있던 시간</small><b>'+hm(n.inBed)+'</b></div><div><small>실제로 잔 시간</small><b>'+hm(n.asleep)+'</b></div>'+
    '<div><small>수면 효율</small><b>'+(eff?Math.round(eff*100)+"%":"—")+'</b></div><div><small>'+(n.awakeCount!=null?"깬 횟수":"중간에 깬 시간")+'</small><b>'+(n.awakeCount!=null?n.awakeCount+"번 · "+hm(n.awakeMin):hm(n.awakeMin))+'</b></div></div></div>';
  // 점수 구성
  if(s)h+='<div class="card"><div class="card-hd">'+ico("list","c-accent")+'<h3>점수 구성</h3></div><div class="pbars">'+s.parts.map(p=>'<div class="pb"><div class="t"><span>'+p.k+'</span><b>'+Math.round(p.v*p.w)+'<small> / '+p.w+'</small></b></div><div class="bar"><i style="width:'+Math.round(clamp(p.v,0,1)*100)+'%"></i></div></div>').join("")+'</div><div class="cap" style="margin-top:10px">없는 항목은 빼고 나머지로 100점을 다시 나눠요.</div></div>';
  // 추세
  h+='<div class="sec-title">추세 <span class="seg" id="sRange"><button data-r="7">7일</button><button data-r="30">30일</button></span></div>';
  h+='<div class="card"><div class="card-hd"><h3>단계별 수면 시간</h3></div><div class="chartbox"><canvas id="chSleep"></canvas></div></div>';
  const R=lastSleeps(sleepRange);const beds=R.map(x=>bedMin(x.bed)).filter(x=>x!=null),wakes=R.map(x=>minOfDay(x.wake)).filter(x=>x!=null);
  const sd=a=>{if(a.length<3)return null;const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)*(x-m))));};
  const bsd=sd(beds),wsd=sd(wakes);
  h+='<div class="card"><div class="card-hd">'+ico("bed","c-blue")+'<h3>규칙성</h3><span class="cap">최근 '+R.length+'일</span></div><div class="kv">'+
     '<div><small>평균 수면</small><b>'+hm(avg(R.map(x=>x.asleep)))+'</b></div><div><small>7시간 넘게 잔 날</small><b>'+R.filter(x=>x.asleep>=420).length+'일</b></div>'+
     '<div><small>평균 잠든 시각</small><b>'+(beds.length?clockStr(avg(beds)):"—")+'</b></div><div><small>평균 기상 시각</small><b>'+(wakes.length?clockStr(avg(wakes)):"—")+'</b></div>'+
     '<div><small>잠드는 시각 들쭉날쭉</small><b>'+(bsd==null?"—":"±"+hm(bsd))+'</b></div><div><small>기상 시각 들쭉날쭉</small><b>'+(wsd==null?"—":"±"+hm(wsd))+'</b></div></div>'+
     '<div class="chartbox sm"><canvas id="chBed"></canvas></div></div>';
  // 분석·제안
  const ai=n.date===TODAY?briefAI("sleep"):"";
  h+='<div class="card"><div class="card-hd">'+ico("spark","c-blue")+'<h3>분석과 제안</h3></div>'+aiBlock(ai||sleepTrendText(R),!!ai)+'<div class="lbl" style="margin-left:0">개선 제안</div><ul class="tips">'+sleepTips(R,bsd).map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></div>';
  h+='</div>';
  $("v-sleep").innerHTML=h;
  document.querySelectorAll("#sRange button").forEach(b=>{b.classList.toggle("on",+b.dataset.r===sleepRange);b.onclick=()=>{sleepRange=+b.dataset.r;renderSleep();};});
  const go=d=>{const j=D.indexOf(sleepView)+d;if(j>=0&&j<D.length){sleepView=D[j];const y=window.scrollY;renderSleep();window.scrollTo(0,y);}};
  $("sPrev").onclick=()=>go(-1);$("sNext").onclick=()=>go(1);
  drawSleepCharts(R);
}
/* 단계 비율: 개인 30일 평균과 비교 */
function stagePct(n){const tot=(n.deep||0)+(n.core||0)+(n.rem||0);if(!tot||n.deep==null||n.rem==null)return"";
  const past=sleepsBefore(n.date).slice(0,30).filter(x=>x.deep!=null&&x.rem!=null&&x.asleep);
  const pr=k=>{const a=avg(past.map(x=>x[k]/((x.deep||0)+(x.core||0)+(x.rem||0)||x.asleep)));return a==null?null:a*100;};
  const cell=(lab,k)=>{const v=n[k]/tot*100,b=past.length>=5?pr(k):null;return '<div><small>'+lab+'</small><b>'+Math.round(v)+'%</b>'+(b!=null?'<span class="cap">평소 '+Math.round(b)+'%</span>':"")+'</div>';};
  return '<div class="pct3">'+cell("깊은 수면","deep")+cell("REM","rem")+cell("얕은 수면","core")+'</div>';}
/* 오늘 밤 목표 취침: 내일 예상 기상 − 7시간 30분, 부채가 3시간 넘으면 30분 앞당김.
   주말 기상은 평일 기상 + 1시간 30분까지만 늦춰 잡는다(리듬이 무너지지 않게). */
function targetBed(debt){
  const all=arr(S.health&&S.health.sleep).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const wakeMed=wk=>{const a=all.filter(x=>{const d=parseYmd(x.date).getDay();return(d>=1&&d<=5)===wk;}).slice(0,10).map(x=>minOfDay(x.wake)).filter(x=>x!=null);return a.length>=3?median(a):null;};
  const tm=parseYmd(addDays(TODAY,1)).getDay(),wkday=tm>=1&&tm<=5;
  const wd=wakeMed(true)??390;let w=wd,why="평일 기상 시각"+(wakeMed(true)!=null?"(최근 중간값)":"(기본값)");
  if(!wkday){const we=wakeMed(false);w=Math.min(we??wd+90,wd+90);why="주말이라 평일 기상보다 최대 1시간 30분 늦게 잡은 기상 시각";}
  const extra=debt>=180?30:0;
  return{wake:clockStr(w),bed:clockStr(w-450-extra+1440),
    why:why+"에서 7시간 30분을 뺐어요."+(extra?" 최근 7일 부족한 잠이 "+hm(debt)+"라 30분 더 앞당겼어요.":"")};}
function hhmmStr(t){const m=String(t||"").match(/(\d{1,2}:\d{2})/);return m?m[1]:"—";}
function clockStr(mins){mins=Math.round(mins)%1440;return pad(Math.floor(mins/60))+":"+pad(mins%60);}
function lastSleeps(n){const out=[];for(let i=n-1;i>=0;i--){const x=sleepOn(addDays(TODAY,-i));if(x)out.push(x);}return out;}
function sleepTrendText(R){if(R.length<3)return"기록이 3일 이상 쌓이면 추세를 알려 드릴게요.";
  const a=avg(R.map(x=>x.asleep));const short=R.filter(x=>x.asleep<360).length;
  const wk=R.filter(x=>{const d=parseYmd(x.date).getDay();return d>=1&&d<=5;}),we=R.filter(x=>{const d=parseYmd(x.date).getDay();return d===0||d===6;});
  let t="최근 "+R.length+"일 평균 "+hm(a)+" 잤어요. 6시간 미만인 날이 "+short+"일이에요.";
  if(wk.length>=2&&we.length>=1){const d=avg(we.map(x=>x.asleep))-avg(wk.map(x=>x.asleep));if(d>=90)t+=" 주말에 평일보다 "+hm(d)+" 더 자서, 평일 수면이 모자란 걸 몰아서 채우는 패턴이에요.";}
  return t;}
function sleepTips(R,bsd){const t=[];const a=avg(R.map(x=>x.asleep));
  if(a!=null&&a<420)t.push("평균 수면이 7시간보다 "+hm(420-a)+" 짧아요. 잠드는 시각을 15분씩 앞당겨 보세요.");
  if(bsd!=null&&bsd>45)t.push("잠드는 시각이 들쭉날쭉해요. 평일·주말 모두 같은 시각(±30분)에 눕는 게 회복에 가장 도움이 돼요.");
  const ln=R.filter(x=>{const b=bedMin(x.bed);return b!=null&&b>=24*60+60;}).length;if(ln>=Math.ceil(R.length/2))t.push("새벽 1시 넘어 잠든 날이 많아요. 자기 1시간 전 화면 밝기를 낮추고 샤워를 일찍 해 보세요.");
  t.push("카페인은 오후 2시 전에 끝내면 깊은 수면에 도움이 돼요.");
  return t.slice(0,3);}

/* =====================================================================
   건강
   ===================================================================== */
function renderHealth(){
  let h='<div class="page-title">건강</div><div class="page-sub">'+esc(syncState()[2])+'</div><div class="stack">';
  const H=S.health;
  if(!H){$("v-health").innerHTML=h+'<div class="card"><div class="empty"><b>건강 데이터 연결 필요</b>'+esc(syncState()[2])+'</div></div><div class="sec-title">오늘 기록</div>'+logCard()+'</div>';bindLog();return;}
  const ref=addDays(TODAY,-1);const pre=addDays(TODAY,-2);
  const M=(k,name,unit,icon,cls,goodUp,digits,note)=>{const v=metric(ref,k),pv=metric(pre,k);if(v==null)return"";
    return '<div class="metric"><div class="lb"><span class="'+cls+'">'+ico(icon,"ico-sm")+'</span>'+name+'</div><div class="v">'+(digits?(Math.round(v*10)/10):fmtN(v))+'<small>'+unit+'</small></div><div class="n">'+(pv!=null?deltaHTML(v-pv,"",goodUp,digits):"")+(note?" "+note:"")+'</div></div>';};
  const cat=(title,icon,cls,body,chartId)=>body?'<div class="card"><div class="card-hd">'+ico(icon,cls)+'<h3>'+title+'</h3><span class="cap">어제 · 그 전날 대비</span></div><div class="metrics">'+body+'</div>'+(chartId?'<div class="chartbox sm"><canvas id="'+chartId+'"></canvas></div>':"")+'</div>':"";
  h+='<div class="sec-title" style="margin-top:4px">측정 지표 <span class="seg" id="hRange"><button data-r="14">14일</button><button data-r="30">30일</button></span></div>';
  h+=cat("활동","run","c-step",M("걸음","걸음 수","걸음","foot","c-step",true)+M("활동에너지","활동량","kcal","zap","c-zap",true)+M("운동시간","운동 시간","분","run","c-accent",true)+M("거리","이동 거리","km","foot","c-step",true,true)+M("오른층수","오른 층수","층","list","c-blue",true)+M("스탠드시간","서 있던 시간","분","clock","c-blue",true))+stepGrid();
  h+=cat("심장","heart","c-heart",M("안정심박","안정 시 심박","bpm","heart","c-heart",false)+M("HRV","심박 변이도(HRV)","ms","pulse","c-heart",true,true)+M("걷기심박","걸을 때 심박","bpm","pulse","c-heart"))+rangeCard();
  h+=cat("호흡·산소","lungs","c-blue",M("혈중산소","혈중 산소","%","drop","c-blue",true,true)+M("호흡수","수면 중 호흡수","회/분","lungs","c-blue",undefined,true)+M("VO2max","심폐 체력(VO₂max)","","run","c-accent",true,true,"최근 측정"));
  h+='<div class="card"><div class="card-hd">'+ico("shield","c-accent")+'<h3>측정되지 않는 항목</h3></div><div class="cap" style="line-height:1.7">스트레스: Apple Watch에 직접 측정값이 없어 표시하지 않아요.<br>체중·체성분: 건강 앱에 기록이 없어요. 기록하면 여기에 추세가 생겨요.</div></div>';
  h+='<div class="sec-title">오늘 기록 <small>물·커피·컨디션·식사</small></div>'+logCard();
  h+=lifeGrid();
  h+='</div>';
  $("v-health").innerHTML=h;
  document.querySelectorAll("#hRange button").forEach(b=>{b.classList.toggle("on",+b.dataset.r===healthRange);b.onclick=()=>{healthRange=+b.dataset.r;renderHealth();};});
  bindLog();
}
function healthDays(n){const ids=[];for(let i=n;i>=1;i--)ids.push(addDays(TODAY,-i));return ids;}
/* 걸음 달력: 칸 색이 진할수록 많이 걸은 날, 목표(8,000보) 넘으면 체크 */
function stepGrid(){const ids=healthDays(healthRange),G=8000;const v=ids.map(d=>metric(d,"걸음"));const have=v.filter(x=>x!=null);if(!have.length)return"";
  const mx=Math.max(G*1.5,...have);const hit=have.filter(x=>x>=G).length;
  return '<div class="card"><div class="card-hd">'+ico("foot","c-step")+'<h3>걸음 달력</h3><span class="cap">최근 '+healthRange+'일</span></div>'+
  '<div class="sumrow"><div><small>하루 평균</small><b>'+fmtN(avg(have))+'<small>보</small></b></div><div><small>목표 8,000보 달성</small><b>'+hit+'<small> / '+have.length+'일</small></b></div><div><small>가장 많이</small><b>'+fmtN(Math.max(...have))+'<small>보</small></b></div></div>'+
  '<div class="hgrid">'+ids.map((d,i)=>{const x=v[i];const a=x==null?0:clamp(x/mx,0.08,1);const dt=parseYmd(d);
    return '<div class="hc'+(x==null?" none":"")+(x!=null&&x>=G?" hit":"")+'" style="--a:'+a.toFixed(2)+'"><span class="d">'+(dt.getMonth()+1)+'/'+dt.getDate()+'</span><b>'+(x==null?"—":x>=1000?(Math.round(x/100)/10)+"k":x)+'</b>'+'</div>';}).join("")+'</div><div class="cap" style="margin-top:10px">색이 진할수록 많이 걸은 날, 초록 테두리는 8,000보를 넘긴 날이에요.</div></div>';}
/* 평소 범위 막대: 회색 = 최근 30일 범위, 진한 띠 = 평소(중간 50%), 점 = 어제 */
function rangeCard(){const rows=[["안정심박","안정 시 심박","bpm",false],["HRV","심박 변이도","ms",true],["걷기심박","걸을 때 심박","bpm",null]].map(([k,n,u,up])=>{
    const ids=healthDays(30);const a=ids.map(d=>metric(d,k)).filter(x=>x!=null).sort((x,y)=>x-y);const y=metric(addDays(TODAY,-1),k);if(a.length<5||y==null)return"";
    const q=p=>a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];const lo=Math.min(a[0],y),hi=Math.max(a[a.length-1],y),sp=(hi-lo)||1,pos=x=>((x-lo)/sp*100).toFixed(1);
    const q1=q(.25),q3=q(.75);const st=y<q1?"low":y>q3?"high":"mid";
    const word=st==="mid"?"평소와 비슷해요":(st==="high"?"평소보다 높아요":"평소보다 낮아요");const good=st==="mid"||up===null?"":((st==="high")===up?" up":" down");
    return '<div class="rg"><div class="t"><span>'+n+'</span><b>'+Math.round(y)+'<small> '+u+'</small></b></div><div class="rbar"><i class="band" style="left:'+pos(q1)+'%;width:'+(pos(q3)-pos(q1)).toFixed(1)+'%"></i><i class="dot'+good+'" style="left:'+pos(y)+'%"></i></div>'+
      '<div class="cap"><span class="rw'+good+'">'+word+'</span> · 평소 '+Math.round(q1)+'–'+Math.round(q3)+' '+u+'</div></div>';}).join("");
  return rows?'<div class="card"><div class="card-hd">'+ico("pulse","c-heart")+'<h3>평소 범위와 비교</h3><span class="cap">어제 · 최근 30일 기준</span></div><div class="ranges">'+rows+'</div><div class="cap" style="margin-top:12px">진한 띠가 평소 범위(최근 30일의 가운데 50%), 점이 어제 값이에요.</div></div>':"";}
/* 물·커피 7일 표 */
function lifeGrid(){const ids=healthDays(6).concat([TODAY]);
  const row=(lab,k,col,goal)=>'<div class="lr"><span class="ln">'+lab+'</span>'+ids.map(d=>{const x=dayData(d);const v=x?x[k]:0;return '<span class="lc'+(goal&&v>=goal?" ok":"")+'" style="--c:'+col+';--a:'+(v?clamp(v/(goal||4),0.2,1).toFixed(2):0)+'">'+(v||"·")+'</span>';}).join("")+'</div>';
  return '<div class="card"><div class="card-hd">'+ico("drop","c-blue")+'<h3>최근 7일 생활 기록</h3><span class="cap">앱에서 누른 기록</span></div><div class="life">'+
    '<div class="lr hd"><span class="ln"></span>'+ids.map(d=>{const t=parseYmd(d);return '<span class="lc">'+(d===TODAY?"오늘":WEEK[t.getDay()])+'</span>';}).join("")+'</div>'+
    row("💧 물","water","var(--blue)",8)+row("☕ 커피","coffee","var(--zap)",0)+'</div><div class="cap" style="margin-top:10px">물은 8잔을 채운 날에 테두리가 생겨요.</div></div>';}
function logCard(){
  const cups=Array.from({length:Math.max(8,today.water)},(_,i)=>i<today.water);
  return '<div class="card" id="logCard"><div class="card-hd">'+ico("plus","c-accent")+'<h3>오늘 기록</h3><span class="cap">누르면 바로 저장돼요</span></div>'+
  '<div class="counter"><div class="meta"><div class="nm">💧 물</div><div class="big">'+today.water+'<small>/ 8잔</small></div></div><button class="pm" data-act="water-" aria-label="물 빼기">−</button><button class="pm add" data-act="water+" aria-label="물 더하기">＋</button></div>'+
  '<div class="stagebar" style="height:8px;margin:12px 0 16px">'+cups.map(on=>'<i style="flex:1;background:'+(on?"var(--blue)":"transparent")+'"></i>').join("")+'</div>'+
  '<div class="counter"><div class="meta"><div class="nm">☕ 커피</div><div class="big">'+today.coffee+'<small>잔</small></div></div><button class="pm" data-act="coffee-" aria-label="커피 빼기">−</button><button class="pm add" data-act="coffee+" aria-label="커피 더하기">＋</button></div>'+
  '<div class="lbl" style="margin-left:0">컨디션 <small>여러 개 골라도 돼요</small></div><div class="opts cond5" id="oCond">'+COND.map(([n,e,l])=>'<button data-v="'+n+'" class="'+(today.condition.includes(n)?"on":"")+'">'+e+'<small>'+l+'</small></button>').join("")+'</div>'+
  '<div class="lbl" style="margin-left:0">기분 <small>여러 개 골라도 돼요</small></div><div class="opts" id="oMood">'+MOOD.map(m=>'<button data-v="'+m+'" class="'+(today.mood.includes(m)?"on":"")+'">'+m+'</button>').join("")+'</div>'+
  '<div class="lbl" style="margin-left:0">운동</div><div class="opts" id="oWork">'+WORK.map(w=>'<button data-v="'+w+'" class="'+(today.workout.includes(w)?"on":"")+'">'+w+'</button>').join("")+'</div>'+
  '<div class="lbl" style="margin-left:0">그 밖에</div><div><div class="trow"><span>💊 영양제</span><button class="toggle '+(today.supplement?"on":"")+'" id="tgSupp" aria-label="영양제"></button></div><div class="trow"><span>🍺 술</span><button class="toggle '+(today.alcohol?"on":"")+'" id="tgAlc" aria-label="술"></button></div></div>'+
  '<div class="lbl" style="margin-left:0">식사 · 메모</div><div class="fields"><input class="field" id="fBreakfast" placeholder="🍳 아침" maxlength="200"><input class="field" id="fLunch" placeholder="🍱 점심" maxlength="200"><input class="field" id="fDinner" placeholder="🍲 저녁" maxlength="200"><textarea class="field" id="fMemo" rows="3" placeholder="📝 메모" maxlength="1000"></textarea></div>'+
  '<div class="saved" id="savedNote">'+esc(savedMsg)+'</div></div>';
}
const FIELDS=[["fBreakfast","breakfast"],["fLunch","lunch"],["fDinner","dinner"],["fMemo","memo"]];
function bindLog(){
  FIELDS.forEach(([id,k])=>{const f=$(id);if(!f)return;f.value=today[k];f.addEventListener("input",e=>{today[k]=e.target.value;changed(false);});});
  const pick=(id,fn)=>{const b=$(id);if(b)b.querySelectorAll("button").forEach(x=>x.onclick=()=>fn(x.dataset.v));};
  pick("oCond",v=>{v=+v;today.condition=today.condition.includes(v)?today.condition.filter(x=>x!==v):today.condition.concat([v]).sort();changed(true);});
  pick("oMood",v=>{today.mood=today.mood.includes(v)?today.mood.filter(x=>x!==v):today.mood.concat([v]);changed(true);});
  pick("oWork",v=>{today.workout=today.workout.includes(v)?today.workout.filter(x=>x!==v):today.workout.concat([v]);changed(true);});
  if($("tgSupp"))$("tgSupp").onclick=()=>{today.supplement=!today.supplement;changed(true);};
  if($("tgAlc"))$("tgAlc").onclick=()=>{today.alcohol=!today.alcohol;changed(true);};
}
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const act=a.dataset.act;
  if(act==="water+")today.water=Math.min(today.water+1,20);if(act==="water-")today.water=Math.max(today.water-1,0);
  if(act==="coffee+")today.coffee=Math.min(today.coffee+1,10);if(act==="coffee-")today.coffee=Math.max(today.coffee-1,0);changed(true);});

/* =====================================================================
   브리핑 (오늘 브리핑 + 받은 알림함)
   ===================================================================== */
function noticeRow(b){
  return '<div class="li tap'+(isUnread(b)?" unread":"")+'" data-bid="'+esc(b.id||"")+'"><div class="ic">'+esc(str(b.icon)||KIND_ICON[b.kind]||"💬")+'</div><div class="m"><div class="t">'+esc(str(b.headline)||"알림")+'</div>'+
    ((str(b.sub)||str(arr(b.items)[0]))?'<div class="s">'+esc(str(b.sub)||str(arr(b.items)[0]))+'</div>':"")+'</div><div class="r">'+(str(b.date)!==TODAY?shortDate(b.date)+" ":"")+hhmm(b.createdAt)+'</div></div>';}
function bindNoticeRows(root){root.querySelectorAll("[data-bid]").forEach(r=>r.onclick=()=>{const b=S.briefs.find(x=>String(x.id)===r.dataset.bid);if(b)openBrief(b);});}
function renderBrief(){
  let h='<div class="page-title">브리핑</div><div class="page-sub">아침·저녁 브리핑과 받은 알림</div>';
  const b=heroBrief();
  if(b){h+='<div class="card tap" id="heroOpen"><div class="card-hd"><span class="badge">'+(KIND_ICON[b.kind]||"")+" "+esc(b.kind)+'</span><span class="cap" style="flex:1">'+hhmm(b.createdAt)+'</span><span class="more">전체 보기'+ico("chev","ico-sm")+'</span></div><div class="bh" style="margin-top:0">'+esc(str(b.headline))+'</div><div class="muted">'+esc(str(b.sub))+'</div></div>';}
  h+='<div class="sec-title">받은 알림</div><div class="chips" id="filters">'+["전체","브리핑","알림","질문"].map(k=>'<button data-f="'+k+'" class="'+(filter===k?"on":"")+'">'+k+'</button>').join("")+'</div>';
  let list=S.briefs.slice();
  if(filter==="브리핑")list=list.filter(x=>BRIEF_KINDS.includes(x.kind));
  if(filter==="알림")list=list.filter(x=>!BRIEF_KINDS.includes(x.kind)&&x.kind!=="질문");
  if(filter==="질문")list=list.filter(x=>x.kind==="질문"||arr(x.questions).length);
  if(!list.length)h+='<div class="card"><div class="empty"><b>아직 받은 알림이 없어요</b>브리핑과 알림이 오면 여기에 쌓여요.</div></div>';
  const yest=addDays(TODAY,-1);let cur=null,buf="";
  list.forEach(x=>{const d=str(x.date);if(d!==cur){if(buf)h+='<div class="card"><div class="list">'+buf+'</div></div>';buf="";cur=d;h+='<div class="group">'+(d===TODAY?"오늘":d===yest?"어제":korDate(d))+'</div>';}buf+=noticeRow(x);});
  if(buf)h+='<div class="card"><div class="list">'+buf+'</div></div>';
  $("v-brief").innerHTML=h;
  if($("heroOpen"))$("heroOpen").onclick=()=>openBrief(b);
  document.querySelectorAll("#filters button").forEach(x=>x.onclick=()=>{filter=x.dataset.f;renderBrief();});
  bindNoticeRows($("v-brief"));
}
function openBrief(b){
  let h='<div class="cap">'+esc((str(b.icon)||KIND_ICON[b.kind]||"💬")+" "+(str(b.kind)||"알림")+" · "+korDate(str(b.date)||TODAY)+(b.createdAt?" · "+hhmm(b.createdAt):""))+'</div><div class="bh">'+esc(str(b.headline)||"알림")+'</div>';
  if(b.sub)h+='<div class="muted">'+esc(str(b.sub))+'</div>';
  arr(b.alerts).forEach(a=>h+='<div class="alert">'+esc(str(a))+'</div>');
  if(b.ai&&(b.ai.condition||b.ai.sleep))h+='<div class="card" style="margin-top:12px">'+aiBlock([str(b.ai.condition),str(b.ai.sleep)].filter(Boolean).join(" "),true)+'</div>';
  const tiles=arr(b.tiles);if(tiles.length)h+='<div class="tiles">'+tiles.map(t=>'<div class="metric"><div class="lb">'+esc(str(t.label))+'</div><div class="v" style="font-size:18px;white-space:normal">'+esc(str(t.value)||"—")+'</div>'+(t.note?'<div class="n">'+esc(str(t.note))+'</div>':"")+'</div>').join("")+'</div>';
  const sec=(title,rows)=>rows?'<div class="lbl">'+title+'</div><div class="card"><div class="list">'+rows+'</div></div>':"";
  h+=sec("일정",arr(b.schedule).map(s=>'<div class="li"><div class="time">'+esc(str(s.time))+'</div><div class="m"><div class="t">'+esc(str(s.text))+'</div></div></div>').join(""));
  h+=sec("오늘 우선순위",arr(b.priorities).map((p,i)=>'<div class="li"><div class="ic" style="width:26px;height:26px;font-size:13px;font-weight:800">'+(i+1)+'</div><div class="m"><div class="t">'+esc(str(p))+'</div></div></div>').join(""));
  h+=sec("업무",arr(b.tasks).map(p=>'<div class="li"><div class="m"><div class="t">'+esc(str(p))+'</div></div></div>').join(""));
  h+=sec("내용",arr(b.items).map(p=>'<div class="li"><div class="m"><div class="t" style="font-weight:500">'+esc(str(p))+'</div></div></div>').join(""));
  const mk=arr(b.markets);if(mk.length)h+='<div class="lbl">지표</div><div class="tiles" style="margin-top:0">'+mk.map(t=>'<div class="metric"><div class="lb">'+esc(str(t.label))+'</div><div class="v" style="font-size:18px">'+esc(str(t.value))+'</div>'+(t.note?'<div class="n">'+esc(str(t.note))+'</div>':"")+'</div>').join("")+'</div>';
  const qs=arr(b.questions);if(qs.length)h+='<div class="q"><b>❓ 답해 주세요</b>'+qs.map(q=>'<div>'+esc(str(q))+'</div>').join("")+'<div class="cap" style="margin-top:6px">건강 탭 \'오늘 기록\'에서 누르거나 Claude에게 말해 주세요</div></div>';
  arr(b.sections).forEach(s=>{h+=sec(esc(str(s.title)),arr(s.items).map(p=>'<div class="li"><div class="m"><div class="t" style="font-weight:500">'+esc(str(p))+'</div></div></div>').join(""));});
  if(b.quote)h+='<p class="muted" style="text-align:center;margin:20px 0 0">“'+esc(str(b.quote))+'”</p>';
  if(b.footnote)h+='<div class="cap" style="margin-top:16px">'+esc(str(b.footnote))+'</div>';
  openSheet((str(b.icon)||KIND_ICON[b.kind]||"💬")+" "+(str(b.kind)||"알림"),h);
}

/* =====================================================================
   일정 (Apple 일정·미리 알림 백업 + 브리핑 일정 + 출발·마감 알림)
   ===================================================================== */
function planItems(date){
  const out=[];const H=S.health;
  arr(H&&H.events).forEach(e=>{if(str(e.start).slice(0,10)===date){const tm=hhmmStr(e.start);out.push({time:/종일/.test(e.start)?"종일":tm,title:e.title,sub:[e.cal,e.loc].filter(Boolean).join(" · "),src:"A"});}});
  arr(H&&H.reminders).forEach(r=>{if(str(r.due).slice(0,10)===date&&!/생일/.test(r.list)&&!/^(출근|퇴근)$/.test(r.title))out.push({time:hhmmStr(r.due),title:r.title,sub:r.list+(r.memo?" · "+r.memo:""),src:"R"});});
  const b=S.briefs.find(x=>str(x.date)===date&&arr(x.schedule).length);
  if(b)arr(b.schedule).forEach(s=>{if(!out.some(o=>o.time===str(s.time)&&o.title===str(s.text)))out.push({time:str(s.time),title:str(s.text),sub:"브리핑",src:"B"});});
  return out.sort((a,b)=>(a.time==="종일"?"00":a.time||"99").localeCompare(b.time==="종일"?"00":b.time||"99"));
}
function renderPlan(){
  let h='<div class="page-title">일정</div><div class="page-sub">Apple 일정·미리 알림 백업과 브리핑 일정을 모았어요</div><div class="stack">';
  for(let i=0;i<7;i++){const d=addDays(TODAY,i);const it=planItems(d);if(!it.length&&i>1)continue;
    h+='<div class="card"><div class="card-hd">'+ico("cal",i===0?"c-accent":"c-blue")+'<h3>'+(i===0?"오늘":i===1?"내일":"")+" "+shortDate(d)+'</h3><span class="cap">'+it.length+'개</span></div>'+
      (it.length?'<div class="list">'+it.map(x=>'<div class="li"><div class="time">'+esc(x.time||"—")+'</div><div class="m"><div class="t">'+esc(x.title)+'</div>'+(x.sub?'<div class="s">'+esc(x.sub)+'</div>':"")+'</div></div>').join("")+'</div>':'<div class="empty" style="padding-top:0">일정 없음</div>')+'</div>';}
  const dep=S.briefs.filter(b=>b.kind==="출발"&&str(b.date)>=addDays(TODAY,-1)),due=S.briefs.filter(b=>b.kind==="마감").slice(0,2);
  if(dep.length||due.length)h+='<div class="card"><div class="card-hd">'+ico("clock","c-zap")+'<h3>출발 · 마감 알림</h3></div><div class="list">'+dep.concat(due).map(noticeRow).join("")+'</div></div>';
  const H=S.health;const now=TODAY;
  const over=arr(H&&H.reminders).filter(r=>r.due&&str(r.due).slice(0,10)<now&&!/생일/.test(r.list));
  if(over.length)h+='<div class="card"><div class="card-hd">'+ico("bell","c-heart")+'<h3>지난 미리 알림</h3><span class="cap">완료 안 됨</span></div><div class="list">'+over.slice(0,8).map(r=>'<div class="li"><div class="time wide">'+shortDate(str(r.due).slice(0,10))+'</div><div class="m"><div class="t">'+esc(r.title)+'</div><div class="s">'+esc(r.list)+'</div></div></div>').join("")+'</div></div>';
  const upB=arr(H&&H.reminders).filter(r=>/생일/.test(r.list)&&str(r.due).slice(0,10)>=now&&str(r.due).slice(0,10)<=addDays(now,30));
  if(upB.length)h+='<div class="card"><div class="card-hd">'+ico("heart","c-heart")+'<h3>다가오는 생일 (30일)</h3></div><div class="list">'+upB.map(r=>'<div class="li"><div class="time wide">'+shortDate(str(r.due).slice(0,10))+'</div><div class="m"><div class="t">'+esc(r.title)+'</div></div></div>').join("")+'</div></div>';
  h+='<div class="cap" style="margin:4px">출발 시각 계산·준비물·충돌 확인·마감 알림은 지금처럼 Claude 예약 작업이 해요. 여기서는 그 결과를 모아 보여 줘요.'+(H&&H.backupAt?" · Apple 백업 "+esc(H.backupAt)+" 기준":"")+'</div></div>';
  $("v-plan").innerHTML=h;bindNoticeRows($("v-plan"));
}

/* =====================================================================
   내 정보
   ===================================================================== */
function renderMe(){
  const p=themePref();const[ss,scls,smsg]=syncState();
  let h='<div class="page-title">내 정보</div><div class="page-sub">설정 · 연동 · 데이터</div><div class="stack">';
  h+='<div class="card"><div class="setrow"><div class="hdr" style="padding:0"><div class="av">'+ico("user")+'</div></div><div class="m"><b>연서 씨</b><small>브리핑 앱 '+APP_VER+'</small></div></div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("sun","c-zap")+'<h3>화면 테마</h3></div><div class="theme3">'+[["system","시스템 설정","monitor"],["light","라이트","sun"],["dark","다크","moon"]].map(([k,l,i])=>'<button data-th="'+k+'" class="'+(p===k?"on":"")+'">'+ico(i)+l+'</button>').join("")+'</div><div class="cap" style="margin-top:10px">시스템 설정을 고르면 폰이 다크 모드로 바뀔 때 앱도 함께 바뀌어요.</div></div>';
  const row=(icon,name,state,cls,note)=>'<div class="setrow"><span class="c-blue">'+ico(icon)+'</span><div class="m"><b>'+name+'</b><small>'+esc(note)+'</small></div><span class="badge '+cls+'">'+state+'</span></div>';
  const H=S.health;
  h+='<div class="card"><div class="card-hd">'+ico("link","c-accent")+'<h3>건강 데이터 연동</h3></div>'+
    row("phone","Apple 건강 (아이폰 단축어 백업)",ss,scls,smsg)+
    row("watch","Apple Watch",H&&arr(H.sleep).length?"데이터 있음":"데이터 없음",H&&arr(H.sleep).length?"":"gray",H&&arr(H.sleep).length?"수면 단계·HRV·심박·혈중산소를 워치가 측정해요":"워치 수면 기록이 아직 없어요")+
    (H&&H.haeAt?row("refresh","Health Auto Export (자동 전송)","연결됨","","마지막 자동 전송 "+H.haeAt):row("refresh","Health Auto Export (자동 전송)","동기화 대기","warn","앱에서 REST API 자동화를 켜면 첫 전송 후 연결됨으로 바뀌어요"))+
    row("heart","Samsung Health","지원되지 않음","gray","아이폰에서는 Samsung Health 데이터를 받을 수 없어요 (안드로이드 Health Connect 전용)")+
    '<div class="lbl" style="margin-left:0">아이폰에서 할 일</div><ol class="steps"><li><b>Health Auto Export</b>: 자동화 → 새 자동화 → REST API → URL에 Claude가 알려 준 주소 → 형식 JSON · 기간 지난 7일 · 데이터 요약 켬 · 묶음 단위 일 → 동기화 주기 1시간</li><li>지표: 걸음·활동 에너지·휴식 에너지·안정 시 심박·심박 변이도·혈중 산소·호흡수·운동 시간·걷기+달리기 거리·오른 층수·스탠드 시간·VO₂max·수면 분석</li><li>Health Auto Export 위젯을 홈 화면에 두면 백그라운드 전송이 더 잘 돼요</li><li>미리 알림·일정은 지금처럼 <b>폰 뒤 톡톡</b>(단축어 "Apple 백업")으로 보내요</li><li>잠금이 풀린 상태에서만 아이폰이 건강 데이터를 내줘요</li><li>앱은 열 때마다, 켜 둔 동안은 5분마다 새 데이터를 가져와요</li><li>14시간 넘게 새 데이터가 없으면 \'동기화 지연\'으로 알려 드려요</li></ol></div>';
  h+='<div class="card"><div class="card-hd">'+ico("bell","c-zap")+'<h3>알림 · 브리핑 시간</h3></div><div class="list">'+
    [["아침 브리핑","평일 07:00 · 주말 10:00"],["마감일 사전 알림","매일 08:40"],["비서 판단 알림","08:37 · 10:37 · 12:37 · 15:37 · 17:37 · 21:37"],["저녁 전 질문","매일 19:20"],["저녁 정리","매일 20:23"],["주간 계획 · 월간 점검","일요일 19:30 · 매달 1일 08:55"]].map(([a,b])=>'<div class="li"><div class="m"><div class="t">'+a+'</div><div class="s">'+b+'</div></div></div>').join("")+
    '</div><div class="cap" style="margin-top:10px">모든 브리핑·알림은 이 앱에 올라와요. 시간 변경은 Claude에게 말해 주세요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("spark","c-blue")+'<h3>AI 분석</h3></div><div class="cap" style="line-height:1.7">· 컨디션·수면 점수는 앱이 정해진 계산식으로 직접 계산해요 (기기 점수와 섞지 않아요).<br>· \'AI 해석\' 표시는 아침 브리핑에서 Claude가 쓴 문장, \'자동 요약\'은 계산 결과로 만든 문장이에요.<br>· 데이터가 부족하면 점수를 만들지 않고 \'분석 데이터 부족\'으로 보여 줘요.<br>· 의료 진단이 아니에요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("shield","c-accent")+'<h3>데이터 · 백업</h3></div><div class="cap" style="line-height:1.7">기록은 내 구글 시트 "연서의 하루 데이터"에만 저장돼요. 개편 단계마다 앱 코드(GitHub 브랜치)·시트·서버 코드를 백업하고, 위치는 구글 드라이브 "브리핑 앱 개편 · 백업·복구 기록" 문서에 있어요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("gear","c-blue")+'<h3>연결</h3></div><div class="setrow"><div class="m"><b>상태</b><small>'+esc($("status").textContent)+'</small></div></div><div class="lbl" style="margin-left:0">앱 비밀번호</div><input class="field" id="keyIn" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="비밀번호"><div class="msg" id="keyMsg"></div><button class="primary" id="keySave">연결하고 불러오기</button></div>';
  h+='</div>';
  $("v-me").innerHTML=h;$("keyIn").value=CFG.key;
  document.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>setTheme(b.dataset.th));
  $("keySave").onclick=()=>{const v=$("keyIn").value.trim();if(!v){$("keyMsg").textContent="비밀번호를 넣어 주세요";return;}CFG.key=v;ls("ys_key",v);load(true);if(dirty)flush();toast("연결했어요");};
}

/* =====================================================================
   차트 (Chart.js, 토큰 색 사용 · 테마 바뀌면 다시 그림)
   ===================================================================== */
const charts={};
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function mk(id,cfg){if(!window.Chart||!$(id))return;if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),cfg);}
function baseOpts(extra){Chart.defaults.font.family=css("--font")||"sans-serif";Chart.defaults.color=css("--sub");Chart.defaults.font.size=11;Chart.defaults.animation=matchMedia("(prefers-reduced-motion: reduce)").matches?false:{duration:500};
  return Object.assign({maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{intersect:false,mode:"index"}},scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkipPadding:10}},y:{grid:{color:css("--line")},border:{display:false},beginAtZero:true}}},extra||{});}
const valLabels={id:"vl",afterDatasetsDraw(c){const o=c.options.plugins.vl;if(!o)return;const x=c.ctx;x.save();x.font="700 10px "+css("--font");x.textAlign="center";x.fillStyle=css("--sub");
  const last=c.data.datasets.length-1;const meta=c.getDatasetMeta(o.stacked?last:0);
  meta.data.forEach((p,j)=>{let v=o.stacked?c.data.datasets.reduce((a,d)=>a+(d.data[j]||0),0):c.data.datasets[0].data[j];if(v==null||v===0)return;x.fillText(o.fmt==="h"?(Math.round(v*10)/10)+"h":o.fmt==="k"?(v>=1000?(Math.round(v/100)/10)+"k":String(v)):String(v),p.x,p.y-6);});x.restore();}};
const lbl=id=>{const d=parseYmd(id);return(d.getMonth()+1)+"/"+d.getDate();};
function drawSleepCharts(R){
  if(!window.Chart||!R.length)return;
  const L=R.map(x=>lbl(x.date));const h=v=>v==null?0:Math.round(v/6)/10;
  mk("chSleep",{type:"bar",plugins:[valLabels],data:{labels:L,datasets:[
    {label:"깊은",data:R.map(x=>h(x.deep)),backgroundColor:css("--deep"),stack:"s",borderRadius:2},
    {label:"얕은",data:R.map(x=>h(x.core)),backgroundColor:css("--core"),stack:"s"},
    {label:"REM",data:R.map(x=>h(x.rem)),backgroundColor:css("--rem"),stack:"s"},
    {label:"깨어 있음",data:R.map(x=>h(x.awakeMin)),backgroundColor:css("--awake"),stack:"s",borderRadius:{topLeft:5,topRight:5}}]},
    options:baseOpts({layout:{padding:{top:16}},plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:8,boxHeight:8,usePointStyle:true}},vl:R.length<=10?{stacked:true,fmt:"h"}:null,
      tooltip:{callbacks:{label:c=>c.dataset.label+" "+hm(c.raw*60)}}},scales:{x:{stacked:true,grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkipPadding:8}},y:{stacked:true,grid:{color:css("--line")},border:{display:false},ticks:{callback:v=>v+"h"}}}})});
  mk("chBed",{type:"line",data:{labels:L,datasets:[{label:"잠든 시각",data:R.map(x=>{const b=bedMin(x.bed);return b==null?null:b/60;}),borderColor:css("--blue"),backgroundColor:css("--blue"),tension:.35,pointRadius:3,spanGaps:true},
    {label:"기상 시각",data:R.map(x=>{const w=minOfDay(x.wake);return w==null?null:w/60+24;}),borderColor:css("--accent"),backgroundColor:css("--accent"),tension:.35,pointRadius:3,spanGaps:true}]},
    options:baseOpts({plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:8,boxHeight:8,usePointStyle:true}},tooltip:{callbacks:{label:c=>c.dataset.label+" "+clockStr(c.raw*60)}}},
      scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkipPadding:8}},y:{reverse:true,beginAtZero:false,grid:{color:css("--line")},border:{display:false},ticks:{stepSize:3,callback:v=>pad(Math.round(v)%24)+"시"}}}})});
}
function drawHealthCharts(){
  if(!window.Chart||!S.health)return;
  const ids=[];for(let i=healthRange;i>=1;i--)ids.push(addDays(TODAY,-i));const L=ids.map(lbl);
  mk("chSteps",{type:"bar",plugins:[valLabels],data:{labels:L,datasets:[{label:"걸음",data:ids.map(d=>metric(d,"걸음")),backgroundColor:css("--step"),borderRadius:5}]},
    options:baseOpts({layout:{padding:{top:16}},plugins:{legend:{display:false},vl:healthRange<=14?{fmt:"k"}:null}})});
  mk("chHeart",{type:"line",data:{labels:L,datasets:[{label:"안정심박",data:ids.map(d=>metric(d,"안정심박")),borderColor:css("--heart"),backgroundColor:css("--heart"),tension:.35,pointRadius:2.5,spanGaps:true,yAxisID:"y"},
    {label:"HRV",data:ids.map(d=>metric(d,"HRV")),borderColor:css("--blue"),backgroundColor:css("--blue"),tension:.35,pointRadius:2.5,spanGaps:true,yAxisID:"y1"}]},
    options:baseOpts({plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:8,boxHeight:8,usePointStyle:true}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkipPadding:8}},
      y:{beginAtZero:false,grid:{color:css("--line")},border:{display:false},title:{display:true,text:"bpm"}},y1:{position:"right",beginAtZero:false,grid:{display:false},border:{display:false},title:{display:true,text:"ms"}}}})});
  const dd=ids.concat([TODAY]);
  mk("chDrink",{type:"bar",plugins:[valLabels],data:{labels:dd.map(lbl),datasets:[{label:"물",data:dd.map(d=>dayData(d)?dayData(d).water:0),backgroundColor:css("--blue"),borderRadius:4},{label:"커피",data:dd.map(d=>dayData(d)?dayData(d).coffee:0),backgroundColor:css("--zap"),borderRadius:4}]},
    options:baseOpts({layout:{padding:{top:14}},plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:8,boxHeight:8,usePointStyle:true}},vl:null},scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkipPadding:8}},y:{beginAtZero:true,ticks:{stepSize:2},grid:{color:css("--line")},border:{display:false}}}})});
}
function dayData(id){return id===TODAY?today:(S.days[id]?normDay(id,S.days[id]):null);}
function refreshCharts(){const t=curTab();if(t==="sleep")renderTab(t);}
window.__chartReady=()=>refreshCharts();

/* ---------- 렌더 ---------- */
function renderTab(t){
  if(t==="home")renderHome();else if(t==="sleep")renderSleep();else if(t==="health")renderHealth();
  else if(t==="brief")renderBrief();else if(t==="plan")renderPlan();else if(t==="me")renderMe();
}
function renderAll(keepScroll){const y=window.scrollY;renderTab(curTab());renderBadge();if(keepScroll)window.scrollTo(0,y);}

/* ---------- 서버 ---------- */
async function apiGet(){const r=await fetch(CFG.url+"?key="+encodeURIComponent(CFG.key)+"&t="+Date.now(),{cache:"no-store"});return r.json();}
async function apiPost(body){const r=await fetch(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({key:CFG.key},body))});return r.json();}

/* 기록 저장 (기존 saveDay 동작 그대로) */
let saveTimer=null,saving=false,dirty=false,savedMsg="";
function setSaved(t){savedMsg=t;const e=$("savedNote");if(e)e.textContent=t;}
function changed(rerender){today.reflected=false;
  if(rerender){const y=window.scrollY;const ae=document.activeElement&&document.activeElement.id;renderTab(curTab());window.scrollTo(0,y);if(ae&&$(ae))$(ae).focus();}
  dirty=true;setSaved("저장 중…");clearTimeout(saveTimer);saveTimer=setTimeout(flush,700);}
async function flush(){
  if(!CFG.key){setSaved("연결이 필요해요");location.hash="#me";return;}
  if(saving){clearTimeout(saveTimer);saveTimer=setTimeout(flush,500);return;}
  saving=true;dirty=false;const body=Object.assign({},today,{workout:today.workout.slice(),condition:today.condition.length?today.condition.join(","):null,mood:today.mood.join(",")});
  try{const res=await apiPost({action:"saveDay",day:body});
    if(res&&res.ok){setSaved("✓ 저장됨 · "+hhmm(new Date()));S.days[TODAY]=body;}
    else{setSaved(res&&res.error==="key"?"비밀번호가 맞지 않아요":"저장하지 못했어요");dirty=true;}
  }catch(err){setSaved("연결이 안 돼요 · 곧 다시 저장할게요");dirty=true;setTimeout(()=>{if(dirty)flush();},5000);}
  saving=false;
}
let loading=false;
async function load(show){
  if(!CFG.key){setStatus("연결이 필요해요 · 내 정보에서 비밀번호를 넣어 주세요","off");return;}
  if(loading)return;loading=true;if(show)setStatus("불러오는 중…","wait");
  try{const res=await apiGet();
    if(!res||!res.ok){setStatus(res&&res.error==="key"?"비밀번호가 맞지 않아요":"불러오지 못했어요","off");}
    else{const next={};(res.days||[]).forEach(d=>{if(d&&d.date)next[d.date]=d;});S.days=next;
      if(next[TODAY]&&!dirty&&!saving)today=normDay(TODAY,next[TODAY]);
      S.briefs=(res.briefings||[]).filter(b=>b&&b.date).sort((a,b)=>str(b.createdAt).localeCompare(str(a.createdAt)));
      if(res.health&&!res.health.error){S.health=normHealth(res.health);S.healthErr="";}else{S.healthErr=res.health&&res.health.error?String(res.health.error):"";}
      S.loadedAt=new Date();setStatus("최신 · "+hhmm(S.loadedAt)+" 업데이트","ok");
      ls("ys_cache",JSON.stringify({days:res.days,briefings:res.briefings,health:res.health||null}));
      const ae=document.activeElement;if(!(ae&&/INPUT|TEXTAREA/.test(ae.tagName)))renderAll(true);else renderBadge();}
  }catch(err){setStatus("연결이 안 돼요 · 저장된 내용을 보여 줘요","off");}
  loading=false;
}
function loadCache(){try{const c=JSON.parse(ls("ys_cache")||"null");if(!c)return;(c.days||[]).forEach(d=>{if(d&&d.date)S.days[d.date]=d;});if(S.days[TODAY])today=normDay(TODAY,S.days[TODAY]);
  S.briefs=(c.briefings||[]).filter(b=>b&&b.date).sort((a,b)=>str(b.createdAt).localeCompare(str(a.createdAt)));if(c.health&&!c.health.error)S.health=normHealth(c.health);}catch(e){}}
/* Health Auto Export 요약에는 '침대 시간'·'깬 횟수'가 없을 수 있다 → 침대 시간은 잔 시간+깨어 있던 시간으로 채운다 */
function normHealth(h){arr(h.sleep).forEach(x=>{if(x.inBed==null&&x.asleep!=null)x.inBed=x.asleep+(x.awakeMin||0);});return h;}

/* ---------- 업데이트·새로고침 ---------- */
async function checkUpdate(){try{const r=await fetch("version.txt?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;const v=(await r.text()).trim();
  if(v&&v!==APP_VER&&!dirty&&!saving){try{if(sessionStorage.getItem("ys_upd")===v)return;sessionStorage.setItem("ys_upd",v);}catch(e){}location.replace(location.pathname+"?v="+encodeURIComponent(v)+location.hash);}}catch(e){}}
function dayRoll(){const n=ymd(new Date());if(n!==TODAY){TODAY=n;today=S.days[n]?normDay(n,S.days[n]):blankDay(n);renderAll(false);}}
function wake(){dayRoll();if(dirty)flush();load(false);checkUpdate();}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")wake();});
window.addEventListener("pageshow",e=>{if(e.persisted)wake();});
window.addEventListener("online",wake);
(()=>{const ptr=document.createElement("div");ptr.id="ptr";ptr.textContent="↓ 당겨서 새로고침";document.body.appendChild(ptr);let y0=null,dy=0;
  window.addEventListener("touchstart",e=>{if(window.scrollY<=0&&e.touches.length===1&&!$("sheet").classList.contains("on")){y0=e.touches[0].clientY;dy=0;}else y0=null;},{passive:true});
  window.addEventListener("touchmove",e=>{if(y0===null)return;dy=e.touches[0].clientY-y0;if(dy>0){ptr.style.transform="translateY("+Math.min(dy/2-70,10)+"px)";ptr.textContent=dy>110?"↻ 놓으면 새로고침":"↓ 당겨서 새로고침";}},{passive:true});
  window.addEventListener("touchend",()=>{if(y0!==null&&dy>110){ptr.textContent="불러오는 중…";load(true).then(()=>{ptr.style.transform="translateY(-70px)";});checkUpdate();}else ptr.style.transform="translateY(-70px)";y0=null;dy=0;});})();
(()=>{let y0=null;const s=$("sheet");
  s.addEventListener("touchstart",e=>{y0=($("sheetBody").scrollTop<=0)?e.touches[0].clientY:null;},{passive:true});
  s.addEventListener("touchmove",e=>{if(y0===null)return;const dy=e.touches[0].clientY-y0;if(dy>0){s.style.transition="none";s.style.transform="translateY("+dy+"px)";}},{passive:true});
  s.addEventListener("touchend",e=>{if(y0===null)return;const dy=e.changedTouches[0].clientY-y0;s.style.transition="";s.style.transform="";if(dy>110)closeSheet();y0=null;});})();

/* ---------- 시작 ---------- */
applyTheme();loadCache();route(false);
if(!CFG.key){setStatus("연결이 필요해요 · 내 정보에서 비밀번호를 넣어 주세요","off");location.hash="#me";}else load(true);
checkUpdate();
setInterval(()=>{if(document.visibilityState==="visible"&&!dirty)load(false);},5*60000);
setInterval(()=>{dayRoll();},60000);
window.__app={S,SCORE,setTheme}; // 테스트용
})();
