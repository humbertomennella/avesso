import './runtime-hotfix.js';
import './story-media-compat.js';
import './avesso-ui.js';
import './polish.js';
import './release-controller.js';

export const SUPABASE_URL = 'https://uibhdikfgjnzljhuflxx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nME0uwUxx1egQflDxtjGoA_j4MIDb7h';

// Carregado de forma assíncrona depois que este módulo termina de avaliar,
// evitando ciclo de importação e mantendo a economia shadow fora do caminho crítico.
queueMicrotask(()=>{
  import('./economy-shadow.js').catch(error=>console.debug('AVESSO economia shadow não carregou',error?.message||error));
});
