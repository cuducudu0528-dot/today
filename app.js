/* KORA (옛 이름: 브리핑) — 건강 중심 개편 (2026-11-19) · 2026-11-25 이름·디자인 KORA로 변경
   데이터: Apps Script 웹 앱 → { days, briefings, health }
   점수 계산식: docs/scoring.md 와 아래 SCORE 모듈이 같아야 한다. */
(function(){
"use strict";
const APP_VER="2026-11-27-2";
const DEF_URL="https://script.google.com/macros/s/AKfycbxgoPMdod-SPlKH4gcsmEH5bg1GVYMmRDgropKc4qbqLEBAKAQlR95xIzrz75Zfh2o9dg/exec";
const WEEK=["일","월","화","수","목","금","토"];
const COND=[[1,"😫","지침"],[2,"😮‍💨","피곤"],[3,"🙂","보통"],[4,"😊","좋음"],[5,"🤩","최고"]];
const WORK=["등","팔","어깨","가슴","하체","유산소","스트레칭"];
const MOOD=["평온","좋음","피곤","스트레스","우울","예민"];
const BRIEF_KINDS=["아침","저녁","주간","월간","마감"];
const KIND_ICO={"아침":"sun","저녁":"moon","주간":"cal","월간":"cal","마감":"clock","알림":"bell","질문":"list","일본어":"doc","출발":"foot","기타":"bell"};
const noEmo=t=>String(t).replace(/^[\s\u2600-\u27BF\u{1F000}-\u{1FAFF}\uFE0F]+/u,"");
const KIND_ICON={"아침":"☀️","저녁":"🌙","주간":"🗓️","월간":"📆","마감":"⏰","알림":"🔔","질문":"📝","일본어":"🇯🇵","출발":"🚶","기타":"💬"};
const SYNC_LATE_H=14;   // 이 시간 넘게 새 건강 데이터가 없으면 '동기화 지연'

/* ---------- 아이콘 (한 가지 라인 세트, 24 그리드, 선 1.8) ---------- */
const P={
  cup:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5"/>',
  smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0M9.5 9.8h.01M14.5 9.8h.01"/>',
  glass:'<path d="M7 3h10l-1 9a4 4 0 0 1-8 0z"/><path d="M12 16v5M8.5 21h7M7.6 8h8.8"/>',
  pill:'<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.7 8.7 4.6 6.6"/>',
  run:'<circle cx="14.5" cy="4.5" r="1.8"/><path d="M9 21l2.5-5 3 2.5V22M6 12l3-3.5 4 1 2.5 3.5H19M11.5 16l1-6.5"/>',
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
  pill:'<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 8 4.6 6.6"/>',
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
function blankDay(id){return{date:id,water:0,coffee:0,workout:[],condition:[],mood:[],supplement:[],alcohol:{lv:0,type:"",n:0},breakfast:"",lunch:"",dinner:"",memo:"",reflected:false};}
function normDay(id,d){d=d||{};const b=v=>v===true||String(v).toUpperCase()==="TRUE";
  return{date:id,water:num(d.water)||0,coffee:num(d.coffee)||0,workout:(Array.isArray(d.workout)?d.workout:str(d.workout).split(",")).map(s=>str(s).trim()).filter(w=>WORK.includes(w)),
  condition:str(d.condition).split(",").map(x=>num(x.trim())).filter(x=>x>=1&&x<=5),mood:str(d.mood).split(",").map(x=>x.trim()).filter(x=>MOOD.includes(x)),supplement:parseSupp(d.supplement),alcohol:parseAlc(d.alcohol),breakfast:str(d.breakfast),lunch:str(d.lunch),dinner:str(d.dinner),memo:str(d.memo),reflected:b(d.reflected)};}
/* 영양제: "TRUE"(예전 기록)=먹음, 그 밖엔 "종합비타민,비타민D" 목록 · 술: "FALSE"/"TRUE"(예전) 또는 "보통|소주 3" */
function parseSupp(v){v=str(v).trim();if(!v||/^false$/i.test(v))return[];if(/^true$/i.test(v))return["먹음"];return v.split(",").map(x=>x.trim()).filter(Boolean);}
function parseAlc(v){v=str(v).trim();if(!v||/^false$/i.test(v))return{lv:0,type:"",n:0};if(/^true$/i.test(v))return{lv:-1,type:"",n:0};
  const[l,d]=v.split("|");const lv=Math.max(0,["안 마심","가볍게","보통","많이","매우 많이"].indexOf(l.trim()));const m=str(d).match(/(\S+)\s+(\d+)/);return{lv:lv||2,type:m?m[1]:"",n:m?+m[2]:0};}
function serAlc(a){if(!a||a.lv===0)return"FALSE";if(a.lv===-1)return"TRUE";return["안 마심","가볍게","보통","많이","매우 많이"][a.lv]+(a.type&&a.n?"|"+a.type+" "+a.n:"");}
const CFG={url:DEF_URL,key:(ls("ys_key")||"").trim()};

/* ---------- 테마: 시스템(기본)/라이트/다크 ---------- */
const mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
const themePref=()=>ls("ys_theme")||"system";
function applyTheme(){const p=themePref();const dark=p==="dark"||(p==="system"&&mq&&mq.matches);
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  $("themeColor").setAttribute("content",dark?"#141513":"#E9E7E0");
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
  label(s){return s>=85?["매우 좋음",""]:s>=70?["좋음",""]:s>=55?["보통","gray"]:s>=40?["주의","warn"]:["쉬어가기","bad"];}
};

/* ---------- 건강 데이터 접근 ---------- */
function sleepOn(date){const H=S.health;return H?arr(H.sleep).find(x=>x.date===date)||null:null;}
function sleepsBefore(date){const H=S.health;return H?arr(H.sleep).filter(x=>x.date<date).sort((a,b)=>b.date.localeCompare(a.date)):[];}
function metric(date,k){const H=S.health;const d=H&&H.daily&&H.daily[date];return d&&d[k]!=null?num(d[k]):null;}
function latestSleep(){const H=S.health;if(!H)return null;const a=arr(H.sleep).slice().sort((a,b)=>b.date.localeCompare(a.date));return a[0]||null;}
function lastHealthAt(){const H=S.health;if(!H)return"";const b=H.sources&&H.sources.backup&&H.sources.backup.ok?H.healthAt:(H.sources?"":H.healthAt);return[b,H.haeAt].filter(Boolean).sort().pop()||"";}
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
function closeSheet(){sheetFn=null;$("scrim").classList.remove("on");$("sheet").classList.remove("on");}
$("sheetClose").innerHTML=ico("x","ico-sm");$("scrim").onclick=closeSheet;$("sheetClose").onclick=closeSheet;

/* ---------- 라우팅 (탭 6개) ---------- */
const TABS=[["home","홈","home"],["sleep","수면","moon"],["health","건강","heart"],["brief","브리핑","doc"],["plan","일정","cal"],["me","내 정보","user"]];
const ALIAS={today:"home",inbox:"brief",archive:"brief",log:"health",stats:"health"};
$("tabs").innerHTML=TABS.map(([id,l,i])=>'<a href="#'+id+'" data-tab="'+id+'">'+ico(i)+l+(id==="brief"?'<span class="badge-n" id="badge"></span>':"")+'</a>').join("");
function curTab(){let t=(location.hash||"").replace("#","");t=ALIAS[t]||t;return TABS.some(x=>x[0]===t)?t:"home";}
function route(keepScroll){const t=curTab();
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id==="v-"+t));
  document.querySelectorAll(".tabbar a").forEach(a=>a.classList.toggle("on",a.dataset.tab===t));
  $("fab").style.display=(t==="sleep")?"flex":"none";
  if(!keepScroll)window.scrollTo(0,0);renderTab(t);if(t==="brief")markSeen();}
window.addEventListener("hashchange",()=>route(false));
$("fab").innerHTML=ico("plus");$("fab").onclick=()=>openPicker("빠른 기록",()=>condPicker()+'<div class="lbl" style="margin-left:0">'+ico("pill","ico-sm c-supp")+' 영양제</div>'+(mySupps().length?chips("supp",mySupps(),v=>today.supplement.includes(v)):"")+'<div class="lbl" style="margin-left:0">'+ico("glass","ico-sm c-alc")+' 술</div>'+chips("alc",ALC.map((l,i)=>[i,l]),v=>today.alcohol.lv===+v||(+v===0&&!today.alcohol.lv),"alc5"));

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

/* ---------- 상태 라벨 5단계: 글자 + 아이콘 + 색 (색만으로 구분하지 않음) ---------- */
const LV5=[[85,"매우 좋음","lv1","spark"],[70,"좋음","lv2","check"],[55,"보통","lv3","list"],[40,"주의","lv4","bell"],[0,"쉬어가기","lv5","bed"]];
function lv5(s){return LV5.find(x=>s>=x[0]);}
function lvBadge(s){const l=lv5(s);return '<span class="lvb '+l[2]+'">'+ico(l[3],"ico-xs")+l[1]+'</span>';}

/* ---------- 개인 기준선(최근 30일, 오늘 제외) ---------- */
function baseline(k,upto){const v=[];for(let i=1;i<=30;i++){const x=metric(addDays(upto||TODAY,-i),k);if(x!=null)v.push(x);}
  if(v.length<5)return null;const s=v.slice().sort((a,b)=>a-b);const q=p=>s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];
  return{med:median(v),q1:q(.25),q3:q(.75),min:s[0],max:s[s.length-1],n:v.length};}
