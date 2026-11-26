
(async function(){
document.getElementById('app').innerHTML='<div class="bar top"><div class="brand">Med QBank<small>Loading questions…</small></div></div>';
await Promise.all(QB.lects.map(L=>[L.file,L.v]).concat([['data/AKT.js',QB.aktV||4]]).concat(location.protocol==='file:'&&!window.QB_SHARED?[['progress_import.js',Date.now()]]:[]).map(([f,v])=>new Promise(r=>{const s=document.createElement('script');s.src=(window.QB_BASE||'')+f+'?v='+v;s.charset='utf-8';s.onload=s.onerror=r;document.head.appendChild(s)})));
QB.lects.forEach(L=>{if(L.pics){const s=document.createElement('script');s.src=(window.QB_BASE||'')+L.pics+'?v='+L.v;document.head.appendChild(s)}});   // question images load in the background
const LECT={}, ORDER=QB.lects.map(L=>L.k); QB.lects.forEach(L=>LECT[L.k]=L);
const ALL=QB.list.filter(q=>LECT[q.l]), BY={}; ALL.forEach(q=>BY[q.id]=q);
const AKT=QB.akt; AKT.qs.forEach(q=>BY[q.id]=q);   // mock AKT items: kept out of ALL so they stay unseen in normal tests

// ---- AKT teaching feedback helpers ----
const mdb=t=>String(t||'').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
function ebul(q){
  if(q.eb&&q.eb.length) return `<ul class="eb">${q.eb.map(b=>`<li>${mdb(b)}</li>`).join('')}</ul>`;
  const ss=String(q.e).match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)||[q.e];
  return `<ul class="eb">${ss.map(x=>x.trim()).filter(Boolean).map(x=>`<li>${x}</li>`).join('')}</ul>`;
}
function dnode(n,hl,tr){n=typeof n==='string'?{t:n}:n;const c=(hl||[]).includes(n.t)?' hl':(tr||[]).includes(n.t)?' tr':'';
  return `<div class="nd${c}"><b>${mdb(n.t)}</b>${n.n?`<small>${mdb(n.n)}</small>`:''}</div>`}
function dia(d){
  if(!d||!d.type) return '';
  const hl=d.hl||[];let tr=d.trap||[],body='';
  if(d.type==='flow'||d.type==='layers'){const st=(d.steps||d.items||[]).map(s=>typeof s==='string'?{t:s}:s);let k=st.length;while(k>1&&tr.includes(st[k-1].t))k--;
    const ok=st.slice(0,k),bad=st.slice(k);tr=tr.filter(t=>bad.some(b=>b.t===t));
    body=(d.type==='flow'?`<div class="flow">${ok.map(s=>dnode(s,hl,tr)).join('<span class="ar">→</span>')}</div>`:`<div class="lay">${ok.map(s=>dnode(s,hl,tr)).join('')}</div>`)+(bad.length?`<div class="notthis"><span>Not this:</span>${bad.map(s=>dnode(s,hl,tr)).join('')}</div>`:'');}
  else if(d.type==='tree') body=`<div class="tree">${dnode(d.root,hl,tr)}<div class="kids">${(d.kids||[]).map(k=>`<div class="br"><span class="dn">↓</span>${dnode(k,hl,tr)}${k.kids&&k.kids.length?`<div class="sub">${k.kids.map(z=>dnode(z,hl,tr)).join('')}</div>`:''}</div>`).join('')}</div></div>`;
  else if(d.type==='compare') body=`<table class="cmp"><tr><th></th>${(d.cols||[]).map((c,i)=>`<th class="${i===d.hc?'hc':''}">${mdb(c)}</th>`).join('')}</tr>${(d.rows||[]).map(r=>`<tr>${r.map((c,i)=>`<td class="${i-1===d.hc?'hc':''}">${mdb(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  return `<div class="dia"><h4>Diagram</h4>${d.title?`<div class="dt">${mdb(d.title)}</div>`:''}${body}${d.cap?`<div class="cap">${mdb(d.cap)}</div>`:''}</div>`;
}
const anl=q=>q.an?`<div class="anl"><h4>Think of it like this</h4>${mdb(q.an)}</div>`:'';

// ---- owner vs shared copy: Ali's copies show his RemNote links; anyone else gets copy-able flashcards ----
const OWNER=!window.QB_SHARED;   // shareable builds (tools/make_share.py) set QB_SHARED: no RemNote links, copy-able cards instead
const cardTxt=c=>({f:(c[2]||c[1]||'').replace(/^Image card: /,''),b:c[3]||'',img:/^Image card/.test(c[1]||'')});
// open the card's PAGE (document) and let the Mac app scroll to + highlight the card (#qbfind=front)
const rnUrl=c=>`https://www.remnote.com/w/${RNKB}/${c[4]||c[0]}`+(c[2]||c[1]?'#qbfind='+encodeURIComponent((c[2]||c[1]).replace(/^Image card: /,'').slice(0,80)):'');
function rnBox(q){
  if(!q.rn||!q.rn.length) return '';
  if(OWNER) return `<div class="rn"><h4>RemNote flashcards:</h4><ul>${q.rn.map(c=>`<li><a href="${rnUrl(c)}" target="_blank" rel="noopener">${esc(c[1])}</a><a class="app" href="remnote://w/${RNKB}/${c[4]||c[0]}">open in RemNote app</a></li>`).join('')}</ul></div>`;
  const cs=q.rn.map(cardTxt).filter(c=>c.f&&c.b&&!c.img);
  if(!cs.length) return '';
  return `<div class="rn fc"><h4>Make this flashcard</h4><p class="fch">Copy it into RemNote, Anki or any flashcard app.</p>${cs.map(c=>`<div class="fcard"><div><span>Front</span>${esc(c.f)}</div><div><span>Back</span>${esc(c.b)}</div><div class="fcb"><button type="button" class="pillbtn" data-copy="${esc(c.f)}">Copy front</button><button type="button" class="pillbtn" data-copy="${esc(c.b)}">Copy back</button><button type="button" class="pillbtn" data-copy="${esc(c.f+' >> '+c.b)}" title="RemNote: paste as a single line">Copy for RemNote</button></div></div>`).join('')}</div>`;
}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}a.remove();return ok}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;e.preventDefault();e.stopPropagation();const ok=await copyText(b.dataset.copy);const o=b.dataset.lab||b.textContent;b.dataset.lab=o;b.textContent=ok?'Copied ✓':'Select and copy';setTimeout(()=>{b.textContent=o},1400)},true);
const LET='ABCDE', RNKB='';  // Ali's RemNote knowledge base
const KEY='neuro-qbank-v1';
let S=load();
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(!s||!s.hist)s={hist:{},flags:{},notes:{},blocks:[],seq:0,prefs:{mode:'tutor',pool:'unused',n:20}};
  const P=s.prefs;P.lectOff=P.lectOff||{};P.topicOff=P.topicOff||{};delete P.lects;delete P.topics;
  /* topics were renamed to the RemNote sections: a new topic stays switched off if at least half its questions came from topics that were off */
  const stale={};for(const k in P.topicOff){const i=k.indexOf('|'),l=+k.slice(0,i),t=k.slice(i+1);if(LECT[l]&&!topicsOf(l).includes(t)){(stale[l]=stale[l]||new Set).add(t);delete P.topicOff[k]}}
  for(const l in stale){const m=LECT[l].mig||{};topicsOf(+l).forEach(t=>{const o=m[t]||{};let off=0,n=0;for(const x in o){n+=o[x];if(stale[l].has(x)||(x!==t&&P.topicOff[l+'|'+x]))off+=o[x]}if(n&&off*2>=n)P.topicOff[l+'|'+t]=true})}
  s.blocks=s.blocks.filter(b=>b.qs.every(x=>BY[x.id]));return s}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const $=s=>document.querySelector(s);
