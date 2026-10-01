# AVESSO Presence

Ponte opcional para o recurso **Ouvindo agora**.

## O que ela consegue detectar
- YouTube / YouTube Music
- Spotify Web
- SoundCloud
- Deezer
- TIDAL Web
- Apple Music Web

Quando uma aba suportada está reproduzindo áudio, a extensão envia título, artista, fonte e URL para a aba do AVESSO. O AVESSO só publica esse status no Supabase se o usuário tiver ativado **mostrar o que estou ouvindo**.

## Limite real
Um site comum não pode inspecionar outras abas, o áudio global do sistema ou aplicativos nativos. Por isso a detecção automática entre abas usa esta extensão. Aplicativos nativos como Spotify Desktop exigiriam uma ponte local separada do sistema operacional.

No celular, a exibição do status funciona normalmente. A detecção automática depende de um navegador móvel que aceite extensões compatíveis.

## Instalação de desenvolvimento
Carregue esta pasta como extensão temporária/descompactada no navegador compatível. Para distribuição pública, gere e assine o pacote na loja do navegador.
