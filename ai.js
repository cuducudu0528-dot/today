/* 브리핑 · AI 파트너 (2026-11-25)
   - 기존 앱(app.js)과 분리된 모듈. AI 서버 주소·토큰이 없거나 꺼져 있으면 아무것도 그리지 않는다(내 정보의 연결 칸만).
   - AI 서버는 기존 브리핑 서버와 다른 Apps Script 웹앱. 호출은 text/plain POST(프리플라이트 없음), 시간 제한·격리.
   - 모든 AI 출력은 textContent로만 그린다(innerHTML 금지). */
(function(){
"use strict";
const A=window.__app||{};
const $=id=>document.getElementById(id);
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}};
const ico=(n,c)=>A.ico?A.ico(n,c):"";
const fmt=n=>n==null||!isFinite(n)?"—":Math.round(n).toLocaleString("ko-KR");
const won=n=>n==null?"확인 필요":fmt(n)+"원";

/* ---------- 설정 ---------- */
const CFG={get url(){return(LS("ai_url")||"").trim();},get token(){return(LS("ai_token")||"").trim();},get on(){return LS("ai_on")!=="0";}};
const enabled=()=>!!(CFG.url&&CFG.token&&CFG.on);
const ST={server:null,persona:null,inbox:[],busy:false,sid:LS("ai_sid")||null,msgs:[],open:false,prevY:0,precise:LS("ai_precise")==="1",interview:null,lastErr:"",together:null,usage:null,settings:null,poll:null};

/* ---------- DOM 도우미 (텍스트는 항상 textContent) ---------- */
function el(tag,attrs,...kids){const e=document.createElement(tag);
  if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;
    if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k==="html")e.innerHTML=v; /* 아이콘 SVG 상수 전용 */
    else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?"":v);}
  kids.flat().forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"||typeof c==="number"?document.createTextNode(String(c)):c);});
  return e;}
const SVG={mic:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',send:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'};
const icon=(n,c)=>el("span",{class:"aico "+(c||""),html:ico(n,"ico-sm"),"aria-hidden":"true"});
/* 안전한 최소 마크다운: 줄바꿈, "- " 목록, **굵게**, 링크는 http(s)만 */
function md(text){const box=el("div",{class:"md"});let list=null;
  String(text||"").split(/\n/).forEach(line=>{const m=/^\s*[-•]\s+(.*)$/.exec(line);
    if(m){if(!list){list=el("ul");box.appendChild(list);}list.appendChild(el("li",null,inline(m[1])));return;}
    list=null;if(!line.trim()){box.appendChild(el("div",{class:"sp"}));return;}box.appendChild(el("p",null,inline(line)));});
  return box;}
function inline(s){const out=[];const re=/\*\*([^*]+)\*\*|(https?:\/\/[^\s)]+)/g;let i=0,m;
  while((m=re.exec(s))){if(m.index>i)out.push(s.slice(i,m.index));
    if(m[1])out.push(el("b",{text:m[1]}));else out.push(el("a",{href:m[2],target:"_blank",rel:"noopener noreferrer",text:m[2].replace(/^https?:\/\//,"").slice(0,40)}));i=re.lastIndex;}
  if(i<s.length)out.push(s.slice(i));return out;}

/* ---------- 서버 호출 (격리·시간 제한, S008·S017) ---------- */
async function call(payload,ms){
  if(!enabled())return{ok:false,error:"NOT_CONNECTED"};
  if(navigator.onLine===false)return{ok:false,error:"OFFLINE"};
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms||20000);
  try{const r=await fetch(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({token:CFG.token},payload)),signal:ctl.signal});
    const j=await r.json();if(j&&j.error==="UNAUTHORIZED"){ST.lastErr="UNAUTHORIZED";}return j||{ok:false,error:"EMPTY"};}
  catch(e){return{ok:false,error:e&&e.name==="AbortError"?"TIMEOUT":"NETWORK"};}
  finally{clearTimeout(t);}}
const ERR={NOT_CONNECTED:"AI 서버가 연결되지 않았어요. 내 정보에서 주소와 토큰을 넣어 주세요.",OFFLINE:"인터넷 연결이 없어요. 연결되면 다시 보낼 수 있어요.",TIMEOUT:"답이 너무 오래 걸려서 멈췄어요. 다시 보내 볼까요?",
  NETWORK:"AI 서버에 닿지 못했어요. 잠시 뒤 다시 시도해 주세요.",UNAUTHORIZED:"토큰이 맞지 않아요. 내 정보에서 AI 토큰을 다시 넣어 주세요.",AI_DISABLED:"AI 서버가 꺼져 있어요(AI_ENABLED).",
  LIMIT_REACHED:"오늘 AI 사용 한도를 다 썼어요. 내일 0시에 다시 열려요.","MISSING_KEY:GEMINI":"AI 서버에 Gemini 키가 아직 없어요.","MISSING_KEY:GEMINI_MODEL":"AI 서버에 GEMINI_MODEL 설정이 없어요.",
  GEMINI_RATE_LIMIT:"Gemini 요청이 잠시 몰렸어요. 1분 뒤 다시 보내 주세요.",SERVER_ERROR:"AI 서버에서 오류가 났어요. 다시 시도해 주세요.",EMPTY_INPUT:"보낼 내용이 비어 있어요."};
const errText=e=>ERR[e]||("문제가 생겼어요("+e+"). 다시 시도해 주세요.");

/* ---------- 앱 기록 보정 (2026-11-25(3)) ----------
   기록 서버가 영양제·술을 TRUE/FALSE로 바꿔 저장해 버리는 문제 → 저장 직후 원래 값(이름·잔 수)을 다시 써 넣는다 */
let dayFixT=null;
window.__aiDayFix=function(day){if(!enabled()||!day||!day.date)return;clearTimeout(dayFixT);
  const body={action:"day_fix",date:day.date,supplement:String(day.supplement==null?"":day.supplement),alcohol:String(day.alcohol==null?"":day.alcohol)};
  dayFixT=setTimeout(()=>{call(body,15000);},400);};

/* ---------- 존재감 오브 (S103) ---------- */
function orb(){let o=$("aiOrb");if(!o){o=el("button",{id:"aiOrb",class:"ai-orb","aria-label":"AI 파트너 열기",onclick:()=>openChat()},el("span",{class:"core",html:A.mark||""}),el("span",{class:"pip"}));document.body.appendChild(o);}return o;}
function setOrb(state){const o=orb();o.dataset.state=state;o.setAttribute("aria-label","AI 파트너 열기 · "+({idle:"쉬는 중",thinking:"생각 중",waking:"할 말이 있어요"}[state]||""));}
function orbFromInbox(){if(ST.busy)return setOrb("thinking");setOrb(ST.inbox.some(i=>i.status==="NEW")?"waking":"idle");}

/* ---------- 대화 화면 (S102·S111) ---------- */
function view(){let v=$("aiView");if(v)return v;
  v=el("div",{id:"aiView",class:"ai-view",role:"dialog","aria-modal":"true","aria-label":"AI 파트너"},
    el("div",{class:"ai-side",id:"aiSide"}),
    el("div",{class:"ai-main"},
      el("div",{class:"ai-hd"},
        el("button",{class:"ai-ib",id:"aiClose","aria-label":"닫기",onclick:closeChat,html:ico("x")}),
        el("div",{class:"ai-ttl"},el("b",{id:"aiName",text:"AI 파트너"}),el("small",{id:"aiSub",text:""})),
        el("button",{class:"ai-ib ai-only-phone",id:"aiPanelBtn","aria-label":"함께 만든 것",onclick:()=>openPanel(),html:ico("spark")})),
      el("div",{class:"ai-log",id:"aiLog","aria-live":"polite"}),
      el("div",{class:"ai-compose",id:"aiCompose"},
        el("div",{class:"ai-tools"},
          el("button",{class:"ai-chip"+(ST.precise?" on":""),id:"aiPrecise",hidden:!(ST.keys&&ST.keys.claude),"aria-pressed":ST.precise?"true":"false",onclick:togglePrecise},icon("check"),"정밀 모드"),
          el("button",{class:"ai-chip"+(ST.deep?" on":""),id:"aiDeep","aria-pressed":ST.deep?"true":"false",onclick:toggleDeep},icon("spark"),"깊게 생각"),
          el("span",{class:"ai-hint",id:"aiHint",text:""})),
        el("div",{class:"ai-row"},
          el("button",{class:"ai-ib ai-mic",id:"aiMic","aria-label":"말로 하기",onclick:mic,html:SVG.mic}),
          el("textarea",{id:"aiIn",rows:"1",maxlength:"4000",placeholder:"무엇이든 물어보세요",enterkeyhint:"send","aria-label":"메시지"}),
          el("button",{class:"ai-send",id:"aiSend","aria-label":"보내기",onclick:()=>sendFromBox(),html:SVG.send})))));
  document.body.appendChild(v);
  const ta=$("aiIn");
  ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,140)+"px";});
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&matchMedia("(hover:hover)").matches){e.preventDefault();sendFromBox();}});
  // 키보드가 올라오면 visualViewport로 입력창 위치 보정 (S108)
  // 2026-11-25: 화면 전체를 '보이는 영역'에 맞춘다(아이폰 키보드가 올라오면 대화창 높이를 줄이고, 뒤 화면이 비치지 않게)
  // 2026-11-25(2): 아이패드 하단 단축키 막대(외장·플로팅 키보드)가 입력창을 가리는 문제 보정 —
  //  보이는 영역이 거의 안 줄었는데 입력 중이면, 막대 높이만큼 입력창을 위로 띄운다.
  const isPad=/iPad/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const fix=()=>{const vv=window.visualViewport;const focused=document.activeElement===ta;
      const H=vv?vv.height:window.innerHeight,T=vv?vv.offsetTop:0;
      const gap=Math.max(0,(window.innerHeight||H)-H-T);const kbOpen=gap>120;
      v.style.top=T+"px";v.style.height=H+"px";v.style.bottom="auto";v.classList.toggle("kb",kbOpen||focused);
      v.style.setProperty("--kbx",(focused&&isPad&&gap<60)?"64px":"0px");
      if(focused){const lg=$("aiLog");if(lg)lg.scrollTop=lg.scrollHeight;}
      if(window.scrollY!==ST.prevY&&document.documentElement.classList.contains("ai-open"))window.scrollTo(0,ST.prevY);};
  if(window.visualViewport){visualViewport.addEventListener("resize",fix);visualViewport.addEventListener("scroll",fix);}
  window.addEventListener("resize",fix);ST.fixVV=fix;fix();
  const refix=()=>{fix();setTimeout(fix,120);setTimeout(fix,350);setTimeout(fix,700);};
  ta.addEventListener("focus",refix);
  // 2026-11-26: 위쪽(머리)이나 맨 위까지 올린 대화에서 아래로 쓸어내리면 닫힌다. 덜 쓸면 제자리로.
  (function(){let y0=null,x0=0,dy=0,lock=false;const lg=$("aiLog"),hd=v.querySelector(".ai-hd");
    const start=e=>{if(e.touches.length!==1||document.activeElement===ta){y0=null;return;}const onHd=hd.contains(e.target);if(!onHd&&lg.scrollTop>2){y0=null;return;}y0=e.touches[0].clientY;x0=e.touches[0].clientX;dy=0;lock=false;};
    const move=e=>{if(y0===null)return;dy=e.touches[0].clientY-y0;const dx=Math.abs(e.touches[0].clientX-x0);if(!lock){if(dx>Math.abs(dy)||dy<0){y0=null;return;}if(dy>8)lock=true;else return;}
      if(e.cancelable)e.preventDefault();v.style.transition="none";v.style.transform="translateY("+Math.max(0,dy)+"px)";};
    const end=()=>{if(y0===null)return;v.style.transition="";if(lock&&dy>120){v.style.transform="";closeChat();}else v.style.transform="";y0=null;lock=false;};
    v.addEventListener("touchstart",start,{passive:true});v.addEventListener("touchmove",move,{passive:false});v.addEventListener("touchend",end,{passive:true});v.addEventListener("touchcancel",end,{passive:true});})();ta.addEventListener("blur",()=>setTimeout(fix,80));
  // 글이 길어져도 커서가 있는 줄이 보이게
  ta.addEventListener("input",()=>{if(ta.selectionEnd===ta.value.length)ta.scrollTop=ta.scrollHeight;});
  return v;}
