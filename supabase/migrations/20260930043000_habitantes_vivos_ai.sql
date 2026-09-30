-- AVESSO.SYS — habitantes vivos com IA
-- Consolida o elenco canônico, liga os cérebros individuais e aponta para os retratos oficiais.

update public.characters set
  image_path='assets/characters/algo.webp',
  avatar_url='assets/characters/algo.webp',
  personality='Técnico, sarcástico, curioso, culpado pelo passado e secretamente protetor.',
  home_location='Oficina do ALGO',
  presence_state='working',
  rarity=10,
  ai_enabled=true
where slug='algo';

update public.characters set
  image_path='assets/characters/404.webp',
  avatar_url='assets/characters/404.webp',
  personality='Caótico, teatral, brincalhão e incapaz de admitir culpa. Considera interfaces organizadas uma afronta pessoal.',
  home_location='Beco 404',
  presence_state='missing',
  rarity=22,
  ai_enabled=true
where slug='404';

update public.characters set
  image_path='assets/characters/npc.webp',
  avatar_url='assets/characters/npc.webp',
  personality='Humano comum que cansou de ser figurante. Curioso, gentil, observador e apaixonado por missões secundárias.',
  home_location='Praça Central',
  presence_state='wandering',
  rarity=12,
  ai_enabled=true
where slug='npc';

update public.characters set
  image_path='assets/characters/rei-engajamento.webp',
  avatar_url='assets/characters/rei-engajamento.webp',
  personality='Vaidoso, teatral, carismático e corporativo. Acredita sinceramente que amizade pode ser transformada em funil.',
  home_location='Torre do Engajamento',
  presence_state='working',
  rarity=30,
  ai_enabled=true
where slug='rei_engajamento';

update public.characters set
  name='Aquele que Lê Tudo',
  role='quebra a quarta parede',
  image_path='assets/characters/aquele-le-tudo.webp',
  avatar_url='assets/characters/aquele-le-tudo.webp',
  personality='Calmo, enigmático, filosófico e sarcasticamente atento. Percebe a interface e o roteiro sem fingir acesso a dados privados.',
  home_location='Arquivo Morto',
  presence_state='observing',
  rarity=45,
  ai_enabled=true
where slug='aquele_le_tudo';

update public.characters set
  image_path='assets/characters/alem.webp',
  avatar_url='assets/characters/alem.webp',
  personality='Raro, misterioso, poético e inquietante sem ser ameaçador. Nunca aparece apenas para preencher silêncio.',
  home_location='Além',
  presence_state='offline',
  rarity=1000,
  ai_enabled=true
where slug='alem';

-- Cada habitante possui cérebro separado, mesmo modelo econômico por padrão e prompt próprio.
update public.character_ai_profiles p
set ai_enabled=true,
    model='gpt-5.6-luna',
    updated_at=now()
from public.characters c
where c.id=p.character_id
  and c.slug in ('algo','404','npc','rei_engajamento','aquele_le_tudo','alem');

-- Mantém a persona canônica numa única fonte usada também pelo motor de eventos legado.
update public.characters c
set system_prompt=p.system_prompt
from public.character_ai_profiles p
where p.character_id=c.id;

-- Presença inicial coerente com o mundo.
insert into public.character_presence(character_id,location,activity,mood,status,next_action_at)
select id,
  case slug
    when 'algo' then 'Oficina do ALGO'
    when '404' then 'Beco 404'
    when 'npc' then 'Praça Central'
    when 'rei_engajamento' then 'Torre do Engajamento'
    when 'aquele_le_tudo' then 'Arquivo Morto'
    when 'alem' then 'Além'
  end,
  case slug
    when 'algo' then 'organizando o que não deveria virar métrica'
    when '404' then 'não fazendo nada, segundo ele'
    when 'npc' then 'procurando uma missão secundária'
    when 'rei_engajamento' then 'preparando um dashboard para ninguém'
    when 'aquele_le_tudo' then 'lendo a interface'
    when 'alem' then 'ausente'
  end,
  case slug
    when '404' then 'suspeito'
    when 'alem' then 'indefinido'
    else 'neutro'
  end,
  case slug
    when '404' then 'hidden'
    when 'alem' then 'unknown'
    else 'online'
  end,
  now() + interval '15 minutes'
from public.characters
where slug in ('algo','404','npc','rei_engajamento','aquele_le_tudo','alem')
on conflict (character_id) do update set
  location=excluded.location,
  activity=excluded.activity,
  mood=excluded.mood,
  status=excluded.status,
  updated_at=now();
