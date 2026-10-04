import './runtime-hotfix.js';
import './story-media-compat.js';
import './avesso-ui.js';
import './polish.js';
import './release-controller.js';

export const SUPABASE_URL = 'https://uibhdikfgjnzljhuflxx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nME0uwUxx1egQflDxtjGoA_j4MIDb7h';

// Carregados de forma assincrona depois que este modulo termina de avaliar,
// evitando ciclos de importacao e mantendo economia/mercado fora do caminho critico.
queueMicrotask(()=>{
  import('./economy-shadow.js').catch(error=>console.debug('AVESSO economia shadow não carregou',error?.message||error));
  import('./market-center.js?v=20261004-market1').catch(error=>console.debug('AVESSO mercado não carregou',error?.message||error));
});
