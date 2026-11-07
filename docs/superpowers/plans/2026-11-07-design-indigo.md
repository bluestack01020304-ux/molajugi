# 몰아주기 디자인(당근 틀 + 인디고) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 앱 화면을 당근마켓 틀과 인디고 포인트 하나로 다시 입힌다. 동선·데이터·서버는 그대로.

**Architecture:** 색·글자·모서리·간격 토큰을 `app/src/lib/theme.ts` 한 파일에 두고, 반복되는 버튼·FAB·썸네일은 공용 컴포넌트로 뺀다. 화면 파일은 토큰과 공용 컴포넌트만 쓰고 색 리터럴을 직접 쓰지 않는다. 마지막 작업에서 "화면 코드에 hex 리터럴이 남아 있지 않다"를 Jest로 고정한다.

**Tech Stack:** Expo SDK 58, React Native `StyleSheet`, `@expo/vector-icons`(Ionicons, Expo Go 포함), jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-07-design-indigo-design.md`

## Global Constraints

- 토큰 값은 스펙 그대로: `primary #3B5BDB`, `primarySoft #EDF2FF`, `ink #212124`, `sub #868B94`, `faint #ADB1BA`, `line #F2F3F6`, `bg #FFFFFF`, `bg2 #F7F8FA`, `danger #E03131`, `dangerSoft #FFF0F0`, `coatA #C9CCD3`, `coatB #BFC3CB`; 뱃지 `hold #FFF4D6/#9A6B00`, `ok #E6F6EA/#1E7B3A`, `muted #F1F3F5/sub`.
- 색 hex 리터럴은 `app/src/lib/theme.ts`에만 존재한다. 다른 `app/src/**/*.tsx`에는 `#RRGGBB`가 없다.
- 동작 변경 없음: 모든 이벤트 핸들러, 쿼리, 라우트, 문구(안내문·버튼 라벨)는 그대로. 단 스펙이 바꾼 것만 예외: 헤더 포인트 잔액 제거, 홈 헤더 종 아이콘(내 정보 탭 이동), 내 판매 상단 버튼 → FAB.
- 기존 Jest 11개, `tsc --noEmit`, `expo export --platform web` 유지.
- 새 패키지는 `@expo/vector-icons` 하나뿐.
- 한국어 문구, 시스템 글꼴.

## Review Focus

1. FAB가 목록 마지막 행을 가린다. 목록 `contentContainerStyle`에 하단 여백 96이 있어야 한다. → Task 2·4 코드 리뷰 항목(화면 컴포넌트는 Supabase 의존이라 단위 테스트 대신 리뷰로 고정).
2. 긴 상품명이 가격 줄을 밀어내 확률이 잘린다. 제목은 `numberOfLines={1}`, 가격 줄은 `flexShrink: 0`. → Task 2 `listing_row_truncates_long_title`
3. 포인트가 부족할 때 상세 버튼이 비활성이고 안내문이 보여야 한다(기존 동작 유지). → Task 3 `detail_disabled_when_insufficient`
4. 색 리터럴이 화면 파일에 다시 생겨 토큰과 어긋난다. → Task 5 `no_hex_literals_outside_theme`
5. 탭 아이콘이 선택/비선택을 구분 못 한다(둘 다 같은 색). → Task 2 코드 리뷰 항목(`tabBarIcon`의 `color` 인자를 그대로 써야 하고 하드코딩 색 금지).

---

## 파일 구조

```
app/src/lib/theme.ts                 # 토큰: colors, type, radius, space (유일한 hex 출처)
app/src/lib/__tests__/theme.test.ts  # 토큰 값 고정 + hex 리터럴 금지 검사(Task 5에서 확장)
app/src/components/ui/Button.tsx     # variant: primary | soft | outline | danger, disabled, busy
app/src/components/ui/Fab.tsx        # 떠 있는 "+ 올리기" 버튼
app/src/components/ui/Thumb.tsx      # 카테고리 아이콘 네모 썸네일 (size 72 | 52)
app/src/components/ui/Icon.tsx       # Ionicons 얇은 래퍼
app/src/components/ListingRow.tsx    # C안 행
app/src/components/CategoryChips.tsx # 테두리 칩
app/src/components/StatusBadge.tsx   # 토큰 사용
app/src/components/PresetPicker.tsx  # 인디고 선택
app/src/components/ScratchCard.tsx   # 코팅·결과 색
app/src/app/(tabs)/_layout.tsx       # 헤더·탭바
app/src/app/(tabs)/{index,gifticons,sell,profile}.tsx
app/src/app/{listing,draw,gifticon}/[id].tsx, sell/new.tsx, login.tsx
```

