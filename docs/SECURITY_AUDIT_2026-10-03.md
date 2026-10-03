# Auditoria de segurança — 03/10/2026

## Escopo

Revisão estrutural do banco e dos fluxos críticos antes da release 1.0: RLS, Storage, funções `SECURITY DEFINER`, views, funções de conta e configuração interna dos personagens.

## Resultado

### RLS

Todas as tabelas de aplicação no schema `public` inspecionadas estão com Row Level Security habilitado. As políticas de mensagens diretas limitam leitura aos participantes e verificam relação/bloqueio; tabelas administrativas usam verificações de papel e funções auxiliares.

### Storage

- `avesso-chat` é privado e exige participante/amigo para leitura e upload.
- `avesso-stories` é privado e a leitura depende de um Story visível ou do próprio autor.
- uploads de álbum, mídia, posts e recados usam prefixos vinculados ao `auth.uid()`.
- assets administrativos exigem papel `owner` para mutação.
- buckets deliberadamente públicos continuam públicos apenas para conteúdo destinado a exibição pública.

### SECURITY DEFINER

As funções privilegiadas inspecionadas possuem `search_path` fixado e fazem checagem explícita de papel antes de operações administrativas. Rotinas de rate limit usadas por Edge Functions não concedem execução a `anon`/`authenticated`.

A view `feed_attention` utiliza `security_invoker=true`, preservando as políticas do chamador.

### Correção aplicada durante a auditoria

`character_ai_profiles` continha `system_prompt`, regras de voz/comportamento e configuração de modelo. A política de leitura pública foi removida e o `SELECT` de `anon`/`authenticated` foi revogado. O personagem continua acessando essas informações apenas pela Edge Function autenticada com cliente administrativo, e o painel administrativo continua alterando-as por RPCs autorizadas.

Migration: `20261003031500_hide_character_ai_internal_prompts.sql`.

### Privacidade de conta

As funções `account-export` e `account-delete` exigem JWT válido. Eventos de exportação/exclusão guardam hash do sujeito e resultado, sem persistir e-mail em texto claro na trilha de auditoria.

A exclusão da única conta `owner` é bloqueada para impedir perda irreversível do controle administrativo.

## Itens que continuam sendo processo, não código

- proteção da branch `main` deve ser habilitada na configuração administrativa do GitHub com checks obrigatórios;
- um banco de staging Supabase separado/branchado depende de provisionamento da conta e pode gerar custo;
- revisão jurídica final dos documentos de privacidade/termos depende de profissional habilitado e do modelo real de operação pública.

Nenhum desses três itens é substituível por CSS, apesar dos melhores esforços históricos da indústria.
