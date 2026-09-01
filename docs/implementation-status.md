# 구현 현황

프론트엔드를 먼저 전부 만들고, 그 뒤에 백엔드(Express + MySQL)를 붙인다.
백엔드가 없는 동안 데이터는 MSW 가 공급한다.

**최종 갱신**: 2026-09-01 · 인증 기반 + 로그인·회원가입 완료 시점

---

## 요약

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 초기화 | ✅ 완료 |
| 1 | 전역 스타일 · 테마 | ✅ 완료 |
| 2 | 타입 · API 계층 | ✅ 완료 |
| 3 | MSW 목 서버 | 🟡 부분 — 공개 조회 + **인증 완료**. 쓰기(POST·PUT·DELETE) 미구현 |
| 4 | 라우팅 · 레이아웃 · 에러 화면 | ✅ 완료 — **권한 가드 동작** (슬라이딩 인디케이터만 미적용) |
| 5 | 공용 컴포넌트 | 🟡 부분 — 12/15 |
| 6 | 화면 9종 | 🟡 **5/9** — 홈 · 선수단 · 기록 · 로그인 · 회원가입 |

**이제 `/admin` 을 포함한 보호 화면이 실제로 막힌다.** 직전까지는 모든 화면이 아무나 열 수 있었다.

**계획 대비 순서 변경**: Phase 4 중 Phase 2·3 에 의존하지 않는 부분(라우트 테이블·에러 화면·헤더)을 먼저 구현했다. 그 전에는 화면에서 확인할 것이 `/` 하나뿐이라 진행 상황을 눈으로 볼 수 없었기 때문이다. 버려지는 작업은 없다 — 권한 가드(`ProtectedRoute`)만 Phase 2·3 뒤로 미뤘다.

---

## Phase 0 — 프로젝트 초기화 ✅

- Vite 8.2.2 + React 19.2.8 + TypeScript 6.0 (`create-vite` 9 `react-ts`)
- 의존성: `radix-ui`(통합), `@radix-ui/react-icons`, `react-router` 8.3.1, `msw` 2.15.0(dev)
- 경로 별칭 `@/` → `src` (`vite.config.ts` + `tsconfig.app.json` 양쪽)
- `strict: true` (템플릿 기본값에 없어 직접 추가)
- `.env` / `.env.example`, `.gitignore` 는 Pegasus 루트 한 곳으로 통합

**계획과 달라진 점**

| 항목 | 계획 | 실제 | 이유 |
|---|---|---|---|
| Radix 설치 | 개별 패키지 12개 | **통합 패키지 `radix-ui`** | 레지스트리 확인 결과 활발히 배포 중(2026-07-31 갱신) |
| 린터 | ESLint | **oxlint** | `create-vite` 9 의 기본값 |
| `baseUrl` | 사용 | **미사용** | TS 6 deprecated · TS 7 제거 예정. `paths` 를 `./` 상대 경로로 쓰면 불필요 |

---

## Phase 1 — 전역 스타일 · 테마 ✅

- `index.html` — `lang="ko"`, FOUC 방지 인라인 스크립트(기본 라이트), Pretendard + Archivo
- `src/styles/global.css` — reset, 토큰 적용, **한글 규칙(`word-break: keep-all` + `overflow-wrap: break-word`)**, `.tabular` / `.srOnly`, `prefers-reduced-motion` 존중
- `src/context/theme-context.ts` · `ThemeProvider.tsx` · `src/hooks/useTheme.ts`

**설계 메모**

- 테마 판정 지점을 **하나로 유지한다.** `index.html` 인라인 스크립트가 `localStorage` 를 읽어 확정하고, `ThemeProvider` 는 그 결과를 DOM 에서 읽기만 한다.
- 컨텍스트·프로바이더·훅을 **3파일로 분리**했다. 한 파일이 컴포넌트와 컴포넌트 아닌 것을 함께 export 하면 Fast Refresh 가 깨진다(oxlint 가 실제로 잡아냈다).

---

## Phase 2 — 타입 · API 계층 ✅

**타입** (`src/types/`) — 블루프린트 §3·§4·§8 을 옮겼다. `auth` · `roster` · `board` · `schedule` · `activity-log` 5개 파일.