const app=$('#app');
let view='home', B=null, tick=null, qStart=Date.now();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,'0')).join(':')};
const fmtMS=s=>{s=Math.round(s);return String(Math.floor(s/60)).padStart(2,'0')+' mins, '+String(s%60).padStart(2,'0')+' secs'};
/* very short answer (VSA): q.a = accepted answers; x.ans = typed text; x.ov = self-marked override */
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/<[^>]+>/g,'').replace(/[^a-z0-9+\-⁺⁻²³ ]+/g,' ').replace(/\b(the|a|an)\b/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const stemS=w=>w.replace(/(ies)$/,'y').replace(/(es|s)$/,'');
function vsaMatch(q,txt){const u=norm(txt);if(!u)return false;return q.a.some(a=>{const v=norm(a);if(u===v||stemS(u)===stemS(v))return true;const tol=v.length>=9?2:v.length>=5?1:0;return lev(u,v)<=tol||lev(stemS(u),stemS(v))<=tol})}
const isVSA=q=>Array.isArray(q.a)&&q.a.length>0;
function isOk(x){if(x.sel==null)return false;const q=BY[x.id];if(isVSA(q))return x.ov!=null?x.ov:vsaMatch(q,x.ans||'');return x.order[x.sel]===0}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* ---------- icons ---------- */
const I={
 menu:'<svg width="30" height="26" viewBox="0 0 30 26"><rect y="2" width="30" height="4" rx="1" fill="#fff"/><rect y="11" width="30" height="4" rx="1" fill="#fff"/><rect y="20" width="30" height="4" rx="1" fill="#fff"/></svg>',
 flag:on=>`<svg width="24" height="30" viewBox="0 0 24 30"><path d="M5 3v25" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4c5-2 8 3 15 0l-3 7 3 6c-7 3-10-2-15 0z" fill="${on?'#e0332b':'none'}" stroke="${on?'#e0332b':'#fff'}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
 prev:'<svg width="40" height="30" viewBox="0 0 40 30"><path d="M36 4 L5 15 L36 26 Z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>',
 next:'<svg width="40" height="30" viewBox="0 0 40 30"><path d="M4 4 L35 15 L4 26 Z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>',
 help:'<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 12.5a4 4 0 1 1 5.6 3.7c-1.1.5-1.6 1.2-1.6 2.3v1" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="23.5" r="1.5" fill="#fff"/></svg>',
 lab:'<svg width="28" height="32" viewBox="0 0 28 32"><rect x="7" y="2" width="14" height="5" rx="1" fill="#fff"/><path d="M8 7h12v20a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z" fill="#e9eefb" stroke="#fff" stroke-width="1.5"/><path d="M8 17h12v10a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z" fill="#f6c85f"/><path d="M11 10v5" stroke="#3755a8" stroke-width="1.5"/></svg>',
 notes:'<svg width="40" height="30" viewBox="0 0 40 30"><rect x="2" y="3" width="24" height="14" rx="2" fill="#fff"/><text x="14" y="13.5" font-size="8" font-family="Arial" font-weight="700" text-anchor="middle" fill="#3755a8">ABC</text><path d="M20 26 L34 10 l4 3 -14 16 -5 1z" fill="#f2a63b" stroke="#fff" stroke-width="1.2"/></svg>',
 calc:'<svg width="34" height="30" viewBox="0 0 34 30"><rect x="1.5" y="1.5" width="31" height="27" rx="2" fill="none" stroke="#fff" stroke-width="2"/><rect x="5" y="5" width="24" height="8" fill="#fff"/><text x="27" y="11.5" font-size="6.5" font-family="Arial" text-anchor="end" fill="#3755a8">0.25</text><g fill="#fff"><rect x="5" y="16" width="5" height="3"/><rect x="12" y="16" width="5" height="3"/><rect x="19" y="16" width="5" height="3"/><rect x="5" y="21.5" width="5" height="3"/><rect x="12" y="21.5" width="5" height="3"/><rect x="19" y="21.5" width="5" height="3"/><rect x="26" y="16" width="3" height="8.5"/></g></svg>',
 book:'<svg width="30" height="30" viewBox="0 0 30 30"><rect x="4" y="2" width="22" height="26" rx="2" fill="none" stroke="#fff" stroke-width="2"/><path d="M4 7h-2M4 12h-2M4 17h-2M4 22h-2" stroke="#fff" stroke-width="2"/><path d="M9 9h12M9 14h12M9 19h8" stroke="#fff" stroke-width="2"/></svg>',
 pause:'<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13.5" fill="none" stroke="#f1c40f" stroke-width="3"/><rect x="11" y="10" width="3.4" height="12" fill="#f1c40f"/><rect x="17.6" y="10" width="3.4" height="12" fill="#f1c40f"/></svg>',
 stop:'<svg width="32" height="32" viewBox="0 0 32 32"><path d="M10 2h12l8 8v12l-8 8H10l-8-8V10z" fill="#e8402f" stroke="#fff" stroke-width="2"/></svg>',
 bars:'<svg width="26" height="22" viewBox="0 0 26 22"><path d="M1 21h24" stroke="currentColor" stroke-width="1.6"/><path d="M5 18V6M10 18V11M15 18V3M20 18V9" stroke="currentColor" stroke-width="2.4"/></svg>',
 clock:'<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 6v7l4 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
 theme:()=>document.documentElement.dataset.theme==='dark'?'<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="5.5" fill="#fff"/><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M15 2.5v3M15 24.5v3M2.5 15h3M24.5 15h3M6.2 6.2l2.1 2.1M21.7 21.7l2.1 2.1M6.2 23.8l2.1-2.1M21.7 8.3l2.1-2.1"/></g></svg>':'<svg width="30" height="30" viewBox="0 0 30 30"><path d="M22.5 19.5A10 10 0 0 1 10.5 5a10 10 0 1 0 12 14.5z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 cal:'<svg width="24" height="26" viewBox="0 0 24 26"><rect x="1.5" y="4" width="21" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M1.5 10h21M7 1.5v5M17 1.5v5" stroke="currentColor" stroke-width="1.8"/><g fill="currentColor"><rect x="5" y="13" width="3" height="3"/><rect x="10.5" y="13" width="3" height="3"/><rect x="16" y="13" width="3" height="3"/><rect x="5" y="18" width="3" height="3"/><rect x="10.5" y="18" width="3" height="3"/></g></svg>'
};

/* ---------- stats ---------- */
function lastAttempt(id){const h=S.hist[id];return h&&h.length?h[h.length-1]:null}
function poolOf(id){const a=lastAttempt(id);if(!a)return'unused';return a.c?'correct':'incorrect'}
function topicsOf(l){const t=(LECT[l].topics||[]).slice();ALL.forEach(q=>{if(q.l===l&&!t.includes(q.t))t.push(q.t)});return t}   // RemNote section order
function overall(){let used=0,cor=0,att=0,ok=0;ALL.forEach(q=>{const h=S.hist[q.id];if(h&&h.length){used++;const a=h[h.length-1];if(a.c)cor++;h.forEach(x=>{att++;if(x.c)ok++})}});return{used,cor,att,ok}}

/* ================= HOME ================= */
function renderHome(){
  const keep=view==='home'?(document.querySelector('.home')||{}).scrollTop||0:0;   // re-rendering must not jump back to the top
  clearInterval(tick);view='home';B=null;
  const P=S.prefs;
  const o=overall();
  const lectSel=l=>!P.lectOff[l];
  const topicOn=(l,t)=>!P.topicOff[l+'|'+t];
  const nSel=ORDER.filter(lectSel).length;
  const avail=filtered().length;
  const susp=S.blocks.filter(b=>!b.done&&!b.akt);
  const counts=pool=>ALL.filter(q=>pool==='all'||(pool==='marked'?S.flags[q.id]:poolOf(q.id)===pool)).length;
  app.innerHTML=`
  <div class="bar top lgbar"><div class="brand">Med QBank<small>FHD 2026–27 · ${ORDER.length} lectures · ${ALL.length.toLocaleString()} questions</small></div><div class="spacer"></div>
   <button class="ibtn" data-act="theme" aria-label="Dark mode" title="Dark mode">${I.theme()}</button>
   <button class="btn" style="margin-right:6px" data-act="backup" title="Move your progress between copies of this site">Backup</button>
   <button class="ibtn" data-act="help" aria-label="Help">${I.help}</button></div>
  <div class="home lg"><div class="homein">
   <div class="kpis">
    <div class="kpi"><b>${o.used}<span style="font-size:15px;color:var(--muted)"> / ${ALL.length}</span></b><span>Questions used</span></div>
    <div class="kpi"><b>${o.att?Math.round(o.ok/o.att*100):0}%</b><span>Correct across all attempts</span></div>
    <div class="kpi"><b>${ALL.length-o.used}</b><span>Unused questions left</span></div>
    <div class="kpi"><b>${Object.values(S.flags).filter(Boolean).length}</b><span>Marked for review</span></div>
   </div>
   ${aktCard()}
   ${susp.length?`<div class="card"><h2>Suspended test</h2><p class="sub">Pick up where you left off.</p>${testsTable(susp)}</div>`:''}
   <div class="card">
    <h2>Create test</h2><p class="sub">Single best answer, five options. Questions are drawn only from your lecture slides, speaker notes and recordings.</p>
    <h3>Test mode</h3>
    <div class="seg" role="group" aria-label="Test mode"><button data-mode="tutor" class="${P.mode==='tutor'?'on':''}">Tutor</button><button data-mode="timed" class="${P.mode==='timed'?'on':''}">Timed</button></div>
    <p class="hint" style="margin:8px 0 0">${P.mode==='tutor'?'Submit each answer to see the explanation straight away. The clock counts up.':'90 seconds per question, counting down. Explanations appear when you end the block.'}</p>
    <h3>Question pool</h3>
    <div class="optrow">${['unused','incorrect','marked','all'].map(p=>`<label class="ck"><input type="radio" name="pool" value="${p}" ${P.pool===p?'checked':''}> ${p[0].toUpperCase()+p.slice(1)} <span class="n">${counts(p)}</span></label>`).join('')}</div>
    <h3>Lectures and topics <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${nSel} of ${ORDER.length} selected</span></h3>
    <div class="lsel-tools"><input id="lsearch" type="search" placeholder="Search lectures or topics…" value="${esc(lq)}" autocomplete="off" aria-label="Search lectures or topics">
     <button class="linkb" data-act="allon">Select all</button><button class="linkb" data-act="alloff">Clear all</button><button class="linkb" data-act="expandall">Expand all</button><button class="linkb" data-act="collapseall">Collapse all</button></div>
    <p class="hint" style="margin:0 0 8px">Tip: tick a topic in an unticked lecture to study just that topic. "Only this" picks one lecture.</p>
    <div class="llist">${ORDER.map(l=>{const L=LECT[l],qs=ALL.filter(q=>q.l===l),tp=topicsOf(l);let u=0,c=0;qs.forEach(q=>{const a=lastAttempt(q.id);if(a){u++;if(a.c)c++}});
      const on=lectSel(l),tOn=tp.filter(t=>topicOn(l,t)).length,nOn=on?qs.filter(q=>topicOn(l,q.t)).length:0;
      return `<details class="lrow ${on?'':'off'}" data-l="${l}" data-s="${esc((L.code+' '+L.short+' '+L.title).toLowerCase())}" ${openL.has(l)?'open':''}><summary><label class="ck" onclick="event.stopPropagation()"><input type="checkbox" data-lect="${l}" ${on&&tOn?'checked':''} ${on&&tOn&&tOn<tp.length?'data-part="1"':''}></label>
       <span class="lcode">${L.code}</span><span class="lname">${esc(L.short)}${on&&tOn<tp.length?` <span class="pill">${tOn}/${tp.length} topics</span>`:''}</span><span class="lmeta">${on?`${nOn} selected · `:''}${u?`${Math.round(c/u*100)}% · `:''}${u}/${qs.length} used</span><span class="chev" aria-hidden="true">›</span></summary>
       <div class="ltools"><button class="linkb" data-act="lall" data-l="${l}">All topics</button><button class="linkb" data-act="lnone" data-l="${l}">No topics</button><button class="linkb" data-act="lonly" data-l="${l}">Only this lecture</button></div>
       <div class="topics">${tp.map(t=>`<label class="ck" data-t="${esc(t.toLowerCase())}"><input type="checkbox" data-topic="${l}|${esc(t)}" ${on&&topicOn(l,t)?'checked':''}> ${esc(t)} <span class="n">${qs.filter(q=>q.t===t).length}</span></label>`).join('')}</div></details>`}).join('')}</div>
    <div class="gen"><label class="ck" for="nq">Number of questions</label><input id="nq" type="number" min="1" max="${Math.max(1,avail)}" value="${Math.min(P.n,Math.max(1,avail))}">
     <span class="hint">${avail} available with these settings</span><div class="spacer"></div>
     <button class="btn pri" data-act="generate" ${avail?'':'disabled'}>Generate test</button></div>
   </div>
   <div class="card"><h2>Previous tests</h2>${S.blocks.filter(b=>b.done&&!b.akt).length?testsTable(S.blocks.filter(b=>b.done&&!b.akt).slice().reverse()):'<p class="sub">Your finished tests will appear here with their scores.</p>'}
    <h3>Performance by topic</h3>${topicPerf()}
    <p style="margin:16px 0 0"><button class="linkb danger-link" data-act="reset">Reset all progress</button></p></div>
  </div></div>`;
  document.querySelectorAll('input[data-part]').forEach(i=>i.indeterminate=true);
  applySearch();
  const h=document.querySelector('.home');if(h&&keep)h.scrollTop=keep;
}
/* lecture/topic search: hides rows in place (no re-render), so typing never loses focus or scroll */
let lq='';
function applySearch(){
  const q=lq.trim().toLowerCase();
  document.querySelectorAll('details.lrow').forEach(d=>{
    const tops=[...d.querySelectorAll('.topics label')];
    if(!q){d.hidden=false;tops.forEach(t=>t.hidden=false);return}
    const lm=d.dataset.s.includes(q),tm=tops.filter(t=>t.dataset.t.includes(q));
    d.hidden=!lm&&!tm.length;
    tops.forEach(t=>t.hidden=!lm&&!tm.includes(t));
    if(tm.length&&!lm)d.open=true;
  });
}
function filtered(){
  const P=S.prefs;
  return ALL.filter(q=>!P.lectOff[q.l]&&!P.topicOff[q.l+'|'+q.t]&&(P.pool==='all'||(P.pool==='marked'?S.flags[q.id]:poolOf(q.id)===P.pool)));
}
function scoreOf(b){let c=0;b.qs.forEach(x=>{if(isOk(x))c++});return c}
function testsTable(list){
  return `<div class="tblwrap"><table class="tests"><thead><tr><th>Test</th><th>Date</th><th>Mode</th><th>Questions</th><th>Score</th><th></th></tr></thead><tbody>${list.map(b=>{
    const sc=scoreOf(b),n=b.qs.length,pc=Math.round(sc/n*100);
    return `<tr><td class="num">#${b.no}</td><td>${new Date(b.created).toLocaleDateString(undefined,{day:'numeric',month:'short'})} ${new Date(b.created).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</td><td><span class="pill ${b.done?'':'sus'}">${b.done?(b.mode==='tutor'?'Tutor':'Timed'):'Suspended'}</span></td><td class="num">${n}</td>
    <td>${b.done?`<div style="display:flex;align-items:center;gap:8px"><div class="bar-meter"><i style="width:${pc}%"></i></div><span class="num">${pc}%</span></div>`:`<span class="hint">${b.qs.filter(x=>x.sel!=null).length} answered</span>`}</td>
    <td>${b.done?`<button class="linkb" data-review="${b.no}">Review</button><button class="linkb" data-results="${b.no}">Results</button>`:`<button class="linkb" data-resume="${b.no}">Resume</button>`}<button class="linkb rm" data-remove="${b.no}" title="Remove this test">Remove</button></td></tr>`}).join('')}</tbody></table></div>`;
}
function topicPerf(){
  const rows=[];ORDER.forEach(l=>topicsOf(l).forEach(t=>{const qs=ALL.filter(q=>q.l===l&&q.t===t);let used=0,cor=0;qs.forEach(q=>{const a=lastAttempt(q.id);if(a){used++;if(a.c)cor++}});rows.push({l,t,n:qs.length,used,cor})}));
  const any=rows.some(r=>r.used);
  if(!any)return '<p class="sub">Answer some questions to see which topics need work.</p>';
  return `<div class="tblwrap"><table class="tests"><thead><tr><th>Lecture</th><th>Topic</th><th>Used</th><th>Correct (latest attempt)</th></tr></thead><tbody>${rows.filter(r=>r.used).sort((a,b)=>a.cor/a.used-b.cor/b.used).map(r=>{const pc=Math.round(r.cor/r.used*100);return `<tr><td>${LECT[r.l].short}</td><td>${esc(r.t)}</td><td class="num">${r.used}/${r.n}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar-meter"><i style="width:${pc}%;background:${pc<60?'var(--bad)':pc<80?'#e0a100':'var(--ok)'}"></i></div><span class="num">${pc}%</span></div></td></tr>`}).join('')}</tbody></table></div>`;
}

/* ================= TEST ================= */
function generate(){
  const n=Math.max(1,Math.min(parseInt($('#nq').value)||20,filtered().length));
  S.prefs.n=n;
  const picks=shuffle(filtered()).slice(0,n);
  S.seq=(S.seq||0)+1;
  B={no:S.seq,created:Date.now(),mode:S.prefs.mode,limit:S.prefs.mode==='timed'?n*90:null,elapsed:0,idx:0,done:false,
     qs:picks.map(q=>({id:q.id,order:shuffle([0,1,2,3,4]),sel:null,sub:false,t:0,strike:[],hl:null}))};
  S.blocks.push(B);save();openTest(B);
}
function openTest(b){savePage();B=b;view='test';qStart=Date.now();render();clearInterval(tick);tick=setInterval(onTick,1000)}
function onTick(){
  if(!B||B.done||view!=='test'||paused)return;
  B.elapsed+=1;const cur=B.qs[B.idx];if(!(B.mode==='tutor'&&cur.sub))cur.t+=1;
  const el=$('#tval');if(el)el.textContent=fmt(B.limit?B.limit-B.elapsed:B.elapsed);
  if(B.elapsed%5===0)save();
  if(B.limit&&B.elapsed>=B.limit){endBlock(true)}
}
let navOpen=false, paused=false;
const openL=new Set();
app.addEventListener('toggle',e=>{const d=e.target.closest&&e.target.closest('details.lrow');if(!d)return;const l=+d.dataset.l;d.open?openL.add(l):openL.delete(l)},true);
function revealed(x){return B.done||(B.mode==='tutor'&&x.sub)}
let lastIdx=null;
function render(){
  if(view!=='test')return;
  const keep={},same=lastIdx===B.idx;['.navcol','.qpane','.xpane .xinner','.xpane'].forEach(k=>{const el=document.querySelector(k);if(el&&(k==='.navcol'||same))keep[k]=el.scrollTop});
  _render();lastIdx=B.idx;
  for(const k in keep){const el=document.querySelector(k);if(el)el.scrollTop=keep[k]}
  if(!('.navcol' in keep)){const c=document.querySelector('.navcol .cur');if(c)c.scrollIntoView({block:'nearest'})}
}
function _render(){
  const x=B.qs[B.idx],q=BY[x.id],rev=revealed(x),n=B.qs.length;
  const corrPos=x.order.indexOf(0);
  const vsa=isVSA(q), gd=isOk(x);
  const choices=vsa?'':x.order.map((oi,pos)=>{
    const sel=x.sel===pos, st=x.strike.includes(pos);
    let mk='';if(rev){if(oi===0)mk='<span class="mk ok">✓</span>';else if(sel)mk='<span class="mk bad">✗</span>'}
    return `<div class="choice ${sel?'sel':''} ${st?'strike':''} ${rev?'locked':''}" data-pos="${pos}" role="radio" aria-checked="${sel}" tabindex="0">
      <span>${mk}</span><span class="radio"></span><span class="txt">${LET[pos]}. ${q.o[oi]}</span></div>`}).join('');
  let strip='';
  if(rev){
    const h=S.hist[q.id]||[];const att=h.length,ok=h.filter(a=>a.c).length;
    const om=x.sel==null, good=isOk(x);
    strip=`<div class="statstrip ${om?'om':good?'':'bad'}"><div class="res">${om?'Omitted':good?'Correct':'Incorrect'}</div>
     <div class="stat">${I.bars}<div>${att?Math.round(ok/att*100):0}%<small>Your accuracy (${att} attempt${att===1?'':'s'})</small></div></div>
     <div class="stat">${I.clock}<div>${fmtMS(x.t)}<small>Time spent</small></div></div>
     <div class="stat">${I.cal}<div>${LECT[q.l].code}<small>${esc(q.t)}</small></div></div></div>`;
  }
  const expl=rev?`<div class="xpane"><div class="tabs"><span class="tab">Explanation</span></div><div class="xinner">
     ${q.f?`<figure><img src="${(window.QB_BASE||'')+LECT[q.l].fig}/${q.f}.jpg" loading="lazy" alt="Slide figure from ${LECT[q.l].code}"><figcaption>Slide figure · ${LECT[q.l].code}, ${LECT[q.l].title}</figcaption></figure>`:''}
     ${q.ft?`<div class="tf"><p><b>Correct answer: ${vsa?q.a[0]:LET[corrPos]+'. '+q.o[0]}</b></p>${ebul(q)}${anl(q)}${dia(q.d)}
     ${vsa?'':`<h4 style="margin:14px 0 4px">Why not the others?</h4><ul class="chs">${x.order.map((oi,pos)=>oi===0?'':`<li><div class="ch"><span class="lt">${LET[pos]} ✗</span><b>${q.o[oi]}</b></div><div class="rs">${q.w[oi-1]}</div></li>`).join('')}</ul>`}</div>`:`<p><b>Correct answer: ${vsa?q.a[0]:LET[corrPos]+'.'}</b> ${q.e}</p>
     ${vsa?'':`<ul class="why">${x.order.map((oi,pos)=>oi===0?'':`<li><b>(Choice ${LET[pos]})</b> ${q.o[oi]}: ${q.w[oi-1]}</li>`).join('')}</ul>`}`}
     ${q.ft?`<div class="aktmeta">Overview: <b>${esc(q.ov)}</b> ${q.ft.map(t=>`<span class="ftchip" style="--c:${FTC[t]||'#888'}">${t}</span>`).join('')}</div>`:''}
     <div class="obj"><h4>Educational objective:</h4>${q.k}</div>
     ${q.x?`<div class="rn"><h4>Read more:</h4><ul><li><a href="${q.x[1]}" target="_blank" rel="noopener">${esc(q.x[0])}: ${esc(q.x[2])}</a></li></ul></div>`:''}
     ${rnBox(q)}
     <div class="src">${LECT[q.l].code} · ${LECT[q.l].title} (${LECT[q.l].by}) · ${esc(q.t)}</div></div></div>`:'';
  let navRev=false;
  const nav=navOpen?`<div class="navcol" role="navigation" aria-label="Questions"><div class="navcard"><h3>Question navigator</h3><div class="navgrid">${B.qs.map((y,i)=>{
     let cls='',st='not answered';const r=revealed(y);
     if(r&&y.sel!=null){navRev=true;cls=isOk(y)?'r-ok':'r-bad';st=isOk(y)?'correct':'incorrect'}else if(y.sel!=null){cls='ans';st='answered'}
     const fl=S.flags[y.id];
     return `<button data-go="${i}" class="${i===B.idx?'cur':''} ${cls} ${fl?'fl':''}" aria-label="Question ${i+1}, ${st}${fl?', flagged':''}"${i===B.idx?' aria-current="true"':''}>${i+1}</button>`}).join('')}</div>
     <p class="navkey">Teal = answered · Orange underline = flagged${navRev?' · Green = correct · Red = incorrect':''}</p>
     <button class="navsubmit" data-act="${B.done?'results':'end'}">${B.done?'View results':'Review and submit'}</button></div></div>`:'';
  const tl=B.limit?'Block Time Remaining':'Block Time Elapsed';
  const tv=B.done?fmt(B.elapsed):fmt(B.limit?B.limit-B.elapsed:B.elapsed);
  app.innerHTML=`
  <div class="bar top">
   <button class="ibtn" data-act="nav" aria-label="Question list">${I.menu}</button>
   <div class="item-meta">${B.akt?`AKT ${B.akt} · `:''}Item ${B.idx+1} of ${n}<br>Question Id: ${q.id}</div>
   <div class="markbox ${S.flags[q.id]?'on':''}" data-act="flag" role="checkbox" aria-checked="${!!S.flags[q.id]}" tabindex="0" title="Mark (M)"><span class="chk"></span>${I.flag(!!S.flags[q.id])}<small class="hide-sm" style="font-size:11px">Mark</small></div>
   <div class="navarrows"><button class="ibtn" data-act="prev" aria-label="Previous" ${B.idx===0?'disabled style="opacity:.4"':''}>${I.prev}<small>Previous</small></button><button class="ibtn" data-act="next" aria-label="Next" ${B.idx===n-1?'disabled style="opacity:.4"':''}>${I.next}<small>Next</small></button></div>
   <button class="ibtn hide-sm" data-act="help" aria-label="Help">${I.help}<small>Tutorial</small></button>
   <button class="ibtn" data-act="ref" aria-label="Reference values">${I.lab}<small class="hide-sm">Lab Values</small></button>
   <button class="ibtn" data-act="notes" aria-label="Notes">${I.notes}<small class="hide-sm">Notes</small></button>
   <button class="ibtn hide-sm" data-act="calc" aria-label="Calculator">${I.calc}<small>Calculator</small></button>
   <button class="ibtn" data-act="theme" aria-label="Dark mode" title="Dark mode">${I.theme()}<small class="hide-sm">Theme</small></button>
  </div>
  <div class="body ${rev?'split':''}">${nav}
   <div class="qpane"><div class="qinner">
     <div class="stem" id="stem">${x.hl||q.s}</div>
     ${q.img?`<figure class="qimg"><img data-pic="${q.img.src}" src="${QB.pics[q.img.src]||''}" alt="Question image"><figcaption>${q.img.cap||''}</figcaption></figure>`:''}
     ${vsa?`<div class="vsabox"><label for="vsa">Very short answer: type a word or short phrase</label>
       <div class="vsarow"><input id="vsa" class="vsa ${rev?(gd?'okb':'badb'):''}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(x.ans||'')}" ${rev?'readonly':''} placeholder="Your answer">${rev?`<span class="mk ${gd?'ok':'bad'}">${gd?'✓':'✗'}</span>`:''}</div>
       ${rev?`<p class="vsaans">Accepted answer: <b>${q.a[0]}</b>${q.a.length>1?` <span class="hint">(also: ${q.a.slice(1).join(', ')})</span>`:''}</p>${x.sel!=null&&!gd?'<button class="linkb" data-act="iwasright">I was right, count it as correct</button>':''}${x.ov===true?'<button class="linkb" data-act="undoright">Undo: mark as incorrect</button>':''}`:''}</div>`:`<div class="choices" role="radiogroup">${choices}</div>`}
     ${B.mode==='tutor'&&!x.sub&&!B.done?`<button class="submit" data-act="submit" ${x.sel==null?'disabled':''}>Submit</button>`:''}
     ${strip}
   </div></div>${expl}
  </div>
  <div class="bar bottom">
   <div class="timer">${B.done?'Review Mode · Time Used':tl}: <span id="tval">${tv}</span><br>${B.done?'':(B.mode==='tutor'?'TUTOR':'TIMED')+' MODE'}</div>
   <div class="spacer"></div>
   <button class="ibtn" data-act="ref2" aria-label="Lecture reference">${I.book}<small>Reference</small></button>
   ${B.done?'':`<button class="ibtn" data-act="suspend" aria-label="Suspend">${I.pause}<small>Suspend</small></button>`}
   <button class="ibtn" data-act="${B.done?'results':'end'}" aria-label="${B.done?'Results':'End block'}">${I.stop}<small>${B.done?'Results':'End Block'}</small></button>
  </div>`;
}
function go(i){if(i<0||i>=B.qs.length)return;B.idx=i;save();render();const p=document.querySelector('.qpane');if(p)p.scrollTop=0}
function choose(pos){const x=B.qs[B.idx];if(revealed(x))return;x.sel=x.sel===pos&&B.mode==='timed'?null:pos;x.strike=x.strike.filter(p=>p!==pos);save();render()}
function record(x){(S.hist[x.id]=S.hist[x.id]||[]).push({c:isOk(x),om:x.sel==null,t:x.t,ts:Date.now(),b:B&&B.created})}
/* remove a test and every answer it added to progress (answers are matched by test tag, or for older answers by time + time spent) */
function removeBlock(no){const b=S.blocks.find(x=>x.no==no);if(!b)return;const end=b.done?(b.created+(b.elapsed||0)*1000+864e5*30):Infinity;
  b.qs.forEach(x=>{const h=S.hist[x.id];if(!h)return;let i=h.findIndex(a=>a.b===b.created);
    if(i<0){let best=1e9;h.forEach((a,j)=>{if(a.b==null&&a.ts>=b.created&&a.ts<=end){const d=Math.abs((a.t||0)-(x.t||0));if(d<best){best=d;i=j}}})}
    if(i>=0){h.splice(i,1);if(!h.length)delete S.hist[x.id]}});
  S.blocks=S.blocks.filter(x=>x!==b);save();renderHome()}
function submit(){const x=B.qs[B.idx];if(x.sel==null||x.sub)return;x.sub=true;record(x);save();render()}
function endBlock(auto){
  B.qs.forEach(x=>{if(!(B.mode==='tutor'&&x.sub))record(x);x.sub=true});
  B.done=true;B.idx=0;save();clearInterval(tick);closePops();B.akt?renderAKT(B,auto):renderResults(B,auto);
}

/* ================= AKT (mock Applied Knowledge Tests) ================= */
const STD=52, SEM=3.6, PASS=STD+SEM, DIST=STD+25, MERIT=DIST-5;   // overall: pass = standard set + 1 SEM; distinction = standard set + 25; merit = within 5% of distinction
const FTR=[['Biomedicine',47,51,9],['Anatomy',27,52,12],['Pathology',23,52,14],['Physiology',13,53,14],['Pharma & Therapeutics',12,52,18],['Person & Pop Health',10,51,22],['Human Behaviour',9,51,25]];   // cohort rubric: items, standard set %, 1.64×SEM %
const FTC={'Biomedicine':'#0a84ff','Anatomy':'#ff9f0a','Pathology':'#ff453a','Physiology':'#30d158','Pharma & Therapeutics':'#bf5af2','Person & Pop Health':'#64d2ff','Human Behaviour':'#ffd60a'};
const aktBlocks=n=>S.blocks.filter(b=>b.akt===n);
function aktGrade(pc){return pc>=DIST?['Distinction','#30d158']:pc>=MERIT?['Merit','#64d2ff']:pc>=PASS?['Pass','#30d158']:['Fail','#ff453a']}
function aktCard(){
  if(!AKT.exams.length)return '';
  return `<div class="card"><h2>AKT</h2><p class="sub">Eleven full mock Applied Knowledge Tests: 120 new, harder questions each (single best answer and very short answer), 3 hours, exam conditions. These questions never appear in normal tests. Feedback by fundamental track, pass mark and every question when you finish.</p>
   <div class="aktgrid">${AKT.exams.map((ids,i)=>{const n=i+1,bl=aktBlocks(n),cur=bl.find(b=>!b.done),last=bl.filter(b=>b.done).pop();
     let st='Not started',gr='';if(cur)st=`In progress · ${cur.qs.filter(x=>x.sel!=null).length}/${cur.qs.length} answered · ${fmt(cur.limit-cur.elapsed).slice(0,5)} left`;else if(last){const pc=scoreOf(last)/last.qs.length*100,g=aktGrade(pc);st=`${Math.round(pc)}% · ${new Date(last.created).toLocaleDateString(undefined,{day:'numeric',month:'short'})}`;gr=`<span class="gr" style="color:${g[1]}">${g[0]}</span>`}
     return `<div class="akttile"><b>AKT ${n}</b><span class="st">${st}</span>${gr}<div class="acts">${cur?`<button class="btn pri" data-aktgo="${n}">Resume</button>`:last?`<button class="btn pri" data-aktres="${last.no}">Feedback</button><button class="btn" data-aktgo="${n}">Retake</button>`:`<button class="btn pri" data-aktgo="${n}">Start</button>`}</div></div>`}).join('')}</div></div>`;
}
function startAKT(n){
  const cur=aktBlocks(n).find(b=>!b.done);if(cur)return openTest(cur);
  modal(`AKT ${n}`,`120 questions · 3 hours (90 seconds per question) · timed.<br><br>Single best answer and very short answer items across all your lectures. Explanations are hidden until you end the exam. You can suspend and resume it from the dashboard.`,[{label:'Cancel'},{label:'Start exam',cls:'pri',fn:()=>{
    S.seq=(S.seq||0)+1;const ids=AKT.exams[n-1];
    const b={no:S.seq,akt:n,created:Date.now(),mode:'timed',limit:ids.length*90,elapsed:0,idx:0,done:false,qs:ids.map(id=>({id,order:shuffle([0,1,2,3,4]),sel:null,sub:false,t:0,strike:[],hl:null}))};
    S.blocks.push(b);save();openTest(b)}}]);
}
let aktF={res:'all',ft:null};
function aktTracks(b){
  return FTR.map(([t,pn,std,s164])=>{const xs=b.qs.filter(x=>(BY[x.id].ft||[]).includes(t)),k=xs.length;if(!k)return null;
    const ok=xs.filter(isOk).length,p=ok/k*100,sem=s164*Math.sqrt(pn/k),mas=std-sem,summ=k>=25;
    return {t,k,ok,p,std,sem,mas,summ,st:p>=std?'Pass':p>=mas?'Borderline':summ?'Fail':'Concerning'}}).filter(Boolean);
}
const stCol={Pass:'#30d158',Borderline:'#ff9f0a',Fail:'#ff453a',Concerning:'#ff453a'};
function aktList(b){
  const rows=b.qs.map((x,i)=>({x,i,q:BY[x.id],r:x.sel==null?'om':isOk(x)?'ok':'bad'})).filter(o=>(aktF.res==='all'||o.r===aktF.res)&&(!aktF.ft||(o.q.ft||[]).includes(aktF.ft)));
  if(!rows.length)return '<div class="empty">No questions match this filter.</div>';
  return rows.map(({x,i,q,r})=>{const vsa=isVSA(q),lab={ok:'Correct',bad:'Incorrect',om:'Omitted'}[r];
    const yours=vsa?(x.ans?esc(x.ans):'—'):(x.sel==null?'—':q.o[x.order[x.sel]]);
    return `<details class="qrow"><summary><span class="qn r-${r}">${i+1}</span><span class="qt"><b>${esc(q.ov||q.t)}</b><small>${esc(LECT[q.l].short)} · ${(q.ft||[]).map(t=>`<span class="ftchip" style="--c:${FTC[t]}">${t}</span>`).join(' ')}</small></span><span class="qr r-${r}">${lab}</span><span class="chev">›</span></summary>
     <div class="qbody"><p class="stem">${q.s}</p>${q.img&&QB.pics[q.img.src]?`<figure class="aimg"><img src="${QB.pics[q.img.src+'_ans']||QB.pics[q.img.src]}" alt="Question image" loading="lazy"><figcaption>${q.img.cap||''}</figcaption></figure>`:''}
      <div class="ans"><div><span>Your answer</span><b class="r-${r}">${yours}</b></div><div><span>Correct answer</span><b>${vsa?esc(q.a[0]):q.o[0]}</b></div></div>
      <div class="tf">${ebul(q)}${anl(q)}${dia(q.d)}
      ${vsa?'':`<h4 style="margin:14px 0 4px">Why not the others?</h4><ul class="chs">${q.o.slice(1).map((o,j)=>`<li><div class="ch"><span class="lt">✗</span><b>${o}</b></div><div class="rs">${q.w[j]}</div></li>`).join('')}</ul>`}</div>
      <div class="obj"><span>Educational objective</span>${q.k}</div>
      <div class="links"><button class="pillbtn" data-aktopen="${i}">Open in exam view</button>${q.x?`<a class="pillbtn" href="${q.x[1]}" target="_blank" rel="noopener">${esc(q.x[0])}: ${esc(q.x[2])} ↗</a>`:''}${OWNER?(q.rn||[]).map(c=>`<a class="pillbtn" href="${rnUrl(c)}" target="_blank" rel="noopener" title="${esc(c[1])}">RemNote: ${esc(c[1].length>48?c[1].slice(0,46)+'…':c[1])}</a>`).join(''):''}</div>${OWNER?'':rnBox(q)}
      <div class="tag">Session: ${esc(LECT[q.l].code)} · ${esc(LECT[q.l].title)} (${esc(LECT[q.l].by)})</div></div></details>`}).join('');
}
function renderAKT(b,auto){
  clearInterval(tick);view='akt';B=b;
  const n=b.qs.length,c=scoreOf(b),om=b.qs.filter(x=>x.sel==null).length,pc=c/n*100,g=aktGrade(pc),T=aktTracks(b);
  const R=74,C=2*Math.PI*R,pt=(p,r)=>{const a=(p*3.6-90)*Math.PI/180;return [90+r*Math.cos(a),90+r*Math.sin(a)]};
  const tick_=(p,col)=>{const [a1,b1]=pt(p,R-13),[a2,b2]=pt(p,R+13);return `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`};
  const ring=`<svg class="ring" viewBox="0 0 180 180" role="img" aria-label="${Math.round(pc)}% correct"><circle cx="90" cy="90" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="16"/><circle class="arc" style="--C:${C};--gc:${g[1]}" cx="90" cy="90" r="${R}" fill="none" stroke="${g[1]}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pc/100)}" transform="rotate(-90 90 90)"/>${tick_(PASS,'#fff')}${tick_(DIST,'rgba(235,235,245,.4)')}<text x="90" y="96" text-anchor="middle" font-size="40" font-weight="700" fill="#fff" id="aktpc">${Math.round(pc)}%</text><text x="90" y="120" text-anchor="middle" font-size="13" fill="rgba(235,235,245,.6)">${c} of ${n}</text></svg>`;
  const mk=(p,l,up)=>`<i style="left:${p}%"></i><em style="left:${p}%${up?';top:-22px':''}">${l}</em>`;
  const fails=T.filter(t=>t.st!=='Pass');
  const L={};b.qs.forEach(x=>{const q=BY[x.id];(L[q.l]=L[q.l]||{n:0,ok:0}).n++;if(isOk(x))L[q.l].ok++});
  const lects=Object.entries(L).map(([l,v])=>({l:+l,...v,p:v.ok/v.n*100})).sort((a,b)=>a.p-b.p||b.n-a.n);
  const cnt=r=>b.qs.filter(x=>(x.sel==null?'om':isOk(x)?'ok':'bad')===r).length;
  app.innerHTML=`<div class="akt" style="--g1:${g[1]}"><div class="aurora"><span></span><span></span><span></span></div><div class="anav"><button class="back" data-act="home">‹ Dashboard</button><div class="ttl">AKT ${b.akt}</div><button class="back" data-aktopen="0">Exam view</button></div>
  <div class="wrap">
   <h1>Results</h1><p class="subt">AKT ${b.akt} · ${new Date(b.created).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})} · ${fmt(b.elapsed)} used of ${fmt(b.limit)}</p>
   ${auto?'<div class="grp note">Time ran out. Unanswered questions were marked as omitted.</div>':''}
   <div class="grp hero">${ring}<div><span class="grade" style="background:${g[1]}22;color:${g[1]}">${g[0]}</span>
     <h3>${pc>=PASS?`You passed with ${Math.round(pc)}%`:`${Math.round(PASS-pc)}% below the pass mark`}</h3>
     <p>Pass mark <b>${PASS.toFixed(1)}%</b> (standard set ${STD}% + 1 SEM ${SEM}%). Merit from <b>${MERIT}%</b>, distinction from <b>${DIST}%</b>.</p>
     <div class="scale"><div class="fill" style="width:${pc}%;background:${g[1]}"></div>${mk(PASS,'Pass')}${mk(MERIT,'Merit',1)}${mk(DIST,'Distinction')}</div>
     ${fails.length?`<p class="warn">${fails.map(t=>`<b style="color:${stCol[t.st]}">${t.t}</b> ${t.st.toLowerCase()}`).join(' · ')}</p>`:'<p class="okline">Every fundamental track at or above its standard set.</p>'}</div></div>
   <div class="tiles"><div><b style="color:#30d158">${c}</b><span>Correct</span></div><div><b style="color:#ff453a">${n-c-om}</b><span>Incorrect</span></div><div><b>${om}</b><span>Omitted</span></div><div><b>${Math.round(b.elapsed/n)}s</b><span>Per question</span></div></div>

   <h2>Fundamental tracks</h2>
   <div class="grp">${T.map(t=>`<div class="ft"><div class="fth"><span class="dot" style="background:${FTC[t.t]}"></span><b>${t.t}</b><small>${t.summ?'Summative':'Formative'} · ${t.k} items</small><span class="pc">${Math.round(t.p)}%</span><span class="st" style="color:${stCol[t.st]};background:${stCol[t.st]}22">${t.st}</span></div>
     <div class="ftbar"><div class="fill" style="width:${t.p}%;background:${FTC[t.t]}"></div><i class="mas" style="left:${Math.max(0,t.mas)}%" title="MAS"></i><i class="std" style="left:${t.std}%" title="Standard set"></i></div>
     <div class="ftn"><span>${t.ok}/${t.k} correct</span><span>Standard set ${t.std}%</span><span>1.64×SEM ${t.sem.toFixed(1)}%</span><span>MAS ${Math.max(0,t.mas).toFixed(1)}%</span></div></div>`).join('')}</div>
   <p class="foot">White line = standard set (pass). Dashed line = MAS (minimum acceptable standard = standard set − 1.64×SEM, with the cohort SEM scaled for the number of items in this paper). At or above the standard set: Pass. Between MAS and standard set: Borderline. Below MAS: Fail for summative tracks (25 or more items), Concerning for formative tracks. Questions can count towards more than one track.</p>

   <h2>By session</h2>
   <div class="grp lgrid">${lects.map(o=>`<div class="lrow2"><span>${esc(LECT[o.l].short)}</span><div class="mini"><div style="width:${o.p}%;background:${o.p>=PASS?'#30d158':o.p>=40?'#ff9f0a':'#ff453a'}"></div></div><b>${o.ok}/${o.n}</b></div>`).join('')}</div>

   <h2>Question feedback</h2>
   <div class="segc">${[['all','All',n],['bad','Incorrect',cnt('bad')],['om','Omitted',cnt('om')],['ok','Correct',c]].map(([k,l,v])=>`<button data-aktf="${k}" class="${aktF.res===k?'on':''}">${l} <small>${v}</small></button>`).join('')}</div>
   <div class="chips"><button data-aktft="" class="${aktF.ft?'':'on'}">All tracks</button>${T.map(t=>`<button data-aktft="${t.t}" class="${aktF.ft===t.t?'on':''}" style="--c:${FTC[t.t]}">${t.t}</button>`).join('')}</div>
   <div class="grp" id="aktlist">${aktList(b)}</div>
   ${reviseHTML(b)}
  </div></div>`;  const el=$('#aktpc'),T0=performance.now(),tgt=Math.round(pc);if(el&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const st=t=>{const k=Math.min(1,(t-T0)/1400),e=1-Math.pow(1-k,3);el.textContent=Math.round(tgt*e)+'%';if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)}
  restorePage();
}

/* what to revise: worst lectures first, with their weak RemNote sections (topics) inside */
function reviseHTML(b){
  const L={};b.qs.forEach(x=>{const q=BY[x.id];const o=L[q.l]=L[q.l]||{n:0,ok:0,T:{}};o.n++;const t=o.T[q.t]=o.T[q.t]||{n:0,ok:0};t.n++;if(isOk(x)){o.ok++;t.ok++}});
  const pcol=p=>p>=70?'#30d158':p>=50?'#ff9f0a':'#ff453a';
  const ls=Object.entries(L).map(([l,v])=>({l:+l,...v,p:v.ok/v.n*100})).filter(o=>o.ok<o.n).sort((a,b)=>a.p-b.p||(b.n-b.ok)-(a.n-a.ok));
  if(!ls.length)return `<h2 class="revh">What to revise</h2><div class="grp revise"><p class="okline">Nothing to revise: every question correct.</p></div>`;
  return `<h2 class="revh">What to revise</h2><p class="subt">Lectures you did worst in first. Inside each, the flashcard sections where you dropped marks, so you can go straight to those cards.</p>
  <div class="grp revise">${ls.map(o=>{const ts=Object.entries(o.T).map(([t,v])=>({t,...v,p:v.ok/v.n*100})).filter(t=>t.ok<t.n).sort((a,b)=>a.p-b.p||(b.n-b.ok)-(a.n-a.ok));
    return `<div class="rvl"><div class="rvh"><b>${esc(LECT[o.l].code?LECT[o.l].code+' · ':'')}${esc(LECT[o.l].short)}</b><span class="rvp" style="color:${pcol(o.p)}">${o.ok}/${o.n} · ${Math.round(o.p)}%</span></div>
    <div class="mini"><div style="width:${o.p}%;background:${pcol(o.p)}"></div></div>
    <ul>${ts.map(t=>`<li><span>${esc(t.t)}</span><em style="color:${pcol(t.p)}">${t.ok}/${t.n}</em></li>`).join('')}</ul></div>`}).join('')}</div>`}
/* ================= RESULTS ================= */
const pageScroll={};
function savePage(){const el=document.querySelector('.home,.akt');if(el&&B&&(view==='results'||view==='akt'))pageScroll[view+B.no]=el.scrollTop}
function restorePage(){const el=document.querySelector('.home,.akt');if(el&&B&&pageScroll[view+B.no])el.scrollTop=pageScroll[view+B.no]}
function renderResults(b,auto){
  clearInterval(tick);view='results';B=b;
  const n=b.qs.length,c=scoreOf(b),om=b.qs.filter(x=>x.sel==null).length,pc=Math.round(c/n*100);
  const r=46,C=2*Math.PI*r;
  app.innerHTML=`<div class="bar top rbar"><div class="brand">Med QBank<small>Test #${b.no} results</small></div><div class="spacer"></div><button class="ibtn" data-act="theme" aria-label="Dark mode" title="Dark mode">${I.theme()}</button><button class="btn" style="background:#fff" data-act="home">Back to dashboard</button></div>
  <div class="home ap"><div class="homein">
   ${auto?'<div class="card" style="border-color:#f1c40f"><b>Time is up.</b> The block ended automatically and unanswered questions were marked as omitted.</div>':''}
   <div class="card"><div class="score">
     <svg class="ring" viewBox="0 0 110 110" role="img" aria-label="${pc}% correct"><circle cx="55" cy="55" r="${r}" class="track" fill="none" stroke="#e6e9f0" stroke-width="12"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="${pc<60?'#d23a2f':pc<80?'#e0a100':'#2e9b3e'}" stroke-width="12" stroke-dasharray="${C*pc/100} ${C}" transform="rotate(-90 55 55)" stroke-linecap="round"/><text x="55" y="61" text-anchor="middle" font-size="22" font-weight="700" fill="#1d1f24">${pc}%</text></svg>
     <div class="kpis" style="flex:1;min-width:260px"><div class="kpi"><b style="color:var(--ok)">${c}</b><span>Correct</span></div><div class="kpi"><b style="color:var(--bad)">${n-c-om}</b><span>Incorrect</span></div><div class="kpi"><b>${om}</b><span>Omitted</span></div><div class="kpi"><b>${fmtMS(b.elapsed/n).replace(' mins,','m').replace(' secs','s')}</b><span>Average time per question</span></div></div>
   </div>
   <div class="gen" style="margin-top:14px"><button class="btn pri" data-review="${b.no}">Review all questions</button>${n-c?`<button class="btn" data-reviewbad="${b.no}">Review incorrect and omitted</button>`:''}</div></div>
   <div class="card"><h2>Question breakdown</h2><div class="tblwrap"><table class="tests reslist"><thead><tr><th>#</th><th>Question Id</th><th>Lecture</th><th>Topic</th><th>Result</th><th>Time</th><th></th></tr></thead><tbody>
   ${b.qs.map((x,i)=>{const q=BY[x.id];const res=x.sel==null?'om':isOk(x)?'ok':'bad';return `<tr><td class="num">${i+1}</td><td class="num">${q.id}</td><td>${LECT[q.l].short}</td><td>${esc(q.t)}</td><td class="r-${res}">${{ok:'Correct',bad:'Incorrect',om:'Omitted'}[res]}</td><td class="num">${fmt(x.t).slice(3)}</td><td><button class="linkb" data-open="${i}">Open</button></td></tr>`}).join('')}
   </tbody></table></div></div>
   <div class="card revcard">${reviseHTML(b)}</div>
  </div></div>`;
  restorePage();
}

/* ================= POPUPS ================= */
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.remove())}
function pop(id,title,html,w,pos){
  let p=document.getElementById(id);if(p){p.remove();return null}
  p=document.createElement('div');p.className='pop';p.id=id;p.style.width=w+'px';
  const W=innerWidth;p.style.left=Math.max(12,Math.min(W-w-12,pos?pos.x:W-w-24))+'px';p.style.top=(pos?pos.y:78)+'px';p.style.maxHeight=`calc(100vh - ${(pos?pos.y:78)+12}px)`;
  p.innerHTML=`<header>${title}<button aria-label="Close">×</button></header><div class="pbody">${html}</div>`;
  document.body.appendChild(p);
  p.querySelector('header button').onclick=()=>p.remove();
  const hd=p.querySelector('header');let dx,dy,drag=false;
  hd.addEventListener('pointerdown',e=>{if(e.target.tagName==='BUTTON')return;drag=true;dx=e.clientX-p.offsetLeft;dy=e.clientY-p.offsetTop;hd.setPointerCapture(e.pointerId)});
  hd.addEventListener('pointermove',e=>{if(!drag)return;p.style.left=Math.max(0,Math.min(innerWidth-60,e.clientX-dx))+'px';p.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-dy))+'px';p.style.maxHeight=`calc(100vh - ${p.offsetTop+12}px)`});
  hd.addEventListener('pointerup',()=>drag=false);
  return p;
}
function refHTML(){
  const cur=B?BY[B.qs[B.idx].id].l:null;
  const ls=B?[cur,...new Set(B.qs.map(x=>BY[x.id].l))].filter((v,i,a)=>a.indexOf(v)===i):ORDER;
  return `<p class="hint" style="margin:0 0 10px">Abbreviations from the lecture slides for the lectures in this test. The current question's lecture is first.</p>`+
   ls.map(l=>`<b style="font-size:13px">${LECT[l].code}: ${esc(LECT[l].short)}</b>${LECT[l].ref&&LECT[l].ref.length?`<table class="reftab"><tr><th>Abbreviation</th><th>Meaning</th></tr>${LECT[l].ref.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td></tr>`).join('')}</table>`:'<p class="hint" style="margin:4px 0 14px">No abbreviations list in this lecture.</p>'}`).join('')}
function helpHTML(){return `<ul class="helpl"><li><b>Select</b> an answer by clicking it, or press <kbd>A</kbd>–<kbd>E</kbd>.</li><li><b>Strike out</b> an option with a right-click (long-press on touch screens).</li><li><b>Very short answer</b> items: type a word or short phrase (small typos are accepted). If your answer is marked wrong but means the same thing, press <b>I was right</b>.</li><li><b>Highlight</b> text in the question by selecting it with the mouse.</li><li><kbd>Enter</kbd> submits in Tutor mode. <kbd>←</kbd> <kbd>→</kbd> move between items. <kbd>M</kbd> marks the item.</li><li><b>Suspend</b> saves the block so you can resume later from the dashboard.</li><li>Progress is saved in this browser only.</li></ul>`}
function openNotes(){
  if(!B)return;const id=B.qs[B.idx].id;
  const p=pop('notes','Notes · Question '+id,`<textarea id="notetxt" placeholder="Type a note for this question">${esc(S.notes[id]||'')}</textarea>`,340);
  if(p){const t=p.querySelector('textarea');t.focus();t.addEventListener('input',()=>{S.notes[id]=t.value;save()})}
}
function openCalc(){
  const p=pop('calc','Calculator',`<div class="calc"><div class="disp" id="cdisp">0</div><div class="keys">${['C','±','√','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='].map(k=>`<button class="${'÷×−+'.includes(k)?'op':k==='='?'eq':''}" data-k="${k}">${k}</button>`).join('')}</div></div>`,250,{x:innerWidth-280,y:80});
  if(!p)return;let cur='0',acc=null,op=null,fresh=false;const d=p.querySelector('#cdisp');
  const show=()=>d.textContent=cur.length>14?Number(cur).toPrecision(10):cur;
  const ap=(a,b,o)=>o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:o==='÷'?(b===0?NaN:a/b):b;
  p.querySelector('.keys').addEventListener('click',e=>{const k=e.target.dataset.k;if(!k)return;
    if(/\d/.test(k)){cur=(fresh||cur==='0')?k:cur+k;fresh=false}
    else if(k==='.'){if(fresh){cur='0.';fresh=false}else if(!cur.includes('.'))cur+='.'}
    else if(k==='C'){cur='0';acc=null;op=null}
    else if(k==='⌫'){cur=cur.length>1?cur.slice(0,-1):'0'}
    else if(k==='±'){cur=String(-Number(cur))}
    else if(k==='√'){cur=String(Math.sqrt(Number(cur)));fresh=true}
    else if(k==='='){if(op!=null){cur=String(+ap(acc,Number(cur),op).toPrecision(12));acc=null;op=null;fresh=true}}
    else{if(op!=null&&!fresh)cur=String(+ap(acc,Number(cur),op).toPrecision(12));acc=Number(cur);op=k;fresh=true}
    show()});
}
function modal(title,body,buttons){
  const s=document.createElement('div');s.className='scrim';
  s.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><header>${title}</header><div class="mb">${body}</div><div class="mf">${buttons.map((b,i)=>`<button class="btn ${b.cls||''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
  document.body.appendChild(s);
  s.addEventListener('click',e=>{const i=e.target.dataset.i;if(i!=null){s.remove();buttons[i].fn&&buttons[i].fn()}else if(e.target===s)s.remove()});
  s.querySelector('.btn.pri,.btn.danger')?.focus();
}


