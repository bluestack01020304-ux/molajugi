import { FunctionsHttpError } from '@supabase/supabase-js';

import type { Category, Draw, Listing, ListingSecret, Settlement } from './database.types';
import { addDays, todayKst } from './format';
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
  OWN_LISTING: '내가 올린 기프티콘은 뽑을 수 없어요',
  SETTLEMENT_NOT_HELD: '이미 처리된 건이에요',
  NOT_BUYER: '당첨자만 처리할 수 있어요',
  EXPIRY_TOO_SOON: '유효기간이 2일 이상 남아야 올릴 수 있어요',
  INVALID_PROBABILITY: '확률 보기를 다시 골라 주세요',
  BAD_REQUEST: '입력값을 확인해 주세요',
  UNAUTHORIZED: '다시 로그인해 주세요',
};

const DEFAULT_MESSAGE = '잠시 후 다시 시도해 주세요';

export function messageFor(code: string): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}

export async function fetchActiveListings(category: Category | 'all'): Promise<Listing[]> {
  let q = supabase.from('listings').select('*').eq('status', 'active')
    .gte('expires_on', addDays(todayKst(), 2));
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
    if (listing && settlement) wins.push({ draw: d, listing, settlement });
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

export async function settle(
  drawId: string,
  action: 'confirm' | 'report',
): Promise<{ status: string }> {
  return invoke('settle', { draw_id: drawId, action });
}
