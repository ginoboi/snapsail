// SnapSail — app logic
const API = 'https://solene-128e0632.base44.app/functions/';
const ANIMALS = [
  ['🐬','dolphin'],['🦁','lion'],['🐼','panda'],['🦖','rex'],
  ['🐙','octo'],['🦜','parrot'],['🐯','tiger'],['🚀','rocket'],
  ['🐢','turtle'],['🦄','unicorn'],['🐳','whale'],['🦅','eagle']
];

/* ---------- store / helpers ---------- */
const LS = k => 'ss_' + k;
const store = {
  get(k, d){ try{ const v = localStorage.getItem(LS(k)); return v===null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ localStorage.setItem(LS(k), JSON.stringify(v)); }
};
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(window.Music) Music.screen(id);
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove('show'), 1800);
}
function sparkleBurst(){
  const chars = ['✨','💧','⭐','🌟'];
  for(let i=0;i<7;i++){
    const s = document.createElement('div');
    s.className = 'sparkle'; s.textContent = chars[Math.floor(Math.random()*chars.length)];
    s.style.left = (30+Math.random()*40)+'vw'; s.style.top = (40+Math.random()*30)+'vh';
    s.style.animation = 'sparkleUp '+(0.7+Math.random()*0.5)+'s ease-out forwards';
    document.body.appendChild(s); setTimeout(()=>s.remove(), 1300);
  }
}
function crewBadge(){
  const h = store.get('household','');
  if(!h) return '';
  const [animal, num] = h.split('-');
  const a = ANIMALS.find(x=>x[1]===animal);
  return (a?a[0]:'⚓') + '·' + (num||'?');
}

/* ---------- audio (synth music + sfx) ---------- */
const AudioSys = (()=>{
  let ctx=null, musicGain=null, sfxGain=null, timer=null, cur=null, step=0, nextT=0;
  let musicOn = store.get('music', true);
  const mf = m => 440 * Math.pow(2,(m-69)/12);
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.4 : 0;
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9;
      musicGain.connect(ctx.destination); sfxGain.connect(ctx.destination);
    }
    if(ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function pluck(t, midi, wave, dur, vol, dest){
    try{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = mf(midi);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
    }catch(e){}
  }
  const THEMES = {
    port:{ stepDur:60/84/4, len:16, fn(s,t){ // title: dreamy harbor
      const ch = s<8 ? [60,64,67,71,74] : [55,59,62,67,71];
      const arp=[0,2,4,3,2,4,3,1];
      pluck(t, ch[arp[s%8]], 'sine', 1.0, 0.28, musicGain);
      if(s%8===0) pluck(t, ch[0]-24, 'sine', 1.7, 0.14, musicGain);
      if(s%4===2) pluck(t, ch[arp[s%8]]+12, 'sine', 0.55, 0.07, musicGain);
    }},
    sail:{ stepDur:60/108/4, len:16, fn(s,t){ // play: upbeat sailing
      const chs=[[60,64,67],[59,62,67],[57,60,64],[62,65,69]];
      const ch = chs[Math.floor(s/4)];
      const arp=[0,1,2,1];
      pluck(t, ch[arp[s%4]], 'triangle', 0.26, 0.20, musicGain);
      if(s%2===0) pluck(t, ch[0]-24 + (s%8===4?7:0), 'sine', 0.24, 0.20, musicGain);
      if(s%4===2) pluck(t, ch[2]+12, 'sine', 0.2, 0.07, musicGain);
    }},
    calm:{ stepDur:60/96/4, len:16, fn(s,t){ // parent cove: gentle
      const ch = s<8 ? [60,64,67,71] : [53,57,60,65];
      const arp=[0,1,2,3,2,1,3,2];
      pluck(t, ch[arp[s%8]], 'triangle', 0.5, 0.20, musicGain);
      if(s%8===0) pluck(t, ch[0]-24, 'sine', 1.5, 0.13, musicGain);
    }}
  };
  function tick(){
    if(!cur || !ctx || !THEMES[cur]) return;
    const th = THEMES[cur];
    try{
      while(nextT < ctx.currentTime + 0.30){
        th.fn(step % th.len, nextT);
        nextT += th.stepDur; step++;
      }
    }catch(e){}
  }
  function play(name){
    if(!ensure() || !THEMES[name]) return;
    if(cur === name) return;
    cur = name; step = 0; nextT = ctx.currentTime + 0.06;
    if(!timer) timer = setInterval(tick, 100);
  }
  function screen(id){
    const map = {
      'screen-title':'port','screen-setup':'port','screen-home':'sail',
      'screen-quiz':'sail','screen-result':'sail',
      'screen-pin':'calm','screen-parent':'calm','screen-process':'calm','screen-review':'calm'
    };
    play(map[id] || 'sail');
  }
  function arm(){
    const once = ()=>{ ensure(); document.removeEventListener('pointerdown', once); };
    document.addEventListener('pointerdown', once);
  }
  function beep(midi, when, wave, dur, vol){
    if(!ensure()) return;
    try{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = mf(midi);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(sfxGain);
      o.start(when); o.stop(when + dur + 0.05);
    }catch(e){}
  }
  const SFX = {
    correct(){ const t = ctx?ctx.currentTime:0; beep(76,t,'triangle',0.14,0.45); beep(81,t+0.09,'triangle',0.16,0.45); beep(88,t+0.18,'sine',0.14,0.18); },
    wrong(){ if(!ensure()) return; const t=ctx.currentTime; const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(mf(60),t); o.frequency.exponentialRampToValueAtTime(mf(53),t+0.28);
      g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.22,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
      o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+0.35); },
    fanfare(){ const t = ctx?ctx.currentTime:0; [72,76,79,84].forEach((m,i)=>beep(m,t+i*0.11,'triangle',0.22,0.40)); beep(88,t+0.5,'sine',0.5,0.16); },
    blip(){ beep(79, ctx?ctx.currentTime:0, 'sine', 0.08, 0.18); },
    now(){ return ctx ? ctx.currentTime : 0; }
  };
  return { play, screen, arm, ensure, SFX, get musicOn(){ return musicOn; } };
})();
const SFX = AudioSys.SFX;
AudioSys.arm();

