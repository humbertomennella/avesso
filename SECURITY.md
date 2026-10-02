# Segurança do AVESSO

O AVESSO usa uma arquitetura de cliente público com Supabase. A chave publicável usada no navegador **não é um segredo**; a segurança depende de autorização no servidor, Row Level Security (RLS), grants mínimos, validação de papel e limites de abuso.

## Princípios

- Nunca colocar `service_role`, secrets de Edge Functions ou chaves privadas no repositório.
- Toda autorização relevante é validada no backend. Esconder um botão no frontend não concede nem remove permissão.
- Tabelas expostas pela Data API usam RLS e grants compatíveis com a necessidade real do cliente.
- Operações administrativas privilegiadas passam por RPCs que validam o papel atual no banco.
- Funções internas de trigger, moderação e rate limiting não são RPCs disponíveis a usuários comuns.
- Buckets de Storage têm limites de tamanho/MIME e políticas por proprietário, participante ou papel.
- Edge Functions que acessam serviços externos exigem JWT e possuem limitação server-side.

## Hierarquia administrativa

O AVESSO usa três níveis:

- **Moderador**: moderação cotidiana, denúncias, conteúdo e suspensão de usuários comuns.
- **Administrador Senior**: supervisiona moderadores e pode atuar em casos de maior privilégio.
- **Owner**: nível máximo e único autorizado a alterar cargos e controles críticos do sistema.

As regras de hierarquia são verificadas no banco. Moderadores não podem moderar contas de staff; Administradores Senior não podem aplicar ações equivalentes sobre peers do mesmo nível ou sobre o Owner.

## Antiabuso

Há limites server-side em superfícies sociais como publicações, respostas, mensagens, Stories, Praça, recados, comentários, reações, denúncias e uploads registrados no banco.

As Edge Functions que podem gerar custo externo ou notificações também passam por um rate guard atômico acessível apenas pela `service_role`. Push notifications ainda usam deduplicação do mesmo evento para impedir reenvio em loop.

Os limites existem no servidor. Alterar JavaScript no navegador não os remove.

## Moderação

Conteúdo textual relevante é analisado por triggers de moderação no banco. Alertas, termos monitorados, auditoria administrativa e dados internos são protegidos por RLS/RPC e não dependem da interface para autorização.

Ações administrativas sensíveis geram registros de auditoria.

## Push e segredos

A configuração privada de Web Push é armazenada em tabela server-only. Clientes `anon` e `authenticated` possuem política explícita de negação e nenhum grant de tabela. O acesso ocorre pela Edge Function com credencial de servidor.

## Observabilidade

Erros do cliente podem ser enviados para o backend quando o usuário está autenticado. O cliente aplica deduplicação e rate limit local, enquanto a tabela aceita somente inserts associados ao próprio usuário. Leitura é restrita à administração.

## Sessão e dados privados

- Mensagens diretas são limitadas aos participantes autorizados.
- Bloqueios e amizades participam das políticas de leitura/escrita relevantes.
- Conteúdo privado não deve ser disponibilizado por bucket público.
- Presença e recursos sociais respeitam as políticas definidas no banco.

## Revisão operacional

Após alterações de schema ou autorização:

1. executar os Security Advisors do Supabase;
2. revisar novas funções `SECURITY DEFINER`;
3. confirmar grants e políticas RLS;
4. validar que helpers/trigger functions não ficaram expostos como RPC;
5. testar funções administrativas com cada nível de papel;
6. revisar Storage e Edge Functions antes de ampliar o acesso público.

## Relato de vulnerabilidade

Não publique credenciais, tokens, dados privados ou detalhes exploráveis em uma issue pública. Registre o problema de forma privada com o mantenedor do projeto, incluindo superfície afetada, impacto e passos mínimos para reprodução.
