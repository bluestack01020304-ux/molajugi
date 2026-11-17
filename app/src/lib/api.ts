import { FunctionsHttpError } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  Category,
  Draw,
  Listing,
  ListingSecret,
  Notification,
  Probability,
  Settlement,
} from './database.types';
import { MIN_DRAWABLE_DAYS, addDays, todayKst } from './format';
import { imageKind } from './imageKind';
import { DEFAULT_RULES } from './rules';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = 'ApiError';
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '포인트가 부족해요',
  LISTING_NOT_ACTIVE: '이미 끝난 기프티콘이에요',
  LISTING_NOT_FOUND: '기프티콘을 찾을 수 없어요',
  LISTING_LOCKED: '이미 뽑은 사람이 있어서 액면가·확률·유효기간은 바꿀 수 없어요',
  OWN_LISTING: '내가 올린 기프티콘은 뽑을 수 없어요',
  SETTLEMENT_NOT_HELD: '이미 처리된 건이에요',
  NOT_BUYER: '당첨자만 처리할 수 있어요',
  INVALID_PROBABILITY: '확률 보기를 다시 골라 주세요',
  BAD_REQUEST: '입력값을 확인해 주세요',
  UNAUTHORIZED: '다시 로그인해 주세요',
  NOT_AN_IMAGE: 'JPG나 PNG 사진만 올릴 수 있어요',
};

const DEFAULT_MESSAGE = '잠시 후 다시 시도해 주세요';

/** 오류 코드를 사용자 문구로. 규칙값이 들어가는 문구는 rules(useRules 값)로 만든다. */
export function messageFor(
  code: string,
  rules: { minDaysToList: number } = DEFAULT_RULES,
): string {
  if (code === 'EXPIRY_TOO_SOON') return `유효기간이 ${rules.minDaysToList}일 이상 남아야 올릴 수 있어요`;
  return ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}

export async function fetchActiveListings(category: Category | 'all'): Promise<Listing[]> {
  let q = supabase.from('listings').select('*').eq('status', 'active')
    .gte('expires_on', addDays(todayKst(), MIN_DRAWABLE_DAYS));
  if (category !== 'all') q = q.eq('category', category);
  const { data, error } = await q.order('expires_on', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchListing(id: string): Promise<Listing> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('LISTING_NOT_FOUND');
  return data;
}

export async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let code = 'INTERNAL';
      try {
        const json = await error.context.json();
        code = json?.error ?? 'INTERNAL';
      } catch {
        // 본문이 JSON이 아니면 INTERNAL
      }
      throw new ApiError(code);
    }
    throw new ApiError('INTERNAL');
  }
  return data as T;
}

export async function draw(
  listingId: string,
): Promise<{ draw_id: string; result: 'win' | 'miss'; balance: number }> {
  return invoke('draw', { listing_id: listingId });
}

export type Win = { draw: Draw; listing: Listing; settlement: Settlement };

export async function fetchMyWins(): Promise<Win[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new ApiError('UNAUTHORIZED');
  const { data: draws, error } = await supabase
    .from('draws')
    .select('*')
    .eq('buyer_id', uid)
    .eq('result', 'win')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!draws || draws.length === 0) return [];
  const listingIds = draws.map((d) => d.listing_id).filter((x): x is string => !!x);
  const [l, s] = await Promise.all([
    supabase.from('listings').select('*').in('id', listingIds),
    supabase.from('settlements').select('*').in('draw_id', draws.map((d) => d.id)),
  ]);
  if (l.error) throw l.error;
  if (s.error) throw s.error;
  const listings = new Map((l.data ?? []).map((x) => [x.id, x]));
  const settlements = new Map((s.data ?? []).map((x) => [x.draw_id, x]));
  const wins: Win[] = [];
  for (const d of draws) {
    const listing = d.listing_id ? listings.get(d.listing_id) : undefined;
    const settlement = settlements.get(d.id);
    if (!listing || !settlement) {
      // 당첨 draw에는 상품과 정산 행이 반드시 있어야 한다. 없으면 RLS/데이터 문제이므로 조용히 버리지 않는다.
      console.warn(`fetchMyWins: draw ${d.id} is missing ${!listing ? 'listing' : 'settlement'}`);
      throw new ApiError('INTERNAL');
    }
    wins.push({ draw: d, listing, settlement });
  }
  return wins;
}

