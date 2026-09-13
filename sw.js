const CACHE = "snapsail-v4";
const ASSETS = ["./", "index.html", "app.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "assets/boat-mascot.png", "assets/bg-title.jpg", "assets/bg-map.jpg", "assets/bg-quiz.jpg", "assets/bg-result.jpg", "assets/bg-cove.jpg", "assets/crew/dolphin.jpg", "assets/crew/eagle.jpg", "assets/crew/lion.jpg", "assets/crew/octo.jpg", "assets/crew/panda.jpg", "assets/crew/parrot.jpg", "assets/crew/rex.jpg", "assets/crew/rocket.jpg", "assets/crew/tiger.jpg", "assets/crew/turtle.jpg", "assets/crew/unicorn.jpg", "assets/crew/whale.jpg", "assets/icons/anchor.jpg", "assets/icons/camera.jpg", "assets/icons/check.jpg", "assets/icons/deck-count.jpg", "assets/icons/deck-math.jpg", "assets/icons/deck-words.jpg", "assets/icons/deck-worksheet.jpg", "assets/icons/lock.jpg", "assets/icons/parent.jpg", "assets/icons/refresh.jpg", "assets/icons/sparkle.jpg", "assets/icons/speaker.jpg", "assets/icons/star.jpg", "assets/icons/trash.jpg", "assets/art/apple.jpg", "assets/art/boat.jpg", "assets/art/fish.jpg", "assets/art/starfish.jpg", "assets/music/cove.mp3", "assets/music/harbor.mp3", "assets/music/sail.mp3"];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(a=>new Request(a,{cache:"reload"})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;
  // app shell: network-first so updates always reach the device
  const shell = url.pathname.endsWith("/snapsail/") || url.pathname.endsWith("index.html") || url.pathname.endsWith("app.js");
  if(shell){
    e.respondWith(
      fetch(e.request).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match("./")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match("./")))
  );
});
