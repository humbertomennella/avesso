# ROADMAP — MUNDO DO AVESSO

> Objetivo: transformar o AVESSO de rede social funcional em um mundo digital persistente sem sacrificar clareza, segurança e conversa.

## Estado atual do Sprint 1

- [x] Preferências de participação `observer / world / chaos`
- [x] Tabelas de personagens e diálogos
- [x] Tabelas de eventos e configuração global
- [x] ALGO ativo como primeiro habitante funcional
- [x] Falas contextuais de ALGO no feed e no Canto
- [x] Kill switch global de interferências
- [x] Atualizações de configuração via Realtime
- [ ] Interface administrativa dedicada para eventos
- [ ] Motor automático de despacho de eventos

O modo `chaos` já pode ser escolhido, mas as interferências visuais permanecem globalmente desligadas até o motor de 404 existir. A ideia é simples: primeiro colocamos a porta. Depois entregamos a chave ao pior morador possível.

---

## Fase 0 — Estabilizar a base

Antes de adicionar caos intencional, eliminar caos acidental.

### Entregas

- revisar autenticação;
- revisar confirmação de e-mail;
- revisar URLs do Supabase;
- revisar RLS;
- revisar moderação;
- revisar painel administrativo;
- corrigir bugs de layout e mídia;
- criar observabilidade;
- criar logs de erro;
- definir ambiente de staging.

### Saída

Rede funcional e previsível.

Só depois merece um personagem especializado em quebrar coisas.

---

## Fase 1 — Fundação do mundo

### Entregas

- Bíblia do Mundo;
- Protocolo de Interferência;
- personagens canônicos;
- mapa conceitual;
- sistema visual de regiões;
- regras de humor;
- regras de quarta parede;
- catálogo inicial de falas;
- inventário de referências culturais permitidas.

### Resultado

Todo recurso novo passa a ter uma lógica narrativa.

---

## Fase 2 — Identidade dentro do produto

### Implementar

- cabeçalho AVESSO.SYS;
- indicadores de região;
- Canto do usuário;
- Praça Central;
- presença visual do Núcleo;
- microfalas de ALGO;
- pequenas aparições da Pessoa que Lê Tudo;
- fim explícito do feed.

### Meta

O usuário deve perceber que entrou em outro lugar antes mesmo de acontecer um evento.

---

## Fase 3 — Personagens vivos

### Primeiro: ALGO

É o mais seguro para estrear porque explica o feed sem alterar conteúdo.

### Segundo: NPC

Traz narrativa social.

### Terceiro: 404

Só entra depois do Protocolo de Interferência estar testado.

### Quarto: Pessoa que Lê Tudo

Aprofunda a quebra da quarta parede.

### Quinto: Rei do Engajamento

Serve para temporadas e campanhas.

---

## Fase 4 — Interference Engine v1

### Backend

Criar:

- characters;
- world_events;
- user_world_preferences;
- interventions;
- world_logs;
- character_dialogues.

### Edge Functions

- dispatch-world-event;
- dismiss-intervention;
- world-event-cron;
- admin-world-control.

### Front-end

- renderer de intervenção;
- preferências de participação;
- indicação de personagem;
- expiração;
- reduzir animação;
- restauração visual.

### Segurança

- RLS;
- service role somente no backend;
- logs;
- kill switch.

---

## Fase 5 — 404 Beta

Grupo pequeno de usuários.

### Testes

- o usuário entende que é brincadeira?
- a intervenção é reversível?
- a frequência é tolerável?
- funciona no mobile?
- respeita acessibilidade?
- confunde com bug real?
- aumenta denúncias?

### Intervenções liberadas

- stamp;
- annotation;
- dialog;
- character_visit.

Sem skins complexas inicialmente.

---

## Fase 6 — A Grande Pane

Primeiro evento global.

### Narrativa

O sistema começa a apresentar sinais estranhos.

ALGO culpa instabilidade.

404 nega.

NPC perdeu algo.

Rei do Engajamento tenta lucrar.

Pessoa que Lê Tudo comenta que isso obviamente é um evento de lançamento.

### Marketing conectado

Campanha externa:

**popularidade.exe parou de funcionar**

Anúncios parecem erros de sistema.

No site, o mundo começa a apresentar pequenas panes.

Quem entra encontra a história acontecendo.

Marketing e produto viram a mesma narrativa.

---

## Fase 7 — Regiões navegáveis

Criar mapa 2D leve.

### Regiões iniciais

- Praça Central;
- O Canto;
- Beco 404;
- Oficina do ALGO;
- Torre do Engajamento;
- Arquivo Morto.

A navegação não deve ser obrigatória.

O feed continua acessível por atalho.

---

## Fase 8 — Memória do mundo

Eventos passados deixam vestígios.

### Implementar

- Arquivo Morto;
- souvenirs cosméticos;
- logs narrativos;
- mural histórico;
- diálogos que reconhecem eventos anteriores.

Evitar sistema de raridade competitivo.

Memória, não status.

---

## Fase 9 — Comunidade como parte do cânone

Permitir propostas de:

- placas;
- frases;
- pequenos easter eggs;
- nomes de ruas;
- eventos;
- histórias.

Curadoria editorial obrigatória.

Não transformar lore em enquete infinita.

---

## Fase 10 — IA controlada

Somente depois da biblioteca de eventos e da segurança estarem maduras.

### Uso possível

- variação de diálogos;
- síntese de acontecimentos públicos;
- personagem respondendo a contexto explícito;
- geração de alternativas de roteiro para revisão humana.

### Não usar para

- ler mensagens privadas sem necessidade;
- inferir saúde mental;
- escolher alvo vulnerável;
- imitar usuário;
- criar punição;
- moderar sozinho.

---

# Prioridade imediata

## Sprint 1

1. estabilizar a base atual;
2. adicionar preferências de participação no mundo;
3. criar tabelas de personagens e eventos;
4. inserir ALGO como primeiro personagem;
5. mostrar falas contextuais no feed;
6. criar controle administrativo para ligar/desligar eventos;
7. implementar kill switch.

## Sprint 2

1. criar Canto;
2. criar Praça Central;
3. inserir NPC;
4. character visits;
5. catálogo de diálogos;
6. Realtime de eventos.

## Sprint 3

1. Interference Engine;
2. inserir 404;
3. stamp + annotation + dialog;
4. cooldown;
5. beta fechado.

## Sprint 4

1. A Grande Pane;
2. campanha de lançamento;
3. integração marketing/produto;
4. métricas saudáveis;
5. revisão pública.

---

# Definição de pronto

O Mundo do AVESSO estará realmente vivo quando:

- usuários reconhecerem personagens pelo comportamento, não apenas pelo desenho;
- personagens influenciarem a interface de forma coerente;
- eventos acontecerem sem deploy manual;
- o mundo lembrar acontecimentos passados;
- a rede continuar utilizável sem participar da narrativa;
- o caos for divertido, não confuso;
- a experiência continuar fazendo sentido sem uma única métrica de popularidade.

A meta não é gamificar amizade.

É fazer a rede parecer habitada.
