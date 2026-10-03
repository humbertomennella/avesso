# Gate de release 1.0 — AVESSO

Uma versão só pode ser tratada como estável quando todos os itens abaixo passarem sem correção emergencial no meio da rodada.

## Fluxos obrigatórios

- cadastro;
- login e logout;
- recuperação de senha;
- edição de perfil;
- postagem pública e dirigida;
- resposta e reação;
- Story com texto, imagem e vídeo;
- amizade, bloqueio e desbloqueio;
- DM, anexo e áudio;
- notificações;
- exportação de dados;
- encerramento de outras sessões;
- exclusão de conta de teste;
- moderação e permissões administrativas.

## Matriz mínima de tela

### Mobile
- 360×800
- 390×844
- 412×915

### Desktop
- 1366×768
- 1440×900
- 1920×1080

## Navegadores mínimos

- Chromium desktop;
- Firefox desktop;
- Chrome/Chromium Android;
- Safari móvel quando houver dispositivo de teste disponível.

## Critérios de bloqueio

A release não avança se houver:

- login, cadastro ou recuperação quebrados;
- perda de dados;
- acesso indevido a conteúdo privado;
- bypass de papel administrativo;
- mensagem privada entregue ao usuário errado;
- janela/modal impossível de fechar;
- overflow que esconda ação principal;
- deploy com CI vermelho;
- migration divergente da produção;
- cache servindo combinações incompatíveis de arquivos.

## Critério 1.0

1. CI estático verde.
2. Smoke E2E desktop e mobile verdes.
3. Auditoria de RLS/Storage/Funções sem falha crítica aberta.
4. Política de Privacidade e Termos publicados.
5. Exportação e exclusão de conta funcionais.
6. Procedimento de rollback e recuperação documentado.
7. Uma rodada completa sem regressão crítica.

Depois disso, recurso novo volta a ser permitido. Antes disso, recurso novo é só mais uma oportunidade de o CSS descobrir uma religião própria.
