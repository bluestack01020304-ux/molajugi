-- 당첨자(구매자)가 자기 뽑기의 정산 행을 읽을 수 있게 한다.
-- 내 기프티콘 목록과 당첨 바코드 화면이 정산 상태(held/confirmed ...)를 보여 주는 데 필요하다.
create policy settlements_select_buyer on public.settlements for select to authenticated
  using (buyer_id = auth.uid());