API 응답 필드는 **camelCase 로 통일**하기로 정했다. 구 API 는 `staff_type`(snake)과 `isPinned`(camel)가 한 응답에 섞여 있었다 — MySQL 컬럼명이 그대로 새어나온 결과다. 새 백엔드가 변환해 내려준다.

타입을 쓰면서 구 스키마의 문제를 함께 정리했다.

| 구 문제 | 새 타입에서 |
|---|---|
| §12-24 `events.type` 주석(`anniversary`)과 실제 ENUM 불일치 | 실제 값(`training/meeting/events/etc`)만 타입에 존재. 잘못 쓰면 컴파일 에러 |
| §12-19 `membership_status` 가 신청 상태와 차단을 겸함 | `MembershipStatus` 에서 `banned` 를 빼고 `isBanned` 분리 |
| §12-20 `holidays` 는 year/month/day, `events` 는 DATE | `Holiday.date` 를 `'YYYY-MM-DD'` 로 통일 |
| §12-23 미사용 컬럼(`kakao_id`, `marketing_sms/kakao`) | 타입에서 제외 — 새 스키마에서 만들지 않는다 |

**권한** (`src/lib/roles.ts`) — **§12-18 결함을 고치는 파일이다.** 구 구현에는 역할 순위 비교 함수가 없어 열거가 코드 전반에 흩어져 있었다. `ROLE_ORDER` + `hasAtLeast` 를 두고 §4.4 매트릭스 전체를 함수로 표현했다.

§4.3 이 지적한 시그니처 불일치(프론트는 `user` 객체, 백엔드는 `role` 문자열)도 **role 문자열 하나로 통일**했다. 프레임워크 의존성이 없어 백엔드가 그대로 import 할 수 있다.

§8.4 의 로그 열람 규칙(`canViewLogsOf`)도 구현했다 — 구 구현은 이걸 프론트 탭 표시 조건으로만 두고 API 는 완전 공개였다(§12-2).

**API** (`src/lib/api.ts`, `src/lib/token.ts`, `src/hooks/useApiErrorHandler.ts`)

계획에서는 "status → 화면 이동 매핑을 `api.ts` 한 곳에 둔다"고 했으나 **정책과 실행을 분리하는 쪽으로 바꿨다.** `api.ts` 는 컴포넌트가 아니라 `useNavigate` 를 쓸 수 없고, navigate 함수를 전역 등록하면 테스트가 어려워진다.

- `api.ts` — `ApiError`(status 보존) · `NetworkError` 를 던지고, `errorRoute(status)` 순수 함수로 목적지만 정한다
- `useApiErrorHandler` — 실제 이동을 담당. **반환값이 계약이다**: `true` 면 처리 완료, `false` 면 화면을 옮기지 않았으니 호출부가 인라인으로 표시해야 한다(400·409 등, `docs/error-screens.md` 3절)
- 401 이면 만료된 토큰을 지우고 `returnTo` 를 붙여 `/401` 로 보낸다

---

## Phase 4 — 라우팅 · 레이아웃 · 에러 화면 ✅

**구현됨**

- `src/lib/routes.ts` — 경로 상수의 단일 출처. 파라미터가 있는 경로는 함수형(`boardDetail(id)`)과 패턴형을 함께 제공
- `src/App.tsx` — 블루프린트 §6.1 라우트 표 + 에러 라우트 + `/notice` 구 URL 리다이렉트 + `*` → 404
- `src/layouts/RootLayout.tsx` — 헤더 + `Outlet`. `ErrorBoundary` 를 `Outlet` 안쪽에 두어 화면에서 예외가 나도 헤더는 남는다
- `src/layouts/Header.tsx` — 공개 메뉴 4개, 활성 링크 표시, 테마 토글, 모바일 햄버거(Radix DropdownMenu)
- `src/pages/errors/` — `ErrorPage` 공통 레이아웃 + `Error401`(returnTo 처리) · `Error403` · `Error404` · `Error500`
- `src/components/ErrorBoundary.tsx` — 렌더 예외를 잡아 500 화면 렌더
- 화면 자리표시자 15개

- `src/components/ProtectedRoute.tsx` — `loading` 중 `null` 렌더(로그인 화면 깜빡임 방지), 비로그인 → `/401?returnTo=`, 권한 부족 → `/403`. 판정은 `lib/roles.ts` 의 `hasAtLeast`
- `src/App.tsx` — §6.1 표대로 8개 보호 라우트에 가드 적용
- `src/layouts/Header.tsx` — 역할별 메뉴(게시판 · 마이페이지 · 관리자), 역할 배지 + username + 로그아웃, 비로그인 시 로그인·회원가입 버튼. 임시로 두었던 `PENDING_AUTH_NAV` 제거

