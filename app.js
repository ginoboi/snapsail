// SnapSail — app logic (v2: watercolor art, music loops, batch snap, 4-digit crew codes)
const API = 'https://solene-128e0632.base44.app/functions/';
const A = 'assets/';
const ANIMALS = [
  ['dolphin','Dolphin'],['lion','Lion'],['panda','Panda'],['rex','Rex'],
  ['octo','Octo'],['parrot','Parrot'],['tiger','Tiger'],['rocket','Rocket'],
  ['turtle','Turtle'],['unicorn','Unicorn'],['whale','Whale'],['eagle','Eagle']
];
const ART = { fish:A+'art/fish.jpg', starfish:A+'art/starfish.jpg', boat:A+'art/boat.jpg', apple:A+'art/apple.jpg' };
const DECKICON = { math:A+'icons/deck-math.jpg', words:A+'icons/deck-words.jpg', count:A+'icons/deck-count.jpg', worksheet:A+'icons/deck-worksheet.jpg' };

/* ---------- store / helpers ---------- */
const LS = k => 'ss_' + k;
const store = {
  get(k, d){ try{ const v = localStorage.getItem(LS(k)); return v===null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ localStorage.setItem(LS(k), JSON.stringify(v)); }
};
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  Music.screen(id);
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove('show'), 2200);
}
function sparkleBurst(){
  const srcs = [A+'icons/sparkle.jpg', A+'icons/star.jpg'];
  for(let i=0;i<7;i++){
    const s = document.createElement('img');
    s.className = 'sparkle'; s.src = srcs[Math.floor(Math.random()*srcs.length)];
    s.style.left = (30+Math.random()*40)+'vw'; s.style.top = (40+Math.random()*30)+'vh';
    s.style.animation = 'sparkleUp '+(0.7+Math.random()*0.5)+'s ease-out forwards';
    document.body.appendChild(s); setTimeout(()=>s.remove(), 1300);
  }
}
function crewImg(word){ return A+'crew/'+word+'.jpg'; }
function crewBadgeHTML(){
  const h = store.get('household','');
  if(!h) return '';
  const [animal, num] = h.split('-');
  return '<img src="'+crewImg(animal)+'">'+num;
}
function renderCrewPills(){
  const badge = crewBadgeHTML();
  ['crew-quiz','crew-parent'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.innerHTML = badge;
  });
}

/* ---------- audio: music loops (real instruments) + synth SFX ---------- */
const Music = (()=>{
  const els = {
    harbor: document.getElementById('mus-harbor'),
    sail: document.getElementById('mus-sail'),
    cove: document.getElementById('mus-cove')
  };
  let cur = null, started = false;
  Object.values(els).forEach(a=>{ a.volume = 0.5; });
  function play(name){
    if(!els[name]) return;
    if(cur === name && !els[name].paused) return;
    Object.values(els).forEach(a=>{ if(a !== els[name]) a.pause(); });
    cur = name;
    els[name].play().catch(()=>{});
  }
  function screen(id){
    const map = {
      'screen-title':'harbor','screen-setup':'harbor','screen-home':'sail',
      'screen-quiz':'sail','screen-result':'sail',
      'screen-pin':'cove','screen-parent':'cove','screen-process':'cove','screen-review':'cove','screen-batch':'cove'
    };
    play(map[id] || 'sail');
  }
  function arm(){
    const once = ()=>{
      if(!started){ started = true; screen(document.querySelector('.screen.active')?.id || 'screen-title'); }
      else if(cur && els[cur].paused){ els[cur].play().catch(()=>{}); }
    };
    document.addEventListener('pointerdown', once);
  }
  return { play, screen, arm };
})();
Music.arm();

const AudioSys = (()=>{ // SFX synth only
  let ctx=null, sfxGain=null;
  const mf = m => 440 * Math.pow(2,(m-69)/12);
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9;
      sfxGain.connect(ctx.destination);
    }
    if(ctx.state === 'suspended') ctx.resume();
    return true;
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
  return {
    ensure,
    blip(){ beep(79, ensure()?ctx.currentTime:0, 'sine', 0.08, 0.18); },
    correct(){ const t = ensure()?ctx.currentTime:0; beep(76,t,'triangle',0.14,0.45); beep(81,t+0.09,'triangle',0.16,0.45); beep(88,t+0.18,'sine',0.14,0.18); },
    wrong(){ if(!ensure()) return; const t=ctx.currentTime; const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(mf(60),t); o.frequency.exponentialRampToValueAtTime(mf(53),t+0.28);
      g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.22,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
      o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+0.35); },
    fanfare(){ const t = ensure()?ctx.currentTime:0; [72,76,79,84].forEach((m,i)=>beep(m,t+i*0.11,'triangle',0.22,0.40)); beep(88,t+0.5,'sine',0.5,0.16); }
  };
})();
const SFX = AudioSys;

