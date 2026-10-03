# Recuperação e continuidade do AVESSO

## Objetivo

Ter um procedimento verificável para recuperar o serviço sem depender de memória, improviso ou da clássica esperança de que o backup “deve estar lá”.

## Componentes críticos

1. GitHub: código, workflows, documentação e assets versionados.
2. Supabase: Auth, Postgres, Storage, Realtime e Edge Functions.
3. GitHub Pages: publicação do frontend.

## Antes de um deploy relevante

- Confirmar workflow `Publicar AVESSO` verde.
- Confirmar smoke tests desktop e mobile.
- Registrar o SHA que está em produção.
- Aplicar migrations antes de depender de novos objetos no frontend.
- Validar Edge Functions novas com JWT obrigatório.

## Rollback do frontend

1. Identificar o último commit verde.
2. Criar um commit de reversão para esse estado.
3. Aguardar `Publicar AVESSO` concluir com sucesso.
4. Validar login, feed, perfil, chat e Stories.
5. Confirmar que o Service Worker instalou o shell correspondente.

Não force o usuário a limpar dados como rotina de deploy. O shell deve trocar de versão e invalidar caches antigos automaticamente.

## Banco de dados

Migrations devem ser aditivas e reversíveis sempre que possível. Alterações destrutivas exigem plano explícito e confirmação antes de execução.

Antes de uma mudança estrutural:

- revisar FKs e regras `ON DELETE`;
- revisar RLS de tabelas afetadas;
- validar funções `SECURITY DEFINER` e `search_path`;
- verificar se Storage e banco permanecem coerentes.

## Contas e privacidade

As Edge Functions `account-export` e `account-delete` exigem JWT válido. Exclusão de conta remove primeiro o usuário autenticado e, depois, limpa arquivos previamente inventariados. A última conta `owner` não pode ser apagada sem transferência de papel.

## Teste de restauração

Periodicamente, executar um ensaio em ambiente não produtivo:

- aplicar todas as migrations em banco limpo;
- publicar Edge Functions;
- criar usuário de teste;
- publicar, responder, enviar mensagem e Story;
- exportar dados;
- excluir o usuário;
- confirmar que o app continua íntegro.

A existência de backup não equivale a capacidade de restauração. O ensaio é o que prova a segunda parte.