/* ================= BACKUP: move progress between the claude.ai page and the standalone copy ================= */
function mergeProgress(o){
  if(!o||typeof o!=='object'||!o.hist||!Array.isArray(o.blocks))throw new Error('This is not a QBank backup.');
  let added=0;const wasEmpty=!Object.keys(S.hist).length&&!S.blocks.length;
  for(const id in o.hist){const mine=S.hist[id]||[],seen=new Set(mine.map(a=>a.ts));(o.hist[id]||[]).forEach(a=>{if(!seen.has(a.ts)){mine.push(a);added++}});mine.sort((a,b)=>a.ts-b.ts);if(mine.length)S.hist[id]=mine}
  const byC=new Map(S.blocks.map(b=>[b.created,b]));let nb=0;
  const prog=b=>(b.done?1e6:0)+b.qs.filter(x=>x.sel!=null).length;
  o.blocks.filter(b=>b.qs.every(x=>BY[x.id])).forEach(b=>{const m=byC.get(b.created);
    if(m){if(prog(b)>prog(m))Object.assign(m,b,{no:m.no});return}
    S.seq=Math.max(S.seq||0,...S.blocks.map(x=>x.no),0)+1;b.no=S.seq;S.blocks.push(b);nb++});
  S.blocks.sort((a,b)=>a.created-b.created);
  for(const id in o.flags||{})if(o.flags[id])S.flags[id]=true;
  for(const id in o.notes||{})if(o.notes[id]&&!S.notes[id])S.notes[id]=o.notes[id];
  if(wasEmpty&&o.prefs)S.prefs=Object.assign(S.prefs,o.prefs);   // a fresh copy takes on your lecture/topic selections
  save();return {added,nb};
}
function openBackup(){
  const data=JSON.stringify(S);
  modal('Backup your progress',`<p style="margin:0 0 8px"><b>Export</b>: copy this text (it is all your answers, tests, marks and notes).</p>
   <textarea id="bkout" readonly style="width:100%;height:90px;font:12px monospace">${esc(data)}</textarea>
   <p style="margin:4px 0 14px"><button class="btn" id="bkcopy">Copy</button> <span class="hint" id="bkmsg">${(data.length/1024).toFixed(0)} KB</span></p>
   <p style="margin:0 0 8px"><b>Import</b>: paste a backup from your other copy here. It is merged with what is already here; nothing is deleted.</p>
   <textarea id="bkin" placeholder="Paste backup here" style="width:100%;height:90px;font:12px monospace"></textarea>`,
   [{label:'Close'},{label:'Import',cls:'pri',fn:()=>{const t=bkin.value.trim();if(!t)return;
     try{const r=mergeProgress(JSON.parse(t));renderHome();modal('Imported',`Merged <b>${r.added}</b> answers and <b>${r.nb}</b> tests into this copy.`,[{label:'OK',cls:'pri'}])}
     catch(e){modal('Import failed',esc(e.message||'Could not read that text.'),[{label:'OK',cls:'pri'}])}}}]);
  const bkin=document.getElementById('bkin'),out=document.getElementById('bkout');
  document.getElementById('bkcopy').onclick=async()=>{out.select();let ok=false;try{await navigator.clipboard.writeText(data);ok=true}catch(e){try{ok=document.execCommand('copy')}catch(_){}}
    document.getElementById('bkmsg').textContent=ok?'Copied. Now open the other copy, press Backup and paste under Import.':'Select the text above and copy it (Cmd+C).'};
}