function vsBase(k,ref){const y=metric(ref,k),b=baseline(k,addDays(ref,1));if(y==null||!b)return null;
  const st=y<b.q1?(y<b.q1-(b.q3-b.q1)?"낮음":"약간 낮음"):y>b.q3?(y>b.q3+(b.q3-b.q1)?"높음":"약간 높음"):"평소 범위";return{y,b,st};}

/* ---------- 오늘의 한 문장 (규칙 기반 — AI 문장이 있으면 그걸 우선) ---------- */
function bodyLine(){
  const c=SCORE.condition(TODAY);const tb=targetBed(lastSleeps(7).reduce((a,x)=>a+Math.max(0,420-(x.asleep||0)),0));
  if(c.missing)return{head:"아직 오늘 몸 상태를 판단할 데이터가 없어요.",tip:"폰 잠금을 풀고 Health Auto Export를 열면 지난밤 수면이 들어와요.",facts:[],score:null};
  const n=c.night,prev=sleepsBefore(n.date).slice(0,7),pa=avg(prev.map(x=>x.asleep));const facts=[];let bad=0;
  if(pa!=null&&prev.length>=3){const d=n.asleep-pa;facts.push(Math.abs(d)<20?"수면은 평소만큼("+hm(n.asleep)+")":"수면이 평소보다 "+hm(Math.abs(d))+" "+(d<0?"짧고":"길고"));if(d<-40)bad++;}
  else facts.push("지난밤 "+hm(n.asleep)+" 잤고");
  const ref=addDays(TODAY,-1);const h=vsBase("HRV",ref),r=vsBase("안정심박",ref);
  const rec=[];if(h&&/낮음/.test(h.st)){rec.push("HRV가 평소보다 낮아요");bad++;}if(r&&/높음/.test(r.st)){rec.push("안정심박이 평소보다 "+Math.round(r.y-r.b.med)+"bpm 높아요");bad++;}
  facts.push(rec.length?rec.join(", "):(h||r)?"회복 지표(HRV·안정심박)는 평소 범위예요":"회복 지표는 아직 쌓이는 중이에요");
  const y=dayData(ref);if(y&&y.alcohol.lv>=2)facts.push("어제 술을 마신 영향이 남아 있을 수 있어요");
  const s=c.score;let tip;
  if(s>=70&&!bad)tip="오늘은 평소 강도로 운동해도 괜찮은 날이에요.";
  else if(s>=55)tip="무리하지 않는 선에서 평소처럼 지내면 돼요. 카페인은 오후 2시 전까지만요.";
  else if(s>=40)tip="강한 운동보다 가벼운 걷기·스트레칭이 맞아요. 오늘은 "+tb.bed+" 전에 자는 걸 목표로 해요.";
  else tip="오늘은 쉬어 가는 날이에요. 일정은 꼭 필요한 것만, 취침은 "+tb.bed+" 전으로 잡아요.";
  return{head:facts.slice(0,2).join(" ")+".",tip,facts,score:s,c,extra:facts[2]||""};
}

/* ---------- 점심 기본값 (평일·공휴일 제외, 설정에서 끄거나 장소 변경) ---------- */
const HOLI=["2026-12-25","2027-01-01","2027-02-06","2027-02-07","2027-02-08","2027-02-09","2027-03-01","2027-05-05","2027-05-13","2027-06-06","2027-08-15","2027-08-16","2027-09-14","2027-09-15","2027-09-16","2027-10-03","2027-10-04","2027-10-09","2027-10-11","2027-12-25","2027-12-27"];
const lunchPlace=()=>ls("ys_lunchplace")||"교직원식당";
const lunchDefOn=()=>ls("ys_lunchdef")!=="off";
function isWorkday(d){const w=parseYmd(d).getDay();return w>=1&&w<=5&&!HOLI.includes(d);}
function applyLunchDefault(){if(!CFG.key||!S.loadedAt||dirty||saving||!lunchDefOn()||!isWorkday(TODAY)||today.lunch||new Date().getHours()<11||ls("ys_lunchauto")===TODAY)return;
  ls("ys_lunchauto",TODAY);today.lunch=lunchPlace();changed(false);}

/* ---------- 식사·술·영양제 선택지 ---------- */
const MEAL={breakfast:["집밥","간단히","배달","외식","건너뜀"],lunch:null,dinner:["집밥","배달","외식","간단히","건너뜀"]};
const mealOpts=k=>k==="lunch"?[lunchPlace(),"도시락","외식","배달","건너뜀"]:MEAL[k];
const ALC=["안 마심","가볍게","보통","많이","매우 많이"];
const DRINK={"소주":[50,.165,"잔"],"맥주":[500,.045,"잔(500cc)"],"와인":[150,.12,"잔"],"위스키":[30,.40,"잔"],"막걸리":[200,.06,"잔"]};
function alcGrams(a){const d=a&&DRINK[a.type];return d&&a.n?Math.round(d[0]*d[1]*0.789*a.n):null;}
function alcText(a){if(!a||!a.lv)return a&&a.lv===-1?"마심":"";return ALC[a.lv]+(a.type&&a.n?" · "+a.type+" "+a.n+"잔":"");}
const SUPP_ALL=["종합비타민","비타민D","오메가3","마그네슘","유산균","철분","비타민C","비타민B군","루테인"];
function mySupps(){try{const a=JSON.parse(ls("ys_supps")||"null");if(Array.isArray(a))return a;}catch(e){}return["종합비타민"];}
function setMySupps(a){ls("ys_supps",JSON.stringify(a));}

/* ---------- 칩 공통 (data-pick 으로 어디서든 같은 동작) ---------- */
function chips(kind,opts,isOn,cls){return '<div class="pk '+(cls||"")+'">'+opts.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;
  return '<button data-pick="'+kind+'" data-v="'+esc(v)+'" class="'+(isOn(v)?"on":"")+'" aria-pressed="'+(isOn(v)?"true":"false")+'">'+l+'</button>';}).join("")+'</div>';}
let sheetFn=null;
function openPicker(title,fn){sheetFn=fn;openSheet(title,fn());}
function refreshSheet(){if(sheetFn&&$("sheet").classList.contains("on"))$("sheetBody").innerHTML=sheetFn();}
const tog=(a,v)=>a.includes(v)?a.filter(x=>x!==v):a.concat([v]);
document.addEventListener("click",e=>{const b=e.target.closest("[data-pick]");if(!b)return;const k=b.dataset.pick,v=b.dataset.v;
  if(k==="cond")today.condition=tog(today.condition,+v).sort();
  else if(k==="mood")today.mood=tog(today.mood,v);
  else if(k==="work")today.workout=tog(today.workout,v);
  else if(k==="supp")today.supplement=tog(today.supplement.filter(x=>x!=="먹음"),v);
  else if(k==="alc"){const n=+v;today.alcohol=Object.assign({},today.alcohol,{lv:today.alcohol.lv===n?0:n});if(!today.alcohol.lv)today.alcohol={lv:0,type:"",n:0};}
  else if(k==="alct"){today.alcohol=Object.assign({},today.alcohol,{type:today.alcohol.type===v?"":v});if(today.alcohol.type&&!today.alcohol.n)today.alcohol.n=1;if(!today.alcohol.lv)today.alcohol.lv=2;}
  else if(k==="mysupp"){setMySupps(tog(mySupps(),v));refreshSheet();renderTab(curTab());return;}
  else if(k.startsWith("meal-")){const f=k.slice(5);mealOpen.delete(f);if(v==="직접 입력"){openPicker(({breakfast:"아침",lunch:"점심",dinner:"저녁"})[f]+" 직접 입력",()=>mealInputSheet(f));setTimeout(()=>{const i=$("mealIn");if(i)i.focus();},300);return;}today[f]=today[f]===v?"":v;}
  changed(true);refreshSheet();});
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const act=a.dataset.act;
  if(act==="alc+"){today.alcohol.n=Math.min((today.alcohol.n||0)+1,30);if(!today.alcohol.lv)today.alcohol.lv=2;changed(true);refreshSheet();}
  if(act==="alc-"){today.alcohol.n=Math.max((today.alcohol.n||0)-1,0);changed(true);refreshSheet();}
  if(act==="suppAdd"){const i=$("suppIn");const v=i&&i.value.trim();if(v){const a=mySupps();if(!a.includes(v))setMySupps(a.concat([v]));i.value="";refreshSheet();renderTab(curTab());}}
  if(act==="mealOpen"){mealOpen.add(a.dataset.f);renderTab(curTab());}
  if(act==="mealSave"){const i=$("mealIn");if(i){today[i.dataset.f]=i.value.trim();changed(true);closeSheet();}}
  if(act==="picker"){const p=PICKERS[a.dataset.p];if(p)openPicker(p[0],p[1]);}});
