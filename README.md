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

## Mundo do AVESSO

O AVESSO está evoluindo de uma rede social funcional para um mundo digital persistente. O computador central, as ilhas, os personagens e os acontecimentos passam a fazer parte do funcionamento do produto, não apenas da identidade visual.

Documentos-base:

- [Bíblia do Mundo do AVESSO](docs/MUNDO_AVESSO.md)
- [Protocolo de Interferência](docs/PROTOCOLO_INTERFERENCIA.md)
- [Roadmap do Mundo do AVESSO](docs/ROADMAP_MUNDO_AVESSO.md)

Princípio técnico: personagens podem interferir na apresentação, mas nunca falsificar autoria, destruir conteúdo ou tocar em áreas críticas de segurança e privacidade.

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

1. Em [Auth > URL Configuration](https://supabase.com/dashboard/project/uibhdikfgjnzljhuflxx/auth/url-configuration), definir **Site URL** como `https://humbertomennella.github.io/avesso/` e incluir este mesmo endereço em **Redirect URLs**. Isto precisa ser feito no painel do Supabase; o `emailRedirectTo` do JavaScript não substitui a lista de URLs permitidas. Links enviados antes do ajuste podem continuar apontando para `localhost:3000`.
   - Contas que já confirmaram o e-mail devem apenas entrar com e-mail e senha. Não refazer cadastro nem usar o link de confirmação outra vez.
2. Definir política de confirmação de e-mail e SMTP próprio.
3. Concluir moderação e painel administrativo.
4. Revisar Política de Privacidade e Termos de Uso para LGPD.
5. Realizar teste de abuso, rate limiting e recuperação de conta.
