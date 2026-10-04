# AVESSO — Economia de Saldo e Recompensas v1.1

Status: validação econômica e especificação final antes da Etapa A de banco.

Este documento complementa `ECONOMIA_AVESSO_V1.md`. Ele registra as simulações, correções e critérios de aceite definidos antes de qualquer mudança em produção.

## 1. Conclusão da revisão

A arquitetura da v1 está aprovada como base, com ajustes de calibração.

A economia não deve premiar tempo de tela como objetivo principal. Presença continua valendo AV$, porque isso faz parte da proposta original, mas convivência, criação e participação diversa devem pesar mais.

Decisões finais desta revisão:

- AV$ continua sendo a unidade interna;
- Pulso AVESSO continua limitado a x1,15;
- não existe ranking público de saldo;
- reações e curtidas não geram AV$;
- repost/`Virar` não gera recompensa de publicação;
- presença econômica é separada do status social;
- saldo só é alterado por funções de banco, nunca pelo navegador;
- limite global recorrente continua em 180 AV$/dia;
- o limite global é aplicado depois do Pulso;
- bônus únicos, backfill, reversões e ajustes administrativos ficam fora do limite diário recorrente.

## 2. Matriz final v1.1

| Regra | Valor base | Limite da regra | Observação |
| --- | ---: | ---: | --- |
| Presença ativa | +5 AV$ / 30 min | 30 AV$/dia | máximo econômico de 3 horas/dia |
| Post original | +20 AV$ | 60 AV$/dia | até 3 posts elegíveis |
| Bônus de mídia | +10 AV$ | 20 AV$/dia | até 2 posts com mídia |
| Resposta qualificada | +6 AV$ | 36 AV$/dia | até 6 conversas elegíveis |
| Story | +10 AV$ | 20 AV$/dia | até 2 stories |
| Recado no Canto | +8 AV$ | 24 AV$/dia | até 3 destinatários distintos |
| Sessão na Praça | +12 AV$ | 24 AV$/dia | até 2 sessões sociais |
| Conversa direta qualificada | +10 AV$ | 20 AV$/dia | até 2 pares distintos |

Mudança principal em relação à v1: presença caiu de 5 AV$ a cada 20 minutos para 5 AV$ a cada 30 minutos; Praça passou de 10 para 12 AV$ por sessão qualificada.

## 3. Pulso AVESSO definitivo

Janela móvel: últimos 7 dias.

- Pulso 1 — x1,00: padrão;
- Pulso 2 — x1,05: 3 dias válidos + 3 categorias;
- Pulso 3 — x1,10: 5 dias válidos + 4 categorias;
- Pulso 4 — x1,15: 6 dias válidos + 5 categorias.

O Pulso:

- é recalculado no servidor;
- não depende de horário exato de login;
- não pune ausência;
- nunca mostra mensagens do tipo "você perdeu sua sequência";
- aplica-se somente a recompensas recorrentes marcadas como elegíveis;
- usa `floor(valor_base * multiplicador)` por transação;
- é aplicado antes do limite global de 180 AV$/dia.

A intenção é reconhecer consistência, não fabricar ansiedade de streak.

## 4. Simulação de emissão

Simulação determinística usando a matriz v1.1.

### Casual

3 dias ativos/semana; 30 min de presença, 1 post e 2 respostas por dia ativo.

Resultado aproximado: **111 AV$/semana**.

### Regular

4 dias; 1 h de presença, 1 post, mídia ocasional, 3 respostas, 1 story, 1 recado e uma conversa direta.

Resultado aproximado com Pulso 2 e bônus: **400 AV$/semana**.

### Ativo

5 dias; 1h30 de presença, 2 posts, participação em várias superfícies, Praça e DM.

Resultado aproximado com Pulso 3: **750 AV$/semana**.

### Muito ativo

6 dias atingindo diversas regras e parte dos limites diários.

Resultado aproximado: **1.160 AV$/semana**.

### Teto teórico recorrente

7 dias atingindo o teto global de 180 AV$/dia + maior bônus semanal:

**1.340 AV$/semana**.

