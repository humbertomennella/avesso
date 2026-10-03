# Backend de privacidade — AVESSO

## Edge Functions ativas

### `account-export`

- exige JWT válido;
- identifica o usuário a partir do token, sem aceitar `user_id` arbitrário do cliente;
- exporta dados próprios e relações em que a conta participa;
- inclui inventário de objetos de Storage sob o prefixo do usuário;
- registra somente hash do sujeito e resultado em `account_privacy_events`.

### `account-delete`

- exige JWT válido;
- exige a confirmação literal `APAGAR MINHA CONTA`;
- bloqueia a exclusão da única conta com papel `owner`;
- limita tentativas repetidas;
- inventaria arquivos pertencentes ao usuário antes da exclusão;
- remove o usuário do Supabase Auth, acionando `ON DELETE CASCADE` do perfil e dados vinculados;
- depois limpa os arquivos inventariados de Storage;
- registra evento minimizado de auditoria sem guardar e-mail em texto claro.

## Tabela de auditoria

`public.account_privacy_events` possui RLS habilitado e não concede acesso a `anon` ou `authenticated`. O acesso operacional é reservado ao `service_role`.

O objetivo da tabela não é preservar a conta apagada. Ela serve para demonstrar que uma operação de privacidade ocorreu e se terminou com sucesso, falha ou bloqueio.

## Regra de segurança

Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend, em logs públicos ou em configuração versionada. O segredo existe apenas no ambiente das Edge Functions.