function mealInputSheet(f){return '<input class="field" id="mealIn" data-f="'+f+'" maxlength="200" placeholder="예: 김치찌개" value="'+esc(today[f])+'"><button class="btn-main" data-act="mealSave" style="margin-top:12px">저장</button>';}

/* ---------- 기록 묶음 (홈 시트·건강 탭이 같이 씀) ---------- */
function condPicker(){return '<div class="lbl" style="margin-left:0">컨디션 <small>여러 개 골라도 돼요</small></div>'+chips("cond",COND.map(([n,e,l])=>[n,e+'<small>'+l+'</small>']),v=>today.condition.includes(+v),"cond5")+
  '<div class="lbl" style="margin-left:0">기분 <small>여러 개 골라도 돼요</small></div>'+chips("mood",MOOD,v=>today.mood.includes(v));}
function alcPicker(){const a=today.alcohol;const g=alcGrams(a);
  return '<div class="lbl" style="margin-left:0">얼마나 마셨나요</div>'+chips("alc",ALC.map((l,i)=>[i,l]).slice(1),v=>a.lv===+v,"alc5")+
  '<div class="lbl" style="margin-left:0">자세히 <small>선택 · 종류와 잔 수</small></div>'+chips("alct",Object.keys(DRINK),v=>a.type===v)+
  (a.type?'<div class="counter" style="margin-top:12px"><div class="meta"><div class="nm">'+esc(a.type)+'</div><div class="big">'+(a.n||0)+'<small>'+DRINK[a.type][2]+'</small></div></div><button class="pm" data-act="alc-" aria-label="잔 빼기">−</button><button class="pm add" data-act="alc+" aria-label="잔 더하기">＋</button></div>'+
    (g?'<div class="cap" style="margin-top:8px">알코올 약 '+g+'g · 표준잔(10g) '+(Math.round(g/10*10)/10)+'잔 · 이번 주 합계 '+weekAlc()+'g</div>':""):"")+
  '<div class="cap" style="margin-top:12px">기록은 다음 날 수면·심박과 같이 보여 드릴게요.</div>';}
function weekAlc(){let s=0;for(let i=0;i<7;i++){const d=dayData(addDays(TODAY,-i));const g=d&&alcGrams(d.alcohol);if(g)s+=g;}return s;}
function suppPicker(){const my=mySupps();
  return (my.length?'<div class="lbl" style="margin-left:0">오늘 먹은 영양제</div>'+chips("supp",my,v=>today.supplement.includes(v)):'<div class="cap">아래에서 내 영양제를 먼저 골라 주세요.</div>')+
  '<div class="lbl" style="margin-left:0">내 영양제 목록 <small>한 번 정하면 매일 체크만</small></div>'+chips("mysupp",Array.from(new Set(SUPP_ALL.concat(my))),v=>my.includes(v),"soft")+
  '<div class="addrow"><input class="field" id="suppIn" maxlength="30" placeholder="직접 입력 (예: 콜라겐)"><button class="btn-sub" data-act="suppAdd">추가</button></div>';}
function workPicker(){return chips("work",WORK,v=>today.workout.includes(v));}
const PICKERS={cond:["컨디션 · 기분",condPicker],alc:["술",alcPicker],supp:["영양제",suppPicker],work:["운동",workPicker]};

/* =====================================================================
   홈 — 시안 D(하루 타임라인) + A(오늘의 한 문장)
   ===================================================================== */
/* KORA 로고 마크 (원본 비율 그대로, 색은 테마를 따름) */
const KORA_MARK='<svg class="kmark" viewBox="0 0 100 100" fill="none" stroke-width="3.3" aria-hidden="true"><rect x="48.35" y="18.4" width="3.3" height="63.2" fill="currentColor"/><path d="M51.65 26.95A23.1 23.1 0 0 1 53.7 72.8M46.3 27.2A23.1 23.1 0 0 0 30.63 37.42M33.67 66.33A23.1 23.1 0 0 0 46.3 72.8" stroke="currentColor"/><path class="kmark-sage" d="M29.24 39.87A23.1 23.1 0 0 0 31.8 64.22" stroke="var(--sage)"/></svg>';
function homeHeader(){const d=parseYmd(TODAY);const[g]=greeting();const age=healthAge();
  const sync=lastHealthAt()?'<span class="sync'+(age!=null&&age>SYNC_LATE_H?" late":"")+'">'+ico("refresh","ico-xs")+esc(String(lastHealthAt()).slice(11,16)||"")+' 동기화</span>':"";
  const unread=(S.briefs||[]).filter(isUnread).length;
  return '<div class="kbrand">'+KORA_MARK+'<span>KORA</span></div><div class="hhd"><div><div class="dt">'+ico("cal","ico-sm")+(d.getMonth()+1)+'월 '+d.getDate()+'일 '+WEEK[d.getDay()]+'요일</div><div class="gr">'+g+', 연서 씨</div>'+sync+'</div><a class="iconbtn" href="#brief" aria-label="브리핑 알림">'+ico("bell")+(unread?'<i class="dot"></i>':"")+'</a><a class="iconbtn" href="#me" aria-label="내 정보">'+ico("user")+'</a></div>';}
function heroCard(){const L=bodyLine();const ai=briefAI("condition");
  let h='<div class="hero">';
  if(L.score==null)return h+'<div class="one">'+esc(L.head)+'</div><div class="tip">'+esc(L.tip)+'</div><button class="btn-sub" onclick="koraReload()">'+ico("refresh","ico-sm")+' 지금 다시 불러오기</button></div>';
  const c=L.c;const l=lv5(c.score);
  h='<div class="hero quote">'; h+='<div class="tag">'+ico("spark","ico-xs")+(ai?"AI 해석":"오늘의 한 문장")+'</div><div class="one">'+esc(ai||L.head)+'</div><div class="tip">'+esc(L.tip)+'</div>'+(L.extra?'<div class="cap" style="margin-top:6px">'+esc(L.extra)+'</div>':"");
  // 링 + 구성 3줄
  const y=SCORE.condition(addDays(TODAY,-1));
  const pv=k=>{const p=c.parts.find(x=>x.k===k);return p?p.v:null;};
  const rec=avg([pv("HRV"),pv("안정심박")]);const rb=[vsBase("HRV",addDays(TODAY,-1)),vsBase("안정심박",addDays(TODAY,-1))];const recOff=(rb[0]&&/낮음/.test(rb[0].st))||(rb[1]&&/높음/.test(rb[1].st));const st=metric(addDays(TODAY,-1),"걸음");
  const line=(name,v,txt,ic)=>'<div class="cl">'+ico(ic,"ico-sm")+'<span class="n">'+name+'</span><span class="bar"><i style="width:'+Math.round(clamp(v==null?0:v,0,1)*100)+'%"></i></span><span class="t">'+txt+'</span></div>';
  h+='</div><div class="hero score"><div class="cond2"><div class="rcol"><div class="rwrap">'+ring(c.score/100,"var(--accent)")+'<div class="sc-in"><b>'+c.score+'</b><small>컨디션</small></div></div>'+lvBadge(c.score)+'</div><div class="cls"><div class="cls-hd">'+ico("heart","ico-sm")+'오늘의 건강 점수</div>'+
    line("수면",pv("수면"),c.sleep.score+"점","moon")+line("회복",rec,rec==null?"기록 쌓는 중":rec<.35?"회복 부족":recOff||rec<.6?"조금 떨어짐":"평소 범위","heart")+line("활동",st==null?null:st/8000,st==null?"—":"어제 "+fmtN(st)+"보","foot")+'</div></div>';
  // 어제 대비 이유 칩
  if(y&&y.parts){const ch=c.parts.map(p=>{const q=y.parts.find(x=>x.k===p.k);if(!q)return null;const d=Math.round((p.v-q.v)*p.w);return Math.abs(d)>=2?[p.k==="최근 3일 수면"?"3일 수면":p.k,d]:null;}).filter(Boolean);
    if(ch.length)h+='<div class="why"><span class="cap">어제보다 '+(c.score-y.score>=0?"+":"")+(c.score-y.score)+'점</span>'+ch.map(([k,d])=>'<span class="wc '+(d>0?"up":"down")+'">'+k+' '+(d>0?"+":"")+d+'</span>').join("")+'</div>';}
  return h+'</div>';}
