-- AVESSO // Economia v3 - hardening do Mercado + Trocas
-- Escrows continuam invisiveis para clientes; policies explicitas eliminam ambiguidade no RLS.

drop policy if exists avesso_market_escrow_client_deny on public.avesso_market_escrow;
create policy avesso_market_escrow_client_deny
on public.avesso_market_escrow for select
to authenticated
using (false);

drop policy if exists avesso_trade_escrow_client_deny on public.avesso_trade_escrow;
create policy avesso_trade_escrow_client_deny
on public.avesso_trade_escrow for select
to authenticated
using (false);

create index if not exists avesso_market_listings_item_idx
  on public.avesso_market_listings(item_id);
create index if not exists avesso_market_listings_buyer_idx
  on public.avesso_market_listings(buyer_id)
  where buyer_id is not null;
create index if not exists avesso_market_escrow_item_idx
  on public.avesso_market_escrow(item_id);
create index if not exists avesso_trade_lines_item_idx
  on public.avesso_trade_lines(item_id);
create index if not exists avesso_trade_escrow_item_idx
  on public.avesso_trade_escrow(item_id);