**미구현**

- **활성 링크 슬라이딩 인디케이터** — 블루프린트 §6.2 의 시각 요소. 현재는 배경색 강조만 적용

**개발 전용 장치**

헤더의 "개발" 드롭다운에 **역할 전환기**와 에러 화면 링크가 있다. `import.meta.env.DEV` 로 감싸 프로덕션 번들에서 제외되며 번들 문자열 검색으로 확인했다.

---

## Phase 3 — MSW 목 서버 🟡 (조회 + 인증)

**공개 조회 8종** — `GET /api/posts` · `/api/roster/years` · `/api/roster/active-year` · `/api/roster` · `/api/events` · `/api/holidays` · `/api/records/batting` · `/api/records/pitching`

**인증 7종** (§5.1) — `POST /login` · `/signup` · `/send-email-code` · `/verify-email-code`, `GET /me` · `/check-username` · `/check-email`

- `src/mocks/fixtures/users.ts` — 역할·상태별 계정 8개(basic 미신청 / basic 승인대기 / member / manager / staff 회장 / staff 감독 / root / 차단)
- `src/mocks/authState.ts` — 세션·사용자·이메일 인증 상태. 회원가입이 실제로 반영된다
- `src/mocks/authGuard.ts` — **판정에 `lib/roles.ts` 의 `hasAtLeast` 를 그대로 쓴다.** 프론트와 목이 같은 함수를 쓰면 어긋날 수 없다. 차단 계정도 여기서 거른다(§12-4)
- `src/mocks/devAuth.tsx` — 개발 전용 역할 전환기

> **§12-3 결함 수정.** 구 구현은 이메일 인증 성공 사실을 서버에 남기지 않아 API 를 직접 호출하면 임의 이메일로 가입할 수 있었다. 목은 인증된 주소 목록을 서버 쪽에 두고 `/signup` 에서 검사한다. **API 직접 호출로 우회가 막히는 것을 브라우저에서 확인했다**(400 "이메일 인증을 먼저 완료해 주세요").

**미구현** — 쓰기(POST·PUT·DELETE): 게시글 · 댓글 · 투표 · 일정 · 관리자 기능.

**개발용 스위치** (`src/mocks/config.ts`) — 세 상태를 눈으로 확인하기 위한 장치다. 정상 응답만 오면 로딩·빈·에러를 설계할 방법이 없다.

```
?mockDelay=2000     응답 지연 (로딩)
?mockEmpty=roster   빈 배열 (빈 상태)
?mockFail=records   500 반환 (에러 상태)  · records:404 처럼 코드 지정 가능
```

