# 구현 현황

프론트엔드를 먼저 전부 만들고, 그 뒤에 백엔드(Express + MySQL)를 붙인다.
백엔드가 없는 동안 데이터는 MSW 가 공급한다.

**최종 갱신**: 2026-08-31 · 라우팅 골격 완료 시점

---

## 요약

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 초기화 | ✅ 완료 |
| 1 | 전역 스타일 · 테마 | ✅ 완료 |
| 2 | 타입 · API 계층 | ⬜ 미착수 |
| 3 | MSW 목 서버 | ⬜ 미착수 |
| 4 | 라우팅 · 레이아웃 · 에러 화면 | 🟡 부분 — **권한 가드만 남음** |
| 5 | 공용 컴포넌트 | 🟡 부분 — 5/11 |
| 6 | 화면 9종 | ⬜ 미착수 (자리표시자만) |

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

## Phase 4 — 라우팅 · 레이아웃 · 에러 화면 🟡

**구현됨**

- `src/lib/routes.ts` — 경로 상수의 단일 출처. 파라미터가 있는 경로는 함수형(`boardDetail(id)`)과 패턴형을 함께 제공
- `src/App.tsx` — 블루프린트 §6.1 라우트 표 + 에러 라우트 + `/notice` 구 URL 리다이렉트 + `*` → 404
- `src/layouts/RootLayout.tsx` — 헤더 + `Outlet`. `ErrorBoundary` 를 `Outlet` 안쪽에 두어 화면에서 예외가 나도 헤더는 남는다
- `src/layouts/Header.tsx` — 공개 메뉴 4개, 활성 링크 표시, 테마 토글, 모바일 햄버거(Radix DropdownMenu)
- `src/pages/errors/` — `ErrorPage` 공통 레이아웃 + `Error401`(returnTo 처리) · `Error403` · `Error404` · `Error500`
- `src/components/ErrorBoundary.tsx` — 렌더 예외를 잡아 500 화면 렌더
- 화면 자리표시자 15개

**미구현**

- **`ProtectedRoute`** — 권한 가드. `roles.ts`(Phase 2)와 인증 상태(Phase 3)가 필요하다. **현재 모든 화면이 열려 있다.**
- **헤더의 역할별 메뉴** — 게시판·마이페이지·관리자는 로그인 상태에 따라 노출돼야 한다. 지금은 개발 전용 드롭다운에 임시로 넣어 두었다
- **활성 링크 슬라이딩 인디케이터** — 블루프린트 §6.2 의 시각 요소. 현재는 배경색 강조만 적용

**개발 전용 장치**

헤더의 "개발" 드롭다운에 인증 필요 화면과 에러 화면 링크를 모아 두었다. `import.meta.env.DEV` 로 감싸 프로덕션 번들에서 제외되며, **번들을 문자열 검색해 실제로 빠지는 것을 확인했다.** Phase 3 에서 역할 전환기가 생기면 대체된다.

---

## Phase 5 — 공용 컴포넌트 🟡 (5/11)

| 컴포넌트 | 상태 |
|---|---|
| `Button` | ✅ 6변형 × 3크기. Radix `Slot` 으로 `asChild` 지원 |
| `ThemeToggle` | ✅ |
| `ErrorPage` | ✅ |
| `ErrorBoundary` | ✅ |
| `PagePlaceholder` | ✅ (임시 — Phase 6 에서 전부 교체) |
| `Modal` · `ConfirmModal` · `Tabs` · `Select` · `Tooltip` · `Popover` · `Pagination` · `ContentRenderer` | ⬜ 미구현 |

---

## 검증 결과

**정적 검사**

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | 통과 — 오류 0 |
| `npm run lint` | 통과 — 경고 0 |
| `npm run build` | 성공 — 322.53 kB / gzip **105.15 kB** (213 모듈) |
| 개발 전용 문자열의 프로덕션 번들 제외 | 5개 항목 전부 제외 확인 |

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

**겪은 문제와 원인**

개발 서버에서 `Cannot read properties of null (reading 'useRef')` — React 사본이 둘이라는 오류가 났다. 원인은 **`react-router` 를 import 하기 전에 개발 서버를 띄워서** Vite 의 의존성 사전 번들 캐시가 낡은 것이었다. `node_modules/.vite` 삭제 후 재시작하니 해소됐다. 코드 문제가 아니었다(프로덕션 빌드는 계속 성공했다).
→ **의존성을 추가한 뒤에는 개발 서버를 재시작할 것.**

curl 은 SPA 의 HTML 껍데기만 받으므로 이 오류를 잡지 못했다(모든 경로가 200 을 반환했다). **라우팅 검증은 반드시 실제 브라우저로 해야 한다.**

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
| 1 | **일정 유형 4색** — 강조색이 `negative`/`positive` 2개뿐이라 훈련·회의·행사·기타를 색으로 구분할 수 없다 | 미해결 | Phase 6-4 |
| 2 | **중간 상태 색 없음** — 멤버 승인 `pending` 등 | 미해결 | Phase 6-8 |
| 3 | **둥근 테이블 + sticky 헤더 충돌** — `overflow: hidden` 이 `position: sticky` 를 무력화한다 | 미해결 | Phase 6-3 |
| 4 | **Pretendard CDN 버전** | ✅ 해결 — `v1.3.9` 가 최신이며 URL 정상(HTTP 200 · 53KB) | Phase 1 |

---

## 블루프린트 결함 대응 현황

`site-blueprint.md` §12 중 프론트엔드에서 대응하는 항목이다.

| 결함 | 대응 | 상태 |
|---|---|---|
| §12-18 서버에 역할 순위 비교 함수 없음 | `lib/roles.ts` 에 `ROLE_ORDER` + `hasAtLeast` | 미착수 (Phase 2) |
| §12-11 `LogDetail` 이 `location.state` 에만 의존 | URL 의 `logId` 로 조회 | 미착수 (Phase 6-9) |
| §12-25 `Records` 시즌 표기 하드코딩 | `active-year` 참조 | 미착수 (Phase 6-3) |
| §12-26 모바일 최적화 미완 | 모바일 우선 재설계 | 🟡 골격은 375px 검증 통과. 테이블 화면이 남음 |
| §12-1, §12-2 프론트 가드만으로 보호 | MSW 가 실제로 401/403 을 반환하도록 작성 | 미착수 (Phase 3) |
| 구 `/unauthorized` 가 두 상태를 겸함 | `/401` · `/403` 으로 분리 | ✅ 완료 |
