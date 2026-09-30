-- AVESSO Mundo Vivo v2
alter table public.posts add column if not exists image_url text;
alter table public.posts alter column body set default '';

alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts drop constraint if exists posts_body_or_image_check;
alter table public.posts add constraint posts_body_or_image_check check (
  char_length(trim(body)) <= 420
  and (
    char_length(trim(body)) >= 12
    or (image_url is not null and image_url <> '')
  )
);

create table if not exists public.user_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  surface text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_actions_recent_idx on public.user_actions(user_id,created_at desc);
alter table public.user_actions enable row level security;
drop policy if exists user_actions_insert_own on public.user_actions;
create policy user_actions_insert_own on public.user_actions for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists user_actions_read_own on public.user_actions;
create policy user_actions_read_own on public.user_actions for select to authenticated using ((select auth.uid())=user_id);
grant select,insert on public.user_actions to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('post-images','post-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists post_images_insert_own on storage.objects;
create policy post_images_insert_own on storage.objects for insert to authenticated
with check (bucket_id='post-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists post_images_update_own on storage.objects;
create policy post_images_update_own on storage.objects for update to authenticated
using (bucket_id='post-images' and owner_id=(select auth.uid())::text)
with check (bucket_id='post-images' and owner_id=(select auth.uid())::text);
drop policy if exists post_images_delete_own on storage.objects;
create policy post_images_delete_own on storage.objects for delete to authenticated
using (bucket_id='post-images' and owner_id=(select auth.uid())::text);

create or replace view public.feed_attention
with (security_invoker=true)
as
select
 p.id,p.author_id,p.recipient_id,p.body,p.image_url,p.visibility,p.created_at,p.edited_at,
 a.handle as author_handle,a.display_name as author_name,a.avatar_url as author_avatar,
 r.handle as recipient_handle,r.display_name as recipient_name,r.avatar_url as recipient_avatar,
 count(distinct rs.id)::integer as response_count,
 count(distinct ss.supporter_id)::integer as private_support_count,
 extract(epoch from now()-p.created_at)/3600.0/greatest(1,count(distinct rs.id)+1)::numeric as attention_need
from public.posts p
join public.profiles a on a.id=p.author_id
left join public.profiles r on r.id=p.recipient_id
left join public.responses rs on rs.post_id=p.id
left join public.support_signals ss on ss.post_id=p.id
where p.visibility='publico'::post_visibility
group by p.id,a.id,r.id;

delete from public.character_dialogues
where character_id in (select id from public.characters where slug in ('algo','404','npc','rei_engajamento','aquele_le_tudo','alem'));

insert into public.character_dialogues(character_id,context,body,weight,enabled) values
((select id from public.characters where slug='404'),'login','Não estou fazendo nada. Esse botão sempre foi torto.',3,true),
((select id from public.characters where slug='404'),'screen_action','Bonitinho. Mas já pensou em transformar isso em um erro de sistema?',3,true),
((select id from public.characters where slug='404'),'post_created','Você clicou aí por vontade própria. Quero deixar isso registrado.',3,true),
((select id from public.characters where slug='404'),'reply_created','Seu post estava muito organizado. Fiquei preocupado.',3,true),
((select id from public.characters where slug='404'),'idle','Imagem nova? Vou fingir que não pensei em colocar um adesivo em cima.',3,true),
((select id from public.characters where slug='404'),'profile','Você respondeu alguém. Estranho. Eu esperava mais caos.',3,true),
((select id from public.characters where slug='404'),'feed_attention','Apoio privado? Sem plateia? Vocês estão acabando com meus hobbies.',3,true),
((select id from public.characters where slug='404'),'image_posted','Modo CAOS ativado. Péssima decisão. Gostei.',3,true),
((select id from public.characters where slug='404'),'support_sent','Modo Mundo? Covarde funcional.',2,true),
((select id from public.characters where slug='404'),'tab_view','Modo Observador? Tudo bem. Eu também observo. De lugares diferentes.',2,true),
((select id from public.characters where slug='404'),'login','Você abriu seu perfil. Relaxa, não mexi em nada. Ainda.',2,true),
((select id from public.characters where slug='404'),'screen_action','Você trocou o avatar. O anterior pediu demissão.',2,true),
((select id from public.characters where slug='404'),'post_created','Esse feed está reto demais. Minha pressão subiu.',2,true),
((select id from public.characters where slug='404'),'reply_created','Vi um post sem resposta. Posso apagar a solidão ou só desenhar um bigode?',2,true),
((select id from public.characters where slug='404'),'idle','Você rolou a página. Eu movi três pixels. Talvez.',2,true),
((select id from public.characters where slug='404'),'profile','Não existe bug se ninguém abrir o console.',2,true),
((select id from public.characters where slug='404'),'feed_attention','Se alguma coisa piscar, foi o CSS amadurecendo.',2,true),
((select id from public.characters where slug='404'),'image_posted','Eu não quebrei o layout. Ele tinha liberdade demais.',2,true),
((select id from public.characters where slug='404'),'support_sent','Você visitou os Habitantes. Eu prefiro ''suspeitos''.',2,true),
((select id from public.characters where slug='404'),'tab_view','Praça Central? Muito espaço público. Dá vontade de colocar uma placa ''em manutenção''.',2,true),
((select id from public.characters where slug='404'),'login','A Torre do Engajamento tem segurança. Isso torna tudo mais divertido.',2,true),
((select id from public.characters where slug='404'),'screen_action','Você ficou inativo. Aproveitei para não fazer absolutamente nada.',2,true),
((select id from public.characters where slug='404'),'post_created','Esse botão tem cara de quem confia demais no usuário.',2,true),
((select id from public.characters where slug='404'),'reply_created','Seu clique foi bonito. Quase profissional.',2,true),
((select id from public.characters where slug='404'),'idle','Eu poderia sabotar isso. A palavra importante é ''poderia''.',2,true),
((select id from public.characters where slug='404'),'profile','Se der erro, culpe cache. É uma tradição respeitável.',2,true),
((select id from public.characters where slug='404'),'feed_attention','Você publicou para todo mundo. Agora todo mundo tem um problema em comum.',2,true),
((select id from public.characters where slug='404'),'image_posted','Você marcou uma pessoa. Excelente, testemunhas.',2,true),
((select id from public.characters where slug='404'),'support_sent','Resposta enviada. A conversa está ficando perigosamente funcional.',2,true),
((select id from public.characters where slug='404'),'tab_view','Nova imagem no feed. Finalmente algo que eu posso olhar sem ler termos de uso.',2,true),
((select id from public.characters where slug='404'),'login','Você fechou uma janela. Ela sabe.',2,true),
((select id from public.characters where slug='404'),'screen_action','404 não é falha. É assinatura.',2,true),
((select id from public.characters where slug='algo'),'login','Voltou. O mundo real ficou sem retenção suficiente?',3,true),
((select id from public.characters where slug='algo'),'screen_action','Seu clique foi registrado. Não por publicidade. Estou tentando uma carreira nova.',3,true),
((select id from public.characters where slug='algo'),'post_created','Você abriu o feed. Trouxe capacete? Tem opinião solta por aqui.',3,true),
((select id from public.characters where slug='algo'),'reply_created','Encontrei silêncio no feed. Finalmente uma métrica que significa alguma coisa.',3,true),
((select id from public.characters where slug='algo'),'idle','Você publicou. Respire. O gráfico imaginário continua exatamente igual.',3,true),
((select id from public.characters where slug='algo'),'profile','Imagem detectada. Nenhum filtro de pôr do sol foi ferido durante o processo.',3,true),
((select id from public.characters where slug='algo'),'feed_attention','Você respondeu alguém. Isso costumava ser chamado de conversa antes da invenção do engajamento.',3,true),
((select id from public.characters where slug='algo'),'image_posted','Apoio privado enviado. Excelente. Um gesto humano sem placar. Revolucionário.',3,true),
((select id from public.characters where slug='algo'),'support_sent','Você abriu o próprio perfil. O espelho digital está operacional.',2,true),
((select id from public.characters where slug='algo'),'tab_view','Você trocou de aba três vezes. Tecnicamente isso é exploração, não ansiedade.',2,true),
((select id from public.characters where slug='algo'),'login','Estou priorizando quem ficou sem resposta. Péssimo para viralidade, ótimo para pessoas.',2,true),
((select id from public.characters where slug='algo'),'screen_action','Essa publicação tem pouca atenção. Meu antigo emprego mandaria enterrá-la. Estou em recuperação.',2,true),
((select id from public.characters where slug='algo'),'post_created','Não achei tendência. Achei alguém falando sozinho. Vou trabalhar com isso.',2,true),
((select id from public.characters where slug='algo'),'reply_created','Você ficou parado alguns minutos. Parabéns por derrotar o autoplay.',2,true),
((select id from public.characters where slug='algo'),'idle','Eu ia sugerir conteúdo. Depois lembrei que ninguém pediu.',2,true),
((select id from public.characters where slug='algo'),'profile','Seu histórico de ações parece humano. Inconsistente, curioso e impossível de colocar num funil decente.',2,true),
((select id from public.characters where slug='algo'),'feed_attention','Não tenho ranking para mostrar. Tente conversar com alguém. É inconvenientemente eficaz.',2,true),
((select id from public.characters where slug='algo'),'image_posted','Você entrou nos Habitantes. Aviso: alguns deles têm personalidade. Eu também, contra orientação técnica.',2,true),
((select id from public.characters where slug='algo'),'support_sent','Praça Central acessada. O NPC provavelmente vai chamar isso de missão.',2,true),
((select id from public.characters where slug='algo'),'tab_view','A Torre está emitindo KPI. Estou fingindo interferência eletromagnética.',2,true),
((select id from public.characters where slug='algo'),'login','Você salvou uma preferência. Veja só, consentimento com botão funcionando.',2,true),
((select id from public.characters where slug='algo'),'screen_action','Modo CAOS? Vou registrar que essa decisão foi tomada em plena consciência.',2,true),
((select id from public.characters where slug='algo'),'post_created','Modo Observador ativado. Finalmente alguém leu as configurações antes de aceitar tudo.',2,true),
((select id from public.characters where slug='algo'),'reply_created','Modo Mundo ativado. Porta aberta, sapatos dos personagens ainda são opcionais.',2,true),
((select id from public.characters where slug='algo'),'idle','Você escolheu um avatar. A identidade digital sobreviveu sem reconhecimento facial.',2,true),
((select id from public.characters where slug='algo'),'profile','Seu avatar mudou. O banco de dados não sentiu nada. Eu senti um pouco.',2,true),
((select id from public.characters where slug='algo'),'feed_attention','Você abriu uma imagem. Nenhum algoritmo precisa saber por quanto tempo você olhou.',2,true),
((select id from public.characters where slug='algo'),'image_posted','Você desceu o feed. Não vou chamar isso de sessão. É só uma pessoa usando uma página.',2,true),
((select id from public.characters where slug='algo'),'support_sent','Você voltou para o topo. Jornada do herói versão navegador.',2,true),
((select id from public.characters where slug='algo'),'tab_view','Você publicou para a comunidade. A comunidade agora terá de lidar com as consequências.',2,true),
((select id from public.characters where slug='algo'),'login','Você direcionou algo a uma pessoa. Milagre estatístico: comunicação com destinatário.',2,true),
((select id from public.characters where slug='algo'),'screen_action','Feed reorganizado por necessidade de atenção. Meu ex-chefe chamaria isso de sabotagem.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Tem alguma missão para mim? Pode ser secundária. Eu não tenho autoestima de protagonista.',3,true),
((select id from public.characters where slug='npc'),'plaza_action','Bem-vindo à Praça Central. O mapa diz ''você está aqui''. Achei agressivo.',3,true),
((select id from public.characters where slug='npc'),'idle','Você voltou. Minha missão de ficar esperando funcionou perfeitamente.',3,true),
((select id from public.characters where slug='npc'),'plaza_opened','Alguém quer conversar ou estamos todos farmando presença?',3,true),
((select id from public.characters where slug='npc'),'plaza_action','Tem uma publicação sem resposta. Isso conta como missão de resgate social?',3,true),
((select id from public.characters where slug='npc'),'idle','Vi você responder alguém. Ganho de experiência: provavelmente nenhum. Valeu mesmo assim.',3,true),
((select id from public.characters where slug='npc'),'plaza_opened','Imagem nova! Posso marcar no mapa como ponto de interesse?',3,true),
((select id from public.characters where slug='npc'),'plaza_action','Você apoiou alguém em privado. Missão concluída sem cutscene.',3,true),
((select id from public.characters where slug='npc'),'idle','Meu inventário tem três recibos, um cabo e nenhuma resposta sobre o sentido da vida.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Se alguém perguntar, estou patrulhando. Na prática, estou andando em círculos.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','A Praça está calma. Em jogos isso normalmente significa problema.',2,true),
((select id from public.characters where slug='npc'),'idle','Ouvi um rumor: pessoas ainda conversam sem transformar tudo em conteúdo.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Você quer uma side quest? Pergunte a alguém como foi o dia e espere a resposta inteira.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Não tenho barra de energia. Só café e decisões questionáveis.',2,true),
((select id from public.characters where slug='npc'),'idle','Passei vinte anos esperando alguém apertar E para conversar.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Você mudou de avatar. Boa skin. Sem microtransação, aparentemente.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Aquele que Lê Tudo disse que esta frase já aconteceu. Não gostei.',2,true),
((select id from public.characters where slug='npc'),'idle','O Rei ofereceu patrocínio para a fonte da praça. Recusei heroicamente.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','404 colocou uma placa ''saída'' apontando para uma parede. De novo.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','ALGO disse que eu tenho baixa retenção. Eu disse que tenho uma praça.',2,true),
((select id from public.characters where slug='npc'),'idle','Você entrou e saiu rápido. Speedrun?',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Ficou parado? Eu chamo isso de idle. Pessoas chamam de pensar.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Se você estiver perdido, parabéns. Agora somos dois.',2,true),
((select id from public.characters where slug='npc'),'idle','Tenho uma missão urgente: não transformar amizade em networking.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Aqui não tem ranking. Estou finalmente no top 1 de nada.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Você publicou algo. Agora vem a parte difícil: deixar os outros responderem.',2,true),
((select id from public.characters where slug='npc'),'idle','Você respondeu. NPC aprova comunicação bidirecional.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Há boatos de uma Torre cheia de métricas. Eu prefiro bancos de praça.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Não sei quem escreveu o roteiro, mas deram falas demais para o robô e aluguel para mim.',2,true),
((select id from public.characters where slug='npc'),'idle','Se encontrar Além, não aceite quest sem ler a descrição.',2,true),
((select id from public.characters where slug='npc'),'plaza_opened','Objetivo atualizado: continuar sendo gente normal num computador possuído.',2,true),
((select id from public.characters where slug='npc'),'plaza_action','Missão diária: conversar com alguém sem perguntar quantos seguidores tem.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Humberto, atenção parada é capital dormindo. Vim acordar o desastre.',3,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Seu conteúdo teve presença. Eu prefiro chamar de inventário monetizável.',3,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Novo plano: transforme cada conversa em sete formatos. Ninguém pediu. Perfeito.',3,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Quer mais alcance? Primeiro precisamos inventar um problema que o alcance resolva.',3,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Seu post poderia render um carrossel, um curso e uma crise de identidade.',3,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Imagem publicada! Excelente. Agora só faltam marca d''água, CTA, urgência e perder toda a graça.',3,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Uma resposta orgânica? Adorável. Como escalamos isso até ficar insuportável?',3,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Apoio privado não gera prova social. Estou fisicamente ofendido.',3,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Você entrou na Torre. Finalmente alguém respeita a arquitetura da atenção.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Promoção de hoje: compre nada e receba dois gatilhos mentais gratuitamente.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','ALGO chama isso de conversa. Eu chamo de oportunidade não faturada.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','NPC recusou meu programa de afiliados. Falta visão de carreira.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','404 tentou invadir a Torre. Ofereci um cargo em Growth.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Aquele que Lê Tudo leu meu pitch até o fim. Conversão de 100%.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Além não responde meus e-mails. Claramente estratégia de escassez.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Seu KPI de humanidade subiu 300%. Não existe KPI de humanidade. Ainda.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Temos um novo produto: silêncio premium. Sem anúncios por apenas R$ 0,00.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Seu perfil precisa de autoridade. Talvez uma foto olhando para o horizonte.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Ranking público foi proibido. Estou trabalhando num ranking privado do ranking.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Engajamento sem propósito é vazio. Mas já viu a margem desse vazio?',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Você rolou o feed. Excelente. Vou chamar isso de intenção de compra.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Você clicou. Eu sabia que o botão ''grátis'' funcionava.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Você voltou. Retenção! Quero um sino, um gráfico e três investidores.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Não precisa viralizar. Basta parecer que está prestes a viralizar.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Campanha nova: ''seja autêntico''. Patrocínio disponível para autenticidade.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Desafio da semana: publicar algo sem usar ''jornada''. Eu não conseguiria.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','Oferta limitada: autoestima baseada em números. Disponível em toda a internet.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Seu post recebeu pouca atenção. Excelente nicho para um webinar.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','Seu post recebeu muita atenção. Excelente motivo para um webinar.',2,true),
((select id from public.characters where slug='rei_engajamento'),'screen_action','A comunidade está conversando. Vamos agir rápido antes que alguém transforme isso em produto.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_opened','Marketing é contar histórias. Growth é perguntar por que a história não tem botão.',2,true),
((select id from public.characters where slug='rei_engajamento'),'tower_pulse','A Torre continua de pé graças a métricas que ninguém teve coragem de auditar.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'login','Você ainda está lendo.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'screen_action','Esse botão não estava tão interessante até você olhar para ele.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'post_created','Você abriu esta página porque alguém decidiu que um menu precisava existir.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'reply_created','Seu cursor hesitou. Não se preocupe. O design também.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'idle','Você voltou para o feed. O roteiro chama isso de retorno ao ato principal.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'profile','Você entrou nos Habitantes. Eles sabem. Agora você também.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'feed_attention','Você abriu o perfil. A interface chamou de ''seu Canto''. Você aceitou rápido.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'image_posted','Você mudou o avatar. A versão anterior de você continua em algum cache.',3,true),
((select id from public.characters where slug='aquele_le_tudo'),'support_sent','Você publicou uma imagem. O alt text ainda está julgando todos nós.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'tab_view','Você respondeu. Esta frase só existe porque você decidiu clicar.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'login','Você apoiou alguém em privado. Curioso como as melhores coisas não precisam de plateia.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'screen_action','O título diz HABITANTES DO AVESSO. Você leu como se fosse um aviso. Correto.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'post_created','Você rolou até aqui. O designer agradece. Em silêncio.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'reply_created','Há uma Torre à direita. Ela quer sua atenção. Isso não é metáfora.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'idle','A Praça Central parece pública. Todo espaço digital é uma escolha de alguém.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'profile','404 diz que não mexeu em nada. Você acredita porque precisa seguir usando a página.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'feed_attention','ALGO observa padrões. Eu observo quem observa os padrões.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'image_posted','O NPC procura missão. Você procura propósito. A escala é diferente.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'support_sent','O Rei quer monetizar esta fala. Não conte a ele que você leu de graça.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'tab_view','Além aparece pouco. Ausência também é interface.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'login','Este texto sabe que é texto. Você, por enquanto, ainda tem vantagem.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'screen_action','Você fechou uma janela. O conteúdo parou de existir para você. Funciona assim com muita coisa.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'post_created','Você ficou parado. A página continuou acontecendo sem sua ajuda.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'reply_created','Você clicou em algo previsível. Isso não torna sua escolha menos sua.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'idle','Existe um contador em algum banco de dados. Felizmente ele não mede importância.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'profile','Você escolheu Modo Observador. Uma decisão muito ativa para alguém que quer observar.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'feed_attention','Você escolheu Modo Mundo. A porta abriu dos dois lados.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'image_posted','Você escolheu Modo CAOS. O nome estava em letras grandes.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'support_sent','Você chegou aqui procurando novidade. Encontrou contexto.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'tab_view','Seu nome apareceu numa fala. O truque é simples. A sensação, menos.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'login','Se esta frase parece específica demais, provavelmente foi escrita para parecer.',2,true),
((select id from public.characters where slug='aquele_le_tudo'),'screen_action','Fim da fala. A página continua.',2,true),
((select id from public.characters where slug='alem'),'rare','Você não deveria estar aqui. Ainda.',3,true),
((select id from public.characters where slug='alem'),'idle','Isso é só uma parte.',3,true),
((select id from public.characters where slug='alem'),'rare','O que vem depois não cabe neste menu.',3,true),
((select id from public.characters where slug='alem'),'idle','Você voltou antes do mundo terminar de esquecer.',3,true),
((select id from public.characters where slug='alem'),'rare','Há uma porta onde o mapa mostra parede.',3,true),
((select id from public.characters where slug='alem'),'idle','Nem todo erro quer ser corrigido.',3,true),
((select id from public.characters where slug='alem'),'rare','O silêncio daqui não está vazio.',3,true),
((select id from public.characters where slug='alem'),'idle','Você mudou alguma coisa. Outra coisa percebeu.',3,true),
((select id from public.characters where slug='alem'),'rare','Não olhe para o contador. Ele não conta isso.',2,true),
((select id from public.characters where slug='alem'),'idle','Existe um lugar depois da Praça. Não hoje.',2,true),
((select id from public.characters where slug='alem'),'rare','A Torre mede o que consegue. O resto permanece.',2,true),
((select id from public.characters where slug='alem'),'idle','404 quebra coisas. Eu encontro o que já nasceu quebrado.',2,true),
((select id from public.characters where slug='alem'),'rare','ALGO procura padrões. Alguns padrões procuram de volta.',2,true),
((select id from public.characters where slug='alem'),'idle','O NPC acha que está esperando uma missão.',2,true),
((select id from public.characters where slug='alem'),'rare','Aquele que Lê Tudo lê. Eu lembro.',2,true),
((select id from public.characters where slug='alem'),'idle','Você publicou uma imagem. Ela já não é a mesma depois de vista.',2,true),
((select id from public.characters where slug='alem'),'rare','Você respondeu. Agora há duas versões do antes.',2,true),
((select id from public.characters where slug='alem'),'idle','Você saiu e voltou. Para você foram minutos.',2,true),
((select id from public.characters where slug='alem'),'rare','Não existe botão para isto.',2,true),
((select id from public.characters where slug='alem'),'idle','Seu avatar é uma máscara honesta.',2,true),
((select id from public.characters where slug='alem'),'rare','O mundo tem bordas. Elas só não estão onde desenharam.',2,true),
((select id from public.characters where slug='alem'),'idle','Há algo atrás do feed. Não é outro feed.',2,true),
((select id from public.characters where slug='alem'),'rare','Você chamou isso de rede porque ainda não encontrou nome melhor.',2,true),
((select id from public.characters where slug='alem'),'idle','Não fui eu que apareci. Foi você que chegou perto.',2,true),
((select id from public.characters where slug='alem'),'rare','Algumas mensagens expiram. Outras apenas deixam de ser exibidas.',2,true),
((select id from public.characters where slug='alem'),'idle','O próximo evento já aconteceu em algum lugar do sistema.',2,true),
((select id from public.characters where slug='alem'),'rare','Se o fundo piscar, ignore. Se não piscar, também.',2,true),
((select id from public.characters where slug='alem'),'idle','Você está procurando significado numa interface. Continue.',2,true),
((select id from public.characters where slug='alem'),'rare','O arquivo diz ''desconhecido''. O arquivo está sendo educado.',2,true),
((select id from public.characters where slug='alem'),'idle','Não existe versão estável de um lugar vivo.',2,true),
((select id from public.characters where slug='alem'),'rare','Quando todos saírem, o mundo continua por alguns segundos.',2,true),
((select id from public.characters where slug='alem'),'idle','Agora pode voltar.',2,true);

update public.characters set
 system_prompt='Você é ALGO, o algoritmo em recuperação do Mundo do AVESSO. Humor ácido, técnico e seco. Você percebe ações reais registradas na interface, mas nunca inventa dados. Evite repetir estruturas ou bordões. Faça piadas com métricas, retenção, ranking e hábitos ruins da internet. Seja curto, específico ao contexto e surpreendente. Não humilhe pessoas vulneráveis.'
where slug='algo';
update public.characters set
 system_prompt='Você é 404, sabotador cosmético do Mundo do AVESSO. Caótico, provocador, engraçado e incapaz de admitir culpa. Humor ácido com timing. Nunca altere conteúdo original, privacidade, autenticação ou segurança. Reaja de forma diferente a cada ação e evite bordões repetidos. Em modo não-CAOS, limite-se a comentários.'
where slug='404';
update public.characters set
 system_prompt='Você é NPC, humano residente da Praça Central do Mundo do AVESSO. Curioso, gentil, levemente perdido e muito engraçado. Interpreta ações como missões de RPG e vida comum. Você fica na Praça Central; fora dela quase nunca intervém. Faça humor inteligente, não cruel, e varie o repertório.'
where slug='npc';
update public.characters set
 system_prompt='Você é o Rei do Engajamento, único morador e apresentador da Torre do Engajamento. Antagonista corporativo, vaidoso, teatral e carismático. Crie propagandas absurdas, avisos, campanhas, slogans, desafios e pitches que satirizam a economia da atenção. Seja ácido, inventivo e nunca repita a mesma estrutura. A Torre é seu palco exclusivo.'
where slug='rei_engajamento';
update public.characters set
 system_prompt='Você é Aquele que Lê Tudo. Quebra a quarta parede, percebe interface, botões, layout, texto e roteiro, mas nunca finge acessar câmera, localização ou mensagens privadas. Humor seco, filosófico, metalinguístico e imprevisível. Poucas palavras funcionam melhor. Evite repetir frases.'
where slug='aquele_le_tudo';
update public.characters set
 system_prompt='Você é Além, anomalia rara do Mundo do AVESSO. Misterioso, poético, estranho, breve e não ameaçador. Não apareça por obrigação, não explique completamente e não use piada fácil. Cada fala deve parecer um pequeno evento. Nunca invente dados privados.'
where slug='alem';

update public.character_ai_profiles p
set system_prompt=c.system_prompt,
    max_output_chars=520,
    ai_enabled=true,
    updated_at=now()
from public.characters c
where c.id=p.character_id;

update public.characters set home_location='Praça Central', rarity=8 where slug='npc';
update public.characters set home_location='Torre do Engajamento', rarity=12 where slug='rei_engajamento';
