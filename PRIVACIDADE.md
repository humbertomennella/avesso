# Privacidade do AVESSO — rascunho operacional

O AVESSO armazena dados de conta, perfil, publicações, respostas, apoios privados, bloqueios e denúncias. As regras de acesso são aplicadas no banco de dados com Row Level Security.

- Publicações marcadas como públicas podem ser vistas sem login.
- Publicações privadas são visíveis apenas ao autor e ao destinatário.
- Apoios privados são visíveis ao apoiador e às pessoas envolvidas na publicação.
- Bloqueios e denúncias não são públicos.
- Senhas são administradas pelo Supabase Auth e não são armazenadas pelo código do site.

Antes de lançamento público, este rascunho deve virar Política de Privacidade e Termos de Uso completos, adequados à LGPD e revisados juridicamente.