/* ---------- starter decks (built-in) ---------- */
const STARTER = [
  { id:'s1', icon:'🔢', title:'Set Sail Math', sub:'Add & subtract', questions:[
    {q:'7 + 5 = ?', choices:['12','11','13'], a:0},
    {q:'16 − 8 = ?', choices:['8','7','9'], a:0},
    {q:'9 + 9 = ?', choices:['18','17','19'], a:0},
    {q:'20 − 5 = ?', choices:['15','14','16'], a:0},
    {q:'34 + 25 = ?', choices:['59','58','69'], a:0},
    {q:'50 − 17 = ?', choices:['33','43','37'], a:0},
    {q:'Which is bigger: 68 or 86?', choices:['86','68','Same'], a:0},
    {q:'What comes next? 30, 40, 50, ___', choices:['60','55','70'], a:0},
    {q:'5 + ___ = 14', choices:['9','8','10'], a:0},
    {q:'25 + 25 = ?', choices:['50','45','55'], a:0}
  ]},
  { id:'s2', icon:'🌊', title:'Word Waves', sub:'Reading fun', questions:[
    {q:'Which word starts with "B"?', choices:['ball','fish','tree'], a:0},
    {q:'Which word rhymes with "cat"?', choices:['hat','dog','sun'], a:0},
    {q:'How many sounds (syllables) in "dinosaur"? 🦖', choices:['3','2','4'], a:0},
    {q:'Which word rhymes with "boat"? ⛵', choices:['goat','car','milk'], a:0},
    {q:'Which word starts with "S"?', choices:['sun','moon','star'], a:0},
    {q:'Fix it: "I ___ a big red ball."', choices:['have','has','am'], a:0},
    {q:'Which word rhymes with "sail"?', choices:['whale','wave','water'], a:0},
    {q:'The opposite of "big" is ___', choices:['small','tall','fast'], a:0},
    {q:'Which word rhymes with "shell"? 🐚', choices:['bell','fish','sand'], a:0},
    {q:'Which one is a fruit? 🍎', choices:['apple','carrot','bread'], a:0}
  ]},
  { id:'s3', icon:'⭐', title:'Count the Crew', sub:'Counting & times', questions:[
    {q:'Count the fish: 🐟🐟🐟🐟🐟🐟', choices:['6','5','7'], a:0},
    {q:'Count the stars: ⭐⭐⭐⭐⭐⭐⭐⭐', choices:['8','7','9'], a:0},
    {q:'2 × 4 = ?', choices:['8','6','10'], a:0},
    {q:'5 × 3 = ?', choices:['15','10','20'], a:0},
    {q:'10 × 6 = ?', choices:['60','16','50'], a:0},
    {q:'How many legs does a spider have? 🕷️', choices:['8','6','10'], a:0},
    {q:'Count the boats: ⛵⛵⛵', choices:['3','2','4'], a:0},
    {q:'2 × 7 = ?', choices:['14','12','16'], a:0},
    {q:'5 × 5 = ?', choices:['25','10','15'], a:0},
    {q:'How many sides does a square have? ⬜', choices:['4','3','5'], a:0}
  ]}
];

