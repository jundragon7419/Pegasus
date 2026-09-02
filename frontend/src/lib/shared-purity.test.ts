import { describe, expect, it } from 'vitest'

/**
 * 공용 규칙 모듈이 프레임워크에 오염되지 않게 막는다.
 *
 * 문서가 여러 곳에서 **"백엔드도 이 함수를 그대로 쓴다"** 고 약속한다
 * (`roles.ts` 의 `hasAtLeast` · `canViewLogsOfUser`, `membership.ts` 의 상태 머신,
 * `validators.ts` 의 §7.2 규칙). 실제로 공유 위치로 옮기는 것은 백엔드 골격이
 * 생긴 뒤에 하기로 했는데, 그때까지 한 줄이라도 React·라우터·MSW 가 섞이면
 * 이사가 어려워진다.
 *
 * **소스를 문자열로 읽어 확인한다.** import 만 봐서는 "지금 안 쓴다"까지만 알 수
 * 있고 타입 전용 import 가 빠진다 — 프론트 전용 타입을 끌어오면 그것도 딸려 온다.
 *
 * `node:fs` 대신 Vite 의 `import.meta.glob` 을 쓴다. 앱 tsconfig 에 node 타입을
 * 넣으면 **화면 코드도 `fs` 를 import 할 수 있게 되므로** 넣고 싶지 않다.
 */

const LIB_SOURCES = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true })
const TYPE_SOURCES = import.meta.glob('../types/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** 백엔드가 그대로 가져갈 모듈. */
const SHARED_LIB = ['roles.ts', 'membership.ts', 'validators.ts', 'korean.ts', 'pagination.ts']

/** 금지 대상. 프레임워크와 프론트 전용 계층이다. */
const FORBIDDEN = [
  'react',
  'react-dom',
  'react-router',
  'radix-ui',
  '@radix-ui',
  'msw',
  '@/components',
  '@/hooks',
  '@/mocks',
  '@/pages',
  '@/layouts',
  '@/context',
  '@/styles',
]

/** `import ... from '<여기>'` 와 `import('<여기>')` 를 모두 잡는다. */
function importsOf(source: string): string[] {
  const found: string[] = []
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) found.push(match[1])
  return found
}

const sourceOf = (map: Record<string, unknown>, key: string): string => {
  const found = map[key]
  if (typeof found !== 'string') throw new Error(`소스를 찾지 못했다: ${key}`)
  return found
}

const offenders = (specifiers: string[]) =>
  specifiers.filter((s) => FORBIDDEN.some((bad) => s === bad || s.startsWith(`${bad}/`)))

describe('공용 규칙 모듈은 프레임워크를 import 하지 않는다', () => {
  it.each(SHARED_LIB)('lib/%s', (file) => {
    expect(offenders(importsOf(sourceOf(LIB_SOURCES, `./${file}`)))).toEqual([])
  })

  it('CSS 도 끌어오지 않는다 — 백엔드에는 번들러가 없다', () => {
    for (const file of SHARED_LIB) {
      const css = importsOf(sourceOf(LIB_SOURCES, `./${file}`)).filter((s) => s.endsWith('.css'))
      expect(css, file).toEqual([])
    }
  })

  it('@/types 외의 내부 경로를 쓰지 않는다 — 전이 오염을 막는다', () => {
    for (const file of SHARED_LIB) {
      const internal = importsOf(sourceOf(LIB_SOURCES, `./${file}`))
        .filter((s) => s.startsWith('@/'))
        .filter((s) => !s.startsWith('@/types'))
      expect(internal, file).toEqual([])
    }
  })
})

describe('도메인 타입도 프레임워크에서 자유롭다', () => {
  const typeFiles = Object.keys(TYPE_SOURCES).filter((path) => !path.endsWith('.test.ts'))

  it('타입 파일을 실제로 읽어 왔다', () => {
    expect(typeFiles.length).toBeGreaterThan(0)
  })

  it.each(typeFiles)('%s', (path) => {
    expect(offenders(importsOf(sourceOf(TYPE_SOURCES, path)))).toEqual([])
  })
})
