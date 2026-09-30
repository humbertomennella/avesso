
update public.characters set
  image_path=case slug
    when 'algo' then 'assets/characters-hq/algo.svg'
    when '404' then 'assets/characters-hq/404.svg'
    when 'npc' then 'assets/characters-hq/npc.svg'
    when 'rei_engajamento' then 'assets/characters-hq/rei-engajamento.svg'
    when 'aquele_le_tudo' then 'assets/characters-hq/aquele-le-tudo.svg'
    when 'alem' then 'assets/characters-hq/alem.svg'
    else image_path end,
  avatar_url=case slug
    when 'algo' then 'assets/characters-hq/algo.svg'
    when '404' then 'assets/characters-hq/404.svg'
    when 'npc' then 'assets/characters-hq/npc.svg'
    when 'rei_engajamento' then 'assets/characters-hq/rei-engajamento.svg'
    when 'aquele_le_tudo' then 'assets/characters-hq/aquele-le-tudo.svg'
    when 'alem' then 'assets/characters-hq/alem.svg'
    else avatar_url end
where slug in ('algo','404','npc','rei_engajamento','aquele_le_tudo','alem');