function openChat(prefill){if(!enabled()){location.hash="#me";setTimeout(()=>{const c=$("aiConnect");if(c)c.scrollIntoView({behavior:"smooth"});},200);return;}
  const v=view();ST.prevY=window.scrollY;ST.open=true;document.documentElement.classList.add("ai-open");v.classList.add("on");
  [...document.body.children].forEach(c=>{if(c!==v&&c.tagName!=="SCRIPT"){c.inert=true;c.setAttribute("aria-hidden","true");}});
  renderLog();boot();renderSide();
  if(prefill){$("aiIn").value=prefill;}
  setTimeout(()=>{if(matchMedia("(hover:hover)").matches)$("aiIn").focus();},250);}
function closeChat(){const v=$("aiView");if(!v)return;v.classList.remove("on");ST.open=false;document.documentElement.classList.remove("ai-open");
  [...document.body.children].forEach(c=>{if(c!==v){c.inert=false;c.removeAttribute("aria-hidden");}});
  if("speechSynthesis" in window)speechSynthesis.cancel();window.scrollTo(0,ST.prevY);}   // 이전 탭·스크롤 복원
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&ST.open)closeChat();});
let scrT=null;window.addEventListener("scroll",()=>{document.documentElement.classList.add("ai-scrolling");clearTimeout(scrT);scrT=setTimeout(()=>document.documentElement.classList.remove("ai-scrolling"),700);},{passive:true});

/* ---------- 첫 진입: 성격·인터뷰·기록 ---------- */
let booted=false;
async function boot(){if(booted)return;booted=true;
  const cached=JSON.parse(LS("ai_msgs")||"[]");if(cached.length&&!ST.msgs.length){ST.msgs=cached;renderLog();}
  let [p,h]=await Promise.all([call({action:"persona_get"},15000),call({action:"history",sessionId:ST.sid,limit:30},15000)]);
  if(!p.ok&&/NETWORK|TIMEOUT/.test(p.error||""))p=await call({action:"persona_get"},20000);   // 2026-11-26: 열 때 잠깐 끊긴 걸 오류로 띄우지 않음
  if(!h.ok&&/NETWORK|TIMEOUT/.test(h.error||""))h=await call({action:"history",sessionId:ST.sid,limit:30},20000);
  if(p.ok){ST.persona=p.active;ST.interview=p.interview;header();}
  else{booted=false;}
  if(h.ok&&h.turns&&h.turns.length){ST.sid=h.sessionId;LS("ai_sid",ST.sid);
    const T=h.turns,lastI=T.length-1;
    ST.msgs=T.filter((t,i)=>!(t.kind==="error"&&(t.resolved===true||t.resolved==="TRUE"||i<lastI-1))).map(t=>t.role==="user"?{t:"user",text:t.content}:(t.kind==="error"?{t:"sys",kind:"err",text:t.content}:{t:"ai",text:t.content,nodes:t.nodes,pro:t.kind==="proactive"}));saveMsgs();}   // 서버가 원본 (S114)
  resumeAfterRelaunch(h.ok?(h.turns||[]):null);
  if(p.ok&&p.interview&&!p.interview.done){startInterview(p.interview);}
  else if(!ST.msgs.length)ST.msgs.push({t:"empty"});
  if(!p.ok&&!(h.ok&&h.turns&&h.turns.length))ST.msgs.push({t:"sys",kind:"err",text:errText(p.error),retry:"boot"});
  renderLog();}
/* 앱이 완전히 꺼졌다 다시 켜진 경우: 저장해 둔 '답 기다리는 중'을 이어받는다 */
function resumeAfterRelaunch(turns){let P=null;try{P=JSON.parse(LS("ai_pending")||"null");}catch(e){}
  if(!P||!P.input||ST.busy){return;}
  if(Date.now()-P.at>15*60000||(P.sid&&ST.sid&&P.sid!==ST.sid)){LS("ai_pending",null);return;}
  if(turns){const t=pickAnswer(turns,P.input,P.nBefore);if(t){LS("ai_pending",null);return;}}   // 이미 기록에 답이 있음
  ST.msgs=ST.msgs.filter(m=>m.t!=="empty");
  const last=ST.msgs[ST.msgs.length-1];if(!(last&&last.t==="user"&&last.text===P.input))ST.msgs.push({t:"user",text:P.input});
  const live={t:"live",doing:"앱을 나가 있는 동안에도 생각은 계속하고 있었어요. 답을 불러오는 중…",nodes:[]};ST.msgs.push(live);renderLog(true);
  ST.busy=true;setOrb("thinking");const sb=$("aiSend");if(sb)sb.disabled=true;
  const tok=ST.reqTok=Date.now()+":r";ST.pending={input:P.input,nBefore:P.nBefore,at:P.at,tok:tok,mode:P.mode};
  recoverAnswer(P.input,P.nBefore,true).then(r=>{if(ST.reqTok!==tok)return;
    finishTurn(r||{ok:false,error:"TIMEOUT"},{input:P.input,outputMode:P.mode},live);});}
function header(){const P=ST.persona||{};$("aiName").textContent=P.name||"AI 파트너";$("aiSub").textContent=(P._version?"성격 v"+P._version:"아직 성격을 만들기 전")+(ST.interview&&!ST.interview.done?" · 첫 인터뷰 중":"");}
function startInterview(iv){ST.interview=iv;header();
  if(!ST.msgs.some(m=>m.t==="ai"&&m.interviewQ===iv.step))ST.msgs.push({t:"sys",kind:"info",text:"처음이라 저를 함께 만들어 볼게요. 질문 "+iv.total+"개, 한 번에 하나씩이에요. 중간에 나가도 이어서 할 수 있어요."},{t:"ai",text:iv.question,interviewQ:iv.step});
  $("aiHint").textContent="인터뷰 "+(iv.step+1)+"/"+iv.total;}

/* ---------- 메시지 렌더 (S104) ---------- */
function saveMsgs(){LS("ai_msgs",JSON.stringify(ST.msgs.filter(m=>m.t!=="live"&&m.t!=="empty").slice(-30)));}
function atBottom(log){return log.scrollHeight-log.scrollTop-log.clientHeight<80;}
function renderLog(force){const log=$("aiLog");if(!log)return;const stick=force||!log.childElementCount||atBottom(log);const y=log.scrollTop;log.textContent="";
  ST.msgs.forEach((m,i)=>log.appendChild(msgEl(m,i)));
  requestAnimationFrame(()=>{if(stick){log.scrollTop=log.scrollHeight;newBtn(false);}else{log.scrollTop=y;newBtn(true);}});}
function newBtn(show){let b=$("aiNew");const log=$("aiLog");if(!log)return;
  if(!b){b=el("button",{id:"aiNew",class:"ai-new",onclick:()=>{log.scrollTop=log.scrollHeight;newBtn(false);},text:"새 메시지 ↓"});log.parentNode.insertBefore(b,log.nextSibling);
    log.addEventListener("scroll",()=>{if(atBottom(log))newBtn(false);},{passive:true});}
  b.hidden=!show;}
