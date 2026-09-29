# AVESSO

Rede social invertida: atenção vale mais que exposição.

## Produto

- Autenticação por e-mail e senha via Supabase Auth.
- Perfis públicos sem contagem de seguidores.
- Toda publicação possui autor e destinatário distintos.
- Feed ordenado por necessidade de atenção, não por viralidade.
- Publicações públicas ou privadas.
- Respostas e apoio privado.
- Círculos pessoais, bloqueios e denúncias no modelo de dados.
- Atualização em tempo real de publicações e respostas.
- RLS em todas as tabelas expostas.

## Arquitetura

- Front-end estático: HTML, CSS e JavaScript modular.
- Backend: Supabase (Auth, PostgreSQL, Realtime e RLS).
- Hospedagem: GitHub Pages pelo workflow em `.github/workflows/pages.yml`.
- Projeto Supabase: `AVESSO`, região `sa-east-1`.

## Desenvolvimento local

Sirva a pasta por HTTP; módulos ES não funcionam corretamente abrindo `index.html` diretamente.

```bash
python3 -m http.server 8080
```

A chave em `config.js` é publicável e foi criada para uso no navegador. Nunca adicione uma chave `service_role` ao repositório.

## Antes de abrir ao público

1. Configurar a URL oficial em Supabase Auth > URL Configuration.
2. Definir política de confirmação de e-mail e SMTP próprio.
3. Concluir moderação e painel administrativo.
4. Revisar Política de Privacidade e Termos de Uso para LGPD.
5. Realizar teste de abuso, rate limiting e recuperação de conta.
