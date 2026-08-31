import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

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

/**
 * 라우트 정의. 블루프린트 §6.1 표를 따른다.
 *
 * 권한 가드(ProtectedRoute)는 아직 붙지 않았다. 인증 상태와 roles.ts 가 필요하며
 * Phase 2·3 이후에 추가한다. 그때까지 모든 화면이 열려 있다.
 * 어떤 화면이 어떤 조건에서 어느 에러 화면으로 가야 하는지는 docs/error-screens.md 에 있다.
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

          {/* manager+ 예정 */}
          <Route path={ROUTES.scheduleWrite} element={<EventWrite />} />

          {/* basic+ / member+ 예정 */}
          <Route path={ROUTES.board} element={<Board />} />
          <Route path={ROUTES.boardWrite} element={<BoardWrite />} />
          <Route path={ROUTE_PATTERNS.boardDetail} element={<BoardDetail />} />
          <Route path={ROUTE_PATTERNS.boardEdit} element={<BoardEdit />} />
          <Route path={ROUTE_PATTERNS.userActivity} element={<UserActivity />} />
          <Route path={ROUTE_PATTERNS.logDetail} element={<LogDetail />} />

          {/* 로그인 필요 예정 */}
          <Route path={ROUTES.mypage} element={<MyPage />} />
          <Route path={ROUTES.admin} element={<Admin />} />

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
