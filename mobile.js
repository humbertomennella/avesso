/* AVESSO mobile integration 2026-10-01 */
(() => {
  const MOBILE_QUERY = '(max-width: 820px)';
  const root = document.documentElement;
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  function syncVisualViewport(){
    const vv = window.visualViewport;
    const height = vv?.height || window.innerHeight;
    root.style.setProperty('--avesso-visual-height', height + 'px');

    if(!isMobile()){
      root.classList.remove('avesso-keyboard-open');
      return;
    }

    const active = document.activeElement;
    const editing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    const viewportShrunk = vv ? vv.height < window.innerHeight * 0.78 : false;
    root.classList.toggle('avesso-keyboard-open', editing && viewportShrunk);
  }

  function centerActiveNav(instant = false){
    if(!isMobile()) return;
    const active = document.querySelector('.app-nav nav button.active');
    if(!active) return;
    requestAnimationFrame(() => {
      try{
        active.scrollIntoView({
          behavior: instant ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }catch{
        active.scrollIntoView();
      }
    });
  }

  function bindNavObserver(){
    const nav = document.querySelector('.app-nav nav');
    if(!nav) return;
    const observer = new MutationObserver(mutations => {
      if(mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')){
        centerActiveNav(false);
      }
    });
    observer.observe(nav, {subtree:true, attributes:true, attributeFilter:['class']});
  }

  document.addEventListener('click', event => {
    if(event.target.closest('[data-app-tab]')){
      setTimeout(() => centerActiveNav(false), 0);
    }
  }, {passive:true});

  document.addEventListener('focusin', syncVisualViewport);
  document.addEventListener('focusout', () => setTimeout(syncVisualViewport, 120));

  window.addEventListener('resize', () => {
    syncVisualViewport();
    centerActiveNav(true);
  }, {passive:true});

  window.visualViewport?.addEventListener('resize', syncVisualViewport, {passive:true});
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, {passive:true});

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      syncVisualViewport();
      bindNavObserver();
      centerActiveNav(true);
    }, {once:true});
  }else{
    syncVisualViewport();
    bindNavObserver();
    centerActiveNav(true);
  }
})();