/* ---------- starter decks (built-in) ---------- */
const STARTER = [
  { id:'s1', icon:DECKICON.math, title:'Set Sail Math', sub:'Add & subtract', questions:[
    {q:'7 + 5 = ?', choices:['12','11','13'], a:0},
    {q:'16 - 8 = ?', choices:['8','7','9'], a:0},
    {q:'9 + 9 = ?', choices:['18','17','19'], a:0},
    {q:'20 - 5 = ?', choices:['15','14','16'], a:0},
    {q:'34 + 25 = ?', choices:['59','58','69'], a:0},
    {q:'50 - 17 = ?', choices:['33','43','37'], a:0},
    {q:'Which is bigger: 68 or 86?', choices:['86','68','Same'], a:0},
    {q:'What comes next? 30, 40, 50, ___', choices:['60','55','70'], a:0},
    {q:'5 + ___ = 14', choices:['9','8','10'], a:0},
    {q:'25 + 25 = ?', choices:['50','45','55'], a:0}
  ]},
  { id:'s2', icon:DECKICON.words, title:'Word Waves', sub:'Reading fun', questions:[
    {q:'Which word starts with "B"?', choices:['ball','fish','tree'], a:0},
    {q:'Which word rhymes with "cat"?', choices:['hat','dog','sun'], a:0},
    {q:'How many sounds (syllables) in "dinosaur"?', choices:['3','2','4'], a:0},
    {q:'Which word rhymes with "boat"?', choices:['goat','car','milk'], a:0},
    {q:'Which word starts with "S"?', choices:['sun','moon','lamp'], a:0},
    {q:'Finish it: "I ___ a big red ball."', choices:['have','has','am'], a:0},
    {q:'Which word rhymes with "sail"?', choices:['whale','wave','car'], a:0},
    {q:'The opposite of "big" is ___', choices:['small','tall','fast'], a:0},
    {q:'Which word rhymes with "shell"?', choices:['bell','fish','sand'], a:0},
    {q:'Which one is a fruit?', choices:['apple','carrot','bread'], a:0}
  ]},
  { id:'s3', icon:DECKICON.count, title:'Count the Crew', sub:'Counting & times', questions:[
    {q:'How many fish do you see?', img:'fish', n:6, choices:['6','5','7'], a:0},
    {q:'How many starfish do you see?', img:'starfish', n:8, choices:['8','7','9'], a:0},
    {q:'How many little boats do you see?', img:'boat', n:3, choices:['3','2','4'], a:0},
    {q:'How many apples do you see?', img:'apple', n:5, choices:['5','4','6'], a:0},
    {q:'2 x 4 = ?', choices:['8','6','10'], a:0},
    {q:'5 x 3 = ?', choices:['15','10','20'], a:0},
    {q:'10 x 6 = ?', choices:['60','16','50'], a:0},
    {q:'How many legs does a spider have?', choices:['8','6','10'], a:0},
    {q:'2 x 7 = ?', choices:['14','12','16'], a:0},
    {q:'How many sides does a square have?', choices:['4','3','5'], a:0}
  ]}
];