Isso é o máximo normal antes de bônus únicos ou eventos especiais.

## 5. Faixas-alvo de emissão

Após a simulação, as metas ficam:

- casual: 80–250 AV$/semana;
- regular: 300–500 AV$/semana;
- ativo: 600–850 AV$/semana;
- muito ativo: 900–1.200 AV$/semana;
- teto recorrente absoluto: 1.340 AV$/semana.

Se o modo sombra produzir medianas significativamente acima dessas faixas, os valores devem ser recalibrados antes de qualquer ativação pública.

## 6. Presença econômica

A presença precisa ser resistente a múltiplas abas e à aba esquecida.

### Heartbeat econômico

O cliente poderá chamar uma RPC específica, mas nunca enviará quantidade de segundos a creditar.

A função usa somente:

- `auth.uid()`;
- horário do servidor;
- último heartbeat econômico registrado;
- estado da sessão econômica;
- limites internos.

O delta entre heartbeats é calculado no servidor e limitado. O cliente não pode pedir "me dê 30 minutos".

### Requisitos para o navegador sinalizar presença

- documento visível;
- usuário autenticado;
- interação humana recente na interface;
- sessão não suspensa;
- aba líder do usuário.

### Múltiplas abas

No front-end deverá existir eleição de uma aba líder via Web Locks API quando disponível, com fallback por BroadcastChannel/localStorage.

O banco também impede dupla contagem por usuário, portanto burlar a eleição local não duplica recompensa.

### Privacidade

`online`, `away` e `invisible` não participam do cálculo econômico. Um usuário invisível continua podendo acumular presença qualificada.

## 7. Post elegível

Gera +20 AV$ quando:

- é um post novo criado pelo usuário;
- passou pelas regras normais de publicação;
- não é reshare/`Virar`;
- ainda não existe transação para o `post_id`;
- a conta não está suspensa.

Post com mídia recebe +10 AV$ adicional se ainda houver cota de mídia no dia.

`Virar`, repost ou republicação automática não gera AV$ de criação.

## 8. Resposta qualificada

Uma resposta só recebe +6 AV$ quando:

- pertence a uma conversa/post real;
- o autor não é também o autor do post em um fluxo artificial de auto-resposta;
- aquela combinação usuário + post ainda não foi recompensada nas últimas 24 horas;
- o conteúdo não é duplicata recente do próprio usuário;
- existe cota diária.

Máximo: seis respostas remuneradas por dia.

Responder vinte vezes no mesmo post pode ser uma conversa ótima, mas não vira impressora de AV$.

## 9. Story elegível

- máximo de dois stories remunerados por dia;
- texto, imagem ou vídeo podem valer igualmente;
- apagar e republicar não cria nova recompensa para o mesmo `story_id`;
- conteúdo removido por moderação por spam pode gerar reversão.

## 10. Recado elegível

+8 AV$ quando:

- destinatário é outro usuário;
- amizade/relação exigida pela regra atual do Canto é válida;
- máximo de um recado recompensado por destinatário por dia;
- máximo de três destinatários remunerados por dia;
- conteúdo duplicado recente não é elegível.

## 11. Praça qualificada

A Praça é social, portanto vale mais que presença passiva.

Uma sessão rende +12 AV$ quando, dentro de pelo menos 15 minutos:

- usuário permaneceu ativo na Praça;
- enviou no mínimo três mensagens válidas;
- pelo menos outro usuário real participou da mesma janela;
- houve atividade dos dois lados, não apenas presença silenciosa do segundo usuário;
- mensagens idênticas/repetitivas são ignoradas;
- aquela sessão ainda não foi paga.

Máximo: duas sessões por dia.

Nunca existe pagamento por mensagem individual.

## 12. Conversa direta qualificada

Uma conversa direta rende +10 AV$ quando:

- amizade está aceita;
- os dois usuários enviaram mensagens;
- existe troca real dos dois lados dentro da janela;
- o par ainda não foi recompensado naquele dia;
- não existe bloqueio;
- nenhum participante está suspenso.

Máximo: dois pares distintos por dia.

