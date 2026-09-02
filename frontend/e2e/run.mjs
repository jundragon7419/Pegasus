/**
 * 브라우저 검증 러너.
 *
 * `npm run e2e` 하나로 전 스위트를 돌린다. 개발 서버가 안 떠 있으면 직접 띄우고
 * 끝나면 내린다 — 새 세션이 사전 준비 없이 바로 돌릴 수 있어야 하기 때문이다.
 *
 * 스위트는 **각각 독립된 프로세스**로 순차 실행한다. 목의 쓰기 상태가 탭 메모리에
 * 살아 있어서 한 스위트가 만든 데이터가 다음 스위트에 새면 결과를 믿을 수 없다.
 * 병렬로 돌리면 같은 목 서버를 공유해 서로 간섭한다.
 *
 *   npm run e2e              전부
 *   npm run e2e board        이름에 'board' 가 들어가는 스위트만
 *   npm run e2e -- --fast    느린 것(반응형·헤디드) 제외
 */
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SUITES_DIR = join(here, 'suites')
const BASE = 'http://localhost:5173'

/** 오래 걸리거나 실제 창을 띄우는 스위트. `--fast` 로 건너뛴다. */
const SLOW = new Set(['responsive.mjs', 'narrow-headed.mjs', 'scrollbar.mjs'])

const args = process.argv.slice(2)
const fast = args.includes('--fast')
const filters = args.filter((a) => !a.startsWith('--'))

const suites = readdirSync(SUITES_DIR)
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => (fast ? !SLOW.has(f) : true))
  .filter((f) => filters.length === 0 || filters.some((q) => f.includes(q)))
  .sort()

if (suites.length === 0) {
  console.error(`실행할 스위트가 없습니다. (필터: ${filters.join(', ') || '없음'})`)
  process.exit(1)
}

/* ── 개발 서버 ───────────────────────────────────────────────────────────── */

const isUp = async () => {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

async function waitUntilUp(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isUp()) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

let devServer = null
if (await isUp()) {
  console.log(`개발 서버가 이미 떠 있습니다 (${BASE})\n`)
} else {
  console.log('개발 서버를 띄웁니다…')
  devServer = spawn('npm', ['run', 'dev'], {
    cwd: join(here, '..'),
    stdio: 'ignore',
    shell: true,
    detached: false,
  })
  if (!(await waitUntilUp())) {
    console.error(`개발 서버가 30초 안에 뜨지 않았습니다. \`npm run dev\` 를 직접 확인해 주세요.`)
    devServer.kill()
    process.exit(1)
  }
  console.log('떴습니다.\n')
}

const stopDevServer = () => {
  if (devServer && !devServer.killed) devServer.kill()
}
process.on('exit', stopDevServer)
process.on('SIGINT', () => {
  stopDevServer()
  process.exit(130)
})

/* ── 실행 ────────────────────────────────────────────────────────────────── */

const run = (file) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [join(SUITES_DIR, file)], { stdio: 'inherit' })
    child.on('close', (code) => resolve(code ?? 1))
  })

const started = Date.now()
const failed = []

for (const suite of suites) {
  console.log(`\n${'─'.repeat(60)}\n▶ ${suite}\n${'─'.repeat(60)}`)
  const code = await run(suite)
  if (code !== 0) failed.push(suite)
}

/* ── 요약 ────────────────────────────────────────────────────────────────── */

const seconds = ((Date.now() - started) / 1000).toFixed(0)
console.log(`\n${'═'.repeat(60)}`)
console.log(`스위트 ${suites.length}개 · ${seconds}초`)

if (failed.length === 0) {
  console.log('전부 통과')
} else {
  console.log(`실패 ${failed.length}개:`)
  for (const f of failed) console.log(`  - ${f}`)
}
console.log('═'.repeat(60))

stopDevServer()
process.exit(failed.length === 0 ? 0 : 1)
