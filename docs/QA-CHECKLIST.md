# Checklist de homologação — AVESSO

Use esta lista depois de mudanças visuais, de autenticação ou de cache. A meta é simples: evitar que uma correção em uma tela ressuscite um bug em outra.

## Autenticação

- [ ] Abrir cadastro pelo CTA "criar meu canto".
- [ ] Alternar para **Entrar** e confirmar que nome/@ desaparecem.
- [ ] Alternar de volta para **Criar conta** e confirmar que nome/@ reaparecem.
- [ ] Login válido entra no app e fecha o diálogo.
- [ ] Login inválido mostra mensagem sem travar o formulário.
- [ ] Mostrar/ocultar senha funciona.
- [ ] Teclado virtual não cobre o botão principal no celular.

## Mobile

Testar em pelo menos 360×800, 390×844 e 412×915.

- [ ] Nenhum overflow horizontal na landing, login, feed, perfil, Praça ou mensagens.
- [ ] Barra inferior permanece acessível e respeita safe area.
- [ ] Stories mantêm proporção e podem ser fechados.
- [ ] Composer abre/fecha sem ficar preso atrás do teclado.
- [ ] Chat minimiza, fecha e volta sem duplicar janelas.
- [ ] Notificações e menus não ficam atrás da navegação.
- [ ] Upload de imagem/vídeo não estoura a viewport.

## Desktop

Testar em 1366×768, 1440×900 e 1920×1080.

- [ ] Sidebar aberta e recolhida não cortam conteúdo.
- [ ] Barra de comandos não invade o feed.
- [ ] Painel direito some/reorganiza corretamente em larguras intermediárias.
- [ ] Conversas minimizadas não cobrem notificações.
- [ ] Modais cabem na altura da tela e continuam roláveis.
- [ ] Stories e visualizadores mantêm proporção.

## PWA / cache

- [ ] Abrir uma sessão antiga e confirmar que a atualização nova é recebida.
- [ ] Recarregar após deploy e confirmar que CSS/JS não ficam misturados entre versões.
- [ ] Abrir offline uma vez após o shell ter sido armazenado.
- [ ] Voltar online e confirmar sincronização sem reload infinito.

## Regressão crítica

- [ ] `main` passa pelo workflow **Publicar AVESSO / verify** antes do deploy.
- [ ] Não existem IDs duplicados no `index.html`.
- [ ] Qualquer novo `querySelector(...).forEach` falha no CI.
- [ ] `polish.js` e `polish.css` continuam presentes no shell offline enquanto essa camada existir.

## Critério para chamar de estável

Uma versão só sai de beta quando os fluxos acima passarem em desktop e mobile sem correção emergencial entre uma rodada e outra. Recurso novo não compensa fluxo básico quebrado. A internet já tentou essa estratégia o suficiente.