/* ================= EVENTS ================= */
app.addEventListener('click',e=>{
  const t=e.target.closest('[data-act],[data-pos],[data-go],[data-mode],[data-resume],[data-review],[data-reviewbad],[data-results],[data-open],[data-aktgo],[data-aktres],[data-aktopen],[data-aktf],[data-aktft],[data-remove]');if(!t)return;
  const d=t.dataset;
  if(d.aktgo){return startAKT(+d.aktgo)}
  if(d.aktres){aktF={res:'all',ft:null};return renderAKT(S.blocks.find(x=>x.no==d.aktres))}
  if(d.aktopen!=null){e.preventDefault();B.idx=+d.aktopen;return openTest(B)}
  if(d.aktf!=null||d.aktft!=null){if(d.aktf!=null)aktF.res=d.aktf;else aktF.ft=d.aktft||null;
    document.querySelectorAll('.akt [data-aktf]').forEach(b=>b.classList.toggle('on',b.dataset.aktf===aktF.res));
    document.querySelectorAll('.akt [data-aktft]').forEach(b=>b.classList.toggle('on',(b.dataset.aktft||null)===aktF.ft));
    $('#aktlist').innerHTML=aktList(B);return}
  if(d.pos!=null)return choose(+d.pos);
  if(d.go!=null){go(+d.go);if(innerWidth<900){navOpen=false;render()}return}
  if(d.mode){S.prefs.mode=d.mode;save();return renderHome()}
  if(d.remove){const b=S.blocks.find(x=>x.no==d.remove);if(!b)return;return modal('Remove test #'+b.no+'?',b.done?'This deletes the test from Previous tests and takes its <b>'+b.qs.length+'</b> answers out of your progress and scores. Those questions go back to unused if this was their only attempt. This cannot be undone.':'This cancels the suspended test and removes any answers it saved. This cannot be undone.',[{label:'Cancel'},{label:'Remove',cls:'danger',fn:()=>removeBlock(b.no)}])}
  if(d.resume){const b=S.blocks.find(x=>x.no==d.resume);return openTest(b)}
  if(d.review){const b=S.blocks.find(x=>x.no==d.review);b.idx=0;return openTest(b)}
  if(d.reviewbad){const b=S.blocks.find(x=>x.no==d.reviewbad);const i=b.qs.findIndex(x=>!isOk(x));b.idx=Math.max(0,i);navOpen=true;return openTest(b)}
  if(d.results){return renderResults(S.blocks.find(x=>x.no==d.results))}
  if(d.open!=null){B.idx=+d.open;return openTest(B)}
  switch(d.act){
    case 'nav':navOpen=!navOpen;return render();
    case 'prev':return go(B.idx-1);
    case 'next':return go(B.idx+1);
    case 'flag':{const id=B.qs[B.idx].id;S.flags[id]=!S.flags[id];if(!S.flags[id])delete S.flags[id];save();return render()}
    case 'submit':return submit();
    case 'iwasright':case 'undoright':{const x=B.qs[B.idx];x.ov=d.act==='iwasright'?true:null;const h=S.hist[x.id];if(h&&h.length)h[h.length-1].c=isOk(x);save();return render()}
    case 'theme':toggleTheme();document.querySelectorAll('[data-act=theme]').forEach(x=>{x.querySelector('svg').outerHTML=I.theme()});return;
    case 'help':return pop('help','How to use this test',helpHTML(),360);
    case 'ref':case 'ref2':return pop('ref','Reference',refHTML(),380);
    case 'notes':return openNotes();
    case 'calc':return openCalc();
    case 'suspend':return modal('Suspend block','Your answers and remaining time are saved. Resume it any time from the dashboard.',[{label:'Cancel'},{label:'Suspend',cls:'pri',fn:()=>{save();closePops();renderHome()}}]);
    case 'end':{const un=B.qs.filter(x=>x.sel==null).length;return modal('End block',`${un?`You have <b>${un}</b> unanswered question${un===1?'':'s'}; they will be marked as omitted. `:''}Are you sure you want to end this block?`,[{label:'No'},{label:'Yes, end block',cls:'danger',fn:()=>endBlock(false)}])}
    case 'results':closePops();return B.akt?renderAKT(B):renderResults(B);
    case 'home':return renderHome();
    case 'allon':S.prefs.lectOff={};S.prefs.topicOff={};save();return renderHome();
    case 'expandall':document.querySelectorAll('details.lrow:not([hidden])').forEach(x=>{x.open=true;openL.add(+x.dataset.l)});return;
    case 'collapseall':document.querySelectorAll('details.lrow').forEach(x=>x.open=false);openL.clear();return;
    case 'lall':case 'lnone':case 'lonly':{const l=+d.l,P=S.prefs;
      if(d.act==='lonly')ORDER.forEach(k=>{if(k!==l)P.lectOff[k]=true});
      if(d.act==='lnone')P.lectOff[l]=true;else{delete P.lectOff[l];topicsOf(l).forEach(t=>delete P.topicOff[l+'|'+t])}
      save();return renderHome()}
    case 'alloff':ORDER.forEach(l=>S.prefs.lectOff[l]=true);save();return renderHome();
    case 'generate':return generate();
    case 'backup':return openBackup();
    case 'reset':return modal('Reset all progress','This clears every answer, mark, note and test in this browser. It cannot be undone.',[{label:'Cancel'},{label:'Reset',cls:'danger',fn:()=>{try{localStorage.removeItem(KEY)}catch(e){}S=load();renderHome()}}]);
  }
});
app.addEventListener('change',e=>{
  const t=e.target,P=S.prefs;
  if(t.name==='pool'){P.pool=t.value}
  else if(t.dataset.lect){const l=+t.dataset.lect;
    if(t.checked){delete P.lectOff[l];const tp=topicsOf(l);if(tp.every(x=>P.topicOff[l+'|'+x]))tp.forEach(x=>delete P.topicOff[l+'|'+x])}   // ticking a lecture with no topics left selects them all
    else P.lectOff[l]=true}
  else if(t.dataset.topic){const k=t.dataset.topic,l=+k.split('|')[0];
    if(P.lectOff[l]){delete P.lectOff[l];topicsOf(l).forEach(x=>P.topicOff[l+'|'+x]=true)}   // topic in an unticked lecture: study just that topic
    if(t.checked)delete P.topicOff[k];else P.topicOff[k]=true;
    if(topicsOf(l).every(x=>P.topicOff[l+'|'+x]))P.lectOff[l]=true}
  else if(t.id==='nq'){P.n=parseInt(t.value)||20;save();return}
  else return;
  save();renderHome();
});
app.addEventListener('input',e=>{if(e.target.id==='lsearch'){lq=e.target.value;applySearch()}});
app.addEventListener('input',e=>{if(e.target.id!=='vsa'||view!=='test')return;const x=B.qs[B.idx];if(revealed(x))return;x.ans=e.target.value;x.sel=x.ans.trim()?0:null;save();const b=document.querySelector('[data-act=submit]');if(b)b.disabled=x.sel==null});
app.addEventListener('keydown',e=>{if(e.target.id==='vsa'&&e.key==='Enter'&&B&&B.mode==='tutor'){e.preventDefault();submit()}});
app.addEventListener('contextmenu',e=>{const c=e.target.closest('.choice');if(!c||view!=='test')return;e.preventDefault();const x=B.qs[B.idx];if(revealed(x))return;const pos=+c.dataset.pos;x.strike=x.strike.includes(pos)?x.strike.filter(p=>p!==pos):[...x.strike,pos];save();render()});
app.addEventListener('mouseup',e=>{
  if(view!=='test')return;const stem=$('#stem');if(!stem||!stem.contains(e.target))return;
  const sel=getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;
  const r=sel.getRangeAt(0);if(!stem.contains(r.commonAncestorContainer))return;
  try{const m=document.createElement('mark');r.surroundContents(m);sel.removeAllRanges();B.qs[B.idx].hl=stem.innerHTML;save()}catch(err){}
});
app.addEventListener('dblclick',e=>{const m=e.target.closest('#stem mark');if(!m)return;m.replaceWith(...m.childNodes);B.qs[B.idx].hl=$('#stem').innerHTML;save()});
document.addEventListener('keydown',e=>{
  if(view!=='test'||e.target.closest('textarea,input')||document.querySelector('.scrim'))return;
  const k=e.key.toUpperCase();
  if('ABCDE'.includes(k)&&k.length===1){choose('ABCDE'.indexOf(k));e.preventDefault()}
  else if(k==='ENTER'){e.preventDefault();if(e.target.closest('.choice'))choose(+e.target.closest('.choice').dataset.pos);else if(B.mode==='tutor')submit()}
  else if(k==='ARROWRIGHT'||k==='N'){e.preventDefault();go(B.idx+1)}
  else if(k==='ARROWLEFT'||k==='P'){e.preventDefault();go(B.idx-1)}
  else if(k==='M'){e.preventDefault();const id=B.qs[B.idx].id;S.flags[id]=!S.flags[id];if(!S.flags[id])delete S.flags[id];save();render()}
});
/* no Mac error beep: a plain key press outside a text box that the page doesn't use is swallowed (the app's web view beeps for unhandled keys) */
document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest&&e.target.closest('textarea,input,select,[contenteditable]'))return;
  if(e.key.length===1&&e.key!==' '||['Enter','ArrowLeft','ArrowRight','Backspace','Delete','Escape'].includes(e.key))e.preventDefault()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});

