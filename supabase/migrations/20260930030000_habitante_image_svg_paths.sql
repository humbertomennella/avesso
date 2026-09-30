update public.characters set image_path=case slug
  when 'algo' then 'assets/habitantes/algo.svg'
  when '404' then 'assets/habitantes/404.svg'
  when 'npc' then 'assets/habitantes/npc.svg'
  when 'rei_engajamento' then 'assets/habitantes/rei-engajamento.svg'
  when 'aquele_le_tudo' then 'assets/habitantes/aquele-le-tudo.svg'
  when 'alem' then 'assets/habitantes/alem.svg'
  else image_path end
where slug in ('algo','404','npc','rei_engajamento','aquele_le_tudo','alem');
