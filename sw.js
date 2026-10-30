/* DIQA PWA service worker: no permanent background tasks and no GPS access. */
const DIQA_CACHE='diqa-pwa-shell-v20261030-custom-logo-v3';
const DIQA_SHELL=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(DIQA_CACHE).then(cache=>cache.addAll(DIQA_SHELL)).catch(err=>{
    console.warn('DIQA: offline shell cache unavailable',err);
  }));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('diqa-pwa-shell-')&&k!==DIQA_CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
/* Network-first prevents stale dispatch data; offline cached login shell is NOT an active connection. */
self.addEventListener('fetch',event=>{
  const req=event.request, url=new URL(req.url);
  if(req.mode==='navigate' && url.origin===self.location.origin && url.pathname.startsWith(new URL('./',self.registration.scope).pathname)){
    event.respondWith(fetch(req).catch(async()=>{
      const cache=await caches.open(DIQA_CACHE);
      return await cache.match('./index.html')||Response.error();
    }));
  }
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data ? event.data.json():{};}catch(e){data={};}
  // Server must have sent a real encrypted Web Push request to this subscription.
  const title='رسالة جديدة — الدقّة';
  const body=typeof data.body==='string'?data.body.slice(0,160):'وصلك إشعار جديد في نظام الدقّة';
  const opts={body,icon:'./icon-192.png',badge:'./icon-192.png',tag:'diqa-team-message',renotify:true,
    data:{url:new URL('./',self.registration.scope).href}};
  event.waitUntil(self.registration.showNotification(title,opts));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const home=new URL('./',self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    const found=clients.find(c=>{try{return new URL(c.url).origin===self.location.origin;}catch(e){return false;}});
    if(found){await found.focus();return;}
    return self.clients.openWindow(home);
  }));
});