/* ---------- setup (animal + 4-digit code) ---------- */
let setupPick = {animal:null, digits:''};
function startApp(){ go('screen-setup'); renderSetup(); }
function renderSetup(){
  const ag = document.getElementById('animal-grid');
  ag.innerHTML = '';
  ANIMALS.forEach(([word,label])=>{
    const b = document.createElement('button');
    b.className = 'animal' + (setupPick.animal===word?' on':'');
    b.innerHTML = '<img src="'+crewImg(word)+'"><span class="w">'+label+'</span>';
    b.onclick = ()=>{ setupPick.animal=word; renderSetup(); SFX.blip(); };
    ag.appendChild(b);
  });
  const cb = document.getElementById('code-box');
  cb.innerHTML = '';
  for(let i=0;i<4;i++){
    const d = document.createElement('div');
    d.className = 'codedigit';
    d.textContent = setupPick.digits[i] || '';
    cb.appendChild(d);
  }
  const nr = document.getElementById('num-row');
  nr.innerHTML = '';
  [1,2,3,4,5,6,7,8,9,0].forEach(n=>{
    const b = document.createElement('button');
    b.className='num'; b.textContent=n;
    b.onclick = ()=>{ if(setupPick.digits.length<4){ setupPick.digits += n; renderSetup(); SFX.blip(); } };
    nr.appendChild(b);
  });
  const del = document.createElement('button');
  del.className='num fn'; del.textContent='Del';
  del.onclick = ()=>{ setupPick.digits = setupPick.digits.slice(0,-1); renderSetup(); };
  nr.appendChild(del);
  const ready = setupPick.animal && setupPick.digits.length===4;
  const btn = document.getElementById('setup-go');
  btn.disabled = !ready;
  btn.innerHTML = ready ? 'Sail as '+setupPick.animal+' '+setupPick.digits+' →' : 'Continue';
}
function genCode(){
  setupPick.digits = String(Math.floor(1000 + Math.random()*9000));
  renderSetup(); SFX.blip();
}
function finishSetup(){
  store.set('household', setupPick.animal + '-' + setupPick.digits);
  go('screen-home'); loadKidDecks();
}