---

### Task 1: 토큰과 공용 UI 컴포넌트

**Files:**
- Create: `app/src/lib/theme.ts`, `app/src/lib/__tests__/theme.test.ts`, `app/src/components/ui/Button.tsx`, `app/src/components/ui/Fab.tsx`, `app/src/components/ui/Thumb.tsx`, `app/src/components/ui/Icon.tsx`
- Modify: `app/package.json` (`npx expo install @expo/vector-icons`)

**Interfaces:**
- Produces (`theme.ts`):
  - `export const colors = { primary, primarySoft, ink, sub, faint, line, bg, bg2, danger, dangerSoft, coatA, coatB, holdBg, holdFg, okBg, okFg, mutedBg } as const` (값은 Global Constraints).
  - `export const type = { screenTitle: { fontSize: 20, fontWeight: '800' }, headerTitle: { fontSize: 18, fontWeight: '700' }, rowTitle: { fontSize: 15, fontWeight: '500' }, price: { fontSize: 15, fontWeight: '700' }, priceBig: { fontSize: 20, fontWeight: '800' }, meta: { fontSize: 12, color: sub }, body: { fontSize: 14 }, button: { fontSize: 15, fontWeight: '700' }, label: { fontSize: 13, fontWeight: '600', color: sub } } as const` (TextStyle 호환).
  - `export const radius = { sm: 8, md: 12, pill: 20, fab: 24 } as const`; `export const space = { screen: 16, row: 14, gap: 12 } as const`.
- Produces (components):
  - `Button({ title, onPress, variant = 'primary', disabled, busy, style })` — `variant: 'primary' | 'soft' | 'outline' | 'danger'`; primary = primary 바탕 흰 글씨, soft = primarySoft 바탕 primary 글씨, outline = bg 바탕 line 테두리 ink 글씨, danger = bg 바탕 danger 테두리·글씨; `disabled` → 바탕 `faint`(primary/soft) 또는 흐림 0.5(outline/danger); `busy` → `ActivityIndicator` 흰색/primary. 높이 48, 모서리 md, 글자 `type.button`.
  - `Fab({ label = '+ 올리기', onPress })` — 절대 위치 right 16 / bottom 16, primary 바탕, 흰 글씨 14/700, 모서리 fab, 그림자(`shadowColor: primary, shadowOpacity 0.3, shadowRadius 10, elevation 6`).
  - `Thumb({ category, size = 72 })` — bg2 바탕, 모서리 sm, 가운데 `CATEGORY_EMOJI` 글자 크기 `size * 0.42`.
  - `Icon({ name, size = 22, color = colors.ink })` — `Ionicons` 그대로 전달하는 래퍼 (`name: keyof typeof Ionicons.glyphMap`).

- [ ] **Step 1: 패키지 설치** — `cd app && npx expo install @expo/vector-icons`.
- [ ] **Step 2: 실패하는 테스트 작성** — `app/src/lib/__tests__/theme.test.ts`

```ts
import { colors, radius, space, type } from '../theme';
test('primary is indigo and karrot orange is gone', () => {
  expect(colors.primary).toBe('#3B5BDB');
  expect(Object.values(colors)).not.toContain('#e8531f');
});
test('tokens carry the spec values', () => {
  expect(colors.ink).toBe('#212124'); expect(colors.sub).toBe('#868B94'); expect(colors.line).toBe('#F2F3F6');
  expect(radius).toEqual({ sm: 8, md: 12, pill: 20, fab: 24 });
  expect(space.screen).toBe(16);
  expect(type.priceBig).toEqual({ fontSize: 20, fontWeight: '800' });
});
```

- [ ] **Step 3: 실패 확인** — `npm test` → FAIL (module not found).
- [ ] **Step 4: `theme.ts`와 네 컴포넌트 구현** — Interfaces대로.
- [ ] **Step 5: 통과 확인** — `npm test` 13/13, `npx tsc --noEmit` 깨끗.
- [ ] **Step 6: Commit** — `git commit -m "feat(app): 디자인 토큰과 공용 UI 컴포넌트"`

