-- Compatibilidade com o seletor ponderado atual do world-character.
-- Números menores = mais frequentes nesta versão do motor.
update public.characters set rarity=case slug
  when 'algo' then 10
  when 'npc' then 12
  when '404' then 22
  when 'rei_engajamento' then 30
  when 'aquele_le_tudo' then 45
  when 'alem' then 1000
  else rarity end
where slug in ('algo','npc','404','rei_engajamento','aquele_le_tudo','alem');
