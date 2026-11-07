-- 매일 UTC 0시(KST 9시)에 daily 함수를 호출한다.
-- 배포 시: alter database postgres set app.daily_url = '…'; alter database postgres set app.service_key = '…';
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'molajugi-daily',
  '0 0 * * *',
  $$select net.http_post(
    url := current_setting('app.daily_url', true),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_key', true),
      'Content-Type', 'application/json'),
    body := '{}'::jsonb)$$
);
