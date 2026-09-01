import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import { DropdownMenu } from 'radix-ui'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { cx } from '@/lib/cx'
import { roleLabelOf } from '@/lib/labels'
import { isManagerRole } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import { DevRoleSwitcher } from '@/mocks/devAuth'
import type { User } from '@/types/auth'

import styles from './Header.module.css'

type NavItem = { to: string; label: string }

/** 로그인 여부와 무관하게 항상 보이는 메뉴. */
const PUBLIC_NAV: NavItem[] = [
  { to: ROUTES.home, label: '홈' },
  { to: ROUTES.schedule, label: '일정' },
  { to: ROUTES.roster, label: '선수단' },
  { to: ROUTES.records, label: '기록' },
]

const ERROR_NAV: NavItem[] = [
  { to: ROUTES.error401, label: '401 인증 필요' },
  { to: ROUTES.error403, label: '403 권한 부족' },
  { to: ROUTES.error404, label: '404 없음' },
  { to: ROUTES.error500, label: '500 서버 오류' },
]

/** §6.2 — 로그인하면 게시판·마이페이지가, 매니저 이상이면 관리자가 더 보인다. */
function navFor(user: User | null): NavItem[] {
  if (!user) return PUBLIC_NAV
  const items = [...PUBLIC_NAV, { to: ROUTES.board, label: '게시판' }]
  if (isManagerRole(user.authority)) items.push({ to: ROUTES.admin, label: '관리자' })
  items.push({ to: ROUTES.mypage, label: '마이페이지' })
  return items
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cx(styles.navLink, isActive && styles.navLinkActive)
}

export function Header() {
  const { user, loading } = useAuth()
  const items = navFor(user)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={ROUTES.home} className={styles.brand}>
          Pegasus
        </Link>

        <nav className={cx(styles.nav, styles.desktopOnly)}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClass}
              end={item.to === ROUTES.home}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.spacer} />

        <div className={styles.right}>
          {/* 확인이 끝나기 전에 로그인 버튼을 보였다가 지우면 깜빡인다 */}
          {!loading && (
            <div className={styles.desktopOnly}>
              {user ? <UserArea user={user} /> : <AuthButtons />}
            </div>
          )}
          {import.meta.env.DEV && <DevMenu />}
          <ThemeToggle hideLabel />
          <MobileMenu items={items} user={user} loading={loading} />
        </div>
      </div>
    </header>
  )
}

function UserArea({ user }: { user: User }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={styles.user}>
      <span
        className={cx(styles.roleBadge, isManagerRole(user.authority) && styles.roleBadgeElevated)}
      >
        {roleLabelOf(user.authority, user.staffType)}
      </span>
      <span className={styles.username}>{user.username}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          logout()
          navigate(ROUTES.home)
        }}
      >
        로그아웃
      </Button>
    </div>
  )
}

/** 현재 보고 있는 화면의 버튼은 숨긴다(§6.2). */
function AuthButtons() {
  const { pathname } = useLocation()
  return (
    <div className={styles.user}>
      {pathname !== ROUTES.login && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.login}>로그인</Link>
        </Button>
      )}
      {pathname !== ROUTES.signup && (
        <Button size="sm" asChild>
          <Link to={ROUTES.signup}>회원가입</Link>
        </Button>
      )}
    </div>
  )
}

/** 모바일 햄버거. 포커스 트랩·ESC·외부 클릭은 Radix 가 처리한다. */
function MobileMenu({
  items,
  user,
  loading,
}: {
  items: NavItem[]
  user: User | null
  loading: boolean
}) {
  const { logout } = useAuth()

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
          {items.map((item) => (
            <DropdownMenu.Item key={item.to} className={styles.menuItem} asChild>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}

          {!loading && <DropdownMenu.Separator className={styles.menuSeparator} />}

          {!loading &&
            (user ? (
              <DropdownMenu.Item className={styles.menuItem} onSelect={() => logout()}>
                <span>
                  로그아웃
                  <span className={styles.menuMeta}>
                    {roleLabelOf(user.authority, user.staffType)} · {user.username}
                  </span>
                </span>
              </DropdownMenu.Item>
            ) : (
              <>
                <DropdownMenu.Item className={styles.menuItem} asChild>
                  <Link to={ROUTES.login}>로그인</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item className={styles.menuItem} asChild>
                  <Link to={ROUTES.signup}>회원가입</Link>
                </DropdownMenu.Item>
              </>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/**
 * 개발 전용 메뉴. `import.meta.env.DEV` 로 감싸므로 프로덕션 번들에 포함되지 않는다.
 * 역할 전환기와 에러 화면 링크를 모아 둔다.
 */
function DevMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={styles.iconButton}>개발</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} sideOffset={8} align="end">
          <DevRoleSwitcher />

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