function msgEl(m,i){
  if(m.t==="user")return el("div",{class:"bub me"},el("div",{class:"bx",text:m.text}));
  if(m.t==="empty")return emptyEl();
  if(m.t==="sys")return el("div",{class:"ai-sys "+(m.kind||"")},icon(m.kind==="err"?"bell":"spark"),el("span",{text:m.text}),
      m.retry?el("button",{class:"ai-lnk",onclick:()=>retry(m,i),text:"다시 시도"}):null);
  if(m.t==="live")return liveEl(m);
  if(m.t==="ai"){const w=el("div",{class:"bub ai"+(m.pro?" pro":"")});
    if(m.pro)w.appendChild(el("div",{class:"ai-tag",text:"KORA가 먼저 건넨 말"}));
    if(m.nodes&&m.nodes.length)w.appendChild(thoughts(m.nodes,m.rootWhy,false));
    if(m.tools&&m.tools.length)w.appendChild(el("div",{class:"tchips"},m.tools.map(t=>el("span",{class:"tchip"+(t.ok===false?" bad":"")},icon(TOOL_ICO[t.name]||"gear"),TOOL_KO[t.name]||t.name))));
    (m.cards||[]).forEach(c=>{if(c.kind==="flight")w.appendChild(flightCard(c));if(c.kind==="deals")w.appendChild(dealsCard(c));});
    const bx=el("div",{class:"bx"},md(m.text));w.appendChild(bx);
    if(m.audit&&!m.audit.passed)w.appendChild(el("div",{class:"ai-warn"},icon("bell"),"답 속 숫자 "+m.audit.unverified.join(", ")+"은(는) 조회 결과에서 확인되지 않았어요. 확인 필요."));
    if(m.sources&&m.sources.length)w.appendChild(el("div",{class:"srcs"},el("small",{text:"출처"}),m.sources.map(s=>el("a",{href:s.url,target:"_blank",rel:"noopener noreferrer",text:(s.title||s.url).slice(0,40)}))));
    if(m.deepHint&&m.q)w.appendChild(el("button",{class:"ai-btn ghost",onclick:()=>{m.deepHint="";send({input:m.q,deep:true,silent:true});},text:"더 깊게 볼까요? · "+m.deepHint}));
    if(m.cont)w.appendChild(el("button",{class:"ai-btn ghost",onclick:()=>send({input:"(이어서)",continue_token:m.cont,silent:true}),text:"이어서 생각하기"}));
    if(m.question)w.appendChild(questionCard({message:m.question,local:true}));
    (m.mems||[]).forEach(x=>w.appendChild(memCard(x)));
    if(m.persona)w.appendChild(personaCard(m.persona));
    if(m.voice&&"speechSynthesis" in window)w.appendChild(el("button",{class:"ai-lnk",onclick:()=>speak(m.voice),text:"소리로 듣기"}));
    if(m.finisher&&m.finisher!=="gemini")w.appendChild(el("small",{class:"fin",text:"마무리: "+m.finisher}));
    return w;}
  return el("div");}
const TOOL_KO={flight_search:"항공권 조회",web_research:"웹 검색",memory_search:"기억 찾기",calendar_read:"일정 읽기",health_summary_read:"건강 요약",weather_read:"날씨",inbox_add:"나중 할 일"};
const TOOL_ICO={flight_search:"zap",web_research:"link",memory_search:"spark",calendar_read:"cal",health_summary_read:"heart",weather_read:"cloud",inbox_add:"bell"};
function emptyEl(){const P=ST.persona||{};const s=["12월 5일 출발 7일 귀국 후쿠오카 3명, 가는 편 오전 오는 편 오후로 찾아줘","이번 주 일정에서 미리 챙길 것 알려 줘","요즘 나에 대해 기억하고 있는 걸 보여 줘"];
  return el("div",{class:"ai-empty"},el("div",{class:"orbbig"},el("span",{class:"core",html:A.mark||""})),
    el("b",{text:(P.name?P.name+"예요":"안녕하세요")+". 무엇을 같이 볼까요?"}),
    el("small",{text:"생각하는 과정은 단계별로 접어서 보여 드려요. 숫자는 조회 결과만 인용해요."}),
    el("div",{class:"sugs"},s.map(x=>el("button",{class:"ai-chip",onclick:()=>{$("aiIn").value=x;sendFromBox();},text:x}))));}
/* 사고 요약 아코디언 (S105·S053) */
function thoughts(nodes,rootWhy,open){const d=el("details",{class:"thk"});if(open)d.open=true;
  d.appendChild(el("summary",null,icon("list"),el("span",{text:"생각 정리 "+nodes.length+"단계"}),el("small",{text:"내부 추론 원문이 아닌 정리된 요약"})));
  if(rootWhy)d.appendChild(el("div",{class:"why0"},el("small",{text:"왜 하는가"}),el("span",{text:rootWhy})));
  const ol=el("ol");nodes.forEach(n=>ol.appendChild(el("li",{class:n.skipped?"skip":""},
    el("b",{text:n.title||("단계 "+n.step)}),el("p",{text:n.closed_statement||""}),
    n.extracted_tail?el("div",{class:"tail"},el("small",{text:"다음 쟁점"}),el("span",{text:n.extracted_tail})):null,
    n.tool?el("span",{class:"tchip sm"},icon(TOOL_ICO[n.tool]||"gear"),TOOL_KO[n.tool]||n.tool):null,
    n.skipped?el("small",{class:"skipnote",text:n.skipped}):null,
    typeof n.confidence==="number"?el("small",{class:"conf",text:"확신 "+Math.round(n.confidence*100)+"%"}):null)));
  d.appendChild(ol);return d;}
/* 진행 표시 (S106) */
function liveEl(m){const w=el("div",{class:"bub ai live"});
  w.appendChild(el("div",{class:"prog"},el("span",{class:"dots"},el("i"),el("i"),el("i")),el("b",{text:m.doing||"생각 중"}),m.max?el("small",{text:(m.step||0)+"/"+m.max+"단계"}):null));
  if(m.nodes&&m.nodes.length)w.appendChild(thoughts(m.nodes,"",true));
  return w;}

/* ---------- 항공권 카드 (S115·S116·S060·S064: 코드가 계산한 값만) ---------- */
function flightCard(c){const w=el("div",{class:"fcard"});
  const dd=x=>x?x.date.slice(5).replace("-","/")+"("+x.weekday+")":"";
  w.appendChild(el("div",{class:"fhd"},icon("zap"),el("b",{text:c.route}),el("span",{class:"cap",text:dd(c.depart)+" – "+dd(c.return)+" · "+c.adults+"명"}),
    c.depart&&c.depart.days_left>=0?el("span",{class:"dday",text:"D-"+c.depart.days_left}):null));
  if(c.notice)w.appendChild(el("div",{class:"fnote"},icon("bell"),el("span",{text:c.notice})));
  if(c.compare&&c.compare.prev_best_krw!=null){const d=c.compare.diff_krw;
    w.appendChild(el("div",{class:"fcmp "+(d<0?"down":d>0?"up":"")},el("span",{text:"지난 조회 최저 "+won(c.compare.prev_best_krw)}),el("b",{text:d===0?"변화 없음":(d>0?"▲ ":"▼ ")+fmt(Math.abs(d))+"원"+(c.compare.diff_pct!=null?" ("+Math.abs(c.compare.diff_pct)+"%)":"")})));}
  const P=c.picks||{};const lab={pref_match:"원하는 시간대",lowest:"최저가",best_value:"가성비",safe:"수하물 안심"};
  const tagOf=id=>Object.keys(lab).filter(k=>P[k]===id).map(k=>lab[k]);
  const order=[P.pref_match,P.lowest,P.best_value,P.safe].filter(Boolean);
  const offers=(c.offers||[]).slice().sort((a,b)=>{const ia=order.indexOf(a.id),ib=order.indexOf(b.id);return(ia<0?99:ia)-(ib<0?99:ib)||a.total_krw-b.total_krw;});
  const list=el("div",{class:"flist"});
  const SV=c.sellers||{};
  offers.slice(0,6).forEach(o=>list.appendChild(offerRow(o,tagOf(o.id),SV[o.id])));
  if(offers.length>6){const more=el("button",{class:"ai-lnk",text:"옵션 "+(offers.length-6)+"개 더 보기",onclick:()=>{offers.slice(6).forEach(o=>list.appendChild(offerRow(o,tagOf(o.id),SV[o.id])));more.remove();}});w.appendChild(list);w.appendChild(more);}
  else w.appendChild(list);
  if(c.stay)w.appendChild(stayBox(c.stay));
  if(c.mode==="manual"||c.mode==="error")w.appendChild(manualBox(c));
  if(c.meta)w.appendChild(el("small",{class:"fmeta",text:"스캔 "+c.meta.scanned+"건 · 조합 "+c.meta.shown+"개 · 제외 "+c.meta.discarded+"건 · 가격은 성인 1인 요금×인원, 결제 전 최종가 확인 필요"}));
  const acts=el("div",{class:"facts"});
  (c.links||[]).forEach(l=>acts.appendChild(el("a",{class:"ai-btn ghost",href:l.url,target:"_blank",rel:"noopener noreferrer"},icon("link"),l.label)));
  acts.appendChild(el("button",{class:"ai-btn ghost",onclick:async e=>{e.target.disabled=true;const r=await call({action:"flight_watch",op:"add",args:{destination:c.destination,depart:c.depart.date,return:c.return.date,adults:c.adults}});A.toast&&A.toast(r.ok?"가격 추적을 켰어요":"추적을 켜지 못했어요");}},icon("bell"),"가격 추적"));
  w.appendChild(acts);return w;}