function todoCard(){const hr=new Date().getHours();const L=bodyLine();const out=[];const stT=metric(TODAY,"걸음");
  const tb=targetBed(lastSleeps(7).reduce((a,x)=>a+Math.max(0,420-(x.asleep||0)),0));
  if(hr<11){if(!today.water)out.push(["drop","일어나서 물 한 잔 먼저 마셔요"]);if(L.score!=null&&L.score<55)out.push(["foot","오늘 운동은 가벼운 걷기·스트레칭으로"]);if(today.coffee>=1)out.push(["coffee","커피는 오늘 "+(today.coffee>=2?"이미 "+today.coffee+"잔, 더는 쉬어요":"1잔 더까지만, 오후 2시 전에")]);}
  else if(hr<14){if(isWorkday(TODAY)&&(!today.lunch||today.lunch===lunchPlace()))out.push(["check","점심이 "+lunchPlace()+"이 아니면 아래에서 바꿔 주세요"]);out.push(["foot","점심 먹고 10분 걷기"+(stT!=null?" · 지금 "+fmtN(stT)+"보":"")]);}
  else if(hr<18){if(today.coffee>0)out.push(["coffee","지금부터 카페인은 쉬어요 (밤잠 영향)"]);if(today.water<5)out.push(["drop","물 "+(6-today.water)+"잔 더 마셔요"]);}
  else if(hr<21){if(stT!=null&&stT<8000){const r=8000-stT;out.push(["foot","목표까지 "+fmtN(r)+"보 · 약 "+Math.ceil(r/110)+"분 걷기"]);}if(!today.condition.length)out.push(["list","오늘 컨디션·기분 기록하기"]);}
  else{out.push(["moon","목표 취침 "+tb.bed+" · 30분 전부터 화면 밝기 낮추기"]);if(!today.condition.length)out.push(["list","자기 전 컨디션·기분 한 번 눌러 두기"]);}
  if(!out.length)return"";
  return '<div class="card"><div class="card-hd">'+ico("bulb","c-zap")+'<h3>지금 할 일</h3></div><div class="todo">'+out.slice(0,3).map(([i,t])=>'<div class="td">'+ico(i,"ico-sm")+'<span>'+esc(t)+'</span></div>').join("")+'</div></div>';}
function quickCard(){const a=today.alcohol;
  const q=(attrs,icon,lab,val,on)=>'<button class="qk'+(on?" on":"")+'" '+attrs+'><span class="qi">'+icon+'</span><b>'+lab+'</b><small>'+val+'</small></button>';
  return '<div class="card"><div class="card-hd">'+ico("plus","c-accent")+'<h3>빠른 기록</h3><span class="cap" id="savedNote">'+esc(savedMsg)+'</span></div><div class="qgrid">'+
    q('data-act="water+"',ico("drop"),"물",today.water+" / 8잔",today.water>0)+q('data-act="coffee+"',ico("cup"),"커피",today.coffee+"잔",today.coffee>0)+
    q('data-act="picker" data-p="cond"',ico("smile"),"컨디션",today.condition.length||today.mood.length?[today.condition.map(n=>COND[n-1][2]).join("·"),today.mood.join("·")].filter(Boolean).join(" / "):"누르기",today.condition.length+today.mood.length>0)+
    q('data-act="picker" data-p="alc"',ico("glass"),"술",alcText(a)||"안 마심",a.lv!==0)+
    q('data-act="picker" data-p="supp"',ico("pill"),"영양제",today.supplement.length?today.supplement.length+"개 먹음":"안 먹음",today.supplement.length>0)+
    q('data-act="picker" data-p="work"',ico("run"),"운동",today.workout.length?today.workout.join("·"):"없음",today.workout.length>0)+
    '</div><div class="cap" style="margin-top:8px">물·커피는 누를 때마다 1잔씩 늘어요. 빼려면 건강 탭에서요.</div></div>';}
const mealOpen=new Set();
function timelineCard(){const n=sleepOn(TODAY);const tb=targetBed(lastSleeps(7).reduce((a,x)=>a+Math.max(0,420-(x.asleep||0)),0));const hr=new Date().getHours();
  const row=(time,icon,title,body,state)=>'<div class="tl '+(state||"")+'"><div class="tt">'+time+'</div><div class="tdot">'+ico(icon,"ico-xs")+'</div><div class="tb"><b>'+title+'</b>'+body+'</div></div>';
  const meal=(f,lab,time,from)=>{const v=today[f];const opts=mealOpts(f).concat(["직접 입력"]);const custom=v&&!opts.includes(v);
    const body=v&&!mealOpen.has(f)?'<button class="lnk" data-act="mealOpen" data-f="'+f+'" style="margin-left:0">바꾸기</button>':chips("meal-"+f,custom?[v].concat(opts):opts,x=>x===v,"sm2");
    return row(time,"check",lab+(v?' <span class="tv">'+esc(v)+'</span>':""),body,v?"done":hr>=from?"now":"");};
  let h='<div class="card"><div class="card-hd">'+ico("clock","c-blue")+'<h3>오늘 하루</h3><span class="cap">한 번 누르면 기록돼요</span></div><div class="tline">';
  h+=row(n?hhmmStr(n.wake):"—","sun","기상",n?'<span class="cap">'+hm(n.asleep)+' 잤어요 · <a href="#sleep">수면 보기</a></span>':'<span class="cap">수면 기록 대기 중</span>',n?"done":"");
  h+=meal("breakfast","아침","08:00",7)+meal("lunch","점심","12:00",11);
  h+=row("—","run","운동"+(today.workout.length?' <span class="tv">'+esc(today.workout.join("·"))+'</span>':""),'<button class="lnk" data-act="picker" data-p="work">'+(today.workout.length?"바꾸기":"기록하기")+'</button>',today.workout.length?"done":"");
  h+=meal("dinner","저녁","18:30",17);
  h+=row(tb.bed,"moon","취침 목표",'<span class="cap">내일 '+tb.wake+' 기상 기준</span>',hr>=21?"now":"");
  return h+'</div></div>';}
function keyNums(){const ref=addDays(TODAY,-1);
  const icn={"걸음":"foot","안정심박":"heart","HRV":"pulse"};const one=(k,name,unit,goodUp)=>{const v=vsBase(k,ref);const y=metric(ref,k);if(y==null)return"";
    const dir=v?(v.y>v.b.med?"▲":"▼"):"";const good=v&&v.st!=="평소 범위"?((/높음/.test(v.st))===goodUp?"up":"down"):"";
    return '<div class="kn">'+ico(icn[k],"ico-sm")+'<small>'+name+'</small><b>'+fmtN(y)+'<i>'+unit+'</i></b><span class="'+good+'">'+(v?dir+" "+v.st:"기준선 쌓는 중")+'</span></div>';};
  const r=one("걸음","어제 걸음","보",true)+one("안정심박","안정심박","bpm",false)+one("HRV","HRV","ms",true);
  return r?'<div class="sec-hd"><h3>'+ico("list","ico-sm")+'주요 건강 지표</h3><span class="cap">내 30일 평소 대비</span><a class="more" href="#health">건강'+ico("chev","ico-sm")+'</a></div><div class="kns">'+r+'</div>':"";}
function sleepMini(){const n=sleepOn(TODAY)||latestSleep();if(!n)return"";const s=SCORE.sleep(n,sleepsBefore(n.date));
  return '<a class="card mini-sleep" href="#sleep"><div class="card-hd">'+ico("moon","c-blue")+'<h3>'+(n.date===TODAY?"어젯밤 수면":shortDate(n.date)+" 수면")+'</h3><span class="pillbtn">수면 분석 보기'+ico("chev","ico-xs")+'</span></div><div class="ms"><b>'+hmHTML(n.asleep)+'</b><span class="cap">'+(s?"수면 점수 "+s.score:"")+' · '+esc(hhmmStr(n.bed))+'→'+esc(hhmmStr(n.wake))+'</span></div>'+stageBar(n)+'<svg class="wave" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 110 C120 110 170 40 260 40 S360 80 400 20 V120 H0Z"/></svg></a>';}
