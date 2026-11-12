import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clearUser, readUser } from '../../auth/session'
import GeneLogo from '../GeneLogo/GeneLogo'
import styles from './style.module.css'

// TODO: 각 페이지가 생기면 실제 경로로 맞추기
const NAV_ITEMS = [
  { label: '회사소개', to: '/company' },
  { label: '연구소소개', to: '/lab' },
  { label: 'EVENT', to: '/event' },
  { label: '고객센터', to: '/support' },
  { label: '마이페이지', to: '/mypage' },
]

// 로고·메뉴를 누르면 이동하면서 맨 위로 부드럽게 올라감
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

/** 오른쪽 위 "___님". 누르면 로그아웃 메뉴가 열림 */
function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const user = readUser()
  const name = user?.name || user?.login_id || '회원'

  // 바깥을 누르거나 Esc를 누르면 닫힘
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const logout = () => {
    clearUser()
    navigate('/login')
  }

  return (
    <div className={styles.user} ref={ref}>
      <button
        type="button"
        className={styles.userName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <b>{name}</b>님
      </button>
      {open && (
        <div className={styles.userMenu} role="menu">
          <button type="button" role="menuitem" onClick={logout}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

/** 서비스 메인부터 쓰는 공통 헤더. 스크롤해도 화면 위에 붙어 있음 */
function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/main" className={styles.brand} aria-label="메인으로" onClick={scrollToTop}>
          <GeneLogo className={styles.mark} background="#0b1530" title="" />
          <span className={styles.name}>
            내진<em>(GENE)</em>설계
          </span>
        </Link>

        <nav className={styles.nav} aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
              onClick={scrollToTop}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default Header
