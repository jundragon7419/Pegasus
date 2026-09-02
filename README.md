# Pegasus

광운대학교 아마야구부 **KWU Pegasus** 웹사이트. 구 사이트를 재구축한다.

현재 **프론트엔드가 완료**되었고 백엔드는 아직 없다. 백엔드가 붙기 전까지
[MSW](https://mswjs.io/)가 브라우저에서 `/api/*` 요청을 가로채 목 데이터를 준다 —
개발 서버만 띄우면 모든 화면이 실제처럼 동작한다.

## 빠른 시작

```bash
cd frontend
npm install
npx playwright install chromium   # 브라우저 검증용 (한 번만)
npm run dev                       # http://localhost:5173
```

로그인은 아무 목 계정이나 쓰면 된다. 비밀번호는 전부 `Pegasus!2026` 이고,
개발 모드에서는 헤더의 **역할 전환기**로 로그인 없이 계정을 바꿀 수 있다.

| 계정 | 권한 | 용도 |
|---|---|---|
| `newbie` | basic (미신청) | 멤버 신청 흐름 |
| `applicant` | basic (승인 대기) | 관리자 승인 대상 |
| `player01` | member | 일반 회원 |
| `manager01` | manager | 게시글·로스터·일정 관리 |
| `president` | staff (회장) | 임명·차단·연도 설정 |
| `rootadmin` | root | 스태프 임명 |
| `bannedone` | member (차단됨) | 차단 계정 동작 |

전체 목록은 `frontend/src/mocks/fixtures/users.ts` 에 있다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (MSW 자동 시작) |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | oxlint |
| `npm test` | 단위 테스트 (Vitest) — 순수 규칙·픽스처 무결성 |
| `npm run e2e` | **브라우저 검증 전체** — 서버가 없으면 직접 띄운다 |
| `npm run e2e:fast` | 느린 스위트(반응형·헤디드) 제외 |
| `npm run e2e board` | 이름에 `board` 가 든 스위트만 |
| `npm run verify` | 위 전부를 순서대로 |
| `npm run build` | 프로덕션 빌드 |

## 검증 구조

두 층으로 나뉜다.

**단위 테스트** (`npm test`) — `src/**/*.test.ts`. 프레임워크 없이 도는 것만 담는다.
권한 매트릭스(§4.4), 멤버십 상태 머신(§7.1), 입력 검증(§7.2), 날짜, 등번호 매핑,
픽스처 무결성, 그리고 **공용 규칙 모듈이 프레임워크를 import 하지 않는지**.

**브라우저 검증** (`npm run e2e`) — `frontend/e2e/suites/*.mjs`. 실제 Chromium 으로
화면을 걸어본다. 권한별 라우트 도달, API 가 401/403/409 를 실제로 반환하는지,
반응형 넘침, 대비 측정 등. 스위트는 각각 독립 프로세스로 **순차** 실행된다 —
목의 쓰기 상태가 탭 메모리에 있어 병렬로 돌리면 서로 간섭한다.

> 브라우저 검증은 단위 테스트가 잡지 못하는 것을 잡는다. 실제로 여러 결함이
> 여기서만 나왔다 — StrictMode 이중 효과로 인한 401 리다이렉트, 탈퇴 후
> `/401` 로 튀던 transition 우선순위 문제 등.

## 문서

| 파일 | 내용 |
|---|---|
| [`site-blueprint.md`](site-blueprint.md) | 구 사이트 전체 명세와 **결함 목록 §12** (재구축의 기준) |
| [`docs/implementation-status.md`](docs/implementation-status.md) | 구현 현황 · 검증 결과 · 결정 기록 · **목이 증명하지 못하는 것** |
| [`docs/error-screens.md`](docs/error-screens.md) | 어떤 상황에 어느 에러 화면으로 가는지, 무엇을 인라인으로 표시하는지 |

## 구조

```
Pegasus/
  site-blueprint.md      구 사이트 명세 + 결함 목록
  docs/                  구현 현황 · 에러 화면 명세
  frontend/
    src/
      lib/               프레임워크 없는 규칙 — 백엔드가 그대로 가져간다
      types/             도메인 타입
      components/        공용 컴포넌트
      pages/             화면 11종
      mocks/             MSW 핸들러 · 목 상태 · 픽스처
    e2e/                 브라우저 검증
```

`src/lib/` 의 `roles.ts` · `membership.ts` · `validators.ts` · `date.ts` ·
`rosterNumber.ts` · `korean.ts` · `pagination.ts` 는 **백엔드가 그대로 import 할
것**을 전제로 쓰였다. `shared-purity.test.ts` 가 프레임워크 유입을 막는다.

## 다음 작업

### 1. 투표 시스템 개선 ← 바로 다음

> **아이디어는 사용자가 직접 준다.** 어떻게 바꿀지 임의로 설계하지 말고
> 사용자의 구상을 먼저 듣는다.

현재 구현과 **아이디어가 부딪힐 만한 제약 5가지**(익명 투표의 재투표 불가 등)를
`docs/implementation-status.md` 의 **"예정 — 투표 시스템 개선"** 절에 정리해 두었다.
사용자와 이야기하기 전에 그것부터 읽는다.

### 2. 백엔드 (Express + MySQL)

목이 확정한 API 계약을 실제로 구현하고, 목이 증명하지 못한 것 — 트랜잭션·동시성,
FK/CASCADE, 비밀번호 해싱, rate limit, 실제 메일, 외부 리그·공휴일 API — 을 처리한다.
`docs/implementation-status.md` 의 **"목이 증명하는 것과 못 하는 것"** 절이 기준이다.