O saldo do outro usuário nunca é revelado.

## 13. Bônus de identidade

Mantidos:

- primeiro avatar: +20 AV$;
- primeira bio válida: +15 AV$;
- primeiro wallpaper: +10 AV$;
- primeira música do Canto: +25 AV$;
- primeira foto do álbum: +15 AV$;
- primeiro recado válido: +10 AV$.

Cada bônus usa chave permanente de conquista. Trocar, apagar e refazer não paga novamente.

## 14. Bônus de diversidade

Janela móvel de 7 dias, não semana de calendário.

### Semana Presente

+40 AV$ ao atingir:

- atividade em 4 dias distintos;
- pelo menos 3 superfícies sociais.

### Semana do Avesso

+80 AV$ ao atingir:

- atividade em 6 dias distintos;
- pelo menos 4 superfícies sociais.

O usuário recebe somente o maior bônus da janela correspondente.

A chave de recompensa impede pagamento repetido da mesma janela.

## 15. O que não gera AV$

- reação/curtida;
- reação recebida;
- número de seguidores/amigos;
- abrir uma tela;
- refresh;
- navegação entre abas;
- `Virar`/repost;
- pedido de amizade enviado;
- mensagem isolada de Praça;
- mensagem isolada de DM;
- ações de habitantes/NPC/automação;
- ações executadas por staff em nome de outro usuário;
- apagar e recriar uma configuração já premiada.

## 16. Proteção contra farming

### Idempotência

A chave deve ser única por usuário e evento.

Recomendação de banco:

`unique(user_id, idempotency_key)`

### Limites

Existem três camadas:

1. limite do evento;
2. limite da regra por dia;
3. limite recorrente global de 180 AV$/dia.

### Conteúdo repetido

Para regras sociais remuneradas, manter fingerprint normalizado recente do conteúdo. O fingerprint é sinal antifraude, não critério editorial.

### Auto-interação

Eventos que dependem de outra pessoa não podem ser satisfeitos pelo próprio usuário.

### Moderação

Conteúdo removido como spam/fraude pode produzir transação de reversão ligada à transação original. Nunca editar ou apagar o ledger.

### Exclusão rápida

Post/recado criado e apagado em janela muito curta pode ser marcado para reversão automática. A implementação deve iniciar com **10 minutos** e ser observada no modo sombra antes da ativação pública.

## 17. Ledger e invariantes

`avesso_wallet_ledger.amount` deve ser assinado:

- ganho: positivo;
- gasto: negativo;
- transferência de saída: negativo;
- transferência de entrada: positivo;
- reversão: sinal oposto à transação original.

Invariantes obrigatórios:

- `wallet.balance = sum(ledger.amount)` do usuário;
- `lifetime_earned` soma somente entradas classificadas como ganho;
- `lifetime_spent` soma valores absolutos de gastos;
- saldo nunca fica negativo;
- uma transação financeira nunca é atualizada ou apagada;
- correções são novas transações.

## 18. Segurança da função de recompensa

A função financeira interna deve:

- usar `SECURITY DEFINER`;
- definir `search_path` explicitamente;
- não confiar em `user_id` fornecido pelo navegador;
- bloquear execução pública direta quando não for uma RPC deliberadamente exposta;
- usar lock transacional/linha da carteira para evitar corrida;
- verificar suspensão;
- verificar regra ativa;
- verificar idempotência;
- verificar limite diário;
- verificar limite global;
- aplicar Pulso;
- gravar ledger e carteira atomicamente.

Triggers de domínio continuam sendo a forma preferida de recompensa para post, story, resposta e recado.

## 19. RPC de presença

A presença é exceção porque depende de sinal do navegador.

A RPC pública autenticada de heartbeat:

- não recebe `user_id`;
- não recebe `seconds`;
- não recebe `reward_amount`;
- utiliza `auth.uid()`;
- registra somente o horário do servidor;
- limita o delta máximo aceito entre heartbeats;
- acumula segundos qualificados;
- concede bloco somente quando o limiar de 30 minutos é atingido;
- respeita 30 AV$/dia.