function nextPlans(){const items=planItems(TODAY);const now=pad(new Date().getHours())+":"+pad(new Date().getMinutes());const up=items.filter(i=>i.time&&i.time!=="종일"&&i.time>=now).slice(0,2);
  const w=weatherTile();
  let h='<div class="card"><div class="card-hd">'+ico("cal","c-blue")+'<h3>다음 일정</h3><a class="more" href="#plan">일정'+ico("chev","ico-sm")+'</a></div>';
  h+=up.length?'<div class="list">'+up.map(i=>{const[hh,mm]=i.time.split(":").map(Number);const left=hh*60+mm-(new Date().getHours()*60+new Date().getMinutes());
    return '<div class="li"><div class="time">'+esc(i.time)+'</div><div class="m"><div class="t">'+esc(i.title)+'</div><div class="s">'+(left<60?left+"분 뒤":Math.floor(left/60)+"시간 "+(left%60)+"분 뒤")+'</div></div></div>';}).join("")+'</div>':'<div class="cap">남은 일정이 없어요.</div>';
  if(w)h+='<div class="wline">'+ico(/비|눈|흐/.test(str(w.value)+str(w.note))?"cloud":"sun","ico-sm")+'<b>'+esc(str(w.value))+'</b><span>'+esc(str(w.note))+'</span></div>';
  return h+'</div>';}
function week7(){const pts=[];for(let i=6;i>=0;i--){const d=addDays(TODAY,-i);const c=SCORE.condition(d);pts.push([d,c.score]);}
  if(pts.filter(p=>p[1]!=null).length<2)return"";
  return '<div class="card"><div class="card-hd">'+ico("pulse","c-accent")+'<h3>최근 7일 컨디션</h3></div><div class="w7">'+pts.map(([d,s])=>{const l=s!=null?lv5(s):null;
    return '<div class="wd'+(d===TODAY?" today":"")+'"><span class="b '+(l?l[2]:"none")+'" style="height:'+(s!=null?Math.max(12,s):8)+'%"></span><b>'+(s!=null?s:"—")+'</b><small>'+(d===TODAY?"오늘":WEEK[parseYmd(d).getDay()])+'</small></div>';}).join("")+'</div></div>';}
function renderHome(){
  applyLunchDefault();
  /* 벤토 그리드: 카드마다 메시지 하나, 크기는 중요도 순 (디자인 v3) */
  const B=(cls,html)=>html?'<div class="bx '+cls+'">'+html+'</div>':"";
  let h=homeHeader()+'<div class="bento">'+B("b-hero",heroCard())+B("b-time",timelineCard())+B("b-sleep",sleepMini())+B("b-nums",keyNums())+B("b-todo",todoCard())+B("b-next",nextPlans())+B("b-quick",quickCard())+B("b-week",week7())+B("b-alert",alertsCard())+'</div>';
  h+='<div class="disc">건강 해석은 참고용이에요. 증상이 있거나 계속되면 진료 상담을 받아 주세요.</div>';
  $("v-home").innerHTML=h;
  bindNoticeRows($("v-home"));
}
function alertsCard(){
  const b=morningBrief();const al=b?arr(b.alerts).map(str):[];
  const notes=S.briefs.filter(x=>str(x.date)===TODAY&&!BRIEF_KINDS.includes(str(x.kind))).slice(0,3);
  if(!al.length&&!notes.length)return"";
  let h='<div class="card"><div class="card-hd">'+ico("bell","c-zap")+'<h3>중요한 알림</h3><a class="more" href="#brief">모두'+ico("chev","ico-sm")+'</a></div>';
  h+=al.map(a=>'<div class="alert" style="margin:0 0 8px">'+ico("bulb","ico-sm")+'<span>'+esc(noEmo(a))+'</span></div>').join("");
  h+='<div class="list">'+notes.map(noticeRow).join("")+'</div>';
  return h+'</div>';
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
  h+=signalCard()+stepCard()+heartCard();
  const ref=addDays(TODAY,-1);const pre=addDays(TODAY,-2);
  const M=(k,name,unit,icon,cls,goodUp,digits,note)=>{const v=metric(ref,k),pv=metric(pre,k);if(v==null)return"";
    return '<div class="metric"><div class="lb"><span class="'+cls+'">'+ico(icon,"ico-sm")+'</span>'+name+'</div><div class="v">'+(digits?(Math.round(v*10)/10):fmtN(v))+'<small>'+unit+'</small></div><div class="n">'+(pv!=null&&Math.round((v-pv)*10)!==0?deltaHTML(v-pv,"",goodUp,digits):'<span class="cap">'+(note||"그 전날과 같음")+'</span>')+'</div></div>';};
  const cat=(title,icon,cls,body)=>body?'<div class="card"><div class="card-hd">'+ico(icon,cls)+'<h3>'+title+'</h3><span class="cap">어제 · 그 전날 대비</span></div><div class="metrics">'+body+'</div></div>':"";
  h+=cat("활동","run","c-step",M("활동에너지","활동량","kcal","zap","c-zap",true)+M("운동시간","운동 시간","분","run","c-accent",true)+M("거리","이동 거리","km","foot","c-step",true,true)+M("스탠드시간","서 있던 시간","분","clock","c-blue",true));
  h+=cat("호흡·산소","lungs","c-blue",M("혈중산소","혈중 산소","%","drop","c-blue",true,true)+M("호흡수","수면 중 호흡수","회/분","lungs","c-blue",undefined,true)+M("VO2max","심폐 체력(VO₂max)","","run","c-accent",true,true,"최근 측정"));
  h+='<div class="sec-title">오늘 기록 <small>물·커피·컨디션·식사·술·영양제</small></div>'+logCard();
  h+=lifeGrid();
  h+='<div class="disc">건강 해석은 참고용이에요. 증상이 있거나 계속되면 진료 상담을 받아 주세요.</div></div>';
  $("v-health").innerHTML=h;
  bindLog();
}
/* 맨 위: 오늘 몸 상태 한 줄 + 항목별 신호등 */
function signalCard(){const L=bodyLine();const n=sleepOn(TODAY)||latestSleep();const s=n?SCORE.sleep(n,sleepsBefore(n.date)):null;
  const ref=addDays(TODAY,-1);const r=vsBase("안정심박",ref),hv=vsBase("HRV",ref);const st=metric(ref,"걸음");
  const heartBad=(r&&/높음/.test(r.st))||(hv&&/낮음/.test(hv.st));
  const sig=(name,lv,txt)=>'<div class="sg '+lv+'"><span class="sd2">'+ico(lv==="g"?"check":lv==="y"?"bell":lv==="r"?"x":"list","ico-xs")+'</span><b>'+name+'</b><small>'+txt+'</small></div>';
  return '<div class="card"><div class="one sm">'+esc(L.head)+'</div><div class="tip">'+esc(L.tip)+'</div><div class="sigs">'+
    sig("수면",!s?"n":s.score>=70?"g":s.score>=55?"y":"r",s?s.score+"점":"—")+
    sig("심장",!r&&!hv?"n":heartBad?"y":"g",!r&&!hv?"—":heartBad?"살펴보기":"평소 범위")+
    sig("활동",st==null?"n":st>=8000?"g":st>=5000?"y":"r",st==null?"—":fmtN(st)+"보")+
    sig("수분",today.water>=8?"g":today.water>=4?"y":"r",today.water+"/8잔")+
    sig("영양제",!mySupps().length?"n":today.supplement.length>=mySupps().length?"g":today.supplement.length?"y":"r",today.supplement.length+"/"+mySupps().length)+'</div></div>';}
/* 걸음: 최근 7일 막대 + 오늘 큰 숫자 */
function stepCard(){const G=8000;const ids=[];for(let i=6;i>=0;i--)ids.push(addDays(TODAY,-i));const v=ids.map(d=>metric(d,"걸음"));
  const past=v.slice(0,6).filter(x=>x!=null);const a7=avg(past);const t=v[6];if(!past.length&&t==null)return"";
  const mx=Math.max(G*1.15,...v.filter(x=>x!=null));
  let h='<div class="card"><div class="card-hd">'+ico("foot","c-step")+'<h3>걸음</h3><span class="cap">목표 '+fmtN(G)+'보</span></div>';
  h+='<div class="stbig"><b>'+(t==null?"—":fmtN(t))+'<i>보</i></b><span>오늘 · 목표의 '+(t==null?"—":Math.round(t/G*100)+"%")+(a7!=null&&t!=null?' · 최근 평균 '+fmtN(a7)+'보':"")+'</span></div>';
  const gp=(G/mx*100).toFixed(1);
  h+='<div class="sbars">'+ids.map((d,i)=>{const x=v[i];const hit=x!=null&&x>=G;const hp=(x==null?2:Math.max(3,x/mx*100)).toFixed(1);
    return '<div class="sb'+(d===TODAY?" today":"")+(hit?" hit":"")+'"><div class="area"><i class="goal" style="bottom:'+gp+'%"></i><span class="bb" style="height:'+hp+'%"><span class="vv">'+(x==null?"":x>=1000?(Math.round(x/100)/10)+"k":x)+'</span></span></div><small>'+(d===TODAY?"오늘":WEEK[parseYmd(d).getDay()])+(hit?" "+ico("check","ico-xs"):"")+'</small></div>';}).join("")+'</div>';
  const hit=past.filter(x=>x>=G).length;
  h+='<div class="cap" style="margin-top:10px">지난 6일 중 '+hit+'일 목표 달성'+(t!=null&&t<G&&new Date().getHours()<21?' · 오늘 남은 '+fmtN(G-t)+'보는 약 '+Math.ceil((G-t)/110)+'분 걷기예요':"")+'</div>';
  return h+'</div>';}