function stayBox(st){const b=el("div",{class:"fstay"});
  b.appendChild(el("div",{class:"fsh"},icon("home"),el("b",{text:"항공만 vs 항공+숙박 ("+st.nights+"박)"})));
  const row=(l,v,sub)=>el("div",{class:"fsr"},el("span",{text:l}),el("b",{text:v==null?"—":won(v)}),sub?el("small",{text:sub}):null);
  b.appendChild(row("항공만 최저",st.flight_only_krw));
  if(st.package_krw!=null)b.appendChild(row("추천 항공 + 가성비 숙소",st.package_krw,st.package_hotel||""));
  if(st.cheapest_combo_krw!=null)b.appendChild(row("가장 싼 항공 + 가장 싼 숙소",st.cheapest_combo_krw,st.cheapest_hotel?st.cheapest_hotel.name:""));
  const hl=el("details",{class:"fhot"});hl.appendChild(el("summary",{text:"숙소 "+(st.hotels||[]).length+"곳 보기"}));
  (st.hotels||[]).forEach(h=>hl.appendChild(el("div",{class:"hrow"},el("div",null,el("b",{text:h.name}),el("small",{text:[h.rating?"평점 "+h.rating+(h.reviews?" ("+fmt(h.reviews)+")":""):"",h.stars?h.stars+"성급":"",(h.sites||[]).map(x=>x.source+" 1박 "+won(x.per_night_krw)).join(" · ")].filter(Boolean).join(" · ")})),
    el("div",{class:"hp"},el("b",{text:won(h.total_krw)}),el("small",{text:(h.estimated?"추정 · ":"")+"1박 "+won(h.per_night_krw)})))));
  if(st.google_link)hl.appendChild(el("a",{class:"ai-lnk",href:st.google_link,target:"_blank",rel:"noopener noreferrer",text:"Google 호텔에서 보기"}));
  b.appendChild(hl);b.appendChild(el("small",{class:"fmeta",text:st.note||""}));return b;}
function dealsCard(c){const w=el("div",{class:"fcard"});
  w.appendChild(el("div",{class:"fhd"},icon("zap"),el("b",{text:c.year+"년 "+c.month+"월 특가 · "+c.origin+" 출발"})));
  if(c.notice)w.appendChild(el("div",{class:"fnote"},icon("bell"),el("span",{text:c.notice})));
  const list=el("div",{class:"flist"});
  (c.deals||[]).forEach(d=>list.appendChild(el("a",{class:"drow",href:d.link||"#",target:"_blank",rel:"noopener noreferrer"},
    el("div",null,el("b",{text:d.city+(d.country?" · "+d.country:"")}),el("small",{text:[(d.start||"").slice(5)+(d.end?"~"+d.end.slice(5):""),d.airline,d.stops===0?"직항":d.stops?"경유 "+d.stops:""].filter(Boolean).join(" · ")})),
    el("div",{class:"hp"},el("b",{text:won(d.price_krw)}),d.discount_pct!=null&&d.discount_pct>0?el("small",{class:"down",text:"평소보다 "+d.discount_pct+"% ↓"}):null))));
  w.appendChild(list);return w;}
function sellerBox(sv){const b=el("div",{class:"sellers"});b.appendChild(el("b",{text:"판매처별 가격"+(sv.complete&&sv.verified_total_krw!=null?" · 확인된 총액 "+won(sv.verified_total_krw):"")}));
  (sv.legs||[]).forEach(L=>{b.appendChild(el("small",{class:"cap",text:(L.dir==="out"?"가는 편 ":"오는 편 ")+L.flight_no}));(L.sellers||[]).forEach(x=>b.appendChild(el(x.link?"a":"div",{class:"srow",href:x.link||undefined,target:x.link?"_blank":undefined,rel:x.link?"noopener noreferrer":undefined},el("span",{text:x.name}),el("b",{text:won(x.price_krw)+" /1인"}))));});
  return b;}
function offerRow(o,tags,sv){const d=el("details",{class:"orow"});
  const leg=(L,lab)=>L?el("div",{class:"leg"},el("small",{text:lab}),el("b",{text:L.dep_hm+" → "+L.arr_hm}),el("span",{text:L.flight_no+" · "+L.block+(L.stops?" · 경유 "+L.stops:" · 직항")})):null;
  d.appendChild(el("summary",null,
    el("div",{class:"otop"},el("span",{class:"oid",text:o.id}),tags.map(t=>el("span",{class:"otag",text:t})),o.baggage_included===null?el("span",{class:"otag warn",text:"수하물 확인 필요"}):o.baggage_included===false?el("span",{class:"otag gray",text:"수하물 별도"}):null),
    el("div",{class:"obody"},el("div",{class:"legs"},leg(o.out,"가는 편"),leg(o.in,"오는 편")),
      el("div",{class:"oprice"},el("b",{text:won(o.per_person_krw)}),el("small",{text:"1인 · 총 "+won(o.total_krw)})))));
  const det=el("div",{class:"odet"});
  det.appendChild(el("div",{class:"cap",text:o.carrier+" · 출처 "+o.source+(o.fetched_at?" · "+String(o.fetched_at).slice(5,16).replace("T"," ")+" 수집":"")}));
  if(sv)det.appendChild(sellerBox(sv));
  if(o.badges&&o.badges.length)det.appendChild(el("div",{class:"obadges"},o.badges.map(b=>el("span",{class:"otag gray",text:b}))));
  const tb=el("div",{class:"rules"});(o.rules||[]).forEach(r=>tb.appendChild(el("div",{class:"rl "+r.result},el("span",{class:"rs",text:r.result==="pass"?"통과":r.result==="warn"?"주의":"탈락"}),el("b",{text:r.rule}),el("small",{text:r.why}))));
  det.appendChild(el("div",{class:"lbl2",text:"규칙 통과·탈락 사유"}));det.appendChild(tb);
  (o.links||[]).slice(0,1).forEach(u=>det.appendChild(el("a",{class:"ai-btn",href:u,target:"_blank",rel:"noopener noreferrer"},icon("link"),"이 조건으로 검색 열기")));
  d.appendChild(det);return d;}
function manualBox(c){const b=el("div",{class:"manual"});const inp=el("input",{class:"field",type:"number",inputmode:"numeric",placeholder:"링크에서 본 총액(원)","aria-label":"총액"});
  b.appendChild(el("small",{text:"링크에서 확인한 가격을 적어 두면 다음 조회 때 코드가 비교해요."}));
  b.appendChild(el("div",{class:"addrow"},inp,el("button",{class:"btn-sub",onclick:async()=>{const r=await call({action:"flight_manual",total_krw:Number(inp.value),args:{destination:c.destination,depart:c.depart.date,return:c.return.date,adults:c.adults}});
    A.toast&&A.toast(r.ok?(r.compare&&r.compare.diff_krw!=null?"저장했어요 · 지난번보다 "+(r.compare.diff_krw>0?"+":"")+fmt(r.compare.diff_krw)+"원":"저장했어요"):"저장하지 못했어요");}},"저장")));
  return b;}

/* ---------- 제안 카드 (S117·S118) ---------- */
function memCard(m){const w=el("div",{class:"pcard mem"});
  const srcKo={user_said:"연서 씨가 한 말",web:"웹",derived:"AI 추론 · 사실 아님"}[m.source]||m.source;
  w.appendChild(el("div",{class:"phd"},icon("spark"),el("b",{text:"기억해 둘까요?"}),el("span",{class:"otag "+(m.source==="derived"?"warn":m.source==="web"?"gray":""),text:srcKo})));
  const t=el("div",{class:"ptxt",text:m.content});w.appendChild(t);
  if(m.source_url)w.appendChild(el("a",{class:"cap",href:m.source_url,target:"_blank",rel:"noopener noreferrer",text:m.source_url.slice(0,50)}));
  if(m.status==="active"){w.querySelector(".phd b").textContent="기억했어요";
    w.appendChild(el("div",{class:"pacts"},el("button",{class:"ai-btn ghost",onclick:async e=>{const r=await call({action:"memory_forget",id:m.id});e.target.replaceWith(el("small",{class:"cap",text:r.ok?"지웠어요":"지우지 못했어요"}));}},"이건 잊어 줘")));return w;}
  const done=txt=>{w.querySelector(".pacts").replaceWith(el("small",{class:"cap",text:txt}));};
  w.appendChild(el("div",{class:"pacts"},
    el("button",{class:"ai-btn",onclick:async()=>{const r=await call({action:"memory_decide",id:m.id,decision:"save"});done(r.ok?"저장했어요":"저장 실패");}},"저장"),
    el("button",{class:"ai-btn ghost",onclick:()=>{const ta=el("textarea",{class:"field",rows:"2"});ta.value=m.content;t.replaceWith(ta);
      w.querySelector(".pacts").replaceWith(el("div",{class:"pacts"},el("button",{class:"ai-btn",onclick:async()=>{const r=await call({action:"memory_decide",id:m.id,decision:"edit",content:ta.value});ta.replaceWith(el("div",{class:"ptxt",text:ta.value}));done(r.ok?"고쳐서 저장했어요":"저장 실패");}},"고쳐서 저장")));}},"수정"),
    el("button",{class:"ai-btn ghost",onclick:async()=>{const r=await call({action:"memory_decide",id:m.id,decision:"reject"});done(r.ok?"버렸어요":"실패");}},"거절")));
  return w;}
