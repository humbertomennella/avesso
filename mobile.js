/* AVESSO mobile integration 2026-10-01 */
(() => {
  const MOBILE_QUERY = '(max-width: 820px)';
  const root = document.documentElement;
  const media = window.matchMedia(MOBILE_QUERY);
  const isMobile = () => media.matches;

  let appNav = null;
  let navAnchor = null;
  let navObserver = null;
  let appObserver = null;

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

  function syncAppVisibility(){
    if(!appNav) return;
    const app = document.querySelector('#app-view');
    appNav.classList.toggle('mobile-nav-suppressed', !!app?.classList.contains('hidden'));
  }

  function mountMobileNav(){
    const original = appNav || document.querySelector('.app-nav nav');
    if(!original) return;

    appNav = original;

    if(!navAnchor && appNav.parentNode){
      navAnchor = document.createComment('avesso-mobile-nav-anchor');
      appNav.parentNode.insertBefore(navAnchor, appNav);
    }

    if(isMobile()){
      if(appNav.parentNode !== document.body) document.body.appendChild(appNav);
      appNav.classList.add('avesso-mobile-nav');
      syncAppVisibility();
    }else{
      appNav.classList.remove('avesso-mobile-nav','mobile-nav-suppressed');
      if(navAnchor?.parentNode && appNav.parentNode !== navAnchor.parentNode){
        navAnchor.parentNode.insertBefore(appNav, navAnchor.nextSibling);
      }
    }
  }

  function centerActiveNav(instant = false){
    if(!isMobile()) return;
    const active = document.querySelector('.avesso-mobile-nav button.active, .app-nav nav button.active');
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
    if(!appNav || navObserver) return;
    navObserver = new MutationObserver(mutations => {
      if(mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')){
        centerActiveNav(false);
      }
    });
    navObserver.observe(appNav, {subtree:true, attributes:true, attributeFilter:['class']});
  }

  function bindAppObserver(){
    const app = document.querySelector('#app-view');
    if(!app || appObserver) return;
    appObserver = new MutationObserver(() => {
      syncAppVisibility();
      if(!app.classList.contains('hidden')) centerActiveNav(true);
    });
    appObserver.observe(app, {attributes:true, attributeFilter:['class']});
  }

  function syncMobileUi(){
    mountMobileNav();
    syncVisualViewport();
    syncAppVisibility();
    centerActiveNav(true);
  }

  document.addEventListener('click', event => {
    if(event.target.closest('[data-app-tab]')){
      setTimeout(() => centerActiveNav(false), 0);
    }
  }, {passive:true});

  document.addEventListener('focusin', syncVisualViewport);
  document.addEventListener('focusout', () => setTimeout(syncVisualViewport, 120));

  window.addEventListener('resize', syncMobileUi, {passive:true});
  media.addEventListener?.('change', syncMobileUi);
  window.visualViewport?.addEventListener('resize', syncVisualViewport, {passive:true});
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, {passive:true});

  function boot(){
    mountMobileNav();
    bindNavObserver();
    bindAppObserver();
    syncMobileUi();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