export async function fetchWinDetail(drawId: string): Promise<{
  draw: Draw;
  listing: Listing;
  secret: ListingSecret;
  settlement: Settlement;
}> {
  const { data: d, error } = await supabase.from('draws').select('*').eq('id', drawId).maybeSingle();
  if (error) throw error;
  if (!d || !d.listing_id) throw new ApiError('BAD_REQUEST');
  const [l, sec, st] = await Promise.all([
    supabase.from('listings').select('*').eq('id', d.listing_id).maybeSingle(),
    supabase.from('listing_secrets').select('*').eq('listing_id', d.listing_id).maybeSingle(),
    supabase.from('settlements').select('*').eq('draw_id', drawId).maybeSingle(),
  ]);
  if (l.error) throw l.error;
  if (sec.error) throw sec.error;
  if (st.error) throw st.error;
  if (!l.data || !sec.data || !st.data) throw new ApiError('BAD_REQUEST');
  return { draw: d, listing: l.data, secret: sec.data, settlement: st.data };
}

export async function signedImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('gifticons').createSignedUrl(path, 600);
  if (error || !data) throw error ?? new ApiError('INTERNAL');
  return data.signedUrl;
}

/** 내려받기용 주소: 서버가 "파일로 저장" 헤더와 파일 이름을 붙여 준다. 10분 동안만 유효하다. */
export async function signedDownloadUrl(path: string, fileName: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('gifticons')
    .createSignedUrl(path, 600, { download: fileName });
  if (error || !data) throw error ?? new ApiError('INTERNAL');
  return data.signedUrl;
}

export async function settle(
  drawId: string,
  action: 'confirm' | 'report',
): Promise<{ status: string }> {
  return invoke('settle', { draw_id: drawId, action });
}

export type CreateListingInput = {
  category: Category;
  brand: string;
  product_name: string;
  face_value: number;
  expires_on: string;
  probability: Probability;
  /** 원본(전체) 사진: 비공개 버킷 gifticons 안의 경로 */
  image_path: string;
  /** 보여주는 사진(바코드를 잘라 낸 사진): 공개 버킷 previews 안의 경로 */
  preview_path: string;
  barcode_number?: string;
};

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new ApiError('UNAUTHORIZED');
  return uid;
}

/**
 * 고른 사진의 내용을 읽는다.
 * 폰에서는 fetch로 기기 안의 파일을 읽으면 사진 대신 "File not found"라는 글자가 돌아오는 경우가 있어
 * (안드로이드에서 실제로 그렇게 올라갔다), 파일 시스템 API로 직접 읽는다. 웹은 fetch로 읽는다.
 */
async function readImage(uri: string): Promise<{ body: ArrayBuffer; kind: 'png' | 'jpeg' }> {
  const body =
    Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
  const kind = imageKind(new Uint8Array(body));
  // 사진이 아닌 내용은 올리지 않는다.
  if (!kind) throw new ApiError('NOT_AN_IMAGE');
  return { body, kind };
}

/** 고른 사진을 버킷의 `{uid}/...`에 올리고 경로를 돌려준다. PNG는 PNG로, JPEG는 JPEG로 올린다. */
async function uploadImage(bucket: 'gifticons' | 'previews', uri: string): Promise<string> {
  const uid = await currentUserId();
  const { body, kind } = await readImage(uri);
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const path = `${uid}/${name}.${kind === 'png' ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: kind === 'png' ? 'image/png' : 'image/jpeg' });
  if (error) throw new ApiError('INTERNAL');
  return path;
}

/** 원본(전체) 사진을 비공개 버킷에 올린다. 판매자와 당첨자만 볼 수 있다. */
export function uploadGifticonImage(uri: string): Promise<string> {
  return uploadImage('gifticons', uri);
}

/** 보여주는 사진(바코드를 잘라 낸 사진)을 공개 버킷에 올린다. 목록에서 누구나 본다. */
export function uploadPreviewImage(uri: string): Promise<string> {
  return uploadImage('previews', uri);
}

/** 원본 사진에서 읽어 낸 정보. 못 읽은 항목은 null (서버 gifticon-reading.ts와 같은 모양). */
export type GifticonReading = {
  brand: string | null;
  product_name: string | null;
  face_value: number | null;
  expires_on: string | null;
  barcode_number: string | null;
  category: Category | null;
};

export type GifticonReadResult = {
  fields: GifticonReading;
  /** 바코드 막대의 윗변이 사진 높이의 어디쯤인지 (0~1). 바코드를 못 찾았으면 null. */
  barcodeTop: number | null;
  /** 서버가 글자 읽기(AI)까지 했는지. false면 바코드 번호만 읽은 것이다. */
  ai: boolean;
};

/**
 * 올린 원본 사진을 서버가 읽어 폼을 채울 정보를 돌려준다.
 * 바코드 번호와 위치는 항상(바코드 무늬 해독), 나머지 글자는 서버에 AI 키가 있을 때만 읽는다.
 */
export async function readGifticon(imagePath: string): Promise<GifticonReadResult> {
  const r = await invoke<{ fields: GifticonReading; barcode_top: number | null; ai: boolean }>(
    'read-gifticon',
    { image_path: imagePath },
  );
  return { fields: r.fields, barcodeTop: r.barcode_top, ai: r.ai };
}

export async function createListing(input: CreateListingInput): Promise<{ id: string; price: number }> {
  return invoke('create-listing', input);
}

export type MyListing = Listing & { settled_net: number; settlement_status: string | null };

const SETTLED = ['completed', 'confirmed', 'auto_released'];

export async function fetchMyListings(): Promise<MyListing[]> {
  const uid = await currentUserId();
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!listings || listings.length === 0) return [];
  const ids = listings.map((l) => l.id);
  // 판매자는 자기 매물의 draws(0004 정책)와 자기 settlements를 읽을 수 있다.
  const [d, s] = await Promise.all([
    supabase.from('draws').select('id, listing_id').in('listing_id', ids),
    supabase.from('settlements').select('draw_id, net, status, created_at').eq('seller_id', uid),
  ]);
  if (d.error) throw d.error;
  if (s.error) throw s.error;
  const drawToListing = new Map((d.data ?? []).map((x) => [x.id, x.listing_id]));
  const net = new Map<string, number>();
  const latest = new Map<string, { status: string; at: string }>();
  for (const st of s.data ?? []) {
    const lid = st.draw_id ? drawToListing.get(st.draw_id) : undefined;
    if (!lid) continue;
    if (SETTLED.includes(st.status)) net.set(lid, (net.get(lid) ?? 0) + st.net);
    const at = st.created_at ?? '';
    const prev = latest.get(lid);
    if (!prev || at > prev.at) latest.set(lid, { status: st.status, at });
  }
  return listings.map((l) => ({
    ...l,
    settled_net: net.get(l.id) ?? 0,
    settlement_status: l.status === 'won' ? (latest.get(l.id)?.status ?? null) : null,
  }));
}

/** 판매자 본인이 보는 매물 한 건. 당첨으로 넘어간 매물은 사진·바코드를 더 볼 수 없어 secret이 null이다. */
export async function fetchMyListing(
  id: string,
): Promise<{ listing: MyListing; secret: ListingSecret | null }> {
  const [all, sec] = await Promise.all([
    fetchMyListings(),
    supabase.from('listing_secrets').select('*').eq('listing_id', id).maybeSingle(),
  ]);
  const listing = all.find((l) => l.id === id);
  if (!listing) throw new ApiError('LISTING_NOT_FOUND');
  if (sec.error) throw sec.error;
  return { listing, secret: sec.data };
}

/** 사진 경로는 그 사진을 바꿀 때만 보낸다. 가격은 서버가 다시 계산해 돌려준다. */
export type UpdateListingInput = Omit<CreateListingInput, 'image_path' | 'preview_path'> & {
  id: string;
  image_path?: string;
  preview_path?: string;
};

export async function updateListing(input: UpdateListingInput): Promise<{ id: string; price: number }> {
  return invoke('update-listing', input);
}

export async function withdrawListing(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('status', 'active')
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new ApiError('LISTING_NOT_ACTIVE');
}

export async function topup(): Promise<{ balance: number }> {
  return invoke('topup', {});
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markAllRead(): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', uid)
    .eq('read', false);
  if (error) throw error;
}

export async function savePushToken(token: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
  if (error) throw error;
}
