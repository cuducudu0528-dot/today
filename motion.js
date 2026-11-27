/* ==========================================================
   KORA 동작 v10 (2026-11-27) — 스마트홈 대시보드 릴스의 움직임
   1) 하단 탭: 선택 알약이 미끄러져 옮겨 가고 아이콘이 톡 튐
   2) 화면 들어올 때: 카드가 차례로 떠오름 (스크롤해서 보이는 카드도 그때 떠오름)
   3) 그래프: 막대가 자라고, 링이 채워지고, 숫자가 0부터 올라감
   4) 빠른 기록: 누르면 살짝 눌리고, 새로 기록한 칸은 가운데부터 색이 차오름
   app.js·ai.js 뒤에 불러온다. 기능은 건드리지 않고 움직임만 더한다.
   ========================================================== */
(function(){
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(.2,.8,.2,1)";
  var canAnim = !!(document.body && document.body.animate);

  /* ---------- 1) 하단 탭 알약 ---------- */
  var tabs = document.getElementById("tabs");
  var pill = null;
  function ensurePill(){
    if(!tabs) return null;
    if(!pill || !pill.isConnected){ pill = document.createElement("span"); pill.className = "tab-pill"; tabs.insertBefore(pill, tabs.firstChild); }
    return pill;
  }
  function movePill(instant){
    var p = ensurePill(); if(!p) return;
    var a = tabs.querySelector("a.on"); if(!a){ p.style.opacity = "0"; return; }
    if(instant) p.classList.add("no-tr");
    p.style.opacity = "1";
    p.style.width = a.offsetWidth + "px";
    p.style.transform = "translateX(" + a.offsetLeft + "px)";
    if(instant){ void p.offsetWidth; p.classList.remove("no-tr"); }
  }
  function bounceIcon(){
    if(RM || !canAnim || !tabs) return;
    var i = tabs.querySelector("a.on .ico"); if(!i) return;
    i.animate([{transform:"translateY(0) scale(1)"},{transform:"translateY(-4px) scale(1.14)",offset:.4},{transform:"translateY(0) scale(1)"}],{duration:480,easing:EASE});
  }

  /* ---------- 2) 카드 차례로 떠오르기 ---------- */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(onSee, {rootMargin:"0px 0px -6% 0px", threshold:0.06}) : null;
  var batch = 0, batchTimer = null;
  function blocks(view){
    var out = [];
    Array.prototype.forEach.call(view.children, function(c){
      if(c.matches(".bento,.home-grid,.stack,.col")) Array.prototype.forEach.call(c.children, function(x){
        if(x.matches(".col,.stack")) Array.prototype.forEach.call(x.children, function(y){ out.push(y); });
        else out.push(x);
      });
      else out.push(c);
    });
    return out.filter(function(el){ return el.offsetHeight > 0; });
  }
  function enter(){
    if(RM || !canAnim) return;
    var view = document.querySelector(".view.on"); if(!view) return;
    if(io) io.disconnect();
    batch = 0;
    blocks(view).forEach(function(el){
      el.style.opacity = "0";
      if(io) io.observe(el); else reveal(el, 0);
    });
  }
  function onSee(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      io.unobserve(e.target);
      reveal(e.target, Math.min(batch++, 8) * 70);
    });
    clearTimeout(batchTimer); batchTimer = setTimeout(function(){ batch = 0; }, 160);
  }
  function reveal(el, delay){
    el.style.opacity = "";
    el.animate([
      {opacity:0, transform:"translateY(22px) scale(.97)"},
      {opacity:1, transform:"none"}
    ], {duration:620, delay:delay, easing:EASE, fill:"backwards"});
    inside(el, delay + 140);
  }

  /* ---------- 3) 그래프·숫자 ---------- */
  function inside(root, delay){
    // 세로 막대 (최근 7일·걸음)
    Array.prototype.forEach.call(root.querySelectorAll(".wd .b, .sb .bb"), function(b, i){
      b.style.transformOrigin = "50% 100%";
      b.animate([{transform:"scaleY(0)"},{transform:"scaleY(1)"}], {duration:720, delay:delay + i*55, easing:"cubic-bezier(.3,1.25,.4,1)", fill:"backwards"});
    });
    // 가로 막대 (점수 구성·수면 단계·건강 점수 줄)
    Array.prototype.forEach.call(root.querySelectorAll(".bar i, .stagebar i, .rbar i"), function(b, i){
      b.style.transformOrigin = "0 50%";
      b.animate([{transform:"scaleX(0)"},{transform:"scaleX(1)"}], {duration:800, delay:delay + i*60, easing:EASE, fill:"backwards"});
    });
    // 링
    Array.prototype.forEach.call(root.querySelectorAll(".ring circle.val"), function(c){
      var full = parseFloat(c.getAttribute("stroke-dasharray")), to = parseFloat(c.getAttribute("stroke-dashoffset"));
      if(!isFinite(full) || !isFinite(to)) return;
      c.animate([{strokeDashoffset:full},{strokeDashoffset:to}], {duration:1100, delay:delay, easing:EASE, fill:"backwards"});
    });
    // 숫자 올라가기
    Array.prototype.forEach.call(root.querySelectorAll(".kn b, .sc-in b, .num, .stbig, .big, .wd b, .sleep-hero b, .counter b, .metric b, .tv, .hv"), function(el){ countUp(el, delay); });
  }
  var NUM = /^(\s*)([\d,]+(?:\.\d+)?)(\s*)$/;
  function countUp(el, delay){
    var node = null;
    for(var i=0;i<el.childNodes.length;i++){ var n = el.childNodes[i]; if(n.nodeType === 3 && NUM.test(n.nodeValue)){ node = n; break; } }
    if(!node) return;
    var m = node.nodeValue.match(NUM), raw = m[2], target = parseFloat(raw.replace(/,/g,""));
    if(!isFinite(target) || target === 0) return;
    var dec = (raw.split(".")[1] || "").length, comma = raw.indexOf(",") >= 0 || (target >= 1000 && !dec);
    var fmt = function(v){ var s = dec ? v.toFixed(dec) : String(Math.round(v)); return comma ? Number(s).toLocaleString("ko-KR",{minimumFractionDigits:dec,maximumFractionDigits:dec}) : s; };
    var dur = 900, start = null;
    node.nodeValue = m[1] + fmt(0) + m[3];
    setTimeout(function(){
      function step(t){
        if(!node.isConnected) return;
        if(start === null) start = t;
        var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
        node.nodeValue = m[1] + (k < 1 ? fmt(target * e) : raw) + m[3];
        if(k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, delay);
  }

  /* ---------- 4) 빠른 기록: 새로 켜진 칸은 색이 차오름 ---------- */
  function qkState(){
    return Array.prototype.map.call(document.querySelectorAll(".view.on .qgrid .qk"), function(q){ return q.classList.contains("on"); });
  }
  function fillNew(before){
    if(RM || !canAnim) return;
    var now = document.querySelectorAll(".view.on .qgrid .qk");
    Array.prototype.forEach.call(now, function(q, i){
      if(q.classList.contains("on") && before[i] === false){
        q.animate([
          {clipPath:"circle(0% at 50% 50%)", filter:"brightness(1.25)"},
          {clipPath:"circle(75% at 50% 50%)", filter:"brightness(1)"}
        ], {duration:560, easing:EASE});
        var ic = q.querySelector(".qi");
        if(ic) ic.animate([{transform:"scale(.6) rotate(-20deg)"},{transform:"scale(1.15)",offset:.6},{transform:"none"}], {duration:520, easing:EASE});
      }
    });
  }

  /* ---------- app.js에 연결 ----------
     app.js는 함수를 밖으로 내놓지 않으므로(IIFE), 주소(#탭) 바뀜과 화면 다시 그리기(MutationObserver)를 지켜본다.
     hashchange 리스너는 app.js보다 늦게 등록되므로 화면이 그려진 뒤에 실행된다. */
  var lastQk = [], bootAt = Date.now(), touched = false, routing = false;
  var hadCache = false; try{ hadCache = !!localStorage.getItem("ys_cache"); }catch(e){}
  window.addEventListener("pointerdown", function(){ touched = true; }, true);
  window.addEventListener("hashchange", function(){
    routing = true;
    movePill(false); bounceIcon(); enter(); lastQk = qkState();
    setTimeout(function(){ routing = false; }, 0);
  });
  var mo = ("MutationObserver" in window) ? new MutationObserver(function(list){
    var active = document.querySelector(".view.on");
    var hit = list.some(function(m){ return m.target === active; });
    if(!hit || routing) return;
    if(!hadCache && !touched && Date.now() - bootAt < 15000){ hadCache = true; enter(); }   // 저장된 내용 없이 처음 열 때만: 서버 내용이 떠오르게
    else fillNew(lastQk);                                        // 기록 버튼을 눌러 다시 그려진 경우
    lastQk = qkState();
  }) : null;
  if(mo) Array.prototype.forEach.call(document.querySelectorAll(".view"), function(v){ mo.observe(v, {childList:true}); });
  window.addEventListener("resize", function(){ movePill(true); });

  // 첫 화면
  function boot(){ movePill(true); enter(); lastQk = qkState(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ movePill(true); });
})();

/* ==========================================================
   KORA 동작 v11 (2026-11-27-4) — 누르는 모든 것에 움직임
   5) 누르면: 손가락 자리에서 물결이 번지고, 버튼 속 아이콘이 톡 튄다
   6) 누른 결과: 물·커피 숫자는 위로 톡 올라오고, 켜진 칩은 통통, 스위치는 미끄러지듯 넘어간다
   ========================================================== */
(function(){
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(RM || !(document.body && document.body.animate)) return;
  var EASE = "cubic-bezier(.2,.8,.2,1)", SPRING = "cubic-bezier(.34,1.56,.5,1)";
  var SEL = "button, a[href], [data-act], .tap, [role=button]";

  /* ---------- 5) 물결 + 아이콘 ---------- */
  document.addEventListener("pointerdown", function(e){
    var el = e.target.closest && e.target.closest(SEL);
    if(!el || el.disabled || el.closest(".tabbar")) return;
    var r = el.getBoundingClientRect();
    if(r.width < 24 || r.height < 20) return;
    var cs = getComputedStyle(el);
    if(cs.position === "static") el.style.position = "relative";
    var d = Math.max(r.width, r.height) * 2.4;
    var host = document.createElement("span"); host.className = "rip-host";
    var s = document.createElement("span"); s.className = "rip";
    s.style.width = s.style.height = d + "px";
    s.style.left = (e.clientX - r.left - d/2) + "px"; s.style.top = (e.clientY - r.top - d/2) + "px";
    host.appendChild(s); el.appendChild(host);
    var a = s.animate([{transform:"scale(0)", opacity:.22},{transform:"scale(1)", opacity:0}], {duration:620, easing:EASE});
    a.onfinish = a.oncancel = function(){ host.remove(); };
    setTimeout(function(){ if(host.isConnected) host.remove(); }, 900);
    if(el.classList.contains("sync-btn")) return;            // 이 버튼 아이콘은 불러오는 동안 돈다
    var ic = el.querySelector(".ico");
    if(ic) ic.animate([
      {transform:"none"},
      {transform:"rotate(-12deg) scale(1.2)", offset:.35},
      {transform:"rotate(7deg) scale(1.05)", offset:.7},
      {transform:"none"}
    ], {duration:480, easing:EASE});
  }, {passive:true, capture:true});

  /* ---------- 6) 다시 그려진 뒤 바뀐 것만 움직이기 ---------- */
  function txt(el){ return el ? el.textContent : ""; }
  function snap(root){
    if(!root) return null;
    var m = function(sel, f){ return Array.prototype.map.call(root.querySelectorAll(sel), f); };
    return {
      qk: m(".qgrid .qk", function(q){ return txt(q.querySelector("small")); }),
      big: m(".counter .big", txt),
      tg: m(".toggle", function(t){ return t.classList.contains("on"); }),
      ch: m(".chips button, .seg button, .kn", function(b){ return b.classList.contains("on"); })
    };
  }
  function each(root, sel, prev, now, fn){
    var els = root.querySelectorAll(sel);
    if(!prev || prev.length !== els.length) return;
    Array.prototype.forEach.call(els, function(el, i){ if(prev[i] !== now[i]) fn(el, now[i]); });
  }
  function play(root, prev){
    var now = snap(root); if(!now || !prev) return now;
    each(root, ".qgrid .qk", prev.qk, now.qk, function(q){
      var sm = q.querySelector("small");
      if(sm) sm.animate([{transform:"translateY(8px)", opacity:0},{transform:"none", opacity:1}], {duration:420, easing:SPRING});
      var ic = q.querySelector(".qi");
      if(ic) ic.animate([{transform:"none"},{transform:"translateY(-5px) scale(1.15)", offset:.4},{transform:"none"}], {duration:480, easing:EASE});
    });
    each(root, ".counter .big", prev.big, now.big, function(b){
      b.animate([{transform:"translateY(10px) scale(.9)", opacity:.2},{transform:"translateY(-2px) scale(1.06)", opacity:1, offset:.6},{transform:"none"}], {duration:460, easing:EASE});
    });
    each(root, ".toggle", prev.tg, now.tg, function(t, on){
      try{ t.animate([{transform:"translateX(" + (on ? -20 : 20) + "px)"},{transform:"none"}], {duration:420, easing:SPRING, pseudoElement:"::after"}); }catch(e){}
      t.animate([{transform:"scale(.92)"},{transform:"none"}], {duration:380, easing:SPRING});
    });
    each(root, ".chips button, .seg button, .kn", prev.ch, now.ch, function(b, on){
      if(on) b.animate([{transform:"scale(.88)"},{transform:"scale(1.07)", offset:.55},{transform:"none"}], {duration:420, easing:EASE});
    });
    return now;
  }
  var last = new Map();
  function rootOf(n){ return n && n.closest ? (n.closest(".view") || n.closest("#sheetBody")) : null; }
  var mo = ("MutationObserver" in window) ? new MutationObserver(function(list){
    var seen = new Set();
    list.forEach(function(m){ var r = m.target.id === "sheetBody" ? m.target : rootOf(m.target); if(r) seen.add(r); });
    seen.forEach(function(r){ last.set(r, play(r, last.get(r))); });
  }) : null;
  function watch(){
    Array.prototype.forEach.call(document.querySelectorAll(".view, #sheetBody"), function(r){ last.set(r, snap(r)); if(mo) mo.observe(r, {childList:true}); });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();
})();
