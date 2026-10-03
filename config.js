// Compatibilidade temporária para um erro legado em app.js:
// duas chamadas usam querySelector(...).forEach(...) em vez de querySelectorAll.
// Como config.js é importado antes do corpo de app.js, este shim impede o boot de
// quebrar e mantém as duas abas de autenticação operacionais até a correção
// estrutural do seletor ser consolidada no bundle principal.
if (typeof Element !== 'undefined' && typeof Element.prototype.forEach !== 'function') {
  Object.defineProperty(Element.prototype, 'forEach', {
    configurable: true,
    writable: true,
    value(callback, thisArg) {
      const nodes = this.matches?.('[data-auth-mode]')
        ? document.querySelectorAll('[data-auth-mode]')
        : [this];
      return Array.from(nodes).forEach(callback, thisArg);
    }
  });
}

export const SUPABASE_URL = 'https://uibhdikfgjnzljhuflxx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nME0uwUxx1egQflDxtjGoA_j4MIDb7h';
