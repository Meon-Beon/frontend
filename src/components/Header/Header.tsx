import { Link, NavLink } from 'react-router-dom'
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

/** 서비스 메인부터 쓰는 공통 헤더. 스크롤해도 화면 위에 붙어 있음 */
function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/main" className={styles.brand}>
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
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link to="/mypage" className={styles.userBtn} aria-label="내 계정">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