/* 심장: 상태 라벨 + 참고 문장 + 30일 범위 막대 */
function heartCard(){const ref=addDays(TODAY,-1);
  const msg={
    "안정심박":(v)=>{const y=Math.round(v.y),m=Math.round(v.b.med);const gen=y<60?"일반 성인 범위(60~100)보다 낮지만, 운동을 꾸준히 하는 사람에게는 흔해요.":y>100?"일반 성인 범위(60~100)보다 높아요.":"일반 성인 범위(60~100) 안이에요.";
      return gen+" 내 30일 평소("+m+")와 비교하면 "+(v.st==="평소 범위"?"비슷해서 안정적이에요.":/높음/.test(v.st)?Math.abs(y-m)+"bpm 높아요. 피로·수면 부족·음주·스트레스가 있으면 이렇게 올라가요.":Math.abs(y-m)+"bpm 낮아요. 잘 쉬었을 때 이렇게 내려가요.");},
    "HRV":(v)=>"HRV는 사람마다 차이가 커서 내 평소와만 비교해요. 내 평소("+Math.round(v.b.q1)+"~"+Math.round(v.b.q3)+"ms)보다 "+(v.st==="평소 범위"?"벗어나지 않아 회복 상태가 무난해요.":/낮음/.test(v.st)?"낮아요. 몸이 아직 회복 중이라는 신호일 수 있어요.":"높아요. 회복이 잘된 편이에요."),
    "걷기심박":(v)=>"걸을 때 심박은 걷는 속도·경사에 따라 달라져요. 내 평소("+Math.round(v.b.q1)+"~"+Math.round(v.b.q3)+"bpm)"+(v.st==="평소 범위"?" 안이에요.":/높음/.test(v.st)?"보다 높아요. 빨리 걸었거나 피곤한 날일 수 있어요.":"보다 낮아요.")};
  const rows=[["안정심박","안정 시 심박","bpm",false,"heart"],["HRV","심박 변이도 (HRV)","ms",true,"pulse"],["걷기심박","걸을 때 심박","bpm",null,"foot"]].map(([k,n,u,up,ic])=>{
    const v=vsBase(k,ref);const y=metric(ref,k);if(y==null)return"";
    if(!v)return '<div class="hr"><div class="ht"><span class="c-heart">'+ico(ic,"ico-sm")+'</span><b>'+n+'</b><span class="hv">'+Math.round(y)+'<i>'+u+'</i></span></div><div class="cap">평소 범위를 계산하려면 기록이 5일 이상 필요해요.</div></div>';
    const lo=Math.min(v.b.min,y),hi=Math.max(v.b.max,y),sp=(hi-lo)||1,pos=x=>((x-lo)/sp*100).toFixed(1);
    const tone=v.st==="평소 범위"?"ok":up===null?"mid":((/높음/.test(v.st))===up?"ok":/약간/.test(v.st)?"mid":"bad");
    return '<div class="hr"><div class="ht"><span class="c-heart">'+ico(ic,"ico-sm")+'</span><b>'+n+'</b><span class="hst '+tone+'">'+ico(tone==="ok"?"check":tone==="bad"?"bell":"list","ico-xs")+v.st+'</span><span class="hv">'+Math.round(y)+'<i>'+u+'</i></span></div>'+
      '<div class="rbar"><i class="band" style="left:'+pos(v.b.q1)+'%;width:'+(pos(v.b.q3)-pos(v.b.q1))+'%"></i><i class="dot '+tone+'" style="left:'+pos(y)+'%"></i></div><div class="rlab"><span>'+Math.round(lo)+'</span><span>평소 '+Math.round(v.b.q1)+'–'+Math.round(v.b.q3)+'</span><span>'+Math.round(hi)+'</span></div>'+
      '<div class="hmsg">'+esc(msg[k](v))+'</div></div>';}).join("");
  if(!rows)return"";
  // 회복 부족 신호: 안정심박 3일 연속 평소보다 높고 HRV도 낮음
  let warn="";const up3=[1,2,3].every(i=>{const x=vsBase("안정심박",addDays(TODAY,-i));return x&&/높음/.test(x.st);});const hl=vsBase("HRV",ref);
  if(up3&&hl&&/낮음/.test(hl.st))warn='<div class="notice">'+ico("bell","ico-sm")+'<div><b>회복 부족 신호</b>안정심박이 3일 연속 평소보다 높고 HRV도 낮아요. 오늘은 강한 운동을 쉬고 일찍 자는 걸 권해요. 어지러움·가슴 두근거림이 있거나 계속되면 진료 상담을 받아 주세요.</div></div>';
  return '<div class="card"><div class="card-hd">'+ico("heart","c-heart")+'<h3>심장</h3><span class="cap">어제 · 내 30일 기준</span></div>'+warn+'<div class="hrs">'+rows+'</div><div class="cap" style="margin-top:12px">진한 띠는 내 최근 30일 중 가운데 50%, 점은 어제 값이에요. 진단이 아닌 참고용이에요.</div></div>';}
/* 물·커피 7일 막대 */
function lifeGrid(){const ids=[];for(let i=6;i>=0;i--)ids.push(addDays(TODAY,-i));
  const col=(k,c,max)=>ids.map(d=>{const x=dayData(d);const v=x?x[k]:0;return '<div class="lg"><div class="area"><span class="bb" style="height:'+(v?Math.max(8,Math.min(100,v/max*100)):3)+'%;background:'+c+'"><span class="vv">'+(v||"")+'</span></span></div><small>'+(d===TODAY?"오늘":WEEK[parseYmd(d).getDay()])+'</small></div>';}).join("");
  return '<div class="card"><div class="card-hd">'+ico("drop","c-blue")+'<h3>최근 7일 물·커피</h3></div><div class="lbl" style="margin-left:0">'+ico("drop","ico-sm c-water")+' 물 <small>8잔 목표</small></div><div class="lgs">'+col("water","var(--blue)",8)+'</div><div class="lbl" style="margin-left:0">'+ico("cup","ico-sm c-coffee")+' 커피</div><div class="lgs short">'+col("coffee","var(--zap)",4)+'</div></div>';}
function logCard(){
  const cups=Array.from({length:Math.max(8,today.water)},(_,i)=>i<today.water);
  const meal=(f,lab)=>{const v=today[f];const opts=mealOpts(f).concat(["직접 입력"]);const custom=v&&!opts.includes(v);return '<div class="mrow"><span class="ml">'+lab+'</span>'+chips("meal-"+f,custom?[v].concat(opts):opts,x=>x===v,"sm2")+'</div>';};
  return '<div class="card" id="logCard"><div class="card-hd">'+ico("plus","c-accent")+'<h3>오늘 기록</h3><span class="cap">누르면 바로 저장돼요</span></div>'+
  '<div class="counter"><div class="meta"><div class="nm">'+ico("drop","ico-sm c-water")+' 물</div><div class="big">'+today.water+'<small>/ 8잔</small></div></div><button class="pm" data-act="water-" aria-label="물 빼기">−</button><button class="pm add" data-act="water+" aria-label="물 더하기">＋</button></div>'+
  '<div class="stagebar" style="height:8px;margin:12px 0 16px">'+cups.map(on=>'<i style="flex:1;background:'+(on?"var(--blue)":"transparent")+'"></i>').join("")+'</div>'+
  '<div class="counter"><div class="meta"><div class="nm">'+ico("cup","ico-sm c-coffee")+' 커피</div><div class="big">'+today.coffee+'<small>잔</small></div></div><button class="pm" data-act="coffee-" aria-label="커피 빼기">−</button><button class="pm add" data-act="coffee+" aria-label="커피 더하기">＋</button></div>'+
  condPicker()+
  '<div class="lbl grp" style="margin-left:0">'+ico("run","ico-sm c-work")+' 운동</div>'+workPicker()+
  '<div class="lbl" style="margin-left:0">'+ico("pill","ico-sm c-supp")+' 영양제 <button class="lnk" data-act="picker" data-p="supp">목록 편집</button></div>'+(mySupps().length?chips("supp",mySupps(),v=>today.supplement.includes(v)):'<div class="cap">목록 편집에서 내 영양제를 골라 주세요.</div>')+
  '<div class="lbl" style="margin-left:0">'+ico("glass","ico-sm c-alc")+' 술 <button class="lnk" data-act="picker" data-p="alc">종류·잔 수</button></div>'+chips("alc",ALC.map((l,i)=>[i,l]),v=>today.alcohol.lv===+v||(+v===0&&!today.alcohol.lv),"alc5")+(today.alcohol.type?'<div class="cap" style="margin-top:6px">'+esc(alcText(today.alcohol))+'</div>':"")+
  '<div class="lbl grp" style="margin-left:0">'+ico("check","ico-sm c-food")+' 식사 <small>평일 점심은 '+esc(lunchPlace())+'이 기본이에요</small></div>'+meal("breakfast","아침")+meal("lunch","점심")+meal("dinner","저녁")+
  '<div class="lbl grp" style="margin-left:0">'+ico("doc","ico-sm c-blue")+' 메모</div><textarea class="field" id="fMemo" rows="3" placeholder="메모" maxlength="1000"></textarea>'+
  '<div class="saved" id="savedNote">'+esc(savedMsg)+'</div></div>';
}
const FIELDS=[["fMemo","memo"]];
function bindLog(){
  FIELDS.forEach(([id,k])=>{const f=$(id);if(!f)return;f.value=today[k];f.addEventListener("input",e=>{today[k]=e.target.value;changed(false);});});
}
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const act=a.dataset.act;
  if(act==="water+")today.water=Math.min(today.water+1,20);if(act==="water-")today.water=Math.max(today.water-1,0);
  if(act==="coffee+")today.coffee=Math.min(today.coffee+1,10);if(act==="coffee-")today.coffee=Math.max(today.coffee-1,0);changed(true);});

