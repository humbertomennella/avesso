const PUBLIC_IMAGE_CACHE='avesso-public-images-v1';

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('avesso-public-images-')&&key!==PUBLIC_IMAGE_CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||self.registration.scope;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>client.url.startsWith(self.registration.scope));
    if(existing){
      await existing.focus();
      if('navigate' in existing&&existing.url!==target)await existing.navigate(target);
      return;
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});


self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.destination!=='image')return;
  const url=new URL(request.url);
  if(!url.pathname.includes('/storage/v1/object/public/'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(PUBLIC_IMAGE_CACHE);
    const cached=await cache.match(request);
    const network=fetch(request).then(async response=>{
      if(response&&(response.ok||response.type==='opaque'))await cache.put(request,response.clone());
      return response;
    }).catch(()=>null);
    if(cached){event.waitUntil(network);return cached;}
    return (await network)||Response.error();
  })());
});