A RPC é incapaz de conceder AV$ arbitrários mesmo se chamada manualmente no console.

## 20. Backfill

Mantido: +20 AV$ por post histórico elegível.

Regras adicionais:

- backfill executado uma única vez;
- não conta no limite diário;
- não recebe Pulso;
- cada post usa `legacy_post_backfill:<post_id>`;
- resultado total deve ser auditado antes de liberar Mercado/Trade;
- a execução precisa emitir relatório com usuários, número de posts e total creditado.

Como a AVESSO ainda está em fase inicial, não será aplicado teto ao backfill nesta primeira versão. Se os dados reais mostrarem concentração absurda, a regra volta para revisão antes da execução.

## 21. Observabilidade econômica

Antes da ativação pública precisamos conseguir responder:

- quanto AV$ foi emitido hoje;
- quanto foi emitido por regra;
- mediana e P95 de ganho por usuário ativo;
- quantos usuários bateram o teto diário;
- quantas tentativas foram rejeitadas por idempotência/cap;
- quantas reversões ocorreram;
- divergência entre carteira e ledger;
- distribuição por Pulso.

Criar consultas/views administrativas. Não expor métricas individuais de saldo entre usuários.

## 22. Critérios de aprovação do modo sombra

A economia só avança para a interface owner/admin quando houver:

- zero duplicação conhecida de idempotency key;
- zero carteira negativa;
- soma da carteira consistente com o ledger em 100% das contas testadas;
- zero ganho duplicado por duas abas do mesmo usuário;
- nenhuma ação de `Virar` pagando como post original;
- presença parada/invisível sem atividade não minerando saldo;
- mediana de usuário ativo dentro da faixa projetada;
- nenhum único tipo de ação respondendo sozinho pela maior parte da emissão de um usuário normal;
- reversão funcionando sem apagar histórico.

## 23. Cenários mínimos de teste

1. criar post elegível -> +20;
2. criar quarto post no mesmo dia -> +0 pela regra;
3. post com mídia -> +20 +10 quando houver cota;
4. `Virar` -> +0;
5. duas abas simultâneas -> presença contada uma vez;
6. aba escondida/inativa -> não acumula presença econômica;
7. 30 min qualificados -> +5;
8. 3h qualificadas -> +30 e para;
9. resposta repetida ao mesmo post -> apenas primeira janela elegível paga;
10. reação -> +0;
11. Praça com usuário sozinho -> +0;
12. Praça com conversa real por 15 min -> +12;
13. DM unilateral -> +0;
14. DM bilateral qualificada -> +10;
15. recado repetido no mesmo destinatário -> apenas um pago/dia;
16. usuário suspenso -> +0;
17. corrida concorrente do mesmo evento -> uma transação;
18. conteúdo moderado como farming -> reversão;
19. atingir 180 AV$ recorrentes -> demais regras pagam +0 naquele dia;
20. modo invisível com atividade real -> presença econômica continua válida.

## 24. Faixas provisórias para testar a futura economia do Mercado

Não implementar Mercado ainda. Estas faixas existem somente para validar se o poder de compra faz sentido:

- item comum: 100–250 AV$;
- avatar/tema simples: 250–500 AV$;
- item especial: 500–900 AV$;
- item raro: 900–1.500 AV$;
- coleção/evento premium interno: 1.500–2.500 AV$.

Um usuário ativo não deve comprar tudo em dois dias, mas também não deve precisar tratar a AVESSO como segundo emprego.

## 25. Próxima etapa técnica autorizável

Com esta calibração, a especificação está pronta para a **Etapa A — banco oculto**.

Essa etapa deve ser implementada em branch separada e conter somente:

- migration das tabelas financeiras;
- regras seed v1.1;
- funções seguras;
- heartbeat econômico;
- triggers de recompensa em modo sombra/desativados por feature flag;
- views de auditoria;
- testes SQL/contratos;
- nenhum Mercado;
- nenhum Trade;
- nenhuma mudança pública de UI;
- nenhum merge automático na `main`.

A economia deve primeiro provar que sabe contar antes de ganhar uma loja.