/* ---------- kid decks ---------- */
let kidDecks = [];
async function loadKidDecks(manual){
  renderCrewPills();
  const [animal, num] = (store.get('household','')||'-').split('-');
  document.getElementById('home-hello').innerHTML =
    '<img src="'+crewImg(animal)+'"><div>Ahoy, crew '+num+'!<small>Tap a deck to set sail</small></div>';
  let remote = [];
  try{
    const r = await fetch(API + 'ssListDecks', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({household: store.get('household','')})});
    const j = await r.json();
    if(j.ok) remote = (j.decks||[]).map(d=>({id:'ws_'+d.id, icon:DECKICON.worksheet, title:d.title, sub:'My worksheet', questions:d.questions}));
  }catch(e){ if(manual) toast('No internet — showing offline decks'); }
  kidDecks = [...remote, ...STARTER];
  const grid = document.getElementById('deck-grid');
  grid.innerHTML = '';
  const done = store.get('done',{});
  kidDecks.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'deckcard';
    b.innerHTML = '<img class="ic" src="'+d.icon+'"><div class="nm">'+d.title+'</div><div class="sb">'+d.sub+' · '+d.questions.length+' questions</div><img class="star '+(done[d.id]?'won':'')+'" src="'+A+'icons/star.jpg">';
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
  document.getElementById('q-prompt').textContent = q.q;
  const art = document.getElementById('q-art');
  art.innerHTML = '';
  if(q.img && q.n && ART[q.img]){
    for(let k=0;k<q.n;k++){
      const im = document.createElement('img');
      im.src = ART[q.img];
      art.appendChild(im);
    }
  }
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
  done[id] = true; store.set('done', done);
  const perfect = Q.correctFirst === Q.deck.questions.length;
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
  ['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach(k=>{
    const b = document.createElement('button');
    b.className='key'; b.textContent=k;
    b.onclick = ()=>{
      SFX.blip();
      if(k==='⌫'){ pin = pin.slice(0,-1); renderPin(); return; }
      if(k==='OK'){ checkPin(); return; }
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
  document.getElementById('crew-parent').innerHTML = crewBadgeHTML();
  const sw = document.getElementById('merge-switch');
  if(store.get('merge', true)) sw.classList.add('on'); else sw.classList.remove('on');
  document.getElementById('code-display').textContent = store.get('household','');
  go('screen-parent'); loadParentDecks();
}
function toggleMerge(){
  const sw = document.getElementById('merge-switch');
  const on = !sw.classList.contains('on');
  sw.classList.toggle('on', on);
  store.set('merge', on);
  SFX.blip();
}
async function loadParentDecks(){
  const box = document.getElementById('parent-decks');
  box.innerHTML = '<div class="tiny-note" style="margin-top:6px">Loading...</div>';
  try{
    const r = await fetch(API+'ssListDecks', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({household:store.get('household',''),all:true})});
    const j = await r.json();
    box.innerHTML = '';
    if(!j.ok || !(j.decks||[]).length){ box.innerHTML = '<div class="tiny-note" style="margin-top:6px">No worksheets yet. Snap one!</div>'; return; }
    j.decks.forEach(d=>{
      const row = document.createElement('div');
      row.className = 'rowdeck';
      row.innerHTML = '<img class="ic" src="'+DECKICON.worksheet+'"><div class="nm">'+d.title+'<br><span class="statuschip '+d.status+'">'+d.status.toUpperCase()+'</span></div>';
      if(d.status!=='published'){
        const btn = document.createElement('button');
        btn.className='minibtn'; btn.innerHTML = '<img src="'+A+'icons/check.jpg">Review';
        btn.onclick = ()=>openReview({ids:[d.id], title:d.title});
        row.appendChild(btn);
      }
      box.appendChild(row);
    });
  }catch(e){ box.innerHTML = '<div class="tiny-note" style="margin-top:6px">No internet connection</div>'; }
}
async function fetchDeck(id){
  const r = await fetch(API+'ssGetDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
  const j = await r.json();
  if(!j.ok) throw new Error(j.error||'failed');
  return j.deck;
}


async function openReview(partial){
  try{
    const deck = await fetchDeck(partial.ids[0]);
    reviewDeck = { ids: partial.ids, title: deck.title||partial.title, image: deck.image, demo: false, questions: deck.questions, _keep: deck.questions.map(()=>true) };
    document.getElementById('review-title').textContent = 'Check the questions';
    renderReview(); go('screen-review');
  }catch(e){ toast('Could not load deck'); }
}
function backFromReview(){
  reviewDeck = null; batch.items = []; batch.separate = null;
  go('screen-parent'); loadParentDecks();
}

/* ---------- batch snap flow ---------- */
let batch = { items: [], busy: false };  // items: {imgB64, status:'queued|work|done|fail', deckId}
document.getElementById('snap-input').addEventListener('change', async (ev)=>{
  const files = [...ev.target.files];
  ev.target.value = '';
  if(!files.length) return;
  const first = !batch.items.length;
  for(const f of files){
    if(batch.items.length >= 8) { toast('Max 8 pages per batch'); break; }
    try{ batch.items.push({imgB64: await downscale(f), status:'queued', deckId:null}); }
    catch(e){ toast('Could not read one photo'); }
  }
  if(batch.items.length){ renderBatch(); if(first) go('screen-batch'); }
});
function renderBatch(){
  const box = document.getElementById('batch-thumbs');
  box.innerHTML = '';
  batch.items.forEach((it, idx)=>{
    const t = document.createElement('div');
    t.className = 'thumb';
    const stMap = {queued:'', work:'work', done:'done', fail:'fail'};
    const stTxt = {queued:'waiting', work:'reading...', done:'ready', fail:'failed - tap retry'};
    t.innerHTML = '<img class="ph" src="data:image/jpeg;base64,'+it.imgB64+'"><div class="st '+stMap[it.status]+'">'+stTxt[it.status]+'</div>';
    if(!batch.busy && it.status!=='done'){
      const del = document.createElement('button');
      del.className='del'; del.textContent='X';
      del.onclick = ()=>{ batch.items.splice(idx,1); renderBatch(); };
      t.appendChild(del);
    }
    if(it.status==='fail' && !batch.busy){
      t.onclick = ()=>{ it.status='queued'; retryOne(it); };
    }
    box.appendChild(t);
  });
  const pending = batch.items.filter(i=>i.status==='queued'||i.status==='fail').length;
  document.getElementById('process-all-btn').disabled = batch.busy || !pending;
  document.getElementById('batch-mode-note').textContent =
    'Batch mode: ' + (store.get('merge', true) ? 'ONE merged deck' : 'separate deck per page');
  document.getElementById('batch-title').textContent = batch.items.length===1 ? 'Your page' : 'Your '+batch.items.length+' pages';
}
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
async function processPage(item){
  item.status = 'work'; renderBatch();
  try{
    const r = await fetch(API+'ssProcessWorksheet', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({household: store.get('household',''), title:'My Worksheet', imageB64: item.imgB64})
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error);
    item.status = 'done'; item.deckId = j.id; item.title = j.title; item.questions = j.questions; item.demo = j.demo; item.imageUrl = j.imageUrl;
  }catch(e){
    item.status = 'fail';
  }
  renderBatch();
}
async function retryOne(item){
  go('screen-process');
  document.getElementById('process-txt').textContent = 'Captain AI is reading your page...';
  await processPage(item);
  go('screen-batch');
}
async function processAll(){
  if(batch.busy) return;
  const todo = batch.items.filter(i=>i.status==='queued'||i.status==='fail');
  if(!todo.length) return;
  batch.busy = true; go('screen-process');
  document.getElementById('process-txt').textContent = 'Captain AI is reading your '+todo.length+' pages...';
  for(const it of todo){ await processPage(it); }   // sequential: one at a time
  batch.busy = false;
  const ok = batch.items.filter(i=>i.status==='done');
  if(!ok.length){ toast('All pages failed — check internet'); go('screen-batch'); return; }
  if(store.get('merge', true)){
    // merge all done pages into one review
    reviewDeck = {
      ids: ok.map(i=>i.deckId),
      title: ok[0].title,
      image: ok[0].imageUrl,
      demo: ok.some(i=>i.demo),
      questions: ok.flatMap(i=>i.questions).slice(0, 24),
      _keep: ok.flatMap(i=>i.questions).slice(0, 24).map(()=>true)
    };
    document.getElementById('review-title').textContent = 'Merged deck ('+reviewDeck.questions.length+' questions)';
    batch.items = [];
    renderReview(); go('screen-review');
  } else {
    // separate decks: review each page one by one
    batch.separate = ok;
    batch.cursor = 0;
    nextSeparateReview();
  }
}
async function nextSeparateReview(){
  if(batch.cursor >= batch.separate.length){
    batch.items = []; toast('All pages published!'); go('screen-parent'); loadParentDecks(); return;
  }
  const it = batch.separate[batch.cursor];
  document.getElementById('review-title').textContent = 'Page '+(batch.cursor+1)+' of '+batch.separate.length;
  reviewDeck = { ids:[it.deckId], title:it.title, image:it.imageUrl, demo:it.demo, questions:it.questions, _keep:it.questions.map(()=>true) };
  renderReview(); go('screen-review');
}
function renderReview(){
  const slot = document.getElementById('review-demo-slot');
  slot.innerHTML = reviewDeck.demo ? '<div class="demobadge">DEMO QUESTIONS — AI vision unavailable right now</div>' : '';
  const img = document.getElementById('review-img');
  if(reviewDeck.image){ img.src = reviewDeck.image; img.style.display = 'block'; }
  else { img.removeAttribute('src'); img.style.display = 'none'; }
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  reviewDeck.questions.forEach((q,i)=>{
    const item = document.createElement('div');
    item.className = 'reviewitem' + (reviewDeck._keep[i]?'':' off');
    item.innerHTML = '<div class="q">'+(i+1)+'. '+q.q+'</div><div class="ans"><img src="'+A+'icons/check.jpg">Answer: '+q.choices[q.a]+'</div>';
    item.onclick = ()=>{ reviewDeck._keep[i] = !reviewDeck._keep[i]; renderReview(); SFX.blip(); };
    list.appendChild(item);
  });
}
async function publishReview(){
  const kept = reviewDeck.questions.filter((q,i)=>reviewDeck._keep[i]);
  if(!kept.length){ toast('Keep at least one question!'); return; }
  try{
    const primary = reviewDeck.ids[0];
    await fetch(API+'ssPublishDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:primary, questions:kept, title:reviewDeck.title})});
    // merged batch: clean up the extra decks we absorbed
    for(const extraId of reviewDeck.ids.slice(1)){
      fetch(API+'ssDeleteDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:extraId})}).catch(()=>{});
    }
    SFX.fanfare(); sparkleBurst();
    if(store.get('merge', true) || !batch.separate){
      toast('Published! Your player can sail it now');
      reviewDeck = null; go('screen-parent'); loadParentDecks();
    } else {
      toast('Page published!');
      batch.cursor++;
      reviewDeck = null;
      nextSeparateReview();
    }
  }catch(e){ toast('Publish failed — check internet'); }
}
async function discardReview(){
  // in separate mode mid-queue, discard just moves to next page; otherwise bin the whole thing
  if(!store.get('merge', true) && batch.separate && reviewDeck && reviewDeck.ids.length===1 && batch.cursor < batch.separate.length){
    try{ await fetch(API+'ssDeleteDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:reviewDeck.ids[0]})}); }catch(e){}
    batch.cursor++; reviewDeck = null; nextSeparateReview(); return;
  }
  if(reviewDeck){
    for(const id of reviewDeck.ids){
      try{ await fetch(API+'ssDeleteDeck', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); }catch(e){}
    }
  }
  reviewDeck = null; batch.items = [];
  go('screen-parent'); loadParentDecks();
}

/* ---------- boot ---------- */
(function boot(){
  if(store.get('household','')){ go('screen-home'); loadKidDecks(); }
})();