/* =====================================================================
   브리핑 (오늘 브리핑 + 받은 알림함)
   ===================================================================== */
function noticeRow(b){
  return '<div class="li tap'+(isUnread(b)?" unread":"")+'" data-bid="'+esc(b.id||"")+'"><div class="ic">'+ico(KIND_ICO[b.kind]||"bell")+'</div><div class="m"><div class="t">'+esc(str(b.headline)||"알림")+'</div>'+
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
  let h='<div class="cap">'+esc((str(b.kind)||"알림")+" · "+korDate(str(b.date)||TODAY)+(b.createdAt?" · "+hhmm(b.createdAt):""))+'</div><div class="bh">'+esc(str(b.headline)||"알림")+'</div>';
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
  const qs=arr(b.questions);if(qs.length)h+='<div class="q"><b>답해 주세요</b>'+qs.map(q=>'<div>'+esc(str(q))+'</div>').join("")+'<div class="cap" style="margin-top:6px">건강 탭 \'오늘 기록\'에서 누르거나 Claude에게 말해 주세요</div></div>';
  arr(b.sections).forEach(s=>{h+=sec(esc(str(s.title)),arr(s.items).map(p=>'<div class="li"><div class="m"><div class="t" style="font-weight:500">'+esc(str(p))+'</div></div></div>').join(""));});
  if(b.quote)h+='<p class="muted" style="text-align:center;margin:20px 0 0">“'+esc(str(b.quote))+'”</p>';
  if(b.footnote)h+='<div class="cap" style="margin-top:16px">'+esc(str(b.footnote))+'</div>';
  openSheet(str(b.kind)||"알림",h);
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
  h+='<div class="card"><div class="setrow"><div class="hdr" style="padding:0"><div class="av">'+ico("user")+'</div></div><div class="m"><b>연서 씨</b><small>KORA '+APP_VER+'</small></div></div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("sun","c-zap")+'<h3>화면 테마</h3></div><div class="theme3">'+[["system","시스템 설정","monitor"],["light","라이트","sun"],["dark","다크","moon"]].map(([k,l,i])=>'<button data-th="'+k+'" class="'+(p===k?"on":"")+'">'+ico(i)+l+'</button>').join("")+'</div><div class="cap" style="margin-top:10px">시스템 설정을 고르면 폰이 다크 모드로 바뀔 때 앱도 함께 바뀌어요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("check","c-accent")+'<h3>기록 기본값</h3></div><div class="trow"><span>평일 점심 자동 기록</span><button class="toggle '+(lunchDefOn()?"on":"")+'" id="tgLunch" aria-label="평일 점심 자동 기록"></button></div>'+
    '<div class="lbl" style="margin-left:0">점심 장소</div><div class="addrow"><input class="field" id="lunchIn" maxlength="30" value="'+esc(lunchPlace())+'"><button class="btn-sub" id="lunchSave">저장</button></div>'+
    '<div class="cap" style="margin-top:8px">평일(공휴일 제외) 오전 11시가 지나면 점심 칸에 자동으로 들어가요. 다른 걸 먹었으면 한 번 눌러 바꾸면 돼요.</div></div>';
  const row=(icon,name,state,cls,note)=>'<div class="setrow"><span class="c-blue">'+ico(icon)+'</span><div class="m"><b>'+name+'</b><small>'+esc(note)+'</small></div><span class="badge '+cls+'">'+state+'</span></div>';
  const H=S.health;
  h+='<div class="card"><div class="card-hd">'+ico("link","c-accent")+'<h3>건강 데이터 연동</h3></div>'+
    row("phone","건강 데이터 (전체)",ss,scls,smsg)+
    (()=>{const B=H&&H.sources&&H.sources.backup;if(!B)return row("doc","Apple 백업 단축어 (폰 뒤 톡톡)","확인 전","gray","서버가 아직 출처 상태를 보내지 않았어요");
      return B.ok?row("doc","Apple 백업 단축어 (폰 뒤 톡톡)","연결됨","","마지막 백업 "+(B.at||"—")+" · 수면·걸음·심박 등 전체 건강이 들어와요"):row("doc","Apple 백업 단축어 (폰 뒤 톡톡)","읽기 실패","bad",B.error||"서버가 백업 문서를 못 읽었어요");})()+
    row("watch","Apple Watch",H&&arr(H.sleep).length?"데이터 있음":"데이터 없음",H&&arr(H.sleep).length?"":"gray",H&&arr(H.sleep).length?"수면 단계·HRV·심박·혈중산소를 워치가 측정해요":"워치 수면 기록이 아직 없어요")+
    (()=>{const E=H&&H.sources&&H.sources.hae;if(E&&!E.ok)return row("refresh","Health Auto Export (자동 전송)","읽기 실패","bad",E.error||"");
      if(!(H&&H.haeAt))return row("refresh","Health Auto Export (자동 전송)","동기화 대기","warn","앱에서 REST API 자동화를 켜면 첫 전송 후 연결됨으로 바뀌어요");
      const t=new Date(String(H.haeAt).replace(" ","T")+":00+09:00"),age=(Date.now()-t)/36e5;
      return age>SYNC_LATE_H?row("refresh","Health Auto Export (자동 전송)","전송 멈춤","warn","마지막 자동 전송 "+H.haeAt+" · 아이폰에서 앱을 한 번 열어 주세요 (단축어 백업이 있으면 그 값으로 채워요)"):row("refresh","Health Auto Export (자동 전송)","연결됨","","마지막 자동 전송 "+H.haeAt);})()+
    '<button class="btn-sub" style="margin-top:10px" onclick="koraReload()">'+ico("refresh","ico-sm")+' 건강 데이터 지금 다시 불러오기</button>'+
    row("heart","Samsung Health","지원되지 않음","gray","아이폰에서는 Samsung Health 데이터를 받을 수 없어요 (안드로이드 Health Connect 전용)")+
    '<div class="lbl" style="margin-left:0">아이폰에서 할 일</div><ol class="steps"><li><b>Health Auto Export</b>: 자동화 → REST API → 형식 JSON · <b>기간 \'지난 7일\'</b>(\'마지막 동기화 이후\'로 두면 조각만 와요) · 데이터 요약 켬 · 묶음 단위 일 · 동기화 주기 1시간</li><li>두 출처를 합쳐서 보여 줘요: 같은 날 값이 여러 번 오면 걸음·에너지는 큰 값, 수면은 더 길게 잡힌 밤을 써요. 그래서 조각 전송이 와도 숫자가 줄어들지 않아요</li><li>지표: 걸음·활동 에너지·휴식 에너지·안정 시 심박·심박 변이도·혈중 산소·호흡수·운동 시간·걷기+달리기 거리·오른 층수·스탠드 시간·VO₂max·수면 분석</li><li>Health Auto Export 위젯을 홈 화면에 두면 백그라운드 전송이 더 잘 돼요</li><li>미리 알림·일정은 지금처럼 <b>폰 뒤 톡톡</b>(단축어 "Apple 백업")으로 보내요</li><li>잠금이 풀린 상태에서만 아이폰이 건강 데이터를 내줘요</li><li>앱은 열 때마다, 켜 둔 동안은 5분마다 새 데이터를 가져와요</li><li>14시간 넘게 새 데이터가 없으면 \'동기화 지연\'으로 알려 드려요</li></ol></div>';
  h+='<div class="card"><div class="card-hd">'+ico("bell","c-zap")+'<h3>알림 · 브리핑 시간</h3></div><div class="list">'+
    [["아침 브리핑","평일 07:00 · 주말 10:00"],["마감일 사전 알림","매일 08:40"],["비서 판단 알림","08:37 · 10:37 · 12:37 · 15:37 · 17:37 · 21:37"],["저녁 전 질문","매일 19:20"],["저녁 정리","매일 20:23"],["주간 계획 · 월간 점검","일요일 19:30 · 매달 1일 08:55"]].map(([a,b])=>'<div class="li"><div class="m"><div class="t">'+a+'</div><div class="s">'+b+'</div></div></div>').join("")+
    '</div><div class="cap" style="margin-top:10px">모든 브리핑·알림은 이 앱에 올라와요. 시간 변경은 Claude에게 말해 주세요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("spark","c-blue")+'<h3>AI 분석</h3></div><div class="cap" style="line-height:1.7">· 컨디션·수면 점수는 앱이 정해진 계산식으로 직접 계산해요 (기기 점수와 섞지 않아요).<br>· \'AI 해석\' 표시는 아침 브리핑에서 Claude가 쓴 문장, \'자동 요약\'은 계산 결과로 만든 문장이에요.<br>· 데이터가 부족하면 점수를 만들지 않고 \'분석 데이터 부족\'으로 보여 줘요.<br>· 의료 진단이 아니에요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("shield","c-accent")+'<h3>데이터 · 백업</h3></div><div class="cap" style="line-height:1.7">기록은 내 구글 시트 "연서의 하루 데이터"에만 저장돼요. 개편 단계마다 앱 코드(GitHub 브랜치)·시트·서버 코드를 백업하고, 위치는 구글 드라이브 "브리핑 앱 개편 · 백업·복구 기록" 문서에 있어요.</div></div>';
  h+='<div class="card"><div class="card-hd">'+ico("gear","c-blue")+'<h3>연결</h3></div><div class="setrow"><div class="m"><b>상태</b><small>'+esc($("status").textContent)+'</small></div></div><div class="lbl" style="margin-left:0">앱 비밀번호</div><input class="field" id="keyIn" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="비밀번호"><div class="msg" id="keyMsg"></div><button class="primary" id="keySave">연결하고 불러오기</button></div>';
  h+='</div>';
  $("v-me").innerHTML=h;$("keyIn").value=CFG.key;
  document.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>setTheme(b.dataset.th));
  $("tgLunch").onclick=()=>{ls("ys_lunchdef",lunchDefOn()?"off":"on");renderMe();};
  $("lunchSave").onclick=()=>{const v=$("lunchIn").value.trim();if(v){ls("ys_lunchplace",v);toast("점심 장소를 바꿨어요");}};
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
function dayData(id){return id===TODAY?today:(S.days[id]?normDay(id,S.days[id]):null);}
function refreshCharts(){const t=curTab();if(t==="sleep")renderTab(t);}
window.__chartReady=()=>refreshCharts();