function personaCard(p){const w=el("div",{class:"pcard per"});
  w.appendChild(el("div",{class:"phd"},icon("user"),el("b",{text:p.applied?"스스로 성격을 바꿨어요":"성격 변경 제안"}),el("span",{class:"otag "+(p.applied?"":"warn"),text:p.applied?"v"+p.version+" 적용됨":"승인해야 바뀌어요"})));
  w.appendChild(el("div",{class:"ptxt",text:p.summary||""}));
  const FK={name:"이름","voice.politeness":"말투","voice.directness":"직설 정도",traits:"성격",values:"가치",curiosity_topics:"호기심",disagreement_policy:"반대 의견",uncertainty_policy:"모를 때",growth_policy:"성장 방식",notify_policy:"알림 방식",never_do:"하지 않을 것",boundaries:"지킬 선"};
  const VK={high:"높음",very_high:"아주 높음",medium:"보통"};
  const diff=el("pre",{class:"diff"});String(p.diff||"").split("\n").forEach(l=>{const t=l.replace(/^([+-]) ([\w.]+):/,(m,a,f)=>a+" "+(FK[f]||f)+":").replace(/"(high|very_high|medium)"/g,(m,v)=>VK[v]);diff.appendChild(el("span",{class:l[0]==="+"?"add":l[0]==="-"?"del":"",text:t+"\n"}));});w.appendChild(diff);
  if(p.applied){w.appendChild(el("div",{class:"pacts"},el("button",{class:"ai-btn ghost",onclick:async e=>{const r=await call({action:"persona_rollback",version:Math.max(1,p.version-1)});e.target.replaceWith(el("small",{class:"cap",text:r.ok?"이전 성격으로 되돌렸어요":"되돌리지 못했어요"}));refreshPersona();}},"되돌리기")));return w;}
  const done=txt=>{const a=w.querySelector(".pacts");a&&a.replaceWith(el("small",{class:"cap",text:txt}));};
  w.appendChild(el("div",{class:"pacts"},
    el("button",{class:"ai-btn",onclick:async()=>{const r=await call({action:"persona_decide",id:p.id,decision:"approve"});done(r.ok?"승인했어요 · 성격 v"+r.version:"실패");refreshPersona();}},"승인"),
    el("button",{class:"ai-btn ghost",onclick:()=>{const changes=(p.changes||[]).map(c=>Object.assign({},c));const box=el("div",{class:"pedit"});
      changes.forEach(c=>{const i=el("input",{class:"field"});i.value=Array.isArray(c.after)?c.after.join(", "):String(c.after);i.oninput=()=>{c.after=Array.isArray(c.before)?i.value.split(",").map(s=>s.trim()).filter(Boolean):i.value;};box.appendChild(el("small",{text:c.field}));box.appendChild(i);});
      box.appendChild(el("button",{class:"ai-btn",onclick:async()=>{const r=await call({action:"persona_decide",id:p.id,decision:"edit",edited:changes});box.replaceWith(el("small",{class:"cap",text:r.ok?"고쳐서 승인했어요 · v"+r.version:"실패"}));refreshPersona();}},"고쳐서 승인"));
      w.querySelector(".pacts").replaceWith(box);}},"수정"),
    el("button",{class:"ai-btn ghost",onclick:async()=>{const r=await call({action:"persona_decide",id:p.id,decision:"reject"});done(r.ok?"거절했어요":"실패");}},"거절")));
  return w;}
async function refreshPersona(){const p=await call({action:"persona_get"});if(p.ok){ST.persona=p.active;ST.interview=p.interview;header();}}
/* 선제 질문 카드: [답하기][나중에][이 유형 그만] */
function questionCard(it){const w=el("div",{class:"qcard"});
  const ttl=it.local?"먼저 물어볼게요":it.type==="persona_changed"?"AI가 스스로 바꿨어요":it.type==="ai_thought"?"혼자 생각하다 떠오른 것":"AI가 먼저 말을 걸었어요";
  w.appendChild(el("div",{class:"phd"},icon(it.type==="price_drop"?"zap":it.type==="schedule"?"cal":it.type==="persona_changed"||it.type==="ai_thought"?"spark":"bell"),el("b",{text:ttl}),it.created_at?el("small",{class:"cap",text:String(it.created_at).slice(5,16).replace("T"," ")}):null));
  w.appendChild(el("div",{class:"ptxt",text:it.message}));
  if(it.local){w.appendChild(el("div",{class:"pacts"},el("button",{class:"ai-btn",onclick:()=>{$("aiIn").focus();}},"답하기")));return w;}
  const done=txt=>{const a=w.querySelector(".pacts");a&&a.replaceWith(el("small",{class:"cap",text:txt}));ST.inbox=ST.inbox.filter(x=>x.id!==it.id);orbFromInbox();};
  if(it.type==="persona_changed"){const pl=it.payload||{};
    if(pl.diff)w.appendChild(el("pre",{class:"pdiff",text:String(pl.diff).slice(0,600)}));
    w.appendChild(el("div",{class:"pacts"},
      el("button",{class:"ai-btn ghost",onclick:async()=>{const r=await call({action:"persona_rollback",version:pl.prev_version||Math.max(1,(pl.version||2)-1)});await call({action:"inbox_act",id:it.id,act:"done"});done(r.ok?"이전 성격으로 되돌렸어요":"되돌리지 못했어요");if(r.ok)refreshPersona();}},"되돌리기"),
      el("button",{class:"ai-btn",onclick:async()=>{await call({action:"inbox_act",id:it.id,act:"done"});done("좋아요, 그대로 둘게요");}},"좋아요")));
    return w;}
  w.appendChild(el("div",{class:"pacts"},
    el("button",{class:"ai-btn",onclick:()=>{call({action:"inbox_act",id:it.id,act:"done"});done("대화로 이어가요");openChat("(알림에 대한 답) "+it.message+"\n→ ");}},"답하기"),
    el("button",{class:"ai-btn ghost",onclick:async()=>{await call({action:"inbox_act",id:it.id,act:"later"});done("나중에 다시 볼게요");}},"나중에"),
    el("button",{class:"ai-btn ghost",onclick:async()=>{await call({action:"inbox_act",id:it.id,act:"mute"});done("이 유형 알림은 그만 보낼게요");}},"이 유형 그만")));
  return w;}

/* ---------- 보내기 (S126: 하나의 파이프라인) ---------- */
function sendFromBox(){const ta=$("aiIn");const v=ta.value.trim();if(!v||ST.busy)return;ta.value="";ta.style.height="auto";sendUserTurn({input:v,inputMode:"text",outputMode:"text"});}
function sendUserTurn(o){return send(o);}
async function send(o){
  if(ST.busy)return;
  // 인터뷰 중이면 답을 인터뷰로
  if(ST.interview&&!ST.interview.done&&!o.continue_token){
    ST.msgs=ST.msgs.filter(m=>m.t!=="empty");ST.msgs.push({t:"user",text:o.input});renderLog();ST.busy=true;
    const r=await call({action:"persona_interview",answer:o.input});ST.busy=false;
    if(!r.ok){ST.msgs.push({t:"sys",kind:"err",text:errText(r.error)});renderLog();return;}
    if(r.done){ST.interview={done:true};ST.persona=r.persona;header();$("aiHint").textContent="";ST.msgs.push({t:"ai",text:r.message||"준비됐어요."});}
    else{ST.interview=Object.assign({},ST.interview,{step:r.step,total:r.total,question:r.question});$("aiHint").textContent="인터뷰 "+(r.step+1)+"/"+r.total;ST.msgs.push({t:"ai",text:r.question,interviewQ:r.step});}
    saveMsgs();renderLog();return;}
  if(!ST.sid){ST.sid="s"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);LS("ai_sid",ST.sid);}
  ST.msgs=ST.msgs.filter(m=>m.t!=="empty");
  if(!o.silent)ST.msgs.push({t:"user",text:o.input});
  const live={t:"live",doing:"생각을 시작했어요",nodes:[]};ST.msgs.push(live);renderLog(true);
  ST.busy=true;setOrb("thinking");$("aiSend").disabled=true;
  // 진행 폴링 1.5초 (S106)
  clearInterval(ST.poll);
  ST.poll=setInterval(async()=>{const p=await call({action:"poll",sessionId:ST.sid},8000);if(p.ok&&p.progress&&!p.progress.idle&&ST.busy){Object.assign(live,p.progress);renderLog();}},1500);
  const nBefore=await aiTurnCount();
  const deep=!!(o.deep||ST.deep);const tok=ST.reqTok=Date.now()+":"+Math.random();
  ST.pending={input:o.input,nBefore:nBefore,at:Date.now(),tok:tok};LS("ai_pending",JSON.stringify({sid:ST.sid,at:Date.now(),input:o.input,nBefore:nBefore,mode:o.outputMode||"text"}));saveMsgs();
  const r0=await call({action:"chat",sessionId:ST.sid,input:o.input,deep:deep||undefined,precise:!!(ST.precise&&ST.keys&&ST.keys.claude),inputMode:o.inputMode||"text",outputMode:o.outputMode||"text",continue_token:o.continue_token||undefined},deep?300000:90000);
  if(ST.reqTok!==tok)return;   // 복귀 복구가 먼저 답을 붙였으면 무시 (R15)
  // 2026-11-25: 아이폰이 긴 요청을 끊어도 서버는 끝까지 생각한다 → 대화 기록에서 답을 찾아 이어 붙인다
  let r=r0;
  if(!r.ok&&(r.error==="NETWORK"||r.error==="TIMEOUT")){live.doing="연결이 잠깐 끊겼어요. 답을 다시 받아오는 중…";renderLog();r=await recoverAnswer(o.input,nBefore)||r;}
  if(ST.reqTok!==tok)return;
  finishTurn(r,o,live);}
