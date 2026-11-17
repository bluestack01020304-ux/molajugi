-- 매물마다 사진을 두 장 둔다.
--  - 원본(전체) 사진: 기존 listing_secrets.image_path. 비공개 버킷 gifticons, 판매자와 당첨자만 본다.
--  - 보여주는 사진: listings.preview_path. 바코드를 잘라 낸 사진으로, 목록과 상세에서 누구나 본다.
-- 이 마이그레이션 전에 올라온 매물은 보여주는 사진이 없다(null).

alter table public.listings add column preview_path text;

-- 보여주는 사진은 공개해도 되는 사진이므로 공개 버킷에 둔다 (주소만 알면 볼 수 있고, 서명 URL이 필요 없다).
insert into storage.buckets (id, name, public) values ('previews', 'previews', true)
on conflict (id) do nothing;

-- 올리기는 로그인한 사용자가 자기 폴더({uid}/...)에만.
create policy previews_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);
