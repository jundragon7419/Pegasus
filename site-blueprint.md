# KWU Pegasus — 시스템 설계 도면 (Site Blueprint)

> 이 문서는 현재 운영 중인 KWU Pegasus 웹사이트의 **실제 코드 동작**을 기준으로 작성된 재구축용 명세다.
> README.md의 기능 소개와 달리, 여기서는 "의도"가 아니라 "코드가 실제로 하는 일"을 기술한다.
> 둘이 어긋나는 지점은 §12에 별도로 정리했다.
>
> - 기준 시점: 커밋 `39dabbd` (2026-06-21) + 미커밋 작업분(MyPage 탭 분리)
> - 대상 독자: 이 사이트를 다른 스택으로 다시 만들거나, 기능을 그대로 이식하려는 개발자

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [아키텍처와 요청 파이프라인](#2-아키텍처와-요청-파이프라인)
3. [데이터 모델](#3-데이터-모델)
4. [권한 체계](#4-권한-체계)
5. [API 전체 명세](#5-api-전체-명세)
6. [페이지·라우트 명세](#6-페이지라우트-명세)
7. [도메인 규칙](#7-도메인-규칙)
8. [활동 로그(감사 로그) 규격](#8-활동-로그감사-로그-규격)
9. [외부 연동](#9-외부-연동)
10. [프론트엔드 공통 인프라](#10-프론트엔드-공통-인프라)
11. [환경 변수·빌드·배포](#11-환경-변수빌드배포)
12. [현재 구현의 결함 목록 (재구축 시 반드시 검토)](#12-현재-구현의-결함-목록-재구축-시-반드시-검토)

---

## 1. 시스템 개요

광운대학교 아마야구 동아리 "Pegasus"의 운영 웹사이트. 공개 홍보 페이지와 회원 전용 커뮤니티가 한 도메인에 공존한다.

### 1.1 기능 도메인 6개

| 도메인 | 핵심 개체 | 주 사용자 |
|---|---|---|
| **인증·회원** | `users` | 전원 |
| **선수단 명단(로스터)** | `roster`, `settings` | 공개 조회 / manager+ 편집 |
| **팀 일정·공휴일** | `events`, `holidays` | 공개 조회 / manager+ 편집 |
| **게시판·댓글·투표** | `posts`, `comments`, `polls`, `poll_options`, `poll_votes` | member+ |
| **관리자 콘솔** | `users`, `roster`, `settings` | manager+ / staff+ / root |
| **경기 기록·통계** | (외부 API + `roster`) | 공개 조회 |

이와 별개로 모든 쓰기 액션을 감사하는 **활동 로그**(`activity_logs`)가 횡단 관심사로 존재한다.

### 1.2 기술 스택

| 계층 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 | React 19, Vite 8, React Router 7, CSS Modules | SPA, 번들 빌드 후 정적 서빙 |
| 상태 관리 | React Context 2개 (`AuthContext`, `ThemeContext`) | 외부 상태 라이브러리 없음 |
| HTTP 클라이언트 | 브라우저 내장 `fetch` | axios 등 미도입 (의도적) |
| 백엔드 | Node.js(CommonJS), Express 5 | ESM 미사용 |
| DB 접근 | `mysql2/promise` 커넥션 풀 + raw SQL | **ORM 미사용(의도적)** |
| DB | MySQL 8, `utf8mb4_unicode_ci` | |
| 인증 | JWT(`jsonwebtoken`) + `bcrypt` | 세션 없음, 무상태 |
| 메일 | `nodemailer` (Gmail SMTP) | 이메일 인증번호 발송 |
| Rate limit | `express-rate-limit` | **회원가입에만 적용** |
| 배포 | pm2 + nixpacks + 셸 스크립트 | `deploy.sh` |

### 1.3 디렉터리 구조

```
KWU-Pegasus/
├── KWU-Pegasus/                     ← 프론트엔드
│   ├── index.html                   FOUC 방지용 테마 사전 적용 스크립트 포함
│   └── src/
│       ├── main.jsx                 ThemeProvider > App
│       ├── App.jsx                  BrowserRouter + 라우트 정의 + ProtectedRoute
│       ├── index.css                디자인 토큰 + 전역 버튼 시스템
│       ├── layouts/Header.jsx       전역 네비게이션 (데스크톱/모바일)
│       ├── context/                 AuthContext, ThemeContext
│       ├── hooks/                   useFetch, useScheduleData, useTabIndicator
│       ├── lib/                     api, constants, validators, formatters, utils, countryCodes
│       ├── components/              ContentRenderer, Pagination, PollVote, VoterModal, ConfirmModal
│       └── pages/
│           ├── auth/                Login, Signup
│           ├── board/               Board, BoardDetail, BoardWrite, BoardEdit, PostForm, UserActivity, LogDetail
│           ├── schedule/            EventWrite
│           ├── admin/               탭 8개 + adminConstants + utils
│           ├── mypage/              탭 6개 + mypageConstants
│           └── Home, Roster, Schedule, Records, Admin, MyPage, Unauthorized, NotFound
│
└── KWU-Pegasus-server/              ← 백엔드
    ├── server.js                    dotenv + listen
    └── src/
        ├── app.js                   CORS, JSON 파서, 라우터 마운트, 404, 에러 핸들러
        ├── db.js                    mysql2 풀 (connectionLimit 10)
        ├── middlewares/auth.js      authenticate / requireRole / optionalAuth
        ├── lib/constants.js         권한 상수 + 권한 판정 헬퍼 + 통계 상수
        ├── lib/userQuery.js         getUserById (auth/mypage 공용)
        ├── routes/                  11개 라우터
        ├── controllers/             11개 컨트롤러
        └── services/                activityLogService, emailService, emailTemplates, holidayService
```

**핵심 설계 원칙**: 라우터는 *경로·미들웨어 조립*만, 컨트롤러는 *비즈니스 로직 + SQL*, 서비스는 *횡단 관심사(로그·메일·외부 API)*. 리포지토리 계층은 없고 컨트롤러가 직접 SQL을 쓴다.

---

## 2. 아키텍처와 요청 파이프라인

### 2.1 전체 구성도

```
[브라우저]
   │  (1) 정적 자산: index.html / JS 번들 / main.jpg / kwu-pegasus.svg
   │  (2) XHR: fetch(`${VITE_API_BASE}/api/...`) + Authorization: Bearer <JWT>
   ▼
[Express 서버 :PORT]
   ├─ cors(CORS_ORIGIN)         ← '*'면 모든 origin 허용, 아니면 단일 origin
   ├─ express.json()
   ├─ /api/{roster,posts,comments,users,records,events,holidays,auth,admin,mypage,polls}
   ├─ /api/health               ← { status: 'ok' }
   ├─ 404 핸들러                 ← { message: '존재하지 않는 API입니다.' }
   └─ 에러 핸들러                ← ER_DUP_ENTRY → 409, 그 외 → 500
   ▼
[MySQL 8 (mysql2 pool, limit 10)]

[외부]
   ├─ data.go.kr 특일 정보 API      ← 공휴일 동기화
   ├─ service-api.unique-play.com   ← 리그 기록(타격/투구)
   └─ Gmail SMTP (nodemailer)       ← 이메일 인증번호
```

### 2.2 인증 요청 파이프라인 (표준 경로)

```
fetch(url, { headers: { Authorization: `Bearer ${token}` } })
   │
   ▼ authenticate 미들웨어
   ├─ Authorization 헤더 없음                       → 401 '로그인이 필요합니다.'
   ├─ jwt.verify(token, JWT_SECRET) 실패             → 401 '유효하지 않은 토큰입니다.'
   ├─ SELECT ... FROM users WHERE id = decoded.id    ★ DB 재조회
   │    └─ 0건                                       → 401
   ├─ membership_status === 'banned'                 → 403 '차단된 계정입니다...'
   └─ req.user = { id, username, role, staff_type, ob_yb, membership_status }
   │
   ▼ requireRole(...roles) 미들웨어 (선택)
   └─ roles에 req.user.role 없음                     → 403 '권한이 없습니다.'
   │
   ▼ 컨트롤러
   ├─ 리소스 소유권/세부 권한 재검증 (canModifyResource, isManagerRole 등)
   ├─ pool.query(sql, [params])  ← 반드시 ? 바인딩
   ├─ res.json(...) 또는 res.status(xxx).json({ message })
   └─ activityLogService.log(...)  ★ await 하지 않음 (fire-and-forget)
   │
   ▼ catch (err) → next(err) → 전역 에러 핸들러
```

**★ 중요한 설계 결정 2가지**

1. **`authenticate`는 JWT를 신뢰하지 않고 매 요청 DB를 다시 읽는다.**
   JWT payload에 `role`이 들어 있지만 권한 판정에는 **DB에서 읽은 값**을 쓴다.
   덕분에 권한 강등/차단이 즉시 반영되고, 만료 전 토큰으로 권한을 유지하는 문제가 없다.
   대가는 모든 인증 요청에 SELECT 1회가 추가된다는 것. → **재구축 시에도 이 방식 유지를 권장.**

2. **활동 로그는 `await` 하지 않는다.**
   `log()` 내부에서 예외를 삼키므로 로그 INSERT 실패가 본 요청을 막지 않는다.
   대신 **액션 직후 즉시 로그를 조회하면 아직 INSERT 전일 수 있다**(검증 시 주의).

### 2.3 프론트엔드 인증 상태 파이프라인

```
index.html 인라인 스크립트
   └─ localStorage.theme 또는 prefers-color-scheme → <html data-theme> 설정 (FOUC 방지)
   ▼
main.jsx → ThemeProvider → App → AuthProvider
   ▼
AuthProvider 마운트 시:
   ├─ localStorage.token ?? sessionStorage.token 조회
   ├─ decodeToken(): JWT payload를 atob로 디코드 (★ 서명 검증 안 함 — 표시용)
   ├─ exp * 1000 > Date.now() 이면 user 상태 세팅, 아니면 토큰 폐기
   └─ loading = false
   ▼
ProtectedRoute
   ├─ loading              → null 렌더 (깜빡임 방지)
   ├─ !user                → <Navigate to="/login">
   ├─ requiredRoles 불충족  → <Navigate to="/unauthorized">
   └─ 통과                 → children
```

- 로그인 시 `remember`(자동 로그인) 체크 → `localStorage`, 미체크 → `sessionStorage`.
- `refreshUser()`는 `/api/mypage/me`를 호출해 role/staff_type 등을 최신화한다. Admin 페이지 마운트 시, 계정 정보 저장 후 호출된다.
- 클라이언트의 JWT 디코드는 **UI 분기 전용**이며, 실제 권한은 항상 서버가 판정한다.

---

## 3. 데이터 모델

### 3.1 개체 관계도

```
                       ┌──────────┐
                       │  users   │
                       └────┬─────┘
        ┌───────────────────┼───────────────────┬──────────────────┐
        │ user_id           │ user_id           │ student_id 매칭   │ user_id
        │ (SET NULL)        │ (CASCADE)         │ (FK: SET NULL)    │ (CASCADE)
        ▼                   ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐        ┌─────────┐      ┌───────────────┐
   │  posts  │        │ comments │        │ roster  │      │ activity_logs │
   └────┬────┘        └──────────┘        └─────────┘      └───────────────┘
        │ post_id (CASCADE)                     ▲
        ▼                                       │ year 참조
   ┌─────────┐  poll_id   ┌──────────────┐      │
   │  polls  │───────────▶│ poll_options │      │
   └────┬────┘ (CASCADE)  └──────┬───────┘      │
        │ poll_id                │ option_id    │
        ▼        (CASCADE)       ▼              │
   ┌────────────────────────────────┐           │
   │          poll_votes            │           │
   │  user_id → users (SET NULL)    │           │
   └────────────────────────────────┘           │
                                                │
   ┌──────────┐   ┌────────────┐   ┌────────────┴──┐
   │  events  │   │  holidays  │   │   settings    │  active_roster_year
   └──────────┘   └────────────┘   └───────────────┘
   (독립)          (독립)
```

### 3.2 테이블 정의

#### `users` — 회원

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | |
| `username` | VARCHAR(50) | NOT NULL, **UNIQUE** | 로그인 아이디 겸 표시명 |
| `password` | VARCHAR(255) | NULL 허용 | bcrypt 해시(cost 10). 카카오 로그인 대비 NULL 허용 |
| `email` | VARCHAR(100) | NOT NULL, **UNIQUE** | |
| `name` | VARCHAR(50) | NULL | 실명. 멤버 신청 시 필수 |
| `student_id` | CHAR(10) | NULL, **UNIQUE** | 10자리 숫자. 로스터 연동 키 |
| `ob_yb` | ENUM('ob','yb') | NULL | 졸업생/재학생 |
| `phone` | VARCHAR(20) | NULL | 숫자만 저장(포맷 제거) |
| `phone_country` | VARCHAR(10) | DEFAULT '82' | 국가번호 |
| `authority` | ENUM('basic','member','manager','staff','root') | DEFAULT 'basic' | **권한 계층** |
| `staff_type` | ENUM('president','headcoach') | NULL | `authority='staff'`일 때만 유효 |
| `membership_status` | ENUM('none','pending','approved','rejected','banned') | DEFAULT 'none' | 멤버 신청 상태 **겸 차단 플래그** |
| `marketing_email` | TINYINT(1) | DEFAULT 0 | 회원가입 시 선택 동의 |
| `marketing_sms` | TINYINT(1) | DEFAULT 0 | **현재 미사용(항상 0)** |
| `marketing_kakao` | TINYINT(1) | DEFAULT 0 | **현재 미사용(항상 0)** |
| `marketing_agreed_at` | DATETIME | NULL | 동의 시각 |
| `kakao_id` | VARCHAR(255) | NULL, UNIQUE | **현재 미사용** |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

> ⚠️ `membership_status`가 **멤버 신청 상태**와 **차단 상태**를 한 컬럼에 겸하고 있다. 차단 해제 시 이전 상태를 복원할 수 없어 `authority` 기반으로 추측한다(§7.1). 재구축 시 `is_banned` 분리 권장.

#### `roster` — 연도별 선수단

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | INT | PK | |
| `year` | INT | NOT NULL | 시즌 연도. 연도마다 명단이 독립 |
| `number` | VARCHAR(10) | NOT NULL | 등번호. 매니저는 `'M'` |
| `name` | VARCHAR(50) | NOT NULL | 실명 |
| `student_id` | CHAR(10) | NOT NULL | `UNIQUE(year, student_id)` |
| `generation` | INT | NOT NULL | 기수 |
| `user_id` | INT | FK → users, ON DELETE SET NULL | **실제로는 코드에서 채우지 않음**(§12-17) |
| `role` | ENUM('roster_president','roster_headcoach','roster_retired','roster_player','roster_manager') | DEFAULT 'roster_player' | 사이트 권한(`authority`)과 **무관** |

> `users`와의 연결은 FK가 아니라 **`student_id` 문자열 매칭**(`LEFT JOIN users u ON u.student_id = r.student_id`)으로 이루어진다.

#### `settings` — 전역 설정 (키-값)

| `setting_key` | `setting_val` | 용도 |
|---|---|---|
| `active_roster_year` | 연도 문자열 | 로스터/기록 조회 시 기본 연도. 미설정 시 코드가 현재 연도로 fallback |

#### `posts` — 게시글 (공지·행사·경기·경조사·일반 통합)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | INT | PK |
| `user_id` | INT | FK → users, **ON DELETE SET NULL** (탈퇴 시 글 보존 의도) |
| `type` | ENUM('notice','event','game','family_occasion','normal') | **`lib/constants.js`의 `POST_TYPES`와 항상 동기화 필요** |
| `pin_until` | DATE NULL | 상단 고정 만료일. `9999-12-31` = 무기한 |
| `title` | VARCHAR(200) | |
| `author` | VARCHAR(50) | 작성 시점 username 스냅샷 |
| `date` | DATE | `CURDATE()` |
| `views` | INT DEFAULT 0 | |
| `content` | TEXT | 평문(마크다운/HTML 아님, `\n`만 의미 있음) |

> 표시용 작성자는 `COALESCE(CONCAT(u.username,'(',u.name,')'), p.author)` — 계정이 살아 있으면 최신 정보, 삭제됐으면 스냅샷.

#### `comments` — 댓글

| 컬럼 | 설명 |
|---|---|
| `post_id` | FK → posts, **ON DELETE CASCADE** |
| `user_id` | FK → users, **ON DELETE CASCADE** (탈퇴 시 댓글 삭제) |
| `content` | TEXT |
| `is_edited` | 수정 여부 플래그 |
| `created_at` | DATETIME |

#### `polls` / `poll_options` / `poll_votes` — 투표

| 테이블 | 핵심 컬럼 | 규칙 |
|---|---|---|
| `polls` | `post_id` **UNIQUE**, `title`, `is_multiple`, `is_anonymous`, `is_private` | 게시글 1개당 투표 최대 1개 |
| `poll_options` | `poll_id`, `option_text`, `vote_count` | `vote_count`는 **비정규화 카운터** |
| `poll_votes` | `poll_id`, `user_id`, `option_id`, `UNIQUE(poll_id,user_id,option_id)` | 익명 투표라도 `user_id`를 **항상 저장** |

> `is_anonymous`는 **저장 단계가 아니라 조회 단계에서만** 익명 처리된다. DB에는 누가 무엇에 투표했는지 그대로 남는다(§12-9).

#### `events` / `holidays` — 일정·공휴일

| `events` | 설명 |
|---|---|
| `date` DATE, `type` ENUM('training','meeting','events','etc'), `name` VARCHAR(100) | `UNIQUE(date, name)` — 같은 날 같은 이름 중복 불가 |

| `holidays` | 설명 |
|---|---|
| `year`, `month`, `day` (INT 분해 저장), `type` DEFAULT 'holiday', `name` | 외부 API로 연 단위 전량 교체 |

> `events`는 `DATE` 한 컬럼, `holidays`는 `year/month/day` 3컬럼으로 **날짜 표현이 불일치**한다. 재구축 시 통일 권장.

#### `activity_logs` — 감사 로그

| 컬럼 | 설명 |
|---|---|
| `user_id` | FK → users, **ON DELETE CASCADE** (행위자 삭제 시 로그도 소멸) |
| `action` | ENUM 22종 (§8.1) |
| `target_type` | ENUM('post','comment','event','user','roster','setting') |
| `target_id` | INT NULL, **FK 없음** — 대상 삭제 후에도 기록 유지 |
| `snapshot` | JSON NULL — 삭제·변경 당시 내용 보존 |
| `created_at` | DATETIME |

### 3.3 인덱스

```sql
idx_logs_user_id       ON activity_logs(user_id)
idx_roster_student_id  ON roster(student_id)
idx_roster_year        ON roster(year)
idx_events_date        ON events(date)
idx_holidays_year      ON holidays(year)
idx_comments_post_id   ON comments(post_id)
idx_comments_user_id   ON comments(user_id)
idx_posts_user_id      ON posts(user_id)
idx_polls_post_id      ON polls(post_id)
idx_poll_votes_poll_id ON poll_votes(poll_id)
idx_poll_votes_user_id ON poll_votes(user_id)
```

### 3.4 마이그레이션 이력

| 파일 | 내용 |
|---|---|
| `001_merge_posts_notices.sql` | `notices` 테이블을 `posts`로 통합, `type`/`is_pinned` 추가 |
| `002_add_pin_until.sql` | `is_pinned`(불리언) → `pin_until`(날짜) 전환 |
| `003_add_comments.sql` | `comments` 테이블 추가 |
| `004_add_activity_logs.sql` | `activity_logs` 테이블 추가 |
| `005_add_indexes.sql` | 조회 성능 인덱스 4종 |

`deploy.sh`가 `schema_migrations(filename, applied_at)` 테이블로 적용 여부를 추적하며, 테이블 최초 생성 시 기존 마이그레이션은 "적용됨"으로 표시한다(`schema.sql`에 이미 반영되어 있으므로).

---

## 4. 권한 체계

### 4.1 역할 계층

```
root  >  staff (president | headcoach)  >  manager  >  member  >  basic
```

| 역할 | 부여 방식 | 의미 |
|---|---|---|
| `basic` | 회원가입 시 자동 | 로그인만 가능. 커뮤니티 접근 불가 |
| `member` | manager+ 가 멤버 신청 승인 | 동아리 승인 회원. 게시판 전체 이용 |
| `manager` | staff/root 가 임명 | 공지 작성, 멤버 승인, 로스터·일정 편집 |
| `staff` | root 가 임명 (+회장/감독 구분) | 매니저 임명, 멤버 강등, 차단, 연도 설정 |
| `root` | **SQL로만 생성/관리** | 전권. 탈퇴 불가, 차단 불가 |

> 계층은 "상위가 하위를 포함"하는 개념이지만, **서버에 일반화된 순위 비교 함수가 없다.** 각 지점에서 배열 포함 검사(`requireRole('staff','root')`)로 개별 판정한다. 순위 비교는 프론트엔드 `UserActivity.jsx`의 `ROLE_ORDER`에만 존재한다.

### 4.2 권한 판정 지점 3계층

| 계층 | 위치 | 역할 | 신뢰도 |
|---|---|---|---|
| **① 라우트 가드(FE)** | `App.jsx` `ProtectedRoute` | 페이지 진입 차단, UX용 | ❌ 우회 가능 |
| **② 미들웨어(BE)** | `authenticate` + `requireRole` | 역할(role) 단위 차단 | ✅ 신뢰 가능 |
| **③ 컨트롤러(BE)** | `canModifyResource`, `isManagerRole`, 개별 분기 | 리소스 소유권·대상 역할 검증 | ✅ 신뢰 가능 |

**재구축 시 원칙**: ①만으로 보호되는 데이터는 사실상 공개 데이터다. 현재 게시판 본문·댓글·활동 로그가 여기 해당한다(§12-1, §12-2).

### 4.3 권한 상수 — 프론트/백 분리

동일한 상대 경로(`src/lib/constants.js`)에 파일이 양쪽에 존재하므로 **어느 쪽 정의인지 반드시 구분**해야 한다.

| 정의 | 프론트 | 백엔드 | 내용 |
|---|:---:|:---:|---|
| `MANAGER_ROLES` | ✅ | ✅ | `['manager','staff','root']` |
| `isManagerRole()` | ✅ (인자: `user` 객체) | ✅ (인자: `role` 문자열) | **시그니처가 다름** |
| `MEMBER_ROLES` / `isMemberRole()` | ✅ | ❌ | `['member','manager','staff','root']` |
| `canModifyResource(user, ownerId)` | ❌ | ✅ | `user.id === ownerId \|\| isManagerRole(user.role)` |
| `POST_TYPES` | ❌ | ✅ | schema.sql ENUM과 동기화 대상 |
| `POST_TYPE_MANAGER` / `MANAGER_TYPES` | ✅ / — | — / ✅ | `['notice','event','game']` |
| `POST_TYPE_PINNABLE` / `PINNABLE_TYPES` | ✅ / — | — / ✅ | `['notice','event','game','family_occasion']` |
| `ROSTER_ROLES`, `STAFF_TYPES`, `STUDENT_ID_REGEX`, `ROSTER_ORDER_BY`, `STATS_CONSTANTS`, `EMAIL_CONFIG` | ❌ | ✅ | 서버 검증/쿼리/계산용 |
| `ROLE_LABEL`, `STAFF_TYPE_LABEL`, `POST_TYPE_LABEL`, `ROSTER_ROLE_LABEL`, `EVENT_TYPES`, `DAYS`, `COLORS` | ✅ | ❌ | 표시 라벨·색상 |

### 4.4 권한 매트릭스 (서버 기준)

`—` = 접근 불가, `○` = 가능, `본인` = 소유자만

| 기능 | 비로그인 | basic | member | manager | staff | root |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 로스터/일정/공휴일/기록 조회 | ○ | ○ | ○ | ○ | ○ | ○ |
| 게시글 목록·본문 조회 (API) | ○ ⚠️ | ○ | ○ | ○ | ○ | ○ |
| 댓글 조회 (API) | ○ ⚠️ | ○ | ○ | ○ | ○ | ○ |
| 활동 로그 조회 (API) | ○ ⚠️ | ○ | ○ | ○ | ○ | ○ |
| 게시글 작성 (normal / family_occasion) | — | — | ○ | ○ | ○ | ○ |
| 게시글 작성 (notice / event / game) | — | — | — | ○ | ○ | ○ |
| 상단 고정(pin) 설정 | — | — | — | ○ | ○ | ○ |
| 게시글 수정 | — | — | 본인 | 본인+타인 | 본인+타인 | 본인+타인 |
| 게시글 삭제 | — | — | 본인 | 본인+타인 | 본인+타인 | 본인+타인 |
| 댓글 작성 | — | — | ○ | ○ | ○ | ○ |
| 댓글 수정 | — | — | 본인 | 본인 | 본인 | 본인 |
| 댓글 삭제 | — | — | 본인 | 본인+타인 | 본인+타인 | 본인+타인 |
| 투표 제출 | — | ○ ⚠️ | ○ | ○ | ○ | ○ |
| 투표 삭제 | — | — | 글 작성자 | 글 작성자 | 글 작성자 | 글 작성자 |
| 마이페이지(계정 수정·멤버 신청·탈퇴) | — | ○ | ○ | ○ | ○ | 탈퇴 ✕ |
| 멤버 신청 승인/거부 | — | — | — | ○ | ○ | ○ |
| 로스터 추가/수정/삭제 | — | — | — | ○ | ○ | ○ |
| 매니저 임명/해제 | — | — | — | — | ○ | ○ |
| 멤버 강등 | — | — | — | — | ○ | ○ |
| 유저 차단 (basic/member/manager 대상) | — | — | — | — | ○ | ○ |
| 유저 차단 (staff 대상) | — | — | — | — | — | ○ |
| 유저 차단 (root 대상) | — | — | — | — | — | — |
| 차단 해제 | — | — | — | — | ○ | ○ |
| 스태프 임명/해제 | — | — | — | — | — | ○ |
| 활성 로스터 연도 설정 | — | — | — | — | ○ | ○ |
| 공휴일 동기화 | — | — | — | — | ○ | ○ |

⚠️ = 프론트엔드에서만 차단되고 API는 무방비인 항목 (§12-1, §12-2)

---

## 5. API 전체 명세

**공통 규약**
- Base URL: `${VITE_API_BASE}` (미설정 시 `http://localhost:3001`)
- 인증: `Authorization: Bearer <JWT>`
- 요청/응답 본문: `application/json`
- 에러: `{ "message": "한국어 메시지" }` + 적절한 status
- 전역 에러 매핑: `ER_DUP_ENTRY` → **409**, 그 외 미처리 예외 → **500**, 없는 경로 → **404**

범례 — 인증: `공개`(미들웨어 없음) / `인증`(authenticate) / `선택`(optionalAuth) / `역할`(requireRole 목록)

### 5.1 `/api/auth` — 인증

| 메서드 | 경로 | 인증 | 요청 | 응답 | 비고 |
|---|---|---|---|---|---|
| POST | `/signup` | 공개 (**rate limit 10분/5회**) | `{username, password, email, marketingAgreed}` | 201 `{message}` | §7.2 검증 규칙 |
| POST | `/login` | 공개 | `{username, password}` | `{token, user:{id,username,role,staff_type,ob_yb,membership_status}}` | JWT 만료 **7d** |
| GET | `/me` | 인증 | — | 유저 전체 프로필 | `getUserById` |
| GET | `/check-username?username=` | 공개 | — | `{available: boolean}` | |
| GET | `/check-email?email=` | 공개 | — | `{available: boolean}` | |
| POST | `/send-email-code` | 공개 | `{email}` | `{message}` / 409 중복 / 500 발송 실패 | 6자리 코드, **TTL 5분**, 메모리 Map 저장 |
| POST | `/verify-email-code` | 공개 | `{email, code}` | `{message}` / 400 | 성공 시 코드 폐기 |

> ⚠️ `verify-email-code` 성공 사실은 **서버 어디에도 저장되지 않는다.** `/signup`은 이메일 인증 여부를 확인하지 않으므로, 인증 절차는 프론트엔드에서만 강제된다(§12-3).

**로그인 실패 응답 통일**: 아이디 없음/비밀번호 불일치 모두 401 `'아이디 또는 비밀번호가 올바르지 않습니다.'` (계정 존재 여부 노출 방지). 단, 차단 계정은 403으로 구분된다.

### 5.2 `/api/posts` — 게시글

| 메서드 | 경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/` | **공개** | — | 전체 게시글 배열. `isPinned` 계산 필드 포함, `ORDER BY isPinned DESC, date DESC, id DESC` |
| GET | `/:id` | **공개** | — | 게시글 1건(+`content`). **응답 후 비동기로 `views + 1`** |
| GET | `/:id/adjacent` | **공개** | — | `{prev: {id,title}\|null, next: {id,title}\|null}` (id 기준) |
| POST | `/` | 역할: member+ | `{type, pinUntil, title, content, poll?}` | 201 `{id}` |
| PUT | `/:id` | 역할: member+ | 동일 | `{message}` |
| DELETE | `/:id` | 역할: member+ | — | `{message}` |

**쓰기 시 서버 검증**
- `MANAGER_TYPES`(notice/event/game) 지정 시 `isManagerRole` 아니면 403
- `resolvePinUntil(type, pinUntil, isManager)`:
  `PINNABLE_TYPES`에 없거나 매니저가 아니면 **강제 `null`** → `pinUntil === 'infinite'`면 `'9999-12-31'`, 아니면 입력값
- 수정/삭제: `canModifyResource(req.user, post.user_id)` — 소유자 또는 manager+
- ⚠️ 목록/상세 API에 **페이지네이션이 없다.** 전체 행을 매번 반환한다.

### 5.3 `/api/comments` — 댓글

| 메서드 | 경로 | 인증 | 요청 | 비고 |
|---|---|---|---|---|
| GET | `/?postId=` | **공개** | — | `postId` 없으면 400 |
| POST | `/` | 역할: member+ | `{postId, content}` | 201, 생성된 댓글 객체 반환 |
| PUT | `/:id` | 역할: member+ | `{content}` | **소유자만** (`user_id !== req.user.id` → 403), `is_edited = 1` |
| DELETE | `/:id` | 역할: member+ | — | `canModifyResource` — 소유자 또는 manager+ |

### 5.4 `/api/polls` — 투표

| 메서드 | 경로 | 인증 | 응답 |
|---|---|---|---|
| GET | `/post/:postId` | 선택 | 투표 없으면 `null` |
| GET | `/:pollId` | 선택 | 없으면 404 |
| POST | `/:pollId/vote` | 인증 (**역할 검사 없음**) | `{optionIds: number[]}` |
| DELETE | `/:pollId` | 인증 | **글 작성자만** (403) |

**조회 응답 구조**
```jsonc
{
  "poll":    { "id", "title", "isMultiple", "isAnonymous", "isPrivate" },
  "options": [{ "id", "text", "votes|null", "percentage|null", "voters": ["username(name)", ...] }],
  "totalVotes": "number|null",
  "userVotes":  [optionId, ...],
  "canSeeResults": true
}
```

**가시성 규칙**
- `canSeeResults = !is_private || 본인이 글 작성자 || role ∈ {root, staff}`
  → 비공개면 `votes`/`percentage`/`totalVotes`가 `null`, UI는 "비공개" 표시
- `canSeeVoters = !is_anonymous && (canSeeResults와 동일 조건)`
  → 기명 + 공개(또는 열람 권한)일 때만 투표자 명단 반환
- ⚠️ `manager`는 비공개 투표 결과를 볼 수 없다(root/staff만 가능).

**투표 제출 트랜잭션**
```
1. 단일선택인데 optionIds.length > 1        → 400
2. optionIds가 해당 poll의 옵션이 아님       → 400
3. BEGIN
   ├─ 기존 투표 있으면: 해당 옵션 vote_count - 1, poll_votes DELETE
   ├─ 새 투표 INSERT (익명이어도 user_id 저장)
   └─ 선택 옵션 vote_count + 1
4. COMMIT (실패 시 ROLLBACK)
```
→ 재투표 시 기존 표를 지우고 다시 넣으므로 **투표 변경이 가능**하다.

### 5.5 `/api/events` — 팀 일정

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| GET | `/?year=` | **공개** | 연도 미지정 시 현재 연도. `WHERE YEAR(date) = ?` |
| POST | `/` | 역할: manager+ | `{date, type, name}`. `UNIQUE(date,name)` 위반 → 409 |
| PUT | `/:id` | 역할: manager+ | 없으면 404 |
| DELETE | `/:id` | 역할: manager+ | |

### 5.6 `/api/holidays` — 공휴일

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| GET | `/?year=` | **공개** | 해당 연도 데이터가 **0건이면 외부 API를 호출해 자동 동기화 후 재조회** |

> ⚠️ 미인증 사용자가 임의 연도를 요청해 외부 API 호출 + DB 쓰기를 유발할 수 있다(§12-6).

### 5.7 `/api/roster` — 선수단 (공개 조회)

| 메서드 | 경로 | 인증 | 응답 |
|---|---|---|---|
| GET | `/years` | 공개 | `[2026, 2025, ...]` (DISTINCT, DESC) |
| GET | `/active-year` | 공개 | `{year}` — settings 값, 없으면 현재 연도 |
| GET | `/?year=` | 공개 | 해당 연도 명단. 연도 미지정 시 활성 연도 |

**정렬 규칙(`ROSTER_ORDER_BY`, 백엔드 상수로 공유)**
```sql
ORDER BY
  CASE WHEN r.number = 'M' THEN 1 ELSE 0 END ASC,                     -- 매니저(M)를 맨 뒤로
  CASE WHEN r.number != 'M' THEN CAST(r.number AS UNSIGNED) END ASC,  -- 등번호 오름차순
  r.generation ASC                                                     -- 기수 오름차순
```

### 5.8 `/api/users/:username` — 타 유저 활동 내역

| 메서드 | 경로 | 인증 | 응답 |
|---|---|---|---|
| GET | `/:username` | **공개** | `{username, role}` — 없으면 404 |
| GET | `/:username/posts` | **공개** | 해당 유저 게시글 전체 |
| GET | `/:username/comments` | **공개** | 해당 유저 댓글 전체(+원글 제목/타입) |
| GET | `/:username/logs` | **공개** ⚠️ | 활동 로그 전체(**snapshot JSON 포함**) |

> ⚠️ **`/logs`에 인증·권한 검사가 전혀 없다.** "자신보다 낮은 권한 유저의 로그만 열람 가능"이라는 규칙은 `UserActivity.jsx`의 `isHigherRole()`로 **탭 표시 여부만** 제어할 뿐이다. API를 직접 호출하면 누구나 임의 유저의 삭제된 게시글 내용·개인정보 스냅샷을 읽을 수 있다(§12-2).

### 5.9 `/api/mypage` — 내 정보 (라우터 전체에 `authenticate` 적용)

| 메서드 | 경로 | 요청 | 비고 |
|---|---|---|---|
| GET | `/me` | — | 전체 프로필 |
| GET | `/check-username?username=` | — | 본인 제외 중복 검사 |
| GET | `/check-email?email=` | — | 본인 제외 중복 검사 |
| PUT | `/account` | `{username, email, phone, phone_country}` | 형식 검증 §7.2. 중복 시 409 |
| PUT | `/profile` | `{name, student_id?, ob_yb}` | **`membership_status ∈ {none, rejected}`일 때만 허용** |
| POST | `/membership-request` | — | 상태 머신 §7.1 |
| GET | `/roster-history` | — | `student_id` 매칭으로 연도별 등번호/역할 |
| GET | `/posts` | — | 최신 **5건** (위젯용) |
| GET | `/posts/all` | — | 전체 |
| GET | `/comments` | — | 최신 **5건** |
| GET | `/comments/all` | — | 전체 |
| GET | `/votes/all` | — | 내가 투표한 poll 목록(DISTINCT) |
| DELETE | `/withdraw` | — | 회원 탈퇴 §7.4 |

### 5.10 `/api/admin` — 관리자 (라우터 전체에 `authenticate` 적용)

| 메서드 | 경로 | 역할 | 동작 |
|---|---|---|---|
| GET | `/pending-members` | manager+ | `membership_status='pending'` 목록 |
| POST | `/approve-member/:id` | manager+ | `status='approved', authority='member'` **(단, `WHERE authority='basic'` 조건부)** |
| POST | `/reject-member/:id` | manager+ | `status='rejected'` |
| GET | `/roster?year=` | manager+ | 연도 필수(미지정 400). `users`와 LEFT JOIN해 `username` 표시 |
| POST | `/roster` | manager+ | 필수값·학번 정규식·역할 화이트리스트·번호(숫자 또는 M) 검증. 중복 학번 409 |
| PUT | `/roster/:id` | manager+ | 동일 검증 |
| DELETE | `/roster/:id` | manager+ | |
| GET | `/org-members` | staff+ | staff/manager/member 전체 + 최신 연도 로스터 정보 |
| PUT | `/users/:id/demote-member` | staff+ | **대상이 `member`일 때만**. → `basic`, `status='none'` |
| GET | `/basic-users` | staff+ | `authority='basic'` 이고 차단되지 않은 유저 |
| PUT | `/users/:id/ban` | staff+ | 대상 역할 검사: staff→`[basic,member,manager]`, root→`+staff`. root는 차단 불가 |
| GET | `/banned-users` | staff+ | 차단 계정 목록 |
| GET | `/bannable-users` | staff+ | `authority != 'root'` 이고 미차단 |
| PUT | `/users/:id/unban` | staff+ | 복원 상태 = `authority ∈ {member,manager,staff}` ? `'approved'` : `'none'` |
| GET | `/members` | staff+ | `authority='member'` |
| GET | `/managers` | staff+ | `authority='manager'` |
| PUT | `/users/:id/set-manager` | staff+ | **대상이 `member`일 때만** |
| PUT | `/users/:id/unset-manager` | staff+ | **대상이 `manager`일 때만** → `member` |
| GET | `/staffs` | **root** | `authority='staff'`, president 우선 정렬 |
| PUT | `/users/:id/set-staff` | **root** | `{staff_type}` 필수(화이트리스트). **대상이 `member`\|`manager`일 때만** |
| PUT | `/users/:id/unset-staff` | **root** | **대상이 `staff`일 때만** → `member`, `staff_type=NULL` |
| PUT | `/roster-year` | staff+ | `settings.active_roster_year` UPSERT |
| POST | `/sync-holidays` | staff+ | `{year}` — 해당 연도 공휴일 전량 재동기화 |

### 5.11 `/api/records` — 경기 기록 (외부 API 프록시 + 계산)

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| GET | `/batting?year=` | **공개** | 팀 타격 기록 + `_woba`, `_wrcPlus`, `_owar`, `_number` |
| GET | `/pitching?year=` | **공개** | 팀 투구 기록 + `_fip`, `_pwar`, `_number` |

메모리 캐시 TTL **24시간**. 상세는 §9.2.

### 5.12 기타

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/api/health` | `{status:'ok'}` |
| GET | `/favicon.ico` | 204 |
| * | 그 외 | 404 `{message:'존재하지 않는 API입니다.'}` |

---

## 6. 페이지·라우트 명세

### 6.1 라우트 표

| 경로 | 컴포넌트 | 가드(`requiredRoles`) | 설명 |
|---|---|---|---|
| `/` | `Home` | 없음 | 히어로 이미지 + 게시판/일정 위젯 |
| `/login` | `Login` | 없음 | |
| `/signup` | `Signup` | 없음 | |
| `/unauthorized` | `Unauthorized` | 없음 | 비로그인/권한부족 2가지 화면 분기 |
| `/schedule` | `Schedule` | 없음 | 월간 캘린더 |
| `/roster` | `Roster` | 없음 | 연도별 선수단 카드 그리드 |
| `/records` | `Records` | 없음 | 시즌 기록(팀/타자/투수) |
| `/board` | `Board` | **basic+** | 게시글 목록 |
| `/board/:id` | `BoardDetail` | **member+** | 본문 + 투표 + 댓글 |
| `/board/write` | `BoardWrite` | **member+** | |
| `/board/:id/edit` | `BoardEdit` | **member+** | 추가로 컴포넌트 내부에서 소유자 검사 |
| `/schedule/write` | `EventWrite` | **manager+** | `?tab=edit`로 수정 탭 진입 |
| `/user/:username` | `UserActivity` | **member+** | 게시글/댓글/(로그) 탭 |
| `/user/:username/log/:logId` | `LogDetail` | **manager+** | 로그 스냅샷 상세. **`location.state`로 데이터 전달** |
| `/mypage` | `MyPage` | 로그인만 | 탭 6개 |
| `/admin` | `Admin` | **manager+** | 탭 8개(역할별 노출) |
| `/notice`, `/notice/:id` | → `/board` 리다이렉트 | — | 구 URL 호환 |
| `*` | `NotFound` | — | 404 |

> `LogDetail`은 `useLocation().state`에만 의존한다. **URL 직접 접근/새로고침 시 "로그 정보를 불러올 수 없습니다."** 가 뜬다(§12-11).

### 6.2 전역 헤더 (`Header.jsx`)

| 요소 | 노출 조건 |
|---|---|
| 홈 / 일정 / 선수단 / 기록 | 항상 |
| 게시판 / 마이페이지 | 로그인 시 |
| 관리자 | `isManagerRole(user)` |
| 테마 토글(🌙/☀️) | 항상 |
| 역할 배지 + username + 로그아웃 | 로그인 시. staff는 배지에 회장/감독 표시 |
| 로그인 / 회원가입 버튼 | 비로그인 시 (현재 경로가 해당 페이지면 그 버튼은 숨김) |

- 활성 링크 아래 **슬라이딩 인디케이터**: `getBoundingClientRect()`로 위치 계산. 경로 변경 시 애니메이션, `document.fonts.ready` 후에는 `transition: none`으로 즉시 배치(폰트 로딩에 의한 위치 튐 방지).
- 모바일(≤768px): 햄버거 → 드롭다운 메뉴 + 배경 블러 오버레이(`body.menu-open .content-area { filter: blur(4px) }`).

### 6.3 페이지별 상세

#### `/` 홈
- **히어로**: `/main.jpg`
- **게시판 위젯**: `GET /api/posts` → 고정글 전체 + 최신글 `8 - 고정글수` 개. 고정글 아래 구분선.
- **일정 위젯(MiniCalendar)**: 현재 월 달력. 공휴일/일정이 있는 날에 색 점(dot) 표시, `title` 속성으로 툴팁. 클릭 시 `/schedule` 이동.

#### `/roster` 선수단
- 마운트 시 `active-year` + `years` 병렬 조회 → 활성 연도 선택 → `GET /api/roster?year=`
- **연도 탭**(연도 2개 이상일 때만), **역할 필터**(전체/선수/감독·회장/매니저/영구결번), **이름·번호 검색**
- 카드 배지: `HC`(감독), `PD`(회장), `M`(매니저이면서 번호가 'M'이 아닌 경우), `영구결번`
- `key={p.student_id}` — 같은 연도 내 학번이 UNIQUE라 안전

#### `/schedule` 일정
- 월간 그리드. 이전/다음 달, "오늘" 버튼(현재 월이 아닐 때만), 연·월 피커(외부 클릭 시 닫힘)
- **최소 연도 2000년**(`MIN_YEAR`)으로 하한 고정
- 공휴일명·일정칩 hover 시 마우스 좌표 추적 툴팁
- manager+ 에게만 "일정 추가"/"일정 수정" 버튼 노출
- 데이터는 `useScheduleData(year, month)` 훅이 공휴일·일정을 `Map`으로 인덱싱해 제공

#### `/schedule/write` 일정 관리 (manager+)
- **추가 탭**: 행 단위로 `{유형, 시작일~종료일, 이름}` 다중 입력.
  `getDatesInRange()`로 **날짜 범위를 일자별로 펼쳐 개별 POST**를 순차 전송. 실패 건은 `409 → "이미 존재하는 일정입니다"`로 수집해 하단에 목록 표시. 전부 성공해야 `/schedule`로 이동.
  시작일 > 종료일 입력 시 자동 보정.
- **수정 탭**: 연 단위 조회 후 월별 필터. 행 단위 즉시 저장(성공 시 1.5초 하이라이트), 다른 달로 날짜를 바꾸면 목록에서 제거. 행 단위 삭제(confirm).

#### `/board` 게시판 목록 (basic+)
- 고정글 섹션 + 구분선 + 일반글 섹션
- **클라이언트 페이지네이션** `DEFAULT_PAGE_SIZE = 15` (일반글만 대상, 고정글은 항상 전체 표시)
- `basic`은 목록은 보이지만 글 클릭 시 `preventDefault` → `/unauthorized`
- 글쓰기 버튼은 `isMemberRole`일 때만 (헤더·푸터 2곳)
- 작성자명 클릭 → 본인이면 `/mypage`, 아니면 `/user/:username` (`author` 문자열 `"username(name)"`에서 정규식으로 username 추출)

#### `/board/:id` 게시글 상세 (member+)
- `GET /api/posts/:id`, `/adjacent`, `/api/comments?postId=`, `/api/polls/post/:id` 를 조회
- **수정 버튼**: `user.id === post.user_id` 일 때만 (매니저라도 타인 글 수정 버튼은 없음)
- **삭제 버튼**: 본인 또는 `isManagerRole`. 타인 글 삭제 시 확인창 문구가 달라짐 →
  `"이 행동은 로그에 기록됩니다.\n올바르지 않은 삭제는 제재를 받을 수 있습니다."`
- 댓글: 500자 제한, 실시간 카운터. 수정은 본인만, 삭제는 본인 또는 매니저(타인 삭제 시 동일 경고 문구). 수정된 댓글에 `(수정)` 표기
- 본문 렌더링은 `ContentRenderer` — `\n`으로 split해 `<p>`/`<br>`. **HTML/마크다운 미지원 → XSS 안전**
- 하단 이전글/목록/다음글 내비게이션

#### `/board/write`, `/board/:id/edit` — 공용 `PostForm`
`BoardWrite`/`BoardEdit`가 초기값과 `onSubmit`을 주입하는 프레젠테이셔널 폼.

| 필드 | 규칙 |
|---|---|
| 유형 | `POST_TYPE_LABEL` 전체 중 `POST_TYPE_MANAGER`는 `isManager`일 때만 노출 |
| 상단 고정 | `isManager && POST_TYPE_PINNABLE.includes(type)` 일 때만 UI 노출. 날짜 지정 또는 "항상 고정" |
| 제목/내용 | 공란이면 라벨·입력창에 에러 스타일 |
| 투표 | 옵션 2개 이상 필수, 제목 필수. 설정: 다중선택 / 익명 / 비공개 |

유형을 pin 불가 타입으로 바꾸면 pin 상태가 자동 해제된다.

**BoardEdit 특이사항**: 기존 투표가 있으면 `hasExistingPoll`로 "투표 추가" 체크박스를 숨기고, 저장 시 **기존 투표를 DELETE한 뒤 게시글을 PUT**한다(서버가 투표를 UPSERT하지 않고 INSERT만 하기 때문 — §12-8).

#### `/user/:username` 활동 내역 (member+)
- 4개 API 병렬 조회(`Promise.all`)
- 탭: 게시글(페이지네이션 15) / 댓글(페이지네이션 15) / **로그**
- 로그 탭 노출 조건: `ROLE_ORDER`로 **열람자 권한 > 대상 권한** 일 때만
  (`basic:0 < member:1 < manager:2 < staff:3 < root:4`)
- 로그 행은 action 종류별로 다른 요약 레이아웃(게시글/댓글/일정/멤버·권한·차단/로스터/연도설정)
- `post_*`, `comment_*` 로그만 클릭 가능 → `/user/:username/log/:logId`

#### `/mypage` 마이페이지 (로그인)
탭 6개. **부모(`MyPage.jsx`)가 데이터를 소유하고 props로 내려주는 하이브리드 구조**(Admin과 달리 탭이 자체 fetch하지 않음).

| 탭 | 내용 | 데이터 로딩 |
|---|---|---|
| 계정 정보 | 사용자 정보 조회/수정, 멤버 신청 | `me` (부모) |
| 활동 내역 | 내 게시글·댓글 최신 5건 미리보기 | `isMemberRole(me)`일 때만 로드 |
| 내 게시글 | 전체 + 페이지네이션 | **탭 최초 진입 시 lazy load**(`postsAllLoaded`) |
| 내 댓글 | 전체 + 페이지네이션 | lazy load |
| 내 투표 | 아코디언 확장 시 poll 상세 로드(`pollData` 캐시) | lazy load |
| 설정 | 회원 탈퇴 | — |

**계정 정보 탭(`AccountTab`)의 편집 플로우**
```
[수정] 클릭
 ├─ 아이디 변경 → [중복확인] 필수 (usernameCheck === 'ok' 이어야 저장 가능)
 ├─ 이메일 변경 → [발송] → 6자리 코드 [인증] 필수 (emailCodeVerified)
 ├─ 전화번호   → 국가코드 콤보박스(검색·Enter 선택, 국기 아이콘) + 번호
 │               82면 010-0000-0000 자동 포맷, 그 외는 숫자만 15자리
 └─ [저장] → PUT /api/mypage/account → load() + refreshUser()
```
읽기 전용 필드: 권한 배지, 역할(선수/매니저/회장/감독/superuser), OB·YB, 실명, 학번.

**멤버 신청(`basic` 전용)**: 상태 배지 + `none`/`rejected`일 때 신청 폼 드롭다운. 프로필(실명·학번·OB/YB) 저장 후 "멤버 신청" 버튼 활성화.

#### `/admin` 관리자 (manager+)
마운트 시 `refreshUser()` 호출로 권한 최신화. **각 탭이 자체적으로 fetch·상태를 소유**한다.

| 탭 | 노출 | 기능 |
|---|---|---|
| 멤버 승인 | manager+ | pending 목록, 승인/거부(거부는 confirm) |
| 로스터 관리 | manager+ | 추가 폼(연도·번호·이름·학번·기수·역할) + 연도 선택 + **행 단위 인라인 편집/삭제** |
| 매니저 관리 | staff+ | 현재 매니저(해제) / 임명 가능 멤버(부여) 2테이블 |
| 스태프 관리 | **root** | 현재 스태프(해제) / 임명 가능 member+manager(회장·감독 선택 후 부여) |
| 일반유저 관리 | staff+ | basic 목록, 계정 차단 |
| 멤버 관리 | staff+ | staff/manager/member 3그룹, 로스터 등번호·멤버 상태 표시, `member`만 강등 버튼 |
| 차단 계정 | staff+ | 차단 목록(해제) / 차단 가능 목록(차단). **`STAFF_BANNABLE`/`ROOT_BANNABLE`로 프론트에서 한 번 더 필터** |
| 연도 설정 | staff+ | 활성 로스터 연도 조회·변경 |

모든 테이블의 username은 `/user/:username` 링크.

#### `/records` 시즌 기록 (공개)
- 탭: **팀** / 타자 / 투수
- 팀 탭: 타자 oWAR Top3, 투수 pWAR Top3 **포디움**(금/은/동 메달 색 + 등번호 방패 SVG)
- 타자/투수 탭: 정렬 가능한 전체 스탯 테이블(헤더 클릭 → desc/asc 토글). 기본 정렬 `_owar` / `_pwar`
- **규정타석/규정이닝 필터**: `regPA = tgame`, `regIP = floor(tgame × 5/9)`. 툴팁으로 계산식 표시
- ⚠️ 헤더의 시즌 표기 `2026 KWU PEGASUS`가 **하드코딩**되어 있다.

---

## 7. 도메인 규칙

### 7.1 멤버십 상태 머신

```
                     회원가입
                        │
                        ▼
                  ┌───────────┐
                  │   none    │  authority: basic
                  └─────┬─────┘
      프로필(실명+OB/YB+학번) 입력 후 신청
                        ▼
                  ┌───────────┐
                  │  pending  │  authority: basic
                  └──┬─────┬──┘
       manager+ 승인 │     │ manager+ 거부
                    ▼     ▼
        ┌────────────┐   ┌───────────┐
        │  approved  │   │ rejected  │──┐ 프로필 수정 후 재신청
        │ auth:member│   │auth: basic│◀─┘
        └──────┬─────┘   └───────────┘
     staff+ 강등│
               ▼
           none / basic

  [차단]  staff+/root → membership_status = 'banned' (이전 상태 소실)
  [해제]  authority ∈ {member,manager,staff} → 'approved',  그 외 → 'none'
```

**신청 전제조건** (`requestMembership`)
1. `membership_status === 'pending'` → 400 "이미 신청 중입니다."
2. `=== 'approved'` → 400 "이미 멤버입니다."
3. `name` 또는 `ob_yb` 없음 → 400 "먼저 프로필(실명, OB/YB)을 입력해주세요."
4. `student_id` 없음 → 400 "먼저 프로필에서 학번을 입력해주세요."

**프로필 수정 잠금**: `PUT /api/mypage/profile`은 `membership_status ∈ {none, rejected}`일 때만 허용. 승인 후에는 실명·학번·OB/YB를 사용자가 바꿀 수 없다(로스터 연동 무결성 보호).

> ⚠️ `AccountTab`은 학번을 "선택"으로 표기하지만 신청 시 서버가 필수로 요구한다(§12-13).

### 7.2 입력 검증 규칙

| 항목 | 정규식/조건 | 프론트 | 백엔드 |
|---|---|:---:|:---:|
| username (가입) | `/^[a-zA-Z0-9_]{5,15}$/` | ✅ | ✅ |
| username (계정 수정) | `/^[a-zA-Z0-9_]{1,15}$/` ⚠️ **하한 불일치** | ✅ (5자) | ✅ (1자) |
| email | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | ✅ | ✅ |
| password | 8자 이상 **AND** 영문 + 숫자 + 특수문자 각 1개 이상 | ✅ | ✅ |
| 특수문자 집합 | ``!@#$%^&*()_-=[]{};:'",.<>?/\|`` | ✅ | ✅ |
| phone | 숫자만 7~15자리 | 포맷팅 | ✅ |
| student_id | `/^\d{10}$/` | ✅ | ✅ |
| 로스터 number | `'M'` 또는 `/^\d+$/` | 대문자 변환 | ✅ |
| 로스터 role | `ROSTER_ROLES` 화이트리스트 | select | ✅ |
| staff_type | `STAFF_TYPES` 화이트리스트 | select | ✅ |
| 댓글 | 1~500자 | `maxLength` | trim 후 빈 값 400 |
| 일정 이름 | ≤100자 | `maxLength` | 컬럼 제약 |

프론트 검증 로직은 `lib/validators.js`에 `{valid, error}` 형태로 통일되어 있다.

### 7.3 게시글 타입과 고정(pin)

| 타입 | 라벨 | 작성 권한 | pin 가능 |
|---|---|---|:---:|
| `notice` | 공지 | manager+ | ✅ |
| `event` | 행사 | manager+ | ✅ |
| `game` | 경기 | manager+ | ✅ |
| `family_occasion` | 경조사 | member+ | ✅ (설정은 manager+만) |
| `normal` | 게시글 | member+ | ❌ |

**`pin_until` 해석**
- `NULL` → 고정 안 함
- 날짜 → 그 날짜까지 고정 (`pin_until >= CURDATE()` 이면 `isPinned = 1`)
- `9999-12-31` → 무기한 고정(수동 해제까지)

**동기화 3점 세트** — 타입을 추가/변경할 때 반드시 함께 수정:
1. `sql/schema.sql`의 `posts.type ENUM(...)`
2. 백엔드 `lib/constants.js`의 `POST_TYPES`
3. 프론트 `lib/constants.js`의 `POST_TYPE_LABEL` / `POST_TYPE_MANAGER` / `POST_TYPE_PINNABLE`
   (+ `lib/utils.js`의 `POST_TYPE_STYLE_KEY`, 각 CSS 모듈의 태그 색상)

### 7.4 회원 탈퇴

```
DELETE /api/mypage/withdraw
 ├─ authority === 'root' → 403 'root 권한 계정은 SQL을 통해서만 관리됩니다.'
 └─ 트랜잭션
      1. DELETE FROM comments WHERE user_id = ?
      2. DELETE FROM posts    WHERE user_id = ?   ← 이 글에 달린 타인 댓글/투표도 CASCADE 삭제
      3. DELETE FROM users    WHERE id = ?        ← activity_logs CASCADE 삭제
                                                    roster.user_id, poll_votes.user_id는 SET NULL
```
UI: `ConfirmModal`에 **"동의합니다"** 정확 일치 입력 요구 → 성공 시 `logout()` + 1.5초 후 `/login`.

> ⚠️ 스키마는 `posts.user_id ON DELETE SET NULL`로 "탈퇴해도 글 보존"을 의도했지만, 컨트롤러가 명시적으로 DELETE한다. 의도와 구현이 상충한다(§12-12).

### 7.5 로스터 ↔ 유저 연동

- 연결 키는 **`student_id` 문자열 매칭**. FK `roster.user_id`는 스키마에 있으나 채워지지 않는다.
- 관리자 로스터 조회: `LEFT JOIN users u ON u.student_id = r.student_id` → `username` 표시(없으면 "미가입")
- 마이페이지 로스터 이력: `JOIN roster r ON u.student_id = r.student_id` → 연도별 등번호/역할
- 멤버 관리 탭: 상관 서브쿼리로 **최신 연도** 로스터 정보만 표시
  ```sql
  LEFT JOIN roster r ON r.student_id = u.student_id
    AND r.year = (SELECT MAX(r2.year) FROM roster r2 WHERE r2.student_id = u.student_id)
  ```

### 7.6 활성 연도(`active_roster_year`)의 영향 범위

| 소비처 | 동작 |
|---|---|
| `GET /api/roster` | `year` 미지정 시 기본값 |
| `Roster.jsx` | 초기 선택 연도 |
| `RosterManagementTab` | 추가 폼의 기본 연도 |
| `recordsController.getRosterNumbers()` | 기록 테이블에 등번호를 붙일 때 참조할 로스터 연도 |

미설정 시 모든 곳에서 `new Date().getFullYear()`로 fallback.

---

## 8. 활동 로그(감사 로그) 규격

### 8.1 액션 목록과 스냅샷 내용

| action | target_type | 스냅샷 필드 | 기록 주체 |
|---|---|---|---|
| `post_create` | post | `type, title, content, pin_until` | member+ |
| `post_update` | post | `type, title, content, pin_until` (수정 **후** 값) | member+ |
| `post_delete` | post | `type, title, content` (삭제 **전** 값) | member+ |
| `comment_create` | comment | `content, post_id, post_title` | member+ |
| `comment_update` | comment | `content, post_id, post_title` (수정 후) | member+ |
| `comment_delete` | comment | `content, post_id, post_title` (삭제 전) | member+ |
| `event_create` / `event_update` | event | `date, type, name` | manager+ |
| `event_delete` | event | `date, type, name` (삭제 전) | manager+ |
| `member_approve` / `member_reject` | user | `username, name, student_id, ob_yb` | manager+ |
| `member_demote` | user | 동일 | staff+ |
| `role_set_manager` / `role_unset_manager` | user | 동일 | staff+ |
| `role_set_staff` | user | 동일 + `staff_type` | root |
| `role_unset_staff` | user | 동일 | root |
| `user_ban` / `user_unban` | user | 동일 | staff+ / root |
| `roster_add` | roster | `name, student_id, role, year, number` | manager+ |
| `roster_update` | roster | `name, student_id, role` | manager+ |
| `roster_delete` | roster | `name, student_id, role` (삭제 전) | manager+ |
| `roster_year_set` | setting | `{year}` (`target_id`는 NULL) | staff+ |

### 8.2 서비스 API

```js
log(userId, action, targetType, targetId, snapshot)
  // INSERT ... VALUES (?, ?, ?, ?, JSON.stringify(snapshot) | null)
  // 내부 try/catch로 예외를 삼킴 → 절대 throw하지 않음

logWithSnapshot(userId, action, targetType, targetId, row, pick)
  // row가 falsy면 no-op
  // pick 배열이 있으면 해당 키만 추출, 없으면 row 전체를 스냅샷으로
  // "삭제/변경 전 SELECT → 로그" 패턴을 공통화한 헬퍼
```

**호출 규약**: 두 함수 모두 **`await` 없이 호출**한다. 로그 실패가 본 흐름을 막지 않도록 하기 위함이며, 그 대가로 액션 직후 즉시 조회하면 아직 INSERT되지 않았을 수 있다.

### 8.3 로그되지 않는 액션 (재구축 시 검토 대상)

회원가입, 로그인/로그아웃, 로그인 실패, 멤버 신청(`requestMembership`), 계정 정보 수정, 프로필 수정, **투표 제출**, **회원 탈퇴**, 공휴일 동기화.

특히 **회원 탈퇴는 로그가 남지 않을 뿐 아니라, `user_id` CASCADE로 그 유저의 기존 로그까지 전부 삭제된다.** 감사 로그의 목적("부정 사용 방지")과 정면으로 충돌한다.

### 8.4 로그 열람 권한 (설계 의도)

- **의도**: 열람자 권한 > 대상 권한일 때만 열람 가능 (`manager`는 `member`/`basic`의 로그를, `root`는 `staff` 이하를)
- **실제**: 프론트엔드 탭 표시 조건으로만 구현. API는 완전 공개 (§12-2)

---

## 9. 외부 연동

### 9.1 공휴일 — 공공데이터포털 특일 정보

```
GET https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo
    ?ServiceKey=<ANNIVERSARY_OPEN_API>&solYear=<year>&numOfRows=50&_type=json
```
- 응답 `response.body.items.item` (단건이면 객체, 복수면 배열 → 정규화 필요)
- `isHoliday === 'Y'` 인 항목만 채택
- `locdate`(YYYYMMDD 정수) → `year/month/day` 분해
- **해당 연도 전량 DELETE 후 INSERT** (멱등)
- 호출 지점 2개: ① `POST /api/admin/sync-holidays` (staff+ 수동) ② `GET /api/holidays` (데이터 0건 시 자동)

### 9.2 경기 기록 — Unique Play

```
GET https://service-api.unique-play.com/games/records/ranking?<params>
Authorization: Bearer <UNIQUE_PLAY_TOKEN>
```
| 파라미터 | 타자 | 투수 |
|---|---|---|
| `teamId` | `UNIQUE_PLAY_TEAM_ID` (기본 `3405`) — 리그 전체 조회 시 생략 | 동일 |
| `subLeagueId` | `UNIQUE_PLAY_SUBLEAGUE_ID` (기본 `842`) | 동일 |
| `batter` | `true` | `false` |
| `orderBy` / `orderDir` | `havg` / `desc` | `era` / `asc` |
| `regulatedIn` | 팀 `true`, 리그 `false` | 양쪽 `true` |

**계산 상수** (`STATS_CONSTANTS`)
```
WOBA_WEIGHTS = { BB:0.688, HBP:0.721, B1:0.884, B2:1.261, B3:1.601, HR:2.072 }  // FanGraphs 표준
WOBA_SCALE = 1.15,  RPW = 9.0,  REPLACEMENT_ADJ = 1.5,  CACHE_TTL = 24h
```

| 지표 | 산식 |
|---|---|
| `PA` | `hab + hbb + hhitByPitch + hsacf + hsacb` |
| `wOBA` | `Σ(가중치 × 이벤트) / (AB + BB - IBB + SF + HBP)` |
| `wRC+` | `((wOBA - lgwOBA)/wOBAScale + lgRPA) / lgRPA × 100` |
| `oWAR` | `(battingRuns + baseRunning + replacementAdj) / RPW`<br>`battingRuns = (wOBA-lgwOBA)/scale × PA`, `baseRunning = SB×0.2 - CS×0.4`, `replacementAdj = 20 × PA/600` |
| `FIP` | `(13·HR + 3·(BB-IBB+HBP) - 2·K)/IP + cFIP`, `cFIP = lgERA - lgFIPcore` |
| `pWAR` | `(lgERA - FIP + 1.5) × IP / 9 / RPW` |

- 리그 데이터가 비면 팀 데이터를 리그 기준으로 대체(`lgPlayers = league.length > 0 ? league : team`)
- `innings` 문자열("5.2" = 5와 2/3이닝)은 `parseIP()`로 변환
- 등번호는 `roster`에서 **이름 → 번호** 맵으로 붙인다(동명이인 충돌 가능)
- `UNIQUE_PLAY_TOKEN` 없으면 빈 배열 반환(장애 대신 빈 화면)
- **캐시**: 모듈 스코프 `{ batting, pitching, at }` 단일 객체. `at` 하나를 두 데이터가 공유하고, **`year` 파라미터를 캐시 키에 포함하지 않는다**(§12-15).

### 9.3 이메일 — Gmail SMTP (nodemailer)

- 인증번호: 6자리 숫자, TTL **5분**, **모듈 스코프 `Map`에 저장**
- 검증 성공 시 코드 즉시 폐기(1회용)
- 템플릿은 `emailTemplates.js`의 인라인 스타일 HTML (다크 배경 `#011126` + 금색 `#D9C5A0`)
- ⚠️ 메모리 저장이므로 **서버 재시작 시 전부 소실**, 다중 인스턴스 환경에서 동작하지 않는다(§12-16).

---

## 10. 프론트엔드 공통 인프라

### 10.1 디자인 토큰 (`index.css`)

**테마 전환 메커니즘**: `<html data-theme="dark|light">` 속성 + CSS 변수 재정의.
FOUC 방지를 위해 `index.html`의 **인라인 스크립트가 React 로드 전에** `localStorage.theme` 또는 `prefers-color-scheme`로 속성을 설정한다.

**핵심 아이디어 — `--overlay-rgb` 단일 변수**
표면·테두리·텍스트 톤을 전부 `rgba(var(--overlay-rgb), α)` 공식으로 정의하고, 테마별로는 **`--overlay-rgb` 하나만** 뒤집는다.

| 토큰 그룹 | 값 |
|---|---|
| 표면 | `--surface-faint .03` / `-card .04` / `-hover .05` / `-input .07` / `-elevated .08` |
| 테두리 | `--border-faint .06` / `-dim .10` / `-default .12` / `-input .15` / `-medium .20` / `-strong .25` / `-hover .35` |
| 텍스트 | `--text-secondary .80` / `-tertiary .55` / `-muted .45` / `-meta .35` / `-dim .30` / `-placeholder .25` / `-ghost .20` |

| 테마 | `--overlay-rgb` | `--bg-page` | `--main-500/400/300` | `--text-100` |
|---|---|---|---|---|
| dark | `255,255,255` | `#011126` | `#A6926D` / `#C0AC87` / `#D9C5A0` | `#ffffff` |
| light | `10,14,26` | `#F7F4EE` | `#B68F4E` / `#9C7A45` / `#8A6A3A` | `#1A1A2E` |

**테마 공통 색**: `--color-red #f07070`, `--color-blue #6fa3f5`, `--color-green #6dc87a`, `--color-purple #c87adc`, `--color-yellow #f5a623`, `--color-error #e05c5c`, `--color-gold-retired #c9a227`

**일정 타입 색** (색상 / 배경 0.16 / 테두리 0.38 3종 세트): training=green, meeting=blue, events=`#f5c842`, etc=purple

**레이아웃**: `--content-width: 65vw` (≤768px에서 `92vw`), `--content-max-width: 1200px`, `--content-min-width: 320px`

**폰트**: Noto Sans KR + Roboto (Google Fonts `@import`)

### 10.2 전역 버튼 시스템

`.btn` + 변형 클래스. CSS Modules 밖의 **유일한 전역 클래스 체계**.

| 클래스 | 용도 | 스타일 |
|---|---|---|
| `.btn-primary` | 주요 액션 | 금색 배경 + 흰 글씨, hover 시 밝은 금색 + 진한 글씨 |
| `.btn-secondary` | 보조 | 투명 + 금색 글씨/테두리 |
| `.btn-ghost` | 취소 | 투명 + 회색 |
| `.btn-positive` | 승인·임명 | 투명 + 초록 |
| `.btn-negative` | 차단·거부·삭제 | 투명 + 빨강 |
| `.btn-sm` / `.btn-lg` | 크기 수정자 | |

`:disabled` → `opacity: 0.35`.

### 10.3 커스텀 훅

| 훅 | 시그니처 | 동작 |
|---|---|---|
| `useFetch(url, options)` | → `{data, loading, error}` | `url`이 falsy면 요청 스킵(조건부 fetch). `AbortController`로 언마운트/URL 변경 시 취소. `options`는 ref에 보관해 **의존성 배열에서 제외**(객체 리터럴로 인한 무한 루프 방지). `!res.ok` → `Error('HTTP <status>')` |
| `useScheduleData(year, month)` | → `{holidayMap, eventMap}` | 공휴일·일정을 병렬 조회 후 `Map`으로 인덱싱. 키는 각각 `"MM-DD"`, `"DD"`. `useMemo` 캐싱 |
| `useTabIndicator(activeKey)` | → `{containerRef, indicatorRef, update}` | `[data-active="true"]` 요소의 `getBoundingClientRect()`로 인디케이터 위치 계산. `activeKey` 변경 시 `requestAnimationFrame`으로 애니메이션, `document.fonts.ready` 후에는 `instant` 배치 |

### 10.4 공용 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `ContentRenderer` | `content.split('\n')` → 빈 줄은 `<br>`, 아니면 `<p>`. **HTML을 해석하지 않아 XSS에 안전** |
| `Pagination` | 슬라이딩 윈도우(`PAGINATION_WINDOW_SIZE = 5`). `«`(5페이지 뒤로) `‹` 숫자 `›` `»` |
| `PollVote` | 투표 UI. 단일=radio, 다중=checkbox. 결과 바 + 퍼센트(비공개면 "비공개"). `onVote`가 null이면 읽기 전용(마이페이지 내 투표 탭) |
| `VoterModal` | 옵션별 투표자 명단 모달 |
| `ConfirmModal` | 제목·설명·(선택)확인 문구 입력·메시지·로딩 상태를 받는 범용 확인 모달. `requiredValue`와 정확히 일치해야 확인 버튼 활성화 |

### 10.5 코딩 컨벤션

**공통**: 세미콜론 미사용(ASI), 작은따옴표, 들여쓰기 2칸, 사용자 노출 메시지·주석은 한국어.

**프론트엔드**
- 컴포넌트는 `function ComponentName() {}` 선언식 (화살표 함수 지양)
- 모듈 최상단 상수는 `UPPER_SNAKE_CASE`, 관련 상수끼리 `=` 위치 정렬
- CSS Modules (`styles.xxx`), 파일명은 `Component.module.css`
- API 호출은 `fetch` + `lib/api.js`의 `API_BASE` (HTTP 클라이언트 라이브러리 미도입)
- ESLint: `no-unused-vars`에 `varsIgnorePattern: '^[A-Z_]'` — **대문자 상수는 미사용이어도 통과하므로, 상수 정리 여부는 lint가 아니라 grep으로 확인해야 한다**

**백엔드**
- CommonJS (`require` / `exports.fnName`)
- 컨트롤러는 예외 없이 아래 형태
  ```js
  exports.fnName = async (req, res, next) => {
    try { /* ... */ } catch (err) { next(err) }
  }
  ```
- raw SQL + `?` 파라미터 바인딩 (**문자열 연결 금지**)
- 에러 응답은 `res.status(xxx).json({ message: '...' })`로 통일

---

## 11. 환경 변수·빌드·배포

### 11.1 환경 변수

**백엔드 `KWU-Pegasus-server/.env`**

| 키 | 용도 | 미설정 시 |
|---|---|---|
| `PORT` | 서버 포트 | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 접속 | `DB_PORT`만 `3306` |
| `JWT_SECRET` | JWT 서명 키 | **필수** |
| `CORS_ORIGIN` | 허용 origin. `'*'`면 전체 허용 | `http://localhost:5173` |
| `ANNIVERSARY_OPEN_API` | 공공데이터 서비스 키 | 공휴일 동기화 실패 |
| `UNIQUE_PLAY_TOKEN` | 기록 API 토큰 | **없으면 기록이 빈 배열** |
| `UNIQUE_PLAY_TEAM_ID` | 팀 ID | `3405` |
| `UNIQUE_PLAY_SUBLEAGUE_ID` | 서브리그 ID | `842` |
| `MAIL_USER` / `MAIL_PASS` | Gmail 계정/앱 비밀번호 | 이메일 발송 실패 |

**프론트엔드 `KWU-Pegasus/.env`**

| 키 | 용도 | 미설정 시 |
|---|---|---|
| `VITE_API_BASE` | API 베이스 URL | `http://localhost:3001` |

> ⚠️ 서버 기본 포트(3000)와 프론트가 기대하는 기본값(3001)이 다르다. 로컬 개발 시 `PORT=3001`을 지정하거나 `VITE_API_BASE`를 맞춰야 한다.

### 11.2 로컬 실행

```bash
# 백엔드
cd KWU-Pegasus-server
npm install
mysql -u root -p < sql/schema.sql     # (선택) sql/seed.sql 로 테스트 데이터
npm run dev                            # nodemon server.js

# 프론트엔드
cd KWU-Pegasus
npm install
npm run dev                            # vite (strictPort: true — 포트 충돌 시 실패)
```

시드 데이터: `sql/seeds/roster/roster_2025.sql`, `roster_2026.sql`, `sql/seeds/posts/posts_example.sql`

### 11.3 배포 (`deploy.sh`)

```
1. git pull origin main
2. .env 로드
3. schema_migrations 테이블 확인/생성
   - 최초 생성 시: 기존 migrations/*.sql 을 "적용됨"으로 마킹 (schema.sql에 이미 반영되어 있으므로)
4. 미적용 마이그레이션을 파일명 순으로 적용 + 기록
5. 프론트엔드: npm install && npm run build
6. pm2 restart kwu-pegasus-server
```
- 빌드 산출물은 `KWU-Pegasus/dist` (Express가 서빙하지 않으므로 **별도 정적 서버/리버스 프록시 필요**)
- `nixpacks.toml`: `providers = ["node"]`

### 11.4 테스트 인프라

**자동화 테스트 프레임워크가 없다.** 대신:
- `KWU-Pegasus/scripts/capture.mjs` — Playwright 기반 스크린샷 캡처(시각 검증용)
- `.claude/` 디렉터리에 orchestrator + 7 에이전트 워크플로우(정적 게이트 / 기능 검증 / 권한 회귀 / 문서 정합성 4단계 수동 검증 프로토콜)

> **재구축 시 최우선 개선 항목.** 권한 매트릭스(§4.4)는 통합 테스트로 고정하기에 이상적인 대상이다.

---

## 12. 현재 구현의 결함 목록 (재구축 시 반드시 검토)

> 새 사이트를 만들 때 **그대로 옮기면 안 되는** 항목들이다. 심각도 순으로 정리했다.

### 🔴 심각 — 보안

**12-1. 게시판 콘텐츠 API가 완전 공개**
`GET /api/posts`, `/api/posts/:id`, `/api/comments?postId=` 에 인증 미들웨어가 없다. 프론트엔드 `ProtectedRoute`(member+)만이 유일한 차단선이므로, `curl`로 회원 전용 게시글 본문과 댓글 전체를 누구나 읽을 수 있다.
→ **수정**: 최소 `authenticate` + `requireRole('member',...)`. 홈 위젯은 제목·날짜만 반환하는 별도 공개 엔드포인트로 분리.

**12-2. 활동 로그 API가 완전 공개**
`GET /api/users/:username/logs`에 인증이 전혀 없다. **삭제된 게시글 본문, 댓글 내용, 승인/차단된 유저의 실명·학번이 담긴 `snapshot` JSON이 무제한 노출**된다. "열람자 권한 > 대상 권한" 규칙은 `UserActivity.jsx`의 탭 표시 조건일 뿐이다.
→ **수정**: 서버에 역할 순위 비교 함수(`ROLE_ORDER`)를 두고 `authenticate` 후 대상 유저 권한과 비교해 403 처리.

**12-3. 이메일 인증이 서버에서 강제되지 않음**
`verify-email-code` 성공 사실이 서버 어디에도 저장되지 않고, `POST /api/auth/signup`과 `PUT /api/mypage/account`는 인증 여부를 확인하지 않는다. API 직접 호출로 임의 이메일 가입이 가능하다.
→ **수정**: 인증 성공 시 서버가 단기 토큰을 발급하거나 `verified_emails` 레코드를 남기고, 가입/변경 시 이를 검증.

**12-4. `optionalAuth`가 차단 계정을 거르지 않음**
`authenticate`와 달리 `membership_status`를 조회하지 않는다. 차단된 계정도 `optionalAuth` 경로(투표 조회)에서 식별된 사용자로 취급된다.

**12-5. 로그인에 rate limit이 없음**
`express-rate-limit`이 `/signup`에만 걸려 있다. `/login`은 무제한 시도 가능 → 무차별 대입 공격에 노출.

**12-6. 미인증 요청이 외부 API 호출 + DB 쓰기를 유발**
`GET /api/holidays?year=1900`처럼 데이터가 없는 연도를 요청하면 공공 API 호출 + DELETE/INSERT가 실행된다. 임의 연도 반복 요청으로 외부 API 쿼터를 소진시킬 수 있다.
→ **수정**: 자동 동기화를 제거하고 관리자 수동 동기화만 유지하거나, 연도 범위를 제한.

### 🟠 중요 — 정합성·데이터

**12-7. 게시글 수정 권한이 UI와 API에서 불일치**
서버 `updatePost`는 `canModifyResource`(소유자 **또는 manager+**)를 쓰지만, `BoardDetail`은 소유자에게만 수정 버튼을 보이고 `BoardEdit`는 소유자가 아니면 "수정 권한이 없습니다"를 표시한다. 즉 **매니저는 UI로는 못 하지만 API로는 타인 글을 수정할 수 있다.** 게다가 `post_update` 로그의 스냅샷은 수정 *후* 값이라 원본 추적이 불가능하다.
→ **수정**: 정책을 하나로 확정하고(권장: 수정은 소유자만, 삭제만 매니저 허용), 수정 로그에 before/after를 모두 남길 것.

**12-8. 투표 수정이 클라이언트 협조에 의존**
`polls.post_id`가 UNIQUE인데 `updatePost`는 `INSERT`만 한다. `BoardEdit`가 저장 직전 기존 투표를 DELETE해 주기 때문에 동작할 뿐이다. 게다가 `DELETE /api/polls/:pollId`는 **글 작성자만** 허용하므로, 매니저가 타인 글을 수정하면 DELETE 403 → INSERT 시 `ER_DUP_ENTRY` → 409로 실패한다. 또한 투표를 지우고 다시 만들면 **기존 투표 기록이 전부 소실**된다.
→ **수정**: 서버에서 UPSERT 또는 `DELETE + INSERT`를 한 트랜잭션으로 처리하고, 옵션이 변하지 않았다면 표를 보존.

**12-9. 익명 투표가 익명이 아님**
`poll_votes.user_id`가 익명 투표에서도 항상 저장된다. 익명 처리는 조회 시점의 분기(`canSeeVoters`)일 뿐이라, DB 접근 권한자나 향후 코드 변경으로 언제든 노출될 수 있다.
→ **수정**: 진짜 익명이 필요하면 `user_id`를 NULL로 저장하고 중복 투표 방지는 별도 `poll_participants(poll_id, user_id)` 테이블로 분리.

**12-10. `member_approve`가 조용히 실패할 수 있음**
```sql
UPDATE users SET membership_status='approved', authority='member'
WHERE id = ? AND authority = 'basic'
```
대상이 이미 `member` 이상이면 아무것도 바뀌지 않는데 응답은 `{message:'승인 완료'}`이고 로그도 남는다. `affectedRows` 확인이 없다.

**12-11. `LogDetail`이 `location.state`에만 의존**
`/user/:username/log/:logId`를 직접 열거나 새로고침하면 항상 "로그 정보를 불러올 수 없습니다."가 뜬다. URL이 사실상 무의미하다.
→ **수정**: `GET /api/users/:username/logs/:logId` 엔드포인트를 만들어 id로 조회.

**12-12. 탈퇴 정책이 스키마 의도와 상충**
`posts.user_id ON DELETE SET NULL`(글 보존)로 설계했지만 `withdrawUser`는 게시글을 명시적으로 DELETE한다. 그 글에 달린 **타인의 댓글과 투표까지 CASCADE로 사라진다.** 또 `activity_logs.user_id ON DELETE CASCADE`로 탈퇴자의 감사 로그가 전부 소멸한다.
→ **수정**: 정책 확정(익명화 vs 완전 삭제). 감사 로그는 최소한 보존하거나 별도 아카이브.

**12-13. 학번 필수 여부 표기 불일치**
`AccountTab`의 멤버 신청 폼은 학번을 "학번 (선택)"으로 표시하지만, `requestMembership`은 학번이 없으면 400을 반환한다.

### 🟡 개선 — 확장성·유지보수

**12-14. 서버 사이드 페이지네이션 부재**
`GET /api/posts`는 전체 게시글을, `/api/users/:username/logs`는 전체 로그를 매번 반환한다. 클라이언트에서 15개씩 잘라 보여줄 뿐이라 데이터가 쌓이면 선형으로 느려진다. 정렬·필터도 전부 클라이언트 몫이다.

**12-15. 기록 캐시 설계 결함**
모듈 스코프 단일 객체이며 **`year`를 캐시 키에 포함하지 않는다.** 다른 연도를 요청해도 24시간 동안 이전 연도 데이터가 반환된다. `cache.at`을 batting/pitching이 공유하는 것도 부정확하다. 다중 인스턴스에서는 인스턴스마다 별도 캐시를 갖는다.

**12-16. 이메일 인증 코드가 프로세스 메모리에 저장**
서버 재시작 시 전부 소실, 다중 인스턴스/무중단 배포에서 동작하지 않는다. → Redis 또는 DB 테이블로.

**12-17. 로스터 연동이 문자열 매칭**
FK `roster.user_id`가 존재하지만 코드가 채우지 않고, 모든 조인이 `student_id` 문자열로 이루어진다. 학번 수정 시 연동이 조용히 끊긴다. 기록 페이지의 등번호 매핑은 **이름 기준**이라 동명이인에서 충돌한다.

**12-18. 서버에 역할 순위 비교 함수가 없음**
권한 계층이 개념적으로 존재하는데 서버에는 `requireRole('staff','root')` 같은 열거만 있다. 역할이 하나 추가되면 모든 호출 지점을 찾아 수정해야 한다. → `ROLE_ORDER` + `hasAtLeast(role, minRole)`를 서버 공용 상수로 도입 권장.

**12-19. 상태 표현 중복**
`membership_status`가 신청 상태와 차단 상태를 겸해, 차단 해제 시 이전 상태를 `authority`로 추측한다. `is_banned`를 분리하면 사라지는 문제다.

**12-20. 날짜 표현 불일치**
`events`는 `DATE` 한 컬럼, `holidays`는 `year/month/day` 3컬럼. 프론트에서 매번 다르게 파싱해야 한다.

**12-21. 조회수 증가가 fire-and-forget**
`getPost`가 응답을 보낸 뒤 `UPDATE posts SET views = views + 1`을 실행한다. 원자적 증가라 값이 깨지지는 않지만, 새로고침마다 증가하며 실패해도 아무도 모른다.

**12-22. `EventWrite` 저장이 순차 N회 요청**
날짜 범위를 펼쳐 하루씩 POST를 보낸다. 30일 범위면 30회 왕복. → 서버에 벌크 생성 엔드포인트 추가 권장.

**12-23. 남아 있는 미사용 코드·스키마**
- `users.kakao_id`, `marketing_sms`, `marketing_kakao` — 컬럼만 존재, 항상 기본값
- `AccountTab` 하단의 "비밀번호 변경 (예시)" / "회원 탈퇴 (예시)" 섹션 — **탈퇴는 `SettingsTab`에 이미 구현되어 있어 중복이자 사용자 혼동 요인**
- `lib/validators.js`의 `validatePassword` — 비밀번호 변경 기능이 없어 회원가입에서만 사용
- 로그인/회원가입 페이지의 카카오 버튼 — `disabled`

**12-24. 스키마 주석과 실제 정의 불일치**
- `events.type` 주석: `game/training/meeting/anniversary` → 실제 ENUM: `training/meeting/events/etc`
- `roster.role` 주석: `president/headcoach/manager/retired/player` → 실제 ENUM은 `roster_` 접두사
- `users` 주석에 `marketing_email` 설명이 2번 중복

**12-25. `Records.jsx` 시즌 표기 하드코딩** — `2026 KWU PEGASUS`. `active-year`를 참조해야 한다.

**12-26. 모바일 최적화 미완** — `Header`의 햄버거 메뉴와 `--content-width: 92vw` 정도만 반응형. 게시판·관리자·기록의 테이블은 데스크톱 전용이다.

---

## 부록 A. 미구현 기능 (README "향후 계획" 기준)

| 기능 | 현재 상태 |
|---|---|
| 비밀번호 변경 | ❌ (UI만 disabled 상태로 존재) |
| 카카오 로그인/채널 연동 | ❌ (`users.kakao_id` 컬럼과 disabled 버튼만) |
| SMS 인증 | ❌ (`marketing_sms` 컬럼만) |
| 게시글 파일 첨부 | ❌ |
| 게시글 수정 이력 열람 | ❌ (로그는 남지만 수정 후 값만) |
| 앨범/갤러리 | ❌ |
| 출석 관리 | ❌ |
| 알림(메일/푸시) | ❌ (이메일 인증번호 발송만 구현) |

> README는 "이메일 연동 0%", "마이페이지 탈퇴 예시 상태"로 기재하고 있으나, **이메일 인증번호 발송·검증과 회원 탈퇴는 실제로 구현되어 있다.** README가 코드보다 뒤처져 있다.

## 부록 B. 새 사이트 구축 시 권장 작업 순서

1. **데이터 모델 확정** — §3을 기반으로 하되 12-19(상태 분리), 12-17(FK 연동), 12-20(날짜 통일) 반영
2. **권한 모델 먼저 구현** — 서버에 역할 순위 함수(12-18)를 두고 §4.4 매트릭스를 **통합 테스트로 고정**
3. **인증 파이프라인** — §2.2 방식(매 요청 DB 재조회) 유지, 12-3/12-5 보완
4. **감사 로그를 처음부터** — §8 규격 채택 + 12-12(탈퇴 시 보존) 반영, before/after 스냅샷
5. **읽기 API에 인증 부여** — 12-1, 12-2 우선 해결. 공개/비공개 엔드포인트를 명시적으로 분리
6. **페이지네이션을 서버로** — 12-14
7. **기능 이식** — 로스터 → 일정 → 게시판 → 투표 → 관리자 → 기록 순 (의존도 낮은 순서)
8. **모바일 우선 재설계** — 12-26. §10.1 토큰 체계는 그대로 재사용 가치가 있음
