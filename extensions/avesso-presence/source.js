const api=globalThis.browser||globalThis.chrome;
let lastSignature="";
let timer=null;

function text(sel){
  return document.querySelector(sel)?.textContent?.trim()||"";
}
function isPlayingMedia(){
  const media=[...document.querySelectorAll("audio,video")];
  return media.some(el=>!el.paused&&!el.ended&&el.readyState>=2);
}
function cleanTitle(value=""){
  return value
    .replace(/\s*[-|]\s*(YouTube|YouTube Music|Spotify|SoundCloud|Deezer|TIDAL|Apple Music)\s*$/i,"")
    .trim();
}
function detect(){
  const host=location.hostname.replace(/^www\./,"").toLowerCase();
  const url=location.href;
  let title="",artist="",source="";
  if(host.endsWith("youtube.com")||host==="youtu.be"){
    source=host.includes("music.youtube")?"YouTube Music":"YouTube";
    title=text("h1.ytd-watch-metadata yt-formatted-string")||text("ytmusic-player-bar .title")||cleanTitle(document.title);
    artist=text("#owner #channel-name a")||text("ytd-channel-name a")||text("ytmusic-player-bar .byline");
  }else if(host==="open.spotify.com"){
    source="Spotify";
    title=text('[data-testid="context-item-info-title"] a')||text('[data-testid="now-playing-widget"] a')||cleanTitle(document.title.split(" • ")[0]||document.title);
    const parts=document.title.split(" • ");
    artist=parts.length>1?cleanTitle(parts[1]):text('[data-testid="context-item-info-subtitles"] a');
  }else if(host==="soundcloud.com"){
    source="SoundCloud";
    title=text(".playbackSoundBadge__titleLink")||text(".playbackTimeline__soundTitle")||cleanTitle(document.title);
    artist=text(".playbackSoundBadge__lightLink")||text(".playbackTimeline__soundTitle a");
  }else if(host.endsWith("deezer.com")){
    source="Deezer";
    title=text('[data-testid="player_track_title"]')||cleanTitle(document.title);
    artist=text('[data-testid="player_artist"]');
  }else if(host==="listen.tidal.com"){
    source="TIDAL";
    title=text('[data-test="footer-track-title"]')||cleanTitle(document.title);
    artist=text('[data-test="footer-track-artist"]');
  }else if(host==="music.apple.com"){
    source="Apple Music";
    title=text(".lcd__marquee .marquee__text")||text('[data-testid="now-playing-title"]')||cleanTitle(document.title);
    artist=text(".lcd__sub-copy")||text('[data-testid="now-playing-artist"]');
  }
  const playing=isPlayingMedia()||Boolean(document.querySelector('[aria-label*="Pause"],[aria-label*="Pausar"],button[title*="Pause"],button[title*="Pausar"]'));
  if(!playing||!title)return null;
  return {title,artist,source,url,playing:true};
}
function send(){
  const payload=detect();
  const signature=JSON.stringify(payload||null);
  if(signature===lastSignature)return;
  lastSignature=signature;
  try{api.runtime.sendMessage({type:"AVESSO_SOURCE_STATE",payload});}catch{}
}
function schedule(){
  clearTimeout(timer);
  timer=setTimeout(send,250);
}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["title","aria-label","class"]});
document.addEventListener("play",schedule,true);
document.addEventListener("pause",schedule,true);
document.addEventListener("ended",schedule,true);
window.addEventListener("popstate",schedule);
setInterval(send,3500);
send();