renderHome();
/* standalone copy: merge a saved backup file once (made from the claude.ai copy) */
if(QB.imp){const stamp='qbank-imported-'+(QB.imp.blocks||[]).length+'-'+Object.keys(QB.imp.hist||{}).length+'-'+JSON.stringify(QB.imp).length;
  let done=null;try{done=localStorage.getItem(stamp)}catch(e){}
  if(!done){try{const r=mergeProgress(QB.imp);try{localStorage.setItem(stamp,'1')}catch(e){}renderHome();modal('Progress imported',`Brought over <b>${r.added}</b> answers and <b>${r.nb}</b> tests from your claude.ai copy.`,[{label:'OK',cls:'pri'}])}catch(e){}}}
})();

/* neumorphic glass: pointer-follow highlight + shrink-on-scroll toolbars */
(function(){
  document.addEventListener('pointermove',function(e){var el=e.target.closest&&e.target.closest('.home.lg .card,.home.lg .kpi,.home.lg .akttile,.akt .grp,.akt .tiles div');
    if(!el)return;var r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true});
  document.addEventListener('scroll',function(e){var t=e.target;if(!t||!t.classList)return;
    if(t.classList.contains('home'))t.classList.toggle('scrolled',t.scrollTop>40)
    else if(t.classList.contains('akt'))t.classList.toggle('scrolled',t.scrollTop>40)},true);
})();
