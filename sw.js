const PUBLIC_IMAGE_CACHE='avesso-public-images-v2';
const SHELL_CACHE='avesso-shell-v24';
const SHELL_ASSETS=[
  './',
  './index.html',
  './styles.css',
  './mobile.css',
  './mobile-ux.css',
  './experience.css',
  './desktop-ux.css',
  './app.js',
  './desktop-ux.js',
  './mobile.js',
  './mobile-ux.js',
  './config.js',
  './gif-library.js',
  './manifest.webmanifest',
  './assets/avesso-app-icon.svg'
];

async function fetchFresh(request){
  try{
    return await fetch(new Request(request,{cache:'no-store'}));
  }catch{
    return fetch(request);
  }
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{
    const cache=await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_ASSETS.map(async asset=>{
      try{
        const request=new Request(asset,{cache:'reload'});
        const response=await fetch(request);
        if(response?.ok)await cache.put(request,response.clone());
      }catch{}
    }));
  }catch{}
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>
    (key.startsWith('avesso-public-images-')&&key!==PUBLIC_IMAGE_CACHE)||
    (key.startsWith('avesso-shell-')&&key!==SHELL_CACHE)
  ).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload={};
    try{payload=event.data?.json?.()||{};}catch{
      try{payload={body:event.data?.text?.()||''};}catch{}
    }
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const visible=windows.some(client=>client.visibilityState==='visible'&&client.focused!==false);
    if(visible){
      windows.forEach(client=>client.postMessage?.({type:'AVESSO_PUSH_WHILE_VISIBLE',payload}));
      return;
    }
    const title=payload.title||'AVESSO';
    let targetUrl=payload.url||self.registration.scope;
    if(!payload.url&&payload.target?.type&&payload.target?.id){
      try{
        const target=new URL(self.registration.scope);
        target.searchParams.set('open',String(payload.target.type));
        target.searchParams.set('id',String(payload.target.id));
        targetUrl=target.href;
      }catch{}
    }
    const options={
      body:payload.body||'Algo aconteceu no seu Canto.',
      icon:payload.icon||new URL('assets/avatars/robo-01.svg',self.registration.scope).href,
      badge:payload.badge||new URL('assets/avatars/robo-01.svg',self.registration.scope).href,
      tag:String(payload.tag||payload.dedupeKey||'avesso-social').slice(0,180),
      renotify:true,
      silent:false,
      vibrate:[90,45,90],
      data:{url:targetUrl,kind:payload.kind||'interaction',target:payload.target||null}
    };
    await self.registration.showNotification(title,options);
  })());
});

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
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(request.destination==='image'&&url.pathname.includes('/storage/v1/object/public/')){
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
    return;
  }

  const sameOrigin=url.origin===self.location.origin;
  const inScope=url.href.startsWith(self.registration.scope);
  const shellRequest=sameOrigin&&inScope&&(
    request.mode==='navigate'||
    ['script','style','manifest','font'].includes(request.destination)
  );
  if(!shellRequest)return;

  event.respondWith((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    try{
      const response=await fetchFresh(request);
      if(response?.ok)await cache.put(request,response.clone());
      return response;
    }catch{
      return (await cache.match(request,{ignoreSearch:true}))||
        (request.mode==='navigate'?await cache.match('./index.html',{ignoreSearch:true}):null)||
        Response.error();
    }
  })());
});