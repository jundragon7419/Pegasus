import { Outlet } from 'react-router'

import { ErrorBoundary } from '@/components/ErrorBoundary'

import { Header } from './Header'

/**
 * 모든 화면이 공유하는 껍데기.
 * ErrorBoundary 를 Outlet 안쪽에 두어, 화면에서 예외가 나도 헤더는 남게 한다.
 */
export function RootLayout() {
  return (
    <>
      <Header />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  )
}
