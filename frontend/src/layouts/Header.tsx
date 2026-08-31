import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import { DropdownMenu } from 'radix-ui'
import { Link, NavLink } from 'react-router'

import { ThemeToggle } from '@/components/ThemeToggle'
import { cx } from '@/lib/cx'
import { ROUTES } from '@/lib/routes'

import styles from './Header.module.css'

/** 로그인 여부와 무관하게 항상 보이는 메뉴. */
const PUBLIC_NAV = [
  { to: ROUTES.home, label: '홈' },
  { to: ROUTES.schedule, label: '일정' },
  { to: ROUTES.roster, label: '선수단' },
  { to: ROUTES.records, label: '기록' },
] as const

/**
 * 인증이 붙기 전까지 이 화면들에 도달할 방법이 없으므로 임시로 열어 둔다.
 * Phase 3 에서 인증 상태가 생기면 권한에 따라 헤더 본 메뉴로 옮기고 이 목록은 지운다.
 */
const PENDING_AUTH_NAV = [
  { to: ROUTES.board, label: '게시판' },
  { to: ROUTES.mypage, label: '마이페이지' },
  { to: ROUTES.admin, label: '관리자' },
  { to: ROUTES.scheduleWrite, label: '일정 관리' },
  { to: ROUTES.boardWrite, label: '글쓰기' },
  { to: ROUTES.login, label: '로그인' },
  { to: ROUTES.signup, label: '회원가입' },
] as const

const ERROR_NAV = [
  { to: ROUTES.error401, label: '401 인증 필요' },
  { to: ROUTES.error403, label: '403 권한 부족' },
  { to: ROUTES.error404, label: '404 없음' },
  { to: ROUTES.error500, label: '500 서버 오류' },
] as const

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cx(styles.navLink, isActive && styles.navLinkActive)
}

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={ROUTES.home} className={styles.brand}>
          Pegasus
        </Link>

        <nav className={cx(styles.nav, styles.desktopOnly)}>
          {PUBLIC_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === ROUTES.home}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.spacer} />

        <div className={styles.right}>
          {import.meta.env.DEV && <DevMenu />}
          <ThemeToggle hideLabel />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

/** 모바일 햄버거. 포커스 트랩·ESC·외부 클릭은 Radix 가 처리한다. */
function MobileMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cx(styles.iconButton, styles.mobileOnly)}
        aria-label="메뉴 열기"
      >
        <HamburgerMenuIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} sideOffset={8} align="end">
          {PUBLIC_NAV.map((item) => (
            <DropdownMenu.Item key={item.to} className={styles.menuItem} asChild>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/**
 * 개발 전용 메뉴. import.meta.env.DEV 로 감싸므로 프로덕션 번들에 포함되지 않는다.
 * 아직 헤더에 노출할 근거가 없는 화면(인증 필요)과 에러 화면으로 이동하기 위한 임시 장치다.
 */
function DevMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={styles.iconButton}>개발</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} sideOffset={8} align="end">
          <DropdownMenu.Label className={styles.menuLabel}>인증 필요 (게이트 미구현)</DropdownMenu.Label>
          {PENDING_AUTH_NAV.map((item) => (
            <DropdownMenu.Item key={item.to} className={styles.menuItem} asChild>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className={styles.menuSeparator} />

          <DropdownMenu.Label className={styles.menuLabel}>에러 화면</DropdownMenu.Label>
          {ERROR_NAV.map((item) => (
            <DropdownMenu.Item key={item.to} className={styles.menuItem} asChild>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
