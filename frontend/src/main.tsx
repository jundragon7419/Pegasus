import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { AuthProvider } from '@/context/AuthProvider'
import { ThemeProvider } from '@/context/ThemeProvider'
import '@/styles/global.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('#root 요소를 찾을 수 없습니다. index.html 을 확인하세요.')
}

/**
 * 백엔드가 없는 동안 MSW 가 /api/* 요청을 가로챈다.
 *
 * 동적 import 라서 프로덕션 번들에는 포함되지 않는다.
 * 워커가 준비되기 전에 렌더하면 첫 요청이 목을 통과해 실제 네트워크로 새므로
 * **시작이 끝난 뒤에 렌더한다.**
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return

  const { worker } = await import('@/mocks/browser')
  await worker.start({
    // 목을 정의하지 않은 요청(폰트 CDN 등)은 그대로 통과시킨다.
    onUnhandledRequest: 'bypass',
    quiet: false,
  })
}

enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  )
})