---

### Task 2: 탭바·홈 헤더·홈 목록 (C안)

**Files:**
- Modify: `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `app/src/components/ListingRow.tsx`, `app/src/components/CategoryChips.tsx`
- Test: `app/src/components/__tests__/ListingRow.test.tsx`

**Interfaces:**
- Consumes: Task 1 전부.
- Produces: `ListingRow({ listing, onPress })` 시그니처 유지. 행 구조: `Thumb(72)` · 가운데 열(제목 `${brand} ${product_name}` 1줄 말줄임, 메타 `${CATEGORY_LABELS[cat]} · ${daysLeftLabel}`, 가격 줄 `[probability%](primary 800) [formatWon(price)](price) [formatWon(face_value)](faint 취소선 12)`). 확률 배지 제거.
- `CategoryChips`: 칩 = bg 바탕, line 테두리 1, 모서리 pill, 글자 14 ink; 선택 = ink 바탕 흰 글씨. 하단 구분선 line.
- `(tabs)/_layout.tsx`: `screenOptions = { headerShadowVisible: false, headerTitleAlign: 'left', headerTitleStyle: type.headerTitle, headerStyle: { backgroundColor: colors.bg }, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.sub, tabBarLabelStyle: { fontSize: 10 }, tabBarStyle: { borderTopColor: colors.line } }`. `headerRight` 제거(잔액 삭제). index 탭만 `headerTitle: () => <Text style={type.screenTitle}>몰아주기</Text>`, `headerRight: 종 아이콘(미읽음>0이면 primary 점) → router.navigate('/(tabs)/profile')`. 탭 아이콘: `tabBarIcon: ({ focused, color }) => <Icon name={focused ? 'home' : 'home-outline'} color={color} />` (ticket, pricetag, person 동일 패턴).
- `index.tsx`: 로딩 색 primary, 재시도 버튼 `Button variant="soft"`, `FlatList contentContainerStyle={{ paddingBottom: 96 }}`(빈 상태와 합쳐서), 화면 바탕 bg, 오른쪽 아래 `Fab onPress={() => router.push('/sell/new')}`.

- [ ] **Step 1: 실패하는 테스트 작성** — `ListingRow.test.tsx` (react-native 렌더는 `react-test-renderer`가 jest-expo에 포함됨)

```tsx
import { create } from 'react-test-renderer';
import { ListingRow } from '../ListingRow';
const base = { id: '1', seller_id: 's', category: 'cafe', brand: '스타벅스', product_name: '아메리카노 T', face_value: 4500, expires_on: '2099-01-01', probability: 50, price: 2250, status: 'active', miss_count: 0, created_at: '' } as any;
test('listing_row_shows_probability_price_and_struck_face', () => {
  const r = create(<ListingRow listing={base} onPress={() => {}} />);
  const texts = r.root.findAllByType(Text as any).map((t: any) => String(t.props.children));
  expect(texts.join(' ')).toMatch(/50%/); expect(texts.join(' ')).toMatch(/2,250원/); expect(texts.join(' ')).toMatch(/4,500원/);
});
test('listing_row_truncates_long_title', () => {
  const r = create(<ListingRow listing={{ ...base, product_name: 'x'.repeat(80) }} onPress={() => {}} />);
  const title = r.root.findAll((n: any) => n.props.numberOfLines === 1 && String(n.props.children).includes('스타벅스'));
  expect(title.length).toBeGreaterThan(0);
});
```
(`Text`는 `react-native`에서 import.)

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL (취소선 액면가/구조 없음).
- [ ] **Step 3: 네 파일 구현** — Interfaces대로. 탭 아이콘 색은 `color` 인자를 그대로 쓴다(`tab_icon_color_follows_focus`는 코드 리뷰 항목: 아이콘에 하드코딩 색 금지).
- [ ] **Step 4: 통과 확인** — `npm test` 15/15, `tsc` 깨끗, `npx expo export --platform web` 번들. 폰에서 홈이 목업 C와 같은지 확인(사람).
- [ ] **Step 5: Commit** — `git commit -m "feat(app): 당근 틀 홈 목록과 탭바"`

---

### Task 3: 상세·긁기·결과 화면

**Files:**
- Modify: `app/src/app/listing/[id].tsx`, `app/src/app/draw/[id].tsx`, `app/src/components/ScratchCard.tsx`
- Test: `app/src/app/listing/__tests__/detail-bottom.test.tsx` (상세의 하단 바를 `DetailBottomBar` 컴포넌트로 분리해 테스트)

**Interfaces:**
- Consumes: Task 1 (`Button`, `Thumb`, 토큰).
- Produces: `app/src/components/DetailBottomBar.tsx` — `DetailBottomBar({ price, faceValue, balance, undrawable, busy, onDraw })`: 왼쪽 `formatWon(price)`(priceBig) + 취소선 `formatWon(faceValue)`(faint), 오른쪽 `내 포인트 ${formatPoints(balance)}`(meta); 그 아래 `Button` — `undrawable` → disabled, 라벨 '지금은 뽑을 수 없는 기프티콘이에요'; `balance < price` → disabled, 라벨 `${formatWon(price)}으로 뽑기`, 위에 danger 안내문 '포인트가 부족해요. 내 정보에서 충전하세요'; 그 외 활성.
  - 라벨 문구 변경: 기존 `${formatPoints(price)}로 뽑기` → `${formatWon(price)}으로 뽑기` (목업 C 표기 통일, 작성자 결정).
- 상세 본문: `Stack.Screen title = brand`, 히어로(bg2, 모서리 md, 좌우 16 여백, `Thumb`가 아니라 큰 이모지 56), 상품명 `type.screenTitle`, 보조줄 `${CATEGORY_LABELS[cat]} · 유효기간 ${expires_on.replace(/-/g,'.')} (${daysLeftLabel})` meta, 표 3줄(액면가 / 당첨 확률(primary 800) / 지금까지 꽝) 각 행 상하 10, 구분선 line, 카드 테두리 없음.
- `ScratchCard`: 코팅 셀 색 `coatA`, 홀수 셀 `coatB`(빗금 느낌), 카드 테두리 없음 모서리 md, 결과 글씨 당첨 `primary` 44/900, 꽝 `sub` 44/800, 안내문 meta.
- `draw/[id].tsx`: 바탕 bg; 긁기 전엔 `Button variant="outline" disabled title="긁는 중…"`; 당첨 = 🎉(54) + '당첨!'(primary 34/900) + 상품명은 없음(현재 화면에 상품명 데이터가 없으므로 생략, 작성자 결정) + `Button '바코드 보기'`; 꽝 = '꽝'(sub 28/800) + '아쉽네요, 꽝이에요'(meta) + `Button variant="soft" '같은 기프티콘 다시 뽑기'` + `Button variant="outline" '목록으로'`.

- [ ] **Step 1: 실패하는 테스트 작성** — `detail-bottom.test.tsx`

```tsx
test('detail_disabled_when_insufficient', () => {
  const r = create(<DetailBottomBar price={2250} faceValue={4500} balance={1000} undrawable={false} busy={false} onDraw={() => {}} />);
  const btn = r.root.findByProps({ accessibilityState: { disabled: true } });
  expect(btn).toBeTruthy();
  expect(JSON.stringify(r.toJSON())).toMatch(/포인트가 부족해요/);
});
test('detail_enabled_when_affordable', () => {
  const r = create(<DetailBottomBar price={2250} faceValue={4500} balance={5000} undrawable={false} busy={false} onDraw={() => {}} />);
  expect(JSON.stringify(r.toJSON())).toMatch(/2,250원으로 뽑기/);
  expect(JSON.stringify(r.toJSON())).toMatch(/4,500원/);
});
```
(`Button`은 `Pressable`에 `accessibilityState={{ disabled }}`를 넘긴다 — Task 1 구현 시 포함.)

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL.
- [ ] **Step 3: 구현** — Interfaces대로. `listing/[id].tsx`의 기존 하단 블록을 `DetailBottomBar`로 교체하고 핸들러(`onDraw`)는 그대로 넘긴다.
- [ ] **Step 4: 통과 확인** — `npm test` 17/17, `tsc`, web export. 폰에서 상세 → 긁기 → 결과 확인(사람).
- [ ] **Step 5: Commit** — `git commit -m "feat(app): 상세·긁기·결과 화면 디자인"`

---

### Task 4: 내 기프티콘·바코드·판매·올리기 화면

**Files:**
- Modify: `app/src/app/(tabs)/gifticons.tsx`, `app/src/app/gifticon/[id].tsx`, `app/src/app/(tabs)/sell.tsx`, `app/src/app/sell/new.tsx`, `app/src/components/StatusBadge.tsx`, `app/src/components/PresetPicker.tsx`

**Interfaces:**
- Consumes: Task 1 (`Button`, `Fab`, `Thumb(52)`, 토큰), Task 2 `CategoryChips`.
- `StatusBadge`: `COLORS` 맵을 토큰으로 교체 — `live: primarySoft/primary`, `hold: holdBg/holdFg`, `ok: okBg/okFg`, `warn: dangerSoft/danger`, `muted: mutedBg/sub`. 매핑 함수(`settlementBadge`, `listingBadge`)는 변경 없음.
- 목록 행(내 기프티콘·내 판매 공통 모양): `Thumb(52)` · 제목(rowTitle) · 메타(meta) · 오른쪽 `StatusBadge`. 행 상하 12, 구분선 line.
- `sell.tsx`: 상단 "+ 새 기프티콘 올리기" 버튼 제거 → `Fab`. 목록 하단 여백 96.
- `gifticon/[id].tsx`: 이미지 박스 bg2 모서리 md, 번호 monospace 22 ink, 안내문 body, 버튼 `Button '정상 사용했어요'` / `Button variant="danger" '이미 쓰인 바코드예요'`. 문구·핸들러 그대로.
- `sell/new.tsx`: 라벨 `type.label`, 입력·날짜 버튼 bg2 모서리 sm 테두리 없음, 이미지 선택 영역 bg2 모서리 md, 푸터 `Button '올리기'`. `PresetPicker` 선택 = primary 테두리 + primarySoft 바탕, 글자 primary.

- [ ] **Step 1: 구현** — 위 규칙대로. 테스트 추가 없음(순수 스타일 교체; Task 5의 hex 검사가 덮는다).
- [ ] **Step 2: 확인** — `npm test` 17/17, `tsc`, web export. 폰에서 내 기프티콘·바코드·내 판매·올리기 확인(사람).
- [ ] **Step 3: Commit** — `git commit -m "feat(app): 기프티콘·판매·올리기 화면 디자인"`

---

### Task 5: 내 정보·로그인, 색 리터럴 금지 검사

**Files:**
- Modify: `app/src/app/(tabs)/profile.tsx`, `app/src/app/login.tsx`, `app/src/lib/__tests__/theme.test.ts`

**Interfaces:**
- `profile.tsx`: 잔액 36/800 ink, `Button '충전 (테스트 +N)'`(primary) / `Button '출금 (준비중)' disabled`, 로그아웃은 `Text` sub 밑줄, 알림함 행 구분선 line, 제목 rowTitle·본문 body·시각 meta.
- `login.tsx`: 제목 '몰아주기' 32/800 ink, 입력 bg2 모서리 sm, `Button` 인디고, 전환 링크 primary.

- [ ] **Step 1: 실패하는 테스트 추가** — `theme.test.ts`에

```ts
import * as fs from 'fs'; import * as path from 'path';
function walk(dir: string): string[] { return fs.readdirSync(dir).flatMap((f) => { const p = path.join(dir, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; }); }
test('no_hex_literals_outside_theme', () => {
  const root = path.join(__dirname, '..', '..');
  const offenders = walk(root).filter((p) => /\.(tsx?)$/.test(p) && !p.endsWith('theme.ts') && !p.includes('__tests__') && !p.endsWith('database.types.ts'))
    .filter((p) => /#[0-9a-fA-F]{6}\b/.test(fs.readFileSync(p, 'utf8')));
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL, offenders에 profile/login(및 남은 파일) 나열.
- [ ] **Step 3: 두 화면 구현 + offenders 전부 토큰으로 교체.**
- [ ] **Step 4: 통과 확인** — `npm test` 18/18, `tsc`, web export. 폰에서 로그인·내 정보 확인(사람).
- [ ] **Step 5: Commit** — `git commit -m "feat(app): 내 정보·로그인 디자인, 색 리터럴 금지 검사"`