/* ---------- app flow ---------- */
let setupPick = {animal:null, num:null};
function startApp(){ go('screen-setup'); renderSetup(); }
function renderSetup(){
  const head = document.getElementById('setup-head');
  const sub = document.getElementById('setup-sub');
  const existing = store.get('household','');
  head.textContent = existing ? 'Welcome back, ' + crewBadge() : 'Pick your crew!';
  sub.textContent = 'Parents and players on different devices should pick the SAME animal and number.';
  const ag = document.getElementById('animal-grid');
  ag.innerHTML = '';
  ANIMALS.forEach(([emoji, word])=>{
    const b = document.createElement('button');
    b.className = 'animal' + (setupPick.animal===word?' on':'');
    b.innerHTML = emoji + '<span class="w">'+word+'</span>';
    b.onclick = ()=>{ setupPick.animal=word; renderSetup(); SFX.blip(); };
    ag.appendChild(b);
  });
  const nr = document.getElementById('num-row');
  nr.innerHTML = '';
  for(let i=1;i<=6;i++){
    const b = document.createElement('button');
    b.className = 'num' + (setupPick.num===i?' on':'');
    b.textContent = i;
    b.onclick = ()=>{ setupPick.num=i; renderSetup(); SFX.blip(); };
    nr.appendChild(b);
  }
  document.getElementById('setup-go').disabled = !(setupPick.animal && setupPick.num);
  document.getElementById('setup-go').textContent = (setupPick.animal && setupPick.num) ? 'Sail as ' + setupPick.animal + '-' + setupPick.num + ' →' : 'Continue →';
}
function finishSetup(){
  store.set('household', setupPick.animal + '-' + setupPick.num);
  go('screen-home'); loadKidDecks();
}
function renderCrewPills(){
  const badge = crewBadge();
  ['crew-quiz','crew-parent'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.textContent = badge;
  });
}

/* ---------- kid decks ---------- */
let kidDecks = [];
async function loadKidDecks(manual){
  renderCrewPills();
  document.getElementById('home-hello').innerHTML = 'Ahoy, crew ' + crewBadge() + '! ⚓<small>Tap a deck to set sail</small>';
  let remote = [];
  try{
    const r = await fetch(API + 'ssListDecks', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({household: store.get('household','')})});
    const j = await r.json();
    if(j.ok) remote = (j.decks||[]).map(d=>({id:'ws_'+d.id, icon:'📸', title:d.title, sub:'My worksheet', questions:d.questions}));
  }catch(e){ if(manual) toast('No internet — showing offline decks'); }
  kidDecks = [...remote, ...STARTER];
  const grid = document.getElementById('deck-grid');
  grid.innerHTML = '';
  const done = store.get('done',{});
  kidDecks.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'deckcard';
    b.innerHTML = '<div class="ic">'+d.icon+'</div><div class="nm">'+d.title+'</div><div class="sb">'+d.sub+' · '+d.questions.length+' questions</div><div class="star '+(done[d.id]?'won':'')+'">⭐</div>';
    b.onclick = ()=>startDeck(d);
    grid.appendChild(b);
  });
}

