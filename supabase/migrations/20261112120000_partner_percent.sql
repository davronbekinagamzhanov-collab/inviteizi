-- v2, ночная доводка: ставка партнёра в процентах («договор»): 10 / 15 / 20 % или свой процент от фактически
-- оплаченной суммы, округление до целых тенге. rate_percent = null — прежняя фиксированная сумма (rate), как у старых партнёров.
-- Смена ставки действует только для новых заказов: начисление записывается суммой в момент оплаты.
-- Применять по «да» владельца, после 20261107120000_partners_v2.sql, до Merge.
alter table public.partners
  add column if not exists rate_percent smallint check (rate_percent between 0 and 100),
  add column if not exists proposed_rate_percent smallint check (proposed_rate_percent between 0 and 100);