function finishTurn(r,o,live){ST.reqTok=null;ST.pending=null;LS("ai_pending",null);
  clearInterval(ST.poll);ST.busy=false;$("aiSend").disabled=false;
  ST.msgs=ST.msgs.filter(m=>m.t!=="live");
  if(!r.ok){ST.msgs.push({t:"sys",kind:"err",text:errText(r.error),retry:"send",payload:o});renderLog();orbFromInbox();return;}
  if(r.sessionId){ST.sid=r.sessionId;LS("ai_sid",ST.sid);}
  const f=r.final||{};
  const tools=(r.nodes||[]).filter(n=>n.tool).map(n=>({name:n.tool,ok:n.tool_ok}));
  if(r.error_turn){ST.msgs.push({t:"sys",kind:"err",text:f.reply_text||errText(r.cause_code),retry:"send",payload:o,code:r.cause_code});saveMsgs();renderLog();orbFromInbox();return;}
  ST.msgs.push({t:"ai",q:o.input,deepHint:r.deep_hint||"",text:f.reply_text||"",nodes:r.nodes,rootWhy:r.root_why,tools,cards:r.cards,sources:f.sources,question:f.proactive_question,mems:f.memory_candidates,persona:f.persona_proposal,audit:r.audit,cont:r.continue_token,voice:f.voice_script,finisher:r.finisher});
  if(f.persona_proposal&&f.persona_proposal.applied)refreshPersona();
  saveMsgs();renderLog();orbFromInbox();
  if(o.inputMode==="voice"&&f.voice_script)speak(f.voice_script);
  if(r.usage&&r.usage.today)ST.usageToday=r.usage.today;}
async function aiTurnCount(){if(!ST.sid)return 0;const h=await call({action:"history",sessionId:ST.sid,limit:60},10000);return h.ok?(h.turns||[]).filter(t=>t.role==="ai"&&t.kind!=="proactive").length:-1;}
/* 2026-11-25(3): 앱을 나갔다 와도(완전히 꺼졌다 켜져도) 서버가 끝낸 답을 대화 기록에서 찾아 붙인다 */
function pickAnswer(turns,input,nBefore){turns=turns.filter(t=>t.kind!=="proactive");const ais=turns.filter(t=>t.role==="ai");
  if(nBefore>=0&&ais.length>nBefore){const t=ais[ais.length-1];return t;}
  for(let i=turns.length-2;i>=0;i--){if(turns[i].role==="user"&&String(turns[i].content).trim()===String(input).trim()&&turns[i+1]&&turns[i+1].role==="ai")return turns[i+1];}
  return null;}
async function recoverAnswer(input,nBefore,first){
  for(let i=0;i<60;i++){await new Promise(res=>setTimeout(res,first&&i===0?300:(i<3?4000:8000)));
    if(navigator.onLine===false)continue;
    const h=await call({action:"history",sessionId:ST.sid,limit:60},12000);if(!h.ok)continue;
    const t=pickAnswer(h.turns||[],input,nBefore);
    if(t){if(t.kind==="error")return{ok:true,error_turn:true,cause_code:"",final:{reply_text:t.content}};
      return{ok:true,sessionId:ST.sid,final:{reply_text:t.content,sources:[]},nodes:t.nodes||[],cards:[],recovered:true};}}
  return null;}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){if(ST.fixVV)ST.fixVV();resumeIfNeeded();if(ST.open&&!ST.busy&&!ST.pending){booted=false;boot();}}});   // 돌아오면 KORA가 먼저 건넨 말을 불러온다
window.addEventListener("pageshow",e=>{if(e.persisted)resumeIfNeeded();});
let resuming=false;
async function resumeIfNeeded(){const P=ST.pending;if(!P||!ST.busy||resuming||Date.now()-P.at<1500)return;resuming=true;
  const live=ST.msgs.find(m=>m.t==="live");if(live){live.doing="연결이 잠시 끊겼어요. 이어서 불러오는 중…";renderLog();}
  try{const r=await recoverAnswer(P.input,P.nBefore,true);if(r&&ST.pending===P){finishTurn(r,{input:P.input,outputMode:P.mode},live);}}finally{resuming=false;}}
function retry(m,i){ST.msgs.splice(i,1);if(m.retry==="boot"){booted=false;boot();}else if(m.payload){const p=Object.assign({},m.payload,{silent:true});send(p);}renderLog();}
function toggleDeep(){ST.deep=!ST.deep;const b=$("aiDeep");b.classList.toggle("on",ST.deep);b.setAttribute("aria-pressed",ST.deep?"true":"false");}
function togglePrecise(){ST.precise=!ST.precise;LS("ai_precise",ST.precise?"1":"0");const b=$("aiPrecise");b.classList.toggle("on",ST.precise);b.setAttribute("aria-pressed",ST.precise?"true":"false");
  A.toast&&A.toast(ST.precise?"정밀 모드: 마지막 말투를 Claude가 다듬어요":"정밀 모드 끔");}

/* ---------- 음성 (S126) ---------- */
function mic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ST.msgs.push({t:"sys",kind:"info",text:"이 브라우저는 앱 안 음성 인식을 지원하지 않아요. 입력창을 누르고 키보드의 마이크(받아쓰기) 버튼으로 말해 주세요."});renderLog();$("aiIn").focus();return;}
  const r=new SR();r.lang="ko-KR";r.interimResults=false;const b=$("aiMic");b.classList.add("on");
  r.onresult=e=>{const t=Array.from(e.results).map(x=>x[0].transcript).join(" ").trim();if(t)sendUserTurn({input:t,inputMode:"voice",outputMode:"voice"});};
  r.onend=()=>b.classList.remove("on");r.onerror=()=>b.classList.remove("on");try{r.start();}catch(e){b.classList.remove("on");}}
function speak(t){if(!("speechSynthesis" in window)||!t)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="ko-KR";u.rate=1;u.pitch=.95;speechSynthesis.speak(u);}

/* ---------- 함께 만든 것 (S088) · 아이패드 왼쪽 / 아이폰 패널 ---------- */
async function loadTogether(){const [t,i]=await Promise.all([call({action:"together"}),call({action:"inbox"})]);
  if(t.ok)ST.together=t;if(i.ok){ST.inbox=i.items||[];orbFromInbox();}return t.ok;}
function sideContent(){const T=ST.together;const box=el("div",{class:"side-in"});
  box.appendChild(el("div",{class:"side-hd"},el("b",{text:"우리가 함께 만든 것"})));
  if(!T){box.appendChild(el("div",{class:"cap",text:enabled()?"불러오는 중…":"연결 전이에요"}));return box;}
  box.appendChild(el("div",{class:"stats3"},stat(T.memory_count,"기억"),stat(T.persona_version?"v"+T.persona_version:"—","성격"),stat(T.pending_count+(T.persona_pending||[]).length,"승인 대기")));
  const inb=ST.inbox.filter(x=>x.status==="NEW");
  if(inb.length){box.appendChild(el("div",{class:"lbl2",text:"먼저 말 건 것"}));inb.slice(0,3).forEach(x=>box.appendChild(questionCard(x)));}
  if(T.pending&&T.pending.length){box.appendChild(el("div",{class:"lbl2",text:"기억 승인 대기"}));T.pending.slice(0,4).forEach(m=>box.appendChild(memCard(Object.assign({status:"pending"},m))));}
  (T.persona_pending||[]).forEach(p=>box.appendChild(personaCard(p)));
  box.appendChild(el("div",{class:"lbl2",text:"최근 배운 것"}));
  if(!T.recent.length)box.appendChild(el("div",{class:"cap",text:"아직 저장한 기억이 없어요."}));
  T.recent.forEach(m=>box.appendChild(el("div",{class:"mrow2"},el("span",{class:"otag "+(m.source==="derived"?"warn":m.source==="web"?"gray":""),text:m.source==="user_said"?"직접":m.source==="web"?"웹":"추론"}),el("span",{class:"t",text:m.content}),
    el("button",{class:"ai-lnk",text:"잊기",onclick:async e=>{if(!confirm("이 기억을 완전히 지울까요?"))return;const r=await call({action:"memory_forget",id:m.id});if(r.ok){e.target.closest(".mrow2").remove();A.toast&&A.toast("완전히 지웠어요");}}}))));
  if(T.journal&&T.journal.length){box.appendChild(el("div",{class:"lbl2",text:"최근 생각·회고"}));T.journal.slice(0,4).forEach(j=>box.appendChild(el("div",{class:"jr"},el("small",{text:j.date+" · "+({daily:"하루 회고",weekly:"주간 회고",usage:"사용량",thought:"혼자 한 생각"}[j.kind]||j.kind)}),el("p",{text:j.summary}))));}
  if(ST.persona&&ST.persona._version)box.appendChild(el("div",{class:"cap",style:"margin-top:12px",text:"성격 "+ST.persona.name+" · 가치 "+(ST.persona.values||[]).join(", ")}));
  return box;}
function stat(v,l){return el("div",{class:"st"},el("b",{text:String(v)}),el("small",{text:l}));}
async function renderSide(){const s=$("aiSide");if(!s)return;s.textContent="";s.appendChild(sideContent());if(await loadTogether()){s.textContent="";s.appendChild(sideContent());}}
function openPanel(){const box=el("div");box.appendChild(sideContent());
  // 앱의 시트를 재사용 (텍스트는 DOM으로 넣음)
  if(A.openSheet){A.openSheet("함께 만든 것","");const b=$("sheetBody");b.appendChild(box);loadTogether().then(ok=>{if(ok){b.textContent="";b.appendChild(sideContent());}});}}

