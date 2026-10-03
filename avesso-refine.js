// AVESSO visual refinement bootstrap 2026-10-03
(() => {
  if(document.querySelector('link[data-avesso-refine]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('./avesso-refine.css?v=20261003-v2',import.meta.url).href;
  link.dataset.avessoRefine='20261003-v2';
  document.head.appendChild(link);
  document.documentElement.dataset.avessoRefine='20261003-v2';
})();