/* ---------- 렌더 ---------- */
function renderTab(t){
  if(t==="home")renderHome();else if(t==="sleep")renderSleep();else if(t==="health")renderHealth();
  else if(t==="brief")renderBrief();else if(t==="plan")renderPlan();else if(t==="me")renderMe();
  if(window.AIP)try{window.AIP.afterRender(t);}catch(e){}
}
function renderAll(keepScroll){const y=window.scrollY;renderTab(curTab());renderBadge();if(keepScroll)window.scrollTo(0,y);}

/* ---------- 서버 ---------- */
/* 2026-11-26-2: 요청마다 시간 제한(멈춘 요청 때문에 다시 불러오기가 영원히 막히지 않게) + 한 번 더 시도 */
async function fetchJson(url,opt,ms){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms||30000);
  try{const r=await fetch(url,Object.assign({},opt,{signal:ctl.signal}));const txt=await r.text();try{return JSON.parse(txt);}catch(e){throw new Error(/<html/i.test(txt)?"서버가 웹페이지를 돌려줬어요(권한·배포 확인 필요)":"응답을 읽지 못했어요");}}
  finally{clearTimeout(t);}}
async function apiGet(fresh){const u=()=>CFG.url+"?key="+encodeURIComponent(CFG.key)+(fresh?"&fresh=1":"")+"&t="+Date.now();
  try{return await fetchJson(u(),{cache:"no-store"},30000);}catch(e){await new Promise(r=>setTimeout(r,1500));return fetchJson(u(),{cache:"no-store"},40000);}}
async function apiPost(body){return fetchJson(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({key:CFG.key},body))},30000);}

/* 기록 저장 (기존 saveDay 동작 그대로) */
let saveTimer=null,saving=false,dirty=false,savedMsg="";
function setSaved(t){savedMsg=t;const e=$("savedNote");if(e)e.textContent=t;}
function changed(rerender){today.reflected=false;
  if(rerender){const y=window.scrollY;const ae=document.activeElement&&document.activeElement.id;renderTab(curTab());window.scrollTo(0,y);if(ae&&$(ae))$(ae).focus();}
  dirty=true;setSaved("저장 중…");clearTimeout(saveTimer);saveTimer=setTimeout(flush,700);}
async function flush(){
  if(!CFG.key){setSaved("연결이 필요해요");location.hash="#me";return;}
  if(saving){clearTimeout(saveTimer);saveTimer=setTimeout(flush,500);return;}
  saving=true;dirty=false;const body=Object.assign({},today,{workout:today.workout.slice(),condition:today.condition.length?today.condition.join(","):null,mood:today.mood.join(","),supplement:today.supplement.length?today.supplement.join(","):"FALSE",alcohol:serAlc(today.alcohol)});
  try{const res=await apiPost({action:"saveDay",day:body});
    if(res&&res.ok){setSaved("✓ 저장됨 · "+hhmm(new Date()));S.days[TODAY]=body;try{window.__aiDayFix&&window.__aiDayFix(body);}catch(e){}const n=$("savedNote");if(n){n.classList.remove("pop");void n.offsetWidth;n.classList.add("pop");}}
    else{setSaved(res&&res.error==="key"?"비밀번호가 맞지 않아요":"저장하지 못했어요");dirty=true;}
  }catch(err){setSaved("연결이 안 돼요 · 곧 다시 저장할게요");dirty=true;setTimeout(()=>{if(dirty)flush();},5000);}
  saving=false;
}
let loading=false;
async function load(show){
  if(!CFG.key){setStatus("연결이 필요해요 · 내 정보에서 비밀번호를 넣어 주세요","off");return;}
  if(loading)return;loading=true;if(show)setStatus("불러오는 중…","wait");
  try{const res=await apiGet(!!show);
    if(!res||!res.ok){setStatus(res&&res.error==="key"?"비밀번호가 맞지 않아요":"불러오지 못했어요","off");}
    else{const next={};(res.days||[]).forEach(d=>{if(d&&d.date)next[d.date]=d;});S.days=next;
      if(next[TODAY]&&!dirty&&!saving)today=normDay(TODAY,next[TODAY]);
      S.briefs=(res.briefings||[]).filter(b=>b&&b.date).sort((a,b)=>str(b.createdAt).localeCompare(str(a.createdAt)));
      if(res.health&&!res.health.error){S.health=normHealth(res.health);S.healthErr="";}else{S.healthErr=res.health&&res.health.error?String(res.health.error):"건강 데이터가 비어 있어요";}   /* 실패해도 이전 건강 데이터는 그대로 보여 준다 */
      S.loadedAt=new Date();setStatus("최신 · "+hhmm(S.loadedAt)+" 업데이트","ok");
      ls("ys_cache",JSON.stringify({days:res.days,briefings:res.briefings,health:res.health||null}));
      const ae=document.activeElement;if(!(ae&&/INPUT|TEXTAREA/.test(ae.tagName)))renderAll(true);else renderBadge();}
  }catch(err){setStatus((err&&err.name==="AbortError"?"서버 응답이 늦어요":"연결이 안 돼요")+" · 저장된 내용을 보여 줘요 · 당겨서 다시 시도","off");}
  finally{loading=false;}
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
  window.addEventListener("touchstart",e=>{if(window.scrollY<=0&&e.touches.length===1&&!$("sheet").classList.contains("on")&&!document.documentElement.classList.contains("ai-open")){y0=e.touches[0].clientY;dy=0;}else y0=null;},{passive:true});
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
window.koraReload=function(){toast("건강 데이터를 새로 불러오는 중…");return load(true).then(()=>{toast(S.healthErr&&!S.health?"건강 데이터를 못 불러왔어요":"새로 불러왔어요 · "+(lastHealthAt()||"—"));});};
window.__app={S,SCORE,setTheme,ico,esc,openSheet,closeSheet,toast,mark:KORA_MARK}; // 테스트용 + AI 모듈(ai.js)이 쓰는 도구
})();