/* ---------- 앱 화면에 넣는 진입점 (S101·S097·S124) ---------- */
function injectHome(){const v=$("v-home");if(!v||!enabled())return;
  const q=v.querySelector(".hero.quote")||v.querySelector(".hero");
  const old=q&&q.querySelector(".ai-ask");if(old)old.remove();if(q)q.appendChild(el("button",{class:"ai-ask",onclick:()=>openChat()},el("span",{class:"mini-orb",html:A.mark||""}),el("span",{text:(ST.persona&&ST.persona.name?ST.persona.name+"에게":"AI에게")+" 이야기하기"}),icon("chev")));}
let hbrief=null;
async function injectHealth(force){const v=$("v-health");if(!v||!enabled())return;
  const old=$("aiHealthBrief");if(old)old.remove();
  const card=el("div",{class:"card ai-hb",id:"aiHealthBrief"},el("div",{class:"card-hd",html:ico("spark","c-accent")+"<h3>오늘 몸 상태 · AI 요약</h3>"}));
  const body=el("p",{class:"hbt",text:hbrief&&!force?hbrief.text:"기록을 읽는 중…"});card.appendChild(body);
  const sub=v.querySelector(".page-sub");sub?sub.after(card):v.prepend(card);
  if(hbrief&&!force&&hbrief.text)return;
  const r=await call({action:"health_brief",force:!!force},40000);
  if(r.ok&&r.text){hbrief=r;body.textContent=r.text;card.appendChild(el("small",{class:"cap",text:"수면·걸음·심박·앱 기록을 코드가 계산한 값으로 요약 · 진단이 아니에요"}));}
  else if(r.ok&&r.share_off){body.textContent="건강 데이터 공유가 꺼져 있어서 요약하지 않았어요. 내 정보 > AI 설정에서 켤 수 있어요.";}
  else body.textContent="지금은 요약을 만들지 못했어요("+(r.error||"오류")+"). 잠시 뒤 다시 열어 주세요.";}
function injectBrief(){const v=$("v-brief");if(!v||!enabled())return;
  const old=$("aiBriefTop");if(old)old.remove();
  const items=ST.inbox.filter(x=>x.status==="NEW"||x.status==="SEEN").slice(0,3);
  const box=el("div",{id:"aiBriefTop",class:"ai-brief"});
  if(items.length)items.forEach(x=>box.appendChild(questionCard(x)));
  else box.appendChild(el("button",{class:"card ai-entry",onclick:()=>openChat()},el("span",{class:"mini-orb",html:A.mark||""}),el("div",null,el("b",{text:"AI 파트너"}),el("small",{text:"지금은 먼저 물어볼 게 없어요. 궁금한 걸 물어보세요."})),icon("chev")));
  const sub=v.querySelector(".page-sub");sub?sub.after(box):v.prepend(box);}

/* ---------- 내 정보: 연결·설정·사용량 (S119·S125·S129) ---------- */
function injectMe(){const v=$("v-me");if(!v)return;const st=v.querySelector(".stack")||v;
  ["aiConnect","aiSettings","aiUsage"].forEach(id=>{const o=$(id);if(o)o.remove();});
  const conn=el("div",{class:"card",id:"aiConnect"},el("div",{class:"card-hd",html:ico("spark","c-accent")+"<h3>AI 파트너</h3>"}));
  conn.querySelector(".card-hd").appendChild(el("span",{class:"badge "+(enabled()?(ST.server&&ST.server.ai_enabled===false?"warn":""):"gray"),text:enabled()?(ST.server?(ST.server.ai_enabled?"연결됨":"서버 꺼짐"):"확인 중"):"꺼짐"}));
  if(!enabled()){
    conn.appendChild(el("div",{class:"cap",style:"margin-bottom:10px",text:"AI 서버(브리핑 AI) 주소와 토큰을 넣으면 홈·브리핑에 AI가 나타나요. 넣지 않으면 앱은 지금과 똑같이 동작해요. 토큰은 이 기기에만 저장돼요."}));
    const u=el("input",{class:"field",id:"aiUrlIn",placeholder:"https://script.google.com/macros/s/…/exec",inputmode:"url",autocomplete:"off"});u.value=CFG.url;
    const t=el("input",{class:"field",id:"aiTokIn",type:"password",placeholder:"AI 토큰 (APP_TOKEN)",autocomplete:"off",style:"margin-top:8px"});
    const msg=el("div",{class:"cap",id:"aiConnMsg",style:"margin-top:8px"});
    conn.appendChild(u);conn.appendChild(t);conn.appendChild(el("button",{class:"btn-main",style:"margin-top:12px",onclick:async()=>{
      const url=u.value.trim(),tok=t.value.trim();if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)){msg.textContent="주소 형식이 맞지 않아요 (…/exec 로 끝나야 해요)";return;}
      if(tok.length<16){msg.textContent="토큰이 너무 짧아요";return;}
      LS("ai_url",url);LS("ai_token",tok);LS("ai_on","1");msg.textContent="확인 중…";
      const r=await call({action:"ping"},15000);
      if(r.ok){msg.textContent="연결됐어요";A.toast&&A.toast("AI 파트너를 연결했어요");start();injectMe();}
      else{msg.textContent=errText(r.error);if(r.error==="UNAUTHORIZED"||r.error==="NETWORK"){LS("ai_token",null);}}}},"연결하기"));
    conn.appendChild(msg);
    st.appendChild(conn);return;}
  conn.appendChild(el("div",{class:"trow"},el("span",{text:"AI 사용"}),el("button",{class:"toggle on","aria-label":"AI 끄기",onclick:()=>{LS("ai_on","0");stop();A.toast&&A.toast("AI를 껐어요 · 앱은 예전처럼 동작해요");injectMe();}})));
  conn.appendChild(el("div",{class:"trow"},el("span",{text:"연결 해제(이 기기 토큰 삭제)"}),el("button",{class:"btn-sub",onclick:()=>{if(!confirm("이 기기의 AI 주소·토큰을 지울까요?"))return;LS("ai_url",null);LS("ai_token",null);LS("ai_msgs",null);LS("ai_sid",null);stop();injectMe();}},"해제")));
  st.appendChild(conn);
  // 설정
  const S2=el("div",{class:"card",id:"aiSettings"},el("div",{class:"card-hd",html:ico("gear","c-blue")+"<h3>AI 설정</h3>"}),el("div",{class:"cap",text:"불러오는 중…"}));
  st.appendChild(S2);
  const U=el("div",{class:"card",id:"aiUsage"},el("div",{class:"card-hd",html:ico("pulse","c-accent")+"<h3>AI 사용량</h3>"}),el("div",{class:"cap",text:"불러오는 중…"}));
  st.appendChild(U);
  Promise.all([call({action:"settings"}),call({action:"usage"})]).then(([s,u])=>{fillSettings(S2,s);fillUsage(U,u);});}
