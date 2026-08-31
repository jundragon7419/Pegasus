import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * MSW 워커 스크립트는 `public/` 에 있어야 개발 서버가 서빙할 수 있는데,
 * 그 자리에 두면 프로덕션 빌드에도 그대로 복사된다.
 * 운영에서는 절대 등록되지 않지만(main.tsx 가 DEV 에서만 시작한다),
 * 쓰지 않는 서비스 워커 파일을 배포에 올릴 이유가 없다.
 */
function dropMockWorker(): Plugin {
  return {
    name: 'drop-msw-worker',
    apply: 'build',
    closeBundle() {
      const target = fileURLToPath(new URL('./dist/mockServiceWorker.js', import.meta.url))
      if (existsSync(target)) rmSync(target)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dropMockWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
