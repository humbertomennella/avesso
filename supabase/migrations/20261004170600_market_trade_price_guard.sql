-- Mantem o preco do Mercado dentro do tipo integer usado pelo ledger.
alter table public.avesso_market_listings
  drop constraint if exists avesso_market_price_ledger_range,
  add constraint avesso_market_price_ledger_range
  check (price_saldo between 1 and 2147483647);