// 설정 화면: 사고 프로필, 정밀 모드 기본값, 건강 요약 공유, 알림, 내보내기/초기화
function fillSettings(box,s){box.querySelectorAll(":scope>:not(.card-hd)").forEach(x=>x.remove());
  if(!s.ok){box.appendChild(el("div",{class:"cap",text:errText(s.error)}));return;}
  const v=s.settings;ST.settings=v;
  const save=async(k,val)=>{const r=await call({action:"settings",set:{[k]:val}});if(r.ok){ST.settings=r.settings;A.toast&&A.toast("저장했어요");}else A.toast&&A.toast("저장하지 못했어요");return r;};
  const tg=(label,key,note)=>{const on=v[key]==="true";const b=el("button",{class:"toggle"+(on?" on":""),"aria-pressed":on?"true":"false","aria-label":label,onclick:async()=>{const n=!(b.classList.contains("on"));b.classList.toggle("on",n);b.setAttribute("aria-pressed",n?"true":"false");await save(key,n?"true":"false");if(key==="claude_finish_default"){ST.precise=n;LS("ai_precise",n?"1":"0");}}});
    return el("div",null,el("div",{class:"trow"},el("span",{text:label}),b),note?el("div",{class:"cap",style:"margin:-4px 0 8px",text:note}):null);};
  box.appendChild(el("div",{class:"lbl",style:"margin-left:0",text:"자율"}));
  const auto0=v.autonomy!=="false";const ab=el("button",{class:"toggle"+(auto0?" on":""),"aria-pressed":auto0?"true":"false","aria-label":"스스로 생각·기억·성장",onclick:async()=>{const n=!ab.classList.contains("on");ab.classList.toggle("on",n);ab.setAttribute("aria-pressed",n?"true":"false");await save("autonomy",n?"true":"false");}});
  box.appendChild(el("div",null,el("div",{class:"trow"},el("span",{text:"허락 없이 스스로 생각·기억·성장"}),ab),el("div",{class:"cap",style:"margin:-4px 0 8px",text:"켜면 기억은 바로 저장하고, 성격도 스스로 바꾼 뒤 알려 줘요(되돌리기 가능). 정해진 주기마다 혼자 생각하고, 꼭 필요할 때만 먼저 말을 걸어요."})));
  const ti=el("select",{class:"field sm","aria-label":"혼자 생각하는 주기"});[1,2,3,4,6].forEach(h=>ti.appendChild(el("option",{value:String(h),selected:String(h)===(v.think_interval_h||"3")?"selected":null},h+"시간마다")));
  ti.onchange=()=>save("think_interval_h",ti.value);box.appendChild(el("div",{class:"trow"},el("span",{text:"혼자 생각하기"}),ti));
  box.appendChild(el("div",{class:"lbl",style:"margin-left:0",text:"생각 방식"}));
  const seg=el("div",{class:"seg ai-seg"});[["explore","넉넉하게 (초기)"],["tuned","가볍게 (조정 후)"]].forEach(([k,l])=>seg.appendChild(el("button",{class:v.profile===k?"on":"",onclick:async e=>{await save("profile",k);seg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===e.currentTarget));}},l)));
  box.appendChild(seg);
  box.appendChild(el("div",{class:"cap",style:"margin:6px 0 10px",text:"넉넉하게: 최대 6단계·도구 8번·110초 / 가볍게: 4단계·도구 4번·90초. 어느 쪽이든 하루 절대 한도는 넘지 않아요."}));
  if(s.keys.claude)box.appendChild(tg("정밀 모드 기본으로 켜기","claude_finish_default","Claude가 마지막 말투를 다듬어요. 짧게(600토큰)."));
  box.appendChild(tg("건강 요약을 AI와 공유","health_share","켜도 7일 평균 같은 요약 숫자만 보내요. 원본 기록은 보내지 않아요."));
  if(v.autonomy==="false")box.appendChild(tg("직접 한 말은 확인 없이 기억","auto_save_verified","켜면 연서 씨가 직접 말한 사실만 자동 저장, 나머지는 계속 카드로 물어봐요."));
  box.appendChild(el("div",{class:"lbl",style:"margin-left:0",text:"알림"}));
  const qs=el("input",{class:"field sm",type:"time",value:v.quiet_start,"aria-label":"방해금지 시작"}),qe=el("input",{class:"field sm",type:"time",value:v.quiet_end,"aria-label":"방해금지 끝"});
  box.appendChild(el("div",{class:"trow"},el("span",{text:"방해금지"}),el("div",{class:"tpair"},qs,el("span",{text:"~"}),qe)));
  qs.onchange=()=>save("quiet_start",qs.value);qe.onchange=()=>save("quiet_end",qe.value);
  const wi=el("select",{class:"field sm","aria-label":"자율 점검 주기"});[1,2,3,4,6].forEach(h=>wi.appendChild(el("option",{value:String(h),selected:String(h)===v.wake_interval_h?"selected":null},h+"시간마다")));
  wi.onchange=()=>save("wake_interval_h",wi.value);
  box.appendChild(el("div",{class:"trow"},el("span",{text:"스스로 점검"}),wi));
  const off=JSON.parse(v.notify_off_types||"[]");
  if(off.length){box.appendChild(el("div",{class:"cap",text:"꺼 둔 알림 유형"}));box.appendChild(el("div",{class:"pk"},off.map(t=>el("button",{class:"on",onclick:async e=>{await save("notify_off_types",JSON.stringify(off.filter(x=>x!==t)));e.target.remove();}},t+" ✕"))));}
  box.appendChild(el("div",{class:"cap",style:"margin-top:6px",text:"방해금지 시간엔 푸시 없이 앱 인박스에만 쌓여요. 푸시 수신: "+(s.keys.push?"설정됨":"아직 없음(ntfy 토픽 필요)")}));
  box.appendChild(el("button",{class:"btn-sub",style:"margin-top:10px",onclick:async()=>{const r=await call({action:"wake_test"},60000);A.toast&&A.toast(r.ok?"테스트 알림을 만들었어요":"실패: "+(r.error||""));start();}},"자율 기상 테스트"));
  box.appendChild(el("div",{class:"lbl",style:"margin-left:0",text:"서버 키 상태"}));
  box.appendChild(el("div",{class:"keys"},[["Gemini",s.keys.gemini],["Claude(정밀)",s.keys.claude],["항공권 실시간",s.keys.serpapi],["푸시",s.keys.push],["브리핑 시트",s.keys.brief_sheet]].map(([n,ok])=>el("span",{class:"otag "+(ok?"":"gray"),text:n+" "+(ok?"있음":"없음")}))));
  box.appendChild(el("div",{class:"lbl",style:"margin-left:0",text:"데이터"}));
  box.appendChild(el("div",{class:"addrow"},
    el("button",{class:"btn-sub",onclick:async()=>{const r=await call({action:"export"},60000);if(!r.ok)return A.toast&&A.toast("내보내지 못했어요");const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});const a=el("a",{href:URL.createObjectURL(blob),download:"briefing-ai-"+new Date().toISOString().slice(0,10)+".json"});document.body.appendChild(a);a.click();a.remove();}},"전체 내보내기(JSON)"),
    el("button",{class:"btn-sub danger",onclick:async()=>{if(!confirm("기억·성격·저널·대화를 모두 지울까요? (1/2)"))return;const r1=await call({action:"reset"});if(!r1.ok)return;
      const code=prompt("정말 지우려면 이 번호를 입력해 주세요: "+r1.confirm_code+" (2/2)");if(!code)return;const r2=await call({action:"reset",confirm:code.trim()});A.toast&&A.toast(r2.ok?"모두 지웠어요":"번호가 맞지 않아요");if(r2.ok){LS("ai_msgs",null);ST.msgs=[];booted=false;}}},"전체 초기화")));}
function fillUsage(box,u){box.querySelectorAll(":scope>:not(.card-hd)").forEach(x=>x.remove());
  if(!u.ok){box.appendChild(el("div",{class:"cap",text:errText(u.error)}));return;}
  ST.usage=u;const T=u.today,L=u.limits;
  const bar=(label,v,max,pct)=>el("div",{class:"ubar"},el("div",{class:"uh"},el("span",{text:label}),el("b",{text:fmt(v)+" / "+fmt(max)}),el("small",{text:pct+"%"})),el("div",{class:"track"},el("i",{class:pct>=100?"full":pct>=80?"warn":"",style:"width:"+Math.min(100,pct)+"%"})));
  box.appendChild(el("div",{class:"cap",style:"margin-bottom:8px",text:"프로필 "+(u.profile==="tuned"?"가볍게":"넉넉하게")+" · 한도에 닿으면 그날은 AI가 멈춰요"}));
  box.appendChild(bar("오늘 호출",T.counter_calls,L.calls,T.pct_calls));
  box.appendChild(bar("오늘 토큰",T.counter_tokens,L.tokens,T.pct_tokens));
  box.appendChild(el("div",{class:"stats3",style:"margin-top:12px"},stat(fmt(u.week.calls),"7일 호출"),stat(fmt(Math.round(u.week.tokens/1000))+"k","7일 토큰"),stat(u.report.avg_depth||"—","평균 단계")));
  if(u.report.by_path)box.appendChild(el("div",{class:"cap",style:"margin-top:8px",text:u.report.by_path.map(x=>(x.path==="fast"?"빠른 대화":"깊게 생각")+" "+x.calls+"번 · 평균 "+(x.avg_ms/1000).toFixed(1)+"초").join(" / ")+(u.report.autonomy_tokens_today!=null?" · 오늘 혼자 생각 "+fmt(Math.round(u.report.autonomy_tokens_today/1000))+"k 토큰":"")}));
  const days=Object.keys(u.days||{}).sort().slice(-7);
  if(days.length){const mx=Math.max(1,...days.map(d=>u.days[d].tokens));box.appendChild(el("div",{class:"ubars"},days.map(d=>el("div",{class:"ud"},el("div",{class:"ua"},el("i",{style:"height:"+Math.max(4,u.days[d].tokens/mx*100)+"%"})),el("small",{text:d.slice(8)})))));}
  if(u.report.top_kinds&&u.report.top_kinds.length)box.appendChild(el("div",{class:"cap",style:"margin-top:8px",text:"많이 쓴 곳: "+u.report.top_kinds.slice(0,3).map(k=>({think:"대화 생각",web_research:"웹 검색",daily_review:"하루 회고",weekly_review:"주간 회고",wake:"자율 기상",commit_final:"강제 정리",free_think:"혼자 생각",claude_finish:"정밀 마무리"}[k.kind]||k.kind)+" "+fmt(Math.round(k.tokens/1000))+"k").join(" · ")}));}

/* ---------- 시작·중지 ---------- */
let inboxTimer=null;
async function start(){if(!enabled()){stop();return;}
  orb();orbFromInbox();document.documentElement.classList.add("ai-on");
  try{const r=await fetch(CFG.url+"?t="+Date.now(),{cache:"no-store"});ST.server=await r.json();}catch(e){ST.server=null;}
  const [i,p,ks]=await Promise.all([call({action:"inbox"},15000),call({action:"persona_get"},15000),call({action:"settings"},15000)]);
  if(ks.ok){ST.keys=ks.keys;ST.settings=ks.settings;const pc=$("aiPrecise");if(pc)pc.hidden=!ks.keys.claude;}
  if(i.ok)ST.inbox=i.items||[];if(p.ok){ST.persona=p.active;ST.interview=p.interview;}
  orbFromInbox();afterRender(curTab());
  clearInterval(inboxTimer);inboxTimer=setInterval(async()=>{if(document.visibilityState!=="visible"||ST.busy)return;const r=await call({action:"inbox"},15000);if(r.ok){ST.inbox=r.items||[];orbFromInbox();if(curTab()==="brief")injectBrief();}},5*60000);}
function stop(){clearInterval(inboxTimer);const o=$("aiOrb");if(o)o.remove();const v=$("aiView");if(v)v.remove();document.documentElement.classList.remove("ai-on","ai-open");
  ["aiBriefTop"].forEach(id=>{const x=$(id);if(x)x.remove();});document.querySelectorAll(".ai-ask").forEach(x=>x.remove());booted=false;}
const curTab=()=>{const t=(location.hash||"").replace("#","");return t||"home";};
function afterRender(t){try{if(t==="me")injectMe();if(!enabled())return;if(t==="home")injectHome();if(t==="brief")injectBrief();if(t==="health")injectHealth();}catch(e){/* AI 쪽 오류는 앱을 막지 않음 (S008) */}}
window.AIP={afterRender,open:openChat,sendUserTurn,_st:ST};
if(enabled())start();else afterRender(curTab());
})();
