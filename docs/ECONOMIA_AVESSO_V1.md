# AVESSO — Economia de Saldo e Recompensas v1

Status: especificação de produto e arquitetura. Não implementar ainda sem validação desta etapa.

## 1. Objetivo

Transformar o número atualmente exibido como "saldo" em uma economia real da AVESSO, sem transformar a rede em cassino, ranking de popularidade ou máquina de retenção artificial.

A economia deve premiar presença qualificada, criação, conversa e participação diversa. O sistema precisa reforçar a proposta da AVESSO: pertencimento, identidade, laços e convivência.

Princípios:

- presença vale mais que volume;
- conversa vale mais que reação mecânica;
- diversidade de participação vale mais que spam de uma única ação;
- saldo é ferramenta de expressão, não prova pública de status;
- nenhuma recompensa depende de seguidores, curtidas públicas ou posição em ranking;
- sem loot box, aposta ou recompensa aleatória paga;
- saldo não é convertível em dinheiro real na v1;
- a carteira do usuário é privada por padrão;
- emblemas podem ser públicos quando o usuário escolher exibi-los.

## 2. Estado atual confirmado

Hoje o valor exibido em `#impact-number` é apenas a quantidade de posts criados pelo usuário. O aplicativo já registra diversas ações em `user_actions`, incluindo criação de post, imagem, GIF, story, respostas, reações e navegação. O sistema também já possui heartbeat/presença e detecção de atividade de janela.

Isso permite criar a economia sem reescrever os fluxos principais. `user_actions` deve permanecer como telemetria; o saldo não deve confiar em eventos arbitrários enviados pelo cliente.

Também já existem `badges` e `user_badges`, que serão aproveitados na Parte 2.

## 3. Nome e unidade

Nome de produto: **Saldo AVESSO**

Símbolo de interface: **AV$**

Exemplos:

- `285 AV$`
- `+20 AV$`
- `Saldo hoje: +64 AV$`

AV$ é uma unidade interna, sem equivalência monetária externa.

## 4. Dois números diferentes

### 4.1. Saldo disponível

É o valor que o usuário pode gastar futuramente no Mercado AVESSO e usar em trocas permitidas.

Pode subir e descer.

### 4.2. Total conquistado

Valor histórico acumulado de AV$ ganhos pelo usuário.

Não diminui quando o usuário compra algo. Serve apenas para progressão interna, conquistas e análise antifraude. Não deve virar ranking público.

## 5. Pulso AVESSO

Para cumprir a ideia de que participação consistente gera uma progressão crescente sem incentivar horas infinitas online, a v1 usa um multiplicador chamado **Pulso AVESSO**.

O Pulso considera os últimos 7 dias e exige diversidade de participação.

- Pulso 1: `x1,00` — padrão.
- Pulso 2: `x1,05` — atividade válida em 3 dias diferentes + 3 categorias de ação.
- Pulso 3: `x1,10` — atividade válida em 5 dias diferentes + 4 categorias.
- Pulso 4: `x1,15` — atividade válida em 6 dias diferentes + 5 categorias.

O Pulso nunca cai para zero e não deve exibir linguagem de punição por "quebrar sequência". Ele é recalculado em janela móvel de 7 dias.

O multiplicador se aplica somente às recompensas recorrentes elegíveis. Não se aplica a bônus únicos, migração de saldo antigo, reversões ou recompensas administrativas.

## 6. Recompensas recorrentes propostas

Valores iniciais devem ser configuráveis em banco para ajuste sem nova migração.

| Ação | Recompensa base | Regra | Limite diário |
| --- | ---: | --- | ---: |
| Presença ativa | +5 AV$ | a cada 20 min qualificados | 45 AV$ |
| Post de texto | +20 AV$ | publicação válida | 60 AV$ |
| Bônus de mídia | +10 AV$ | imagem, GIF ou vídeo em post | 20 AV$ |
| Resposta em conversa | +6 AV$ | alvo único por período | 36 AV$ |
| Story publicado | +10 AV$ | story válido | 20 AV$ |
| Recado em Canto | +8 AV$ | 1 recompensado por destinatário/dia | 24 AV$ |
| Sessão qualificada na Praça | +10 AV$ | sessão social válida | 20 AV$ |
| Conversa direta qualificada | +10 AV$ | troca mútua entre amigos | 20 AV$ |

Reações simples não geram AV$. Curtidas/reação recebida também não geram AV$. Isso evita transformar popularidade em moeda.

## 7. O que é presença ativa

A AVESSO não deve premiar uma aba esquecida aberta durante oito horas.

Um bloco de presença é qualificado quando:

- a sessão está autenticada;
- a página está visível;
- o usuário apresentou atividade recente na interface;
- existe heartbeat válido da sessão;
- o usuário não está suspenso;
- o bloco ainda não foi recompensado.

A atividade pode ser atualizada por interação de teclado, ponteiro, toque, foco e ações reais do aplicativo.

A presença econômica deve ser independente do status social `online`, `ausente` ou `invisível`. O usuário não pode perder recompensa por escolher privacidade.

