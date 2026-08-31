import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { ThemeProvider } from '@/context/ThemeProvider'
import '@/styles/global.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('#root 요소를 찾을 수 없습니다. index.html 을 확인하세요.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