**픽스처의 개인정보 처리** — 구 시드(`C:\code\WEB\...\sql\seeds\`)에는 실명과 입학연도로 시작하는 **실제 학번**이 들어 있다. `Pegasus` 저장소는 GitHub 공개 원격이 붙어 있으므로 옮기지 않았다. 구성(2026 시즌 40명 = 감독 1 · 회장 1 · 선수 32 · 매니저 3 · 영구결번 3)만 참고하고 이름·학번은 가공값이다. 학번 5번째 자리 `9` 가 합성값 표식이다.

**기록 픽스처는 생성 스크립트로 만든다** (`scratchpad/gen-fixtures.mjs`). 손으로 적으면 타율과 안타·타수가 어긋나 화면이 고장난 것처럼 보인다. 안타·타수·이닝에서 타율·출루율·장타율·OPS·ERA·WHIP·K/7 을 실제로 계산해 넣었고, **검증 스크립트로 정합성을 확인했다.**

첫 생성본은 22명 전원이 규정타석을 넘겨 **규정 필터가 아무 일도 하지 않았다.** 픽스처는 그럴듯하기만 해서는 안 되고 UI 기능을 시험할 수 있어야 하므로, 출전이 적은 선수를 넣어 타자 3명·투수 3명이 걸러지도록 고쳤다.

---

## Phase 5 — 공용 컴포넌트 🟡 (12/15)

| 컴포넌트 | 상태 |
|---|---|
| `Button` | ✅ 6변형 × 3크기. Radix `Slot` 으로 `asChild` 지원 |
| `Tabs` | ✅ Radix Tabs 래퍼 |
| `Tooltip` | ✅ Radix Tooltip. 물음표 아이콘 트리거 |
| `Checkbox` | ✅ Radix Checkbox |
| `SearchInput` | ✅ 지우기 버튼 포함 |
| `Skeleton` · `EmptyState` · `ErrorState` | ✅ 세 상태 |
| `ThemeToggle` · `ErrorPage` · `ErrorBoundary` | ✅ |
| `TextField` | ✅ 레이블·에러·힌트·성공 문구. `aria-describedby` + `aria-invalid` 연결 |
| `PagePlaceholder` | ✅ (임시 — 남은 4개 화면에서 교체) |
| `Modal` · `ConfirmModal` · `Pagination` · `ContentRenderer` | ⬜ 미구현 |

---

## Phase 6 — 화면 🟡 (5/9)

### 홈 `/` ✅

히어로(`public/hero.jpg`) + 게시판 위젯 + 미니 캘린더.

- 게시판 위젯 — 고정글 전체 + 최신글로 8칸을 채우고, 고정글 구간 끝에 굵은 구분선
- 미니 캘린더 — 이번 달. 공휴일은 빨강 점, 팀 일정은 골드 점 **하나**

> **미해결 항목 ① 관련 결정**: 미니 캘린더는 일정 유형(훈련·회의·행사·기타)을 색으로 구분하지 않는다. 셀이 30px 남짓이라 4색 점이 서로 분간되지 않는다. 유형 구분은 `/schedule` 에서 라벨로 보여준다. **일정 4색을 팔레트에 추가할지는 Phase 6-4 에서 결정한다.**

**빠진 것** — 히어로 이미지가 207KB 다. 모바일 기준으로 무거워 최적화(리사이즈·WebP) 여지가 있다.

### 선수단 `/roster` ✅

연도 탭 · 역할 필터 5종 · 이름·번호 검색 · 카드 그리드 · 배지(HC · PD · M · 영구결번).

**공개 화면에 학번을 표시하지 않는다.** 번호·이름·기수·역할만 보여준다. §12-2 가 실명·학번 노출을 결함으로 지적한 것과 같은 이유다.

### 기록 `/records` ✅

팀(포디움) · 타자(22열) · 투수(**19열**) 탭.

> 계획서에 투수 18열로 적었으나 구 소스를 세어보니 19열이었다. 구현이 구 소스와 일치한다.

- 정렬 — 헤더 클릭 desc↔asc. `innings`("5.2" = 5⅔)는 아웃 카운트를 반영해 숫자로 변환 후 정렬한다
- 규정 필터 — 규정타석 = 팀 경기 수, 규정이닝 = 경기 수 × 5 ÷ 9(내림). 계산식은 Tooltip
- 포디움 메달 색은 디자인 토큰이 아니라 이 화면 전용이며, **두 테마 각각에서 배경 대비 4.5:1 을 넘도록 계산해 넣었다**
- **§12-25 수정** — 시즌 표기가 하드코딩(`2026 KWU PEGASUS`)이었다. `active-year` 를 참조한다

**미해결 항목 ③ 해결 — 둥근 모서리 + sticky**

`overflow: hidden` 은 스크롤 컨테이너를 만들어 안쪽 sticky 를 망가뜨린다. 두 겹으로 나눠 해결했다.

- `.tableFrame` — `border-radius` + **`overflow: clip`**. `clip` 은 `hidden` 과 달리 스크롤 컨테이너를 만들지 않는다
- `.tableScroll` — `overflow-x: auto`. 이름 열의 sticky 는 이 컨테이너 기준

375px 에서 `scrollLeft = 400` 으로 밀어도 이름 열이 `left: 17px` 에 그대로 있는 것을 브라우저로 확인했다.

> **함께 확인된 제약**: 가로 스크롤 컨테이너 안에서는 **헤더를 페이지 기준으로 sticky 시킬 수 없다.** CSS 사양상 한 축을 `auto` 로 두면 다른 축도 스크롤 컨테이너가 되기 때문이다. 모바일에서 더 중요한 것은 이름 열 고정이라 그쪽을 택했다.

### 로그인 `/login` ✅

아이디 · 비밀번호 · 자동 로그인.

- **실패는 화면을 옮기지 않는다.** 폼 하단 인라인이며 입력이 보존된다(`docs/error-screens.md` 3절)
- 실패 문구가 아이디·비밀번호를 구분하지 않는다 — 구분하면 어떤 아이디가 존재하는지 알려주는 셈이다(계정 열거)
- 자동 로그인 체크 시 `localStorage`, 미체크 시 `sessionStorage`
- `returnTo` 가 있으면 로그인 후 그곳으로 복귀

### 회원가입 `/signup` ✅

아이디(중복 확인) · 비밀번호(+확인) · 이메일(코드 발송 → 인증) · 마케팅 수신 동의.

- 중복(409)·형식 오류는 **해당 필드 인라인**. 화면이 바뀌지 않는다
- 이메일 인증을 마치기 전에는 가입 버튼이 비활성
- 인증번호는 목 서버가 **개발자 콘솔에 찍는다**(메일을 보낼 수 없으므로)

> **§7.2 불일치 정리.** username 하한이 가입은 5자, 계정 수정은 1자로 서로 달랐다. 같은 값에 규칙이 둘일 이유가 없어 **5자로 통일**했다(`src/lib/validators.ts`).

### 미구현 화면 (4/9)

일정(캘린더) · 게시판 · 마이페이지 · 관리자 · 활동내역 — 자리표시자다.

---

## 검증 결과

**정적 검사**

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | 통과 — 오류 0 |
| `npm run lint` | 통과 — 경고 0 |
| `npm test` | **45개 통과** — 권한 매트릭스 25 + 한국어 조사 6 + 입력 검증 14 |
| `npm run build` | 성공 — 376.79 kB / gzip **121.44 kB** |
| 목 데이터의 프로덕션 번들 제외 | `setupWorker` · `impersonate` · `__dev` · 목 비밀번호 · 계정명 · 픽스처 이름 전부 제외 확인 |
| `dist/` 에 서비스 워커 미포함 | Vite 플러그인으로 제거. 개발 서버에서는 계속 서빙됨 |

**권한 매트릭스 워크스루** — 6개 계정(비로그인 · basic · member · manager · staff · root) × 보호 라우트 9개 = **54개 조합이 §4.4 · §6.1 표와 정확히 일치**. 헤더 메뉴도 역할별로 검증했다.

**반응형 통합 회귀 검사** — 폭 9종 × 화면 12종(기록은 3탭) × 라이트·다크 × 로그인 상태 = **270개 조합, 가로 넘침 없음**.

**화면별 브라우저 검증** (Playwright)

| 화면 | 확인한 것 |
|---|---|
| 선수단 | 카드 40장 · 연도 전환(2026↔2025, 40↔32) · 역할 필터 4종 · 검색 · 빈 상태 · 에러 상태 · 375px 2열 |
| 기록 | 포디움 6장 · 타자 22열 22행 · 투수 19열 12행 · 정렬 토글 · 규정 필터(22→19, 12→9) · **sticky 이름 열** · 다크 메달 색 |
| 홈 | 히어로 로드 · 위젯 8줄 · 고정글 구분선 · 캘린더 42칸/31일 · 점 10일 · 오늘 강조 · 빈·에러 상태 · 375px 1열 |
| 공통 | 전 라우트 콘솔 오류 0 · 375px 가로 넘침 없음 |

**권한 매트릭스 테스트** (`src/lib/roles.test.ts`)

§11.4 가 "재구축 시 최우선 개선 항목"으로 지적한 부분이다. 구 프로젝트에는 자동화 테스트가 전혀 없었다. Vitest 를 추가하고 §4.4 표를 그대로 코드로 옮겼다 — 표 한 줄이 배열 하나(`[비로그인, basic, member, manager, staff, root]`)에 대응한다.

**변이 테스트로 실효성을 확인했다.** `canBanUser` 의 staff 대상 판정을 `isRoot` → `isStaffRole` 로 일부러 바꾸자 해당 테스트만 정확히 실패했고, 되돌리니 통과했다. 테스트가 실제로 회귀를 잡는다.

**브라우저 검증** (Playwright · 구 프로젝트의 `node_modules` 재사용)

| 항목 | 결과 |
|---|---|
| 라우트 21개 렌더 | 전부 통과, **콘솔 오류 0건** |
| `/notice` → `/board` 리다이렉트 | 통과 |
| 없는 경로 → 404 | 통과 |
| 테마 토글 (light→dark, 배경색 변경, 새로고침 유지, localStorage) | 전부 통과 |
| `/401?returnTo=/admin` 의 로그인 링크 | `/login?returnTo=%2Fadmin` 전달 확인 |
| 모바일 375px — 데스크톱 nav 숨김 / 햄버거 노출 / 메뉴 4항목 / ESC 닫힘 | 전부 통과 |
| 375px 가로 스크롤 | 5개 화면 전부 넘침 없음 |

**검증이 잡아낸 버그 4건** (인증 작업 중)

정적 검사(타입·린트)로는 하나도 걸리지 않았고, 전부 브라우저 검증에서 나왔다.

| 버그 | 증상 | 원인 · 수정 |
|---|---|---|
| **자동 로그인이 무의미** | 새로고침하면 `localStorage` 에 토큰이 있는데도 로그아웃 | 목 세션이 페이지 메모리에만 있어 새로고침 시 소실. 실제 JWT 가 서명으로 자기 완결성을 갖듯, 목 토큰도 사용자 id 를 담아 복원하게 함 |
| **잘못된 `/401` 리다이렉트** | 로그인 상태인데 보호 라우트가 전부 `/401` 로 감 | `finally { setLoading(false) }` 가 **abort 시에도 실행**돼, 사용자 확인 전에 "비로그인" 으로 확정됐다. StrictMode 만의 문제가 아니라 빠른 화면 전환마다 발생. `finally` 를 없애고 성공·실패 경로에서만 내리도록 수정 |
| **320px 헤더 2px 넘침** | 아주 좁은 화면에서 가로 스크롤 | 브랜드 + 개발 메뉴 + 테마 토글 + 햄버거가 안 들어감. ≤360px 에서 간격·여백 축소. **통합 회귀 검사가 발견했다 — 화면마다 따로 쟀으면 또 놓쳤다** |
| **목 비밀번호가 배포물에 누출** | 프로덕션 번들에 `Pegasus!2026` 포함 | `Header` → `devAuth` → 픽스처로 이어지는 **정적 import** 때문. 전환기가 픽스처를 import 하지 않고 목 서버에 계정 목록을 물어보도록 변경 |

**겪은 문제와 원인**

개발 서버에서 `Cannot read properties of null (reading 'useRef')` — React 사본이 둘이라는 오류가 났다. 원인은 **`react-router` 를 import 하기 전에 개발 서버를 띄워서** Vite 의 의존성 사전 번들 캐시가 낡은 것이었다. `node_modules/.vite` 삭제 후 재시작하니 해소됐다. 코드 문제가 아니었다(프로덕션 빌드는 계속 성공했다).
→ **의존성을 추가한 뒤에는 개발 서버를 재시작할 것.**

curl 은 SPA 의 HTML 껍데기만 받으므로 이 오류를 잡지 못했다(모든 경로가 200 을 반환했다). **라우팅 검증은 반드시 실제 브라우저로 해야 한다.**

**412px 가로 스크롤 신고 — 레이아웃 버그가 아니었다**

삼성폰 비율(412×915)에서 좌우 스크롤이 생긴다는 신고를 받고 조사했다. 결론은 **DevTools 기기 모드의 확대**였다. 사용자 콘솔에서 잰 값이 `넘침: 0` · `clientWidth: 412` · **`visualViewport: 334`** 였다 — 페이지는 412px 로 정상 배치돼 있는데 화면이 1.23배 확대돼 334px 만 보이던 것이다. `Ctrl+Shift+M` 으로 기기 모드를 껐다 켜니 해소됐다.

다만 **그때 드러난 검증의 구멍은 실재했다.** 폭 375·320 만 쟀고, 기록 화면은 타자 탭에서만, 모바일은 라이트 테마에서만 확인했었다. 그래서 통합 회귀 검사를 만들었고, 실제로 320px 헤더 넘침을 잡아냈다.

---

## 미구현 (Phase 2 · 3 · 6)

| Phase | 항목 |
|---|---|
| 2 | `src/types/` 도메인 타입, `src/lib/api.ts` fetch 래퍼, `src/lib/roles.ts` 권한 헬퍼 |
| 3 | MSW 핸들러 11종, 픽스처, 개발 전용 역할 전환기 |
| 6 | 홈 · 선수단 · 기록 · 일정 · 로그인/회원가입 · 게시판 · 마이페이지 · 관리자 · 활동내역 — **전부 자리표시자 상태** |

---

## 미해결 설계 항목

| # | 항목 | 상태 | 결정 시점 |
|---|---|---|---|
| 1 | **일정 유형 4색** — 강조색이 `negative`/`positive` 2개뿐이라 훈련·회의·행사·기타를 색으로 구분할 수 없다 | 🟡 **미니 캘린더는 단일 표시로 우회.** 팔레트 확장 여부는 미결 | Phase 6-4 (일정) |
| 2 | **중간 상태 색 없음** — 멤버 승인 `pending` 등 | 미해결 | Phase 6-8 (관리자) |
| 3 | **둥근 모서리 + sticky 충돌** | ✅ **해결** — `overflow: clip` + 스크롤 컨테이너 분리. 다만 가로 스크롤 표에는 페이지 기준 sticky 헤더를 둘 수 없음(CSS 사양) | Phase 6-3 |
| 4 | **Pretendard CDN 버전** | ✅ 해결 — `v1.3.9` 가 최신이며 URL 정상(HTTP 200 · 53KB) | Phase 1 |
| 5 | **히어로 이미지 207KB** — 모바일 기준으로 무겁다. 리사이즈·WebP 검토 | 미해결 | 성능 점검 시 |
| 6 | **412px 가로 스크롤 신고** | ✅ 해결 — 레이아웃 버그가 아니라 DevTools 확대(`visualViewport 334` / `innerWidth 412`)였다 | 2026-09-01 |

---

## 블루프린트 결함 대응 현황

`site-blueprint.md` §12 중 프론트엔드에서 대응하는 항목이다.

| 결함 | 대응 | 상태 |
|---|---|---|
| §12-18 서버에 역할 순위 비교 함수 없음 | `lib/roles.ts` 에 `ROLE_ORDER` + `hasAtLeast`. 프레임워크 의존성 없이 작성해 백엔드가 그대로 쓴다 | ✅ 완료 · 테스트로 고정 |
| §12-2 로그 열람 권한이 프론트에만 존재 | `canViewLogsOf` 구현. **백엔드도 반드시 이 함수로 서버에서 판정해야 한다** | 🟡 함수만 완료 |
| §12-24 스키마 주석과 실제 ENUM 불일치 | 실제 값만 타입에 존재 | ✅ 완료 |
| §12-19 상태 컬럼이 신청·차단을 겸함 | `isBanned` 분리 | ✅ 타입 완료 (스키마는 백엔드에서) |
| §12-20 날짜 표현 불일치 | `Holiday.date` 통일 | ✅ 타입 완료 |
| §11.4 자동화 테스트 부재 | Vitest + §4.4 매트릭스 테스트 25개 | ✅ 착수 |
| §12-11 `LogDetail` 이 `location.state` 에만 의존 | URL 의 `logId` 로 조회 | 미착수 (Phase 6-9) |
| §12-25 `Records` 시즌 표기 하드코딩 | `active-year` 참조 | 미착수 (Phase 6-3) |
| §12-26 모바일 최적화 미완 | 모바일 우선 재설계 | 🟡 골격은 375px 검증 통과. 테이블 화면이 남음 |
| §12-1, §12-2 프론트 가드만으로 보호 | MSW `authGuard` 가 실제로 401/403 을 반환. 판정은 프론트와 같은 `hasAtLeast` 를 쓴다 | ✅ 인증 부분 완료. 게시글·로그 조회 API 는 쓰기 핸들러와 함께 |
| §12-3 이메일 인증이 서버에서 강제되지 않음 | 인증된 주소를 서버가 들고 `/signup` 에서 검사. **API 직접 호출 우회가 막히는 것을 확인** | ✅ 완료 |
| §12-4 `optionalAuth` 가 차단 계정을 거르지 않음 | `requireAuth` · `optionalAuth` 모두 `isBanned` 확인 | ✅ 완료 |
| §7.2 username 하한 불일치 (가입 5자 / 수정 1자) | `validators.ts` 에서 **5자로 통일**, 테스트로 고정 | ✅ 완료 |
| 구 `/unauthorized` 가 두 상태를 겸함 | `/401` · `/403` 으로 분리 | ✅ 완료 |
