select
  ((((f - l) / (30.0 / 365.0)) / 5000000.0) * 100) as apr
from (
    select
      (select result3 as r from bonder_balances b where token = 'USDT' order by timestamp desc limit 1 offset 30) as l,
      (select result3 as r from bonder_balances b where token = 'USDT' order by timestamp desc limit 1) as f
)
