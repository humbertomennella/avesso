const api=globalThis.browser||globalThis.chrome;
let timer=null;

function text(sel){
  return document.querySelector(sel)?.textContent?.trim()||"";
}
function cleanTitle(value=""){
  return String(value||"")
    .replace(/\s*[-|]\s*(YouTube|YouTube Music|Spotify|SoundCloud|Deezer|TIDAL|Apple Music)\s*$/i,"")
    .trim();
}
function isPlayingMedia(){
  return [...document.querySelectorAll("audio,video")]
    .some(el=>!el.paused&&!el.ended&&el.readyState>=2&&Number(el.volume)!==0);
}
function explicitPlayingControl(){
  return Boolean(document.querySelector(
    '[aria-label="Pause"],[aria-label="Pausar"],[data-testid="control-button-pause"],button[title="Pause"],button[title="Pausar"]'
  ));
}
function detect(){
  const host=location.hostname.replace(/^www\./,"").toLowerCase();
  const url=location.href;
  let title="",artist="",source="";

  if(host.endsWith("youtube.com")||host==="youtu.be"){
    const music=host.includes("music.youtube");
    source=music?"YouTube Music":"YouTube";
    title=music
      ?text("ytmusic-player-bar .title")||text("ytmusic-player-bar .title yt-formatted-string")||cleanTitle(document.title)
      :text("h1.ytd-watch-metadata yt-formatted-string")||text("h1.title yt-formatted-string")||cleanTitle(document.title);
    artist=music
      ?text("ytmusic-player-bar .byline a")||text("ytmusic-player-bar .byline")
      :text("#owner #channel-name a")||text("ytd-channel-name a");
  }else if(host==="open.spotify.com"){
    source="Spotify";
    title=text('[data-testid="context-item-info-title"] a')
      ||text('[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]')
      ||cleanTitle(document.title.split(" • ")[0]||document.title);
    artist=text('[data-testid="context-item-info-subtitles"] a')
      ||text('[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitles"] a');
    if(!artist){
      const parts=document.title.split(" • ");
      artist=parts.length>1?cleanTitle(parts[1]):"";
    }
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
    title=text('[data-testid="now-playing-title"]')||text(".lcd__marquee .marquee__text")||cleanTitle(document.title);
    artist=text('[data-testid="now-playing-artist"]')||text(".lcd__sub-copy");
  }

  const playing=isPlayingMedia()||explicitPlayingControl();
  if(!playing||!title)return null;
  return {
    title:cleanTitle(title).slice(0,180),
    artist:cleanTitle(artist.replace(/\s*[•·]\s*.*$/,"")).slice(0,180),
    source,
    url,
    playing:true
  };
}
function send(){
  try{api.runtime.sendMessage({type:"AVESSO_SOURCE_STATE",payload:detect()});}catch{}
}
function schedule(){
  clearTimeout(timer);
  timer=setTimeout(send,120);
}

new MutationObserver(schedule).observe(document.documentElement,{
  subtree:true,
  childList:true,
  characterData:true,
  attributes:true,
  attributeFilter:["title","aria-label","class","data-testid"]
});
document.addEventListener("play",schedule,true);
document.addEventListener("pause",schedule,true);
document.addEventListener("ended",schedule,true);
window.addEventListener("popstate",schedule);
window.addEventListener("hashchange",schedule);
setInterval(send,2000);
send();
