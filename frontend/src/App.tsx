import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RootLayout } from '@/layouts/RootLayout'
import { ROUTES, ROUTE_PATTERNS } from '@/lib/routes'
import Home from '@/pages/Home'
import Records from '@/pages/Records'
import Roster from '@/pages/Roster'
import Schedule from '@/pages/Schedule'
import Admin from '@/pages/admin/Admin'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import Board from '@/pages/board/Board'
import BoardDetail from '@/pages/board/BoardDetail'
import BoardEdit from '@/pages/board/BoardEdit'
import BoardWrite from '@/pages/board/BoardWrite'
import LogDetail from '@/pages/board/LogDetail'
import UserActivity from '@/pages/board/UserActivity'
import Error401 from '@/pages/errors/Error401'
import Error403 from '@/pages/errors/Error403'
import Error404 from '@/pages/errors/Error404'
import Error500 from '@/pages/errors/Error500'
import MyPage from '@/pages/mypage/MyPage'
import EventWrite from '@/pages/schedule/EventWrite'
import type { Role } from '@/types/auth'

/** 라우트 정의를 짧게 유지하기 위한 헬퍼. */
const guard = (children: ReactNode, minRole?: Role) => (
  <ProtectedRoute minRole={minRole}>{children}</ProtectedRoute>
)

/**
 * 라우트 정의. 블루프린트 §6.1 라우트 표의 가드를 그대로 반영한다.
 * 어떤 조건에서 어느 에러 화면으로 가는지는 docs/error-screens.md 에 있다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* 공개 */}
          <Route index element={<Home />} />
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.signup} element={<Signup />} />
          <Route path={ROUTES.schedule} element={<Schedule />} />
          <Route path={ROUTES.roster} element={<Roster />} />
          <Route path={ROUTES.records} element={<Records />} />

          {/* 로그인만 하면 목록은 볼 수 있다. 본문은 member+ 다 */}
          <Route path={ROUTES.board} element={guard(<Board />, 'basic')} />

          {/* member+ */}
          <Route path={ROUTES.boardWrite} element={guard(<BoardWrite />, 'member')} />
          <Route path={ROUTE_PATTERNS.boardDetail} element={guard(<BoardDetail />, 'member')} />
          <Route path={ROUTE_PATTERNS.boardEdit} element={guard(<BoardEdit />, 'member')} />
          <Route path={ROUTE_PATTERNS.userActivity} element={guard(<UserActivity />, 'member')} />

          {/* manager+ */}
          <Route path={ROUTES.scheduleWrite} element={guard(<EventWrite />, 'manager')} />
          <Route path={ROUTES.admin} element={guard(<Admin />, 'manager')} />
          <Route path={ROUTE_PATTERNS.logDetail} element={guard(<LogDetail />, 'manager')} />

          {/* 로그인만 필요 */}
          <Route path={ROUTES.mypage} element={guard(<MyPage />)} />

          {/* 에러 화면 — docs/error-screens.md */}
          <Route path={ROUTES.error401} element={<Error401 />} />
          <Route path={ROUTES.error403} element={<Error403 />} />
          <Route path={ROUTES.error404} element={<Error404 />} />
          <Route path={ROUTES.error500} element={<Error500 />} />

          {/* 구 URL 호환 */}
          <Route path="/notice" element={<Navigate to={ROUTES.board} replace />} />
          <Route path="/notice/:id" element={<Navigate to={ROUTES.board} replace />} />

          <Route path="*" element={<Error404 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