/* ---------- quiz engine ---------- */
const Q = { deck:null, i:0, correctFirst:0, lock:false };
function startDeck(deck){
  Q.deck = deck; Q.i = 0; Q.correctFirst = 0; Q.lock = false;
  document.getElementById('quiz-title').textContent = deck.title.slice(0,24);
  go('screen-quiz'); renderCrewPills(); renderQuestion();
}
function quitQuiz(){ try{ speechSynthesis.cancel(); }catch(e){} go('screen-home'); loadKidDecks(); }
function renderQuestion(){
  const qs = Q.deck.questions, q = qs[Q.i];
  Q.lock = false;
  document.getElementById('quiz-fill').style.width = (100*Q.i/qs.length)+'%';
  document.getElementById('quiz-count').textContent = (Q.i+1) + ' of ' + qs.length;
  document.getElementById('q-prompt').innerHTML = q.q;
  const box = document.getElementById('q-choices');
  box.className = 'qchoices' + (q.choices.length===2 ? ' two' : '');
  box.innerHTML = '';
  const order = q.choices.map((c,i)=>({c,i}));
  for(let k=order.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [order[k],order[j]]=[order[j],order[k]]; }
  order.forEach(({c,i})=>{
    const b = document.createElement('button');
    b.className = 'qchoice'; b.textContent = c;
    b.onclick = ()=>answer(i, b);
    box.appendChild(b);
  });
}
function answer(i, btn){
  if(Q.lock) return; Q.lock = true;
  const q = Q.deck.questions[Q.i];
  const all = document.querySelectorAll('.qchoice');
  all.forEach(b=>b.classList.add('dis'));
  if(i === q.a){
    btn.classList.add('ok'); Q.correctFirst++; SFX.correct(); sparkleBurst();
    setTimeout(next, 900);
  } else {
    btn.classList.add('no'); SFX.wrong(); all[q.a].classList.add('ok');
    setTimeout(next, 1400);
  }
}
function next(){
  Q.i++;
  if(Q.i >= Q.deck.questions.length) finishDeck();
  else renderQuestion();
}
function finishDeck(){
  const id = Q.deck.id;
  const done = store.get('done',{});
  const first = !done[id];
  done[id] = true; store.set('done', done);
  const perfect = Q.correctFirst === Q.deck.questions.length;
  document.getElementById('result-star').textContent = perfect ? '🌟' : '⭐';
  document.getElementById('result-msg').textContent = perfect ? 'PERFECT VOYAGE!' : 'Great voyage!';
  document.getElementById('result-sub').textContent = Q.correctFirst + ' of ' + Q.deck.questions.length + ' right on the first try';
  SFX.fanfare();
  go('screen-result');
}
function readAloud(){
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(document.getElementById('q-prompt').textContent);
    u.rate = 0.85; speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- parent ---------- */
let pin = '', pinMode = 'enter', reviewDeck = null;
function openParent(){
  renderCrewPills();
  pinMode = store.get('parent_pin','') ? 'enter' : 'create';
  document.getElementById('pin-head').textContent = pinMode==='create' ? 'Create a parent PIN' : 'Enter parent PIN';
  pin = ''; renderPin(); go('screen-pin');
}
function renderPin(){
  const dots = document.getElementById('pin-dots');
  dots.innerHTML = '';
  for(let i=0;i<4;i++){
    const d = document.createElement('div');
    d.className = 'pdot' + (i<pin.length?' on':'');
    dots.appendChild(d);
  }
  const pad = document.getElementById('keypad');
  pad.innerHTML = '';
  ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(k=>{
    const b = document.createElement('button');
    b.className='key'; b.textContent=k;
    b.onclick = ()=>{
      SFX.blip();
      if(k==='⌫'){ pin = pin.slice(0,-1); renderPin(); return; }
      if(k==='✓'){ checkPin(); return; }
      if(pin.length<4){ pin += k; renderPin(); if(pin.length===4) setTimeout(checkPin,250); }
    };
    pad.appendChild(b);
  });
}
function checkPin(){
  const msg = document.getElementById('pin-msg');
  if(pinMode==='create'){
    if(pin.length===4){ store.set('parent_pin', pin); enterParent(); }
    else { msg.textContent = 'PIN must be 4 digits'; pin=''; renderPin(); }
  } else {
    if(pin === store.get('parent_pin','')){ enterParent(); }
    else {
      msg.textContent = 'Wrong PIN. Try again!';
      document.getElementById('pin-dots').classList.add('shake');
      setTimeout(()=>document.getElementById('pin-dots').classList.remove('shake'),400);
      pin=''; setTimeout(renderPin,350);
    }
  }
}
function enterParent(){
  document.getElementById('pin-msg').textContent = '';
  document.getElementById('crew-parent').textContent = crewBadge();
  document.getElementById('code-display').textContent = store.get('household','');
  go('screen-parent'); loadParentDecks();
}
async function loadParentDecks(){
  const box = document.getElementById('parent-decks');
  box.innerHTML = '<div class="tiny-note" style="margin-top:6px">Loading...</div>';
  try{
    const r = await fetch(API+'ssListDecks', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({household:store.get('household',''),all:true})});
    const j = await r.json();
    box.innerHTML = '';
    if(!j.ok || !(j.decks||[]).length){ box.innerHTML = '<div class="tiny-note" style="margin-top:6px">No worksheets yet. Snap one! 📷</div>'; return; }
    j.decks.forEach(d=>{
      const row = document.createElement('div');
      row.className = 'rowdeck';
      row.innerHTML = '<div class="ic">📸</div><div class="nm">'+d.title+'<br><span class="statuschip '+d.status+'">'+d.status.toUpperCase()+'</span></div>';
      if(d.status!=='published'){
        const btn = document.createElement('button');
        btn.className='minibtn'; btn.textContent='✅ Review';
        btn.onclick = ()=>openReview(d.id);
        row.appendChild(btn);
      }
      box.appendChild(row);
    });
  }catch(e){ box.innerHTML = '<div class="tiny-note" style="margin-top:6px">No internet connection</div>'; }
}
async function openReview(id){
  try{
    const r = await fetch(API+'ssGetDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    const j = await r.json();
    if(!j.ok){ toast('Could not load deck'); return; }
    reviewDeck = j.deck;
    reviewDeck._keep = j.deck.questions.map(()=>true);
    renderReview();
    go('screen-review');
  }catch(e){ toast('No internet connection'); }
}
function renderReview(){
  const slot = document.getElementById('review-demo-slot');
  slot.innerHTML = reviewDeck.demo ? '<div class="demobadge">🤖 DEMO QUESTIONS — AI vision unavailable right now</div>' : '';
  const img = document.getElementById('review-img');
  img.src = reviewDeck.image || '';
  img.style.display = reviewDeck.image ? 'block' : 'none';
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  reviewDeck.questions.forEach((q,i)=>{
    const item = document.createElement('div');
    item.className = 'reviewitem' + (reviewDeck._keep[i]?'':' off');
    item.innerHTML = '<div class="q">'+(i+1)+'. '+q.q+'</div><div class="ans">✅ Answer: '+q.choices[q.a]+'</div>';
    item.onclick = ()=>{ reviewDeck._keep[i] = !reviewDeck._keep[i]; renderReview(); SFX.blip(); };
    list.appendChild(item);
  });
}
async function publishReview(){
  const kept = reviewDeck.questions.filter((q,i)=>reviewDeck._keep[i]);
  if(!kept.length){ toast('Keep at least one question!'); return; }
  try{
    await fetch(API+'ssPublishDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:reviewDeck.id, questions:kept})});
    SFX.fanfare(); sparkleBurst();
    toast('Published! Your player can sail it now 🎉');
    go('screen-parent'); loadParentDecks();
  }catch(e){ toast('No internet connection'); }
}
function discardReview(){ go('screen-parent'); loadParentDecks(); }

/* ---------- camera snap flow ---------- */
document.getElementById('snap-input').addEventListener('change', async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  go('screen-process');
  try{
    const b64 = await downscale(file);
    const r = await fetch(API+'ssProcessWorksheet', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({household: store.get('household',''), title:'My Worksheet', imageB64: b64})
    });
    const j = await r.json();
    if(!j.ok){ toast('Oops: ' + (j.error||'failed')); go('screen-parent'); return; }
    reviewDeck = { id: j.id, title: j.title, image: j.imageUrl, questions: j.questions, demo: j.demo, _keep: j.questions.map(()=>true) };
    renderReview(); go('screen-review');
  }catch(e){ toast('Upload failed — check internet'); go('screen-parent'); }
});
function downscale(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const rd = new FileReader();
    rd.onload = ()=>{ img.src = rd.result; };
    rd.onerror = reject;
    img.onload = ()=>{
      const max = 1000;
      const scale = Math.min(1, max/Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*scale); c.height = Math.round(img.height*scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.62).split(',')[1]);
    };
    rd.readAsDataURL(file);
  });
}

/* ---------- boot ---------- */
(function boot(){
  if(store.get('household','')){ go('screen-home'); loadKidDecks(); }
})();
