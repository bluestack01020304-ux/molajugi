-- 판매자가 자기 매물의 뽑기 기록(draw_id -> listing_id 연결)을 읽을 수 있게 한다.
-- 내 판매 화면이 매물별 정산액을 합산하는 데 필요하다.
create policy draws_select_seller on draws for select to authenticated
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()));
