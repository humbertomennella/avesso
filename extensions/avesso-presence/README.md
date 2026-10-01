# AVESSO Presence 0.3.0

Ponte opcional para o recurso **Ouvindo agora** e para as observações autorizadas do **Aquele que Lê Tudo**.

## O que ela consegue detectar
- YouTube / YouTube Music
- Spotify Web
- SoundCloud
- Deezer
- TIDAL Web
- Apple Music Web

A faixa tocando é reavaliada continuamente. Além do conteúdo do player, a 0.3.0 usa o título da aba audível como fallback para YouTube/YouTube Music. Isso cobre a navegação SPA em que o player troca de vídeo mas deixa um nó antigo no DOM. A aba do AVESSO também consulta a extensão periodicamente, em vez de depender de um único evento.

## Contexto de abas
O AVESSO pode, se o usuário ativar a opção no **Meu Canto**, avisar Aquele que Lê Tudo quando houver troca de aba. A extensão envia somente:
- domínio;
- título visível da aba;
- indicação de áudio ativo.

Ela não lê conteúdo de formulários, mensagens privadas, câmera, microfone, histórico completo nem o conteúdo interno da página.

## Limite real
Um site comum não pode inspecionar outras abas, o áudio global do sistema ou aplicativos nativos. Por isso a detecção automática entre abas usa esta extensão. Aplicativos nativos como Spotify Desktop exigiriam uma ponte local separada do sistema operacional.

No celular, a exibição do status funciona normalmente. A detecção automática depende de um navegador móvel que aceite extensões compatíveis.

## Instalação de desenvolvimento
Carregue esta pasta como extensão temporária/descompactada no navegador compatível. Para distribuição pública, gere e assine o pacote na loja do navegador.