A v1 premia no máximo 3 horas qualificadas por dia. Permanecer mais tempo é perfeitamente permitido, só não vira mineração de AV$.

## 8. Sessão qualificada da Praça

Não pagar por mensagem individual. Isso criaria spam em aproximadamente quinze minutos, porque usuários continuam sendo usuários.

Uma sessão da Praça vale +10 AV$ quando, dentro de uma janela mínima de 15 minutos:

- o usuário enviou ao menos 3 mensagens válidas;
- houve participação de ao menos outro usuário real;
- não foram mensagens repetidas/duplicadas;
- o usuário permaneceu ativo na Praça durante o período.

Máximo: duas sessões recompensadas por dia.

## 9. Conversa direta qualificada

Também não pagar por cada DM.

Uma conversa privada pode render +10 AV$ quando:

- os dois usuários são amigos aceitos;
- ambos enviaram mensagens no período;
- existe uma troca mínima de mensagens de ambas as partes;
- o par ainda não recebeu o bônus naquele período.

Máximo de duas conversas recompensadas por dia.

## 10. Bônus únicos de identidade

A primeira vez que o usuário constrói partes importantes do Canto pode gerar recompensa única.

- definir avatar: +20 AV$;
- escrever bio válida: +15 AV$;
- escolher papel de parede: +10 AV$;
- configurar a primeira música do Canto: +25 AV$;
- adicionar a primeira foto ao álbum: +15 AV$;
- publicar o primeiro recado para um amigo: +10 AV$.

Esses bônus possuem chave idempotente e nunca são pagos novamente ao apagar/trocar o conteúdo.

## 11. Bônus de participação diversa

A economia deve incentivar explorar a AVESSO, não repetir a mesma ação cinquenta vezes.

### Semana presente

+40 AV$ quando o usuário participa em 4 dias diferentes da semana e utiliza pelo menos 3 superfícies sociais distintas.

### Semana do Avesso

+80 AV$ quando o usuário participa em 6 dias diferentes e utiliza pelo menos 4 superfícies sociais distintas.

Superfícies válidas:

- Feed/conversas;
- Praça;
- Canto;
- Stories;
- Amigos & Cúmplices.

Os bônus não são acumulativos entre si na mesma semana. Recebe apenas o maior atingido.

## 12. Categorias para cálculo do Pulso

Categorias válidas:

1. presença;
2. publicação;
3. conversa/resposta;
4. Praça;
5. Canto/recados;
6. Stories;
7. conversa direta.

A mesma ação repetida não aumenta diversidade.

## 13. Limites e inflação

Meta de emissão inicial:

- usuário casual: aproximadamente 120–250 AV$/semana;
- usuário ativo: aproximadamente 450–800 AV$/semana;
- usuário muito ativo: aproximadamente 900–1.250 AV$/semana.

Teto recomendado de ganhos recorrentes: **180 AV$/dia**.

Bônus únicos e recompensas especiais podem exceder o teto porque não são repetíveis.

Esses números serão usados futuramente para precificar temas, avatares, emblemas, músicas e itens do Mercado.

## 14. Migração do saldo atual

Como o saldo atual representa o número de posts, os usuários existentes não devem simplesmente acordar com zero.

Na ativação da economia:

- cada post histórico válido gera +20 AV$;
- cada post histórico recebe uma transação `legacy_post_backfill` única;
- novos posts passam a usar a regra normal;
- outras atividades antigas não serão retroativamente remuneradas na v1, para evitar reconstrução imperfeita de histórico.

Essa migração preserva a ideia original de que publicar sempre contribuiu para o saldo.

## 15. Arquitetura de banco proposta

### `avesso_wallets`

- `user_id uuid primary key`
- `balance bigint not null default 0`
- `lifetime_earned bigint not null default 0`
- `lifetime_spent bigint not null default 0`
- `updated_at timestamptz`

O cliente pode ler apenas a própria carteira. Não pode atualizar diretamente.

### `avesso_wallet_ledger`

Livro-razão imutável.

- `id bigint identity primary key`
- `user_id uuid`
- `transaction_type text` (`earn`, `spend`, `transfer_in`, `transfer_out`, `reversal`, `admin_adjustment`)
- `rule_key text`
- `source_type text`
- `source_id text`
- `amount integer`
- `idempotency_key text unique`
- `metadata jsonb`
- `created_at timestamptz`

Nenhum usuário pode editar ou apagar registros do ledger.

### `avesso_reward_rules`

Tabela administrativa para ajuste de economia.

Campos principais:

- `rule_key`
- `label`
- `base_amount`
- `daily_cap`
- `cooldown_seconds`
- `multiplier_eligible`
- `enabled`
- `config jsonb`

Leitura autenticada opcional; escrita apenas por owner/sistema.

### `avesso_activity_sessions`

Controla presença econômica sem misturar status social.

- `id uuid`
- `user_id uuid`
- `started_at`
- `last_active_at`
- `last_heartbeat_at`
- `qualified_seconds`
- `rewarded_blocks`
- `ended_at`

## 16. Motor de recompensa

Criar função interna de banco semelhante a:

`award_avesso_reward(user_id, rule_key, source_type, source_id, metadata)`

