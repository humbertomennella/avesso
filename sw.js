self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

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