Requisitos:

- SECURITY DEFINER com `search_path` fixo;
- indisponível para chamada arbitrária do cliente;
- valida usuário e suspensão;
- busca regra ativa;
- aplica idempotência;
- aplica limite diário;
- calcula Pulso quando elegível;
- bloqueia saldo negativo;
- grava ledger e atualiza carteira na mesma transação;
- retorna o valor realmente concedido.

Sempre que possível, recompensas devem nascer de triggers de banco nas tabelas reais, não de `trackAction()`.

Exemplos:

- insert em `posts` -> recompensa publicação;
- post com mídia -> bônus de mídia;
- insert em `responses` -> resposta;
- insert em `stories` -> story;
- insert em `guestbook_entries` -> recado.

`user_actions` continua útil para Pulso, analytics e sinais auxiliares, mas não é autoridade financeira.

## 17. Antifraude e anti-spam

Regras obrigatórias:

- nenhuma mutação direta da carteira pelo navegador;
- idempotência por evento;
- limites por regra e limite global diário;
- recompensa de conversa exige outra pessoa;
- recompensa da Praça é por sessão, não por mensagem;
- amizade enviada não gera saldo;
- reação simples não gera saldo;
- desfazer/refazer configuração de perfil não paga novamente;
- usuário suspenso não ganha AV$;
- operações administrativas deixam trilha de auditoria;
- moderação pode criar uma reversão explícita quando necessário;
- carteira nunca aceita valor negativo por corrida de concorrência.

## 18. Visual da área Saldo & Recompensas

A área deve seguir a direção Windows 98 + vaporwave + preto e branco + neon magenta.

### Resumo lateral

Substituir o atual card que mostra apenas número de posts por:

- `SEU SALDO` + valor em AV$;
- `HOJE +XX AV$`;
- Pulso atual (`x1,10`, por exemplo);
- minutos de presença qualificada no dia;
- barra para próximo bloco de presença;
- botão `ver movimentos`.

### Tela completa

Blocos:

1. Carteira;
2. Como você ganhou hoje;
3. Pulso AVESSO;
4. Próximas recompensas;
5. Histórico de movimentos;
6. Regras resumidas;
7. Bônus de identidade/semana.

A carteira não terá ranking público.

## 19. Privacidade

- saldo disponível: privado;
- histórico de transações: privado;
- total histórico: privado;
- Pulso: privado por padrão;
- usuário pode futuramente escolher exibir conquistas e badges;
- Mercado e Trade nunca revelam o saldo total do outro usuário.

## 20. Compatibilidade com fases futuras

Esta arquitetura já prepara:

- Parte 2: emblemas e badges;
- Parte 3: inventário e Mercado AVESSO;
- Parte 4: Trade;
- Parte 5: Laços;
- Parte 6: temas, avatares, emoticons;
- Parte 7: músicas e Rádio da Praça.

O ledger será a fonte de verdade para compras e trocas futuras.

## 21. Estratégia de implantação segura

### Etapa A — banco oculto

Criar tabelas, regras, ledger e backfill sem mudar a interface.

### Etapa B — recompensas em sombra

Ativar cálculo para usuários de teste, comparar ganhos e detectar inflação/duplicidade. A interface pública continua mostrando o sistema antigo.

### Etapa C — interface interna

Ativar Saldo & Recompensas para conta owner/admin e validar desktop/mobile.

### Etapa D — ativação geral

Trocar `loadImpact()` pela carteira real somente depois dos testes.

### Etapa E — estabilização

Monitorar emissão média, erros, duplicidades e comportamento de farming antes do Mercado.

## 22. Testes obrigatórios antes da publicação

- backfill executa uma vez;
- dois eventos iguais não pagam duas vezes;
- concorrência simultânea não duplica saldo;
- limite diário funciona;
- Pulso aplica multiplicador correto;
- aba escondida não acumula presença;
- status invisível não perde recompensa por privacidade;
- sessão parada não minera saldo;
- Praça exige interação real;
- DM exige reciprocidade;
- usuário suspenso não ganha saldo;
- cliente não consegue alterar carteira/ledger;
- carteira nunca fica negativa;
- reversão registra movimento inverso;
- desktop e mobile exibem os mesmos valores;
- atualização em tempo real não duplica animações/avisos.

## 23. Decisões congeladas para a v1

- moeda: AV$;
- sem compra de AV$ com dinheiro real;
- sem saque/conversão externa;
- sem ranking público de riqueza;
- sem recompensa por curtida recebida;
- sem recompensa por pedido de amizade enviado;
- presença limitada e qualificada;
- economia baseada em ledger;
- sistema server-authoritative sempre que possível;
- regras ajustáveis sem alterar código;
- implantação gradual e reversível.

## 24. Próximo passo após aprovação deste documento

Implementar apenas a fundação da Etapa A em uma branch separada:

1. migration do ledger/carteira/regras/sessões;
2. políticas RLS;
3. função interna de recompensa;
4. regras iniciais;
5. backfill de posts;
6. testes SQL e contratos de segurança;
7. nenhuma mudança visual pública ainda.
