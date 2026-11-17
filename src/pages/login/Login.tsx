import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { client } from '../../api/client'
import { saveUser, type SessionUser } from '../../auth/session'
import GeneLogo from '../../components/GeneLogo/GeneLogo'
import styles from './style.module.css'

const SAVED_ID_KEY = 'gene:savedId'

// TODO: 로그인 서버(/api/login)가 준비되면 false로 바꾸기.
// true인 동안은 서버를 부르지 않고, 아이디·비밀번호만 입력하면 로그인 성공으로 처리함
const MOCK_LOGIN = false

function readSavedId() {
  try {
    return localStorage.getItem(SAVED_ID_KEY) ?? ''
  } catch {
    return ''
  }
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      className={className ?? styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const ICON = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M6 12.5l4 4 8-9',
}

/**
 * 로그인 뒤 돌아갈 주소. RequireAuth가 state.from 으로 넘겨준 값을 쓰고, 없으면 메인으로.
 * '/'로 시작하는 우리 사이트 안 주소만 허용 ('//다른사이트' 같은 외부 주소로 튕기는 것 방지)
 */
function getRedirectPath(state: unknown) {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== '/login') {
    return from
  }
  return '/main'
}

function Login() {
  const [userId, setUserId] = useState(readSavedId)
  const [password, setPassword] = useState('')
  const [rememberId, setRememberId] = useState(() => readSavedId() !== '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = getRedirectPath(location.state)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      if (rememberId) localStorage.setItem(SAVED_ID_KEY, userId)
      else localStorage.removeItem(SAVED_ID_KEY)
    } catch {
      // 저장소를 쓸 수 없는 환경(사파리 비공개 모드 등)에서는 저장만 건너뜀
    }

    setError('')

    if (MOCK_LOGIN) {
      saveUser({ id: 0, login_id: userId, name: null })
      navigate(redirectPath, { replace: true })
      return
    }

    setLoading(true)
    try {
      // 서버가 200을 주면 성공, 401이면 axios가 에러를 던져 catch로 간다
      const { data } = await client.post<SessionUser>('/api/login', { login_id: userId, password })
      saveUser(data)
      navigate(redirectPath, { replace: true })
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError('서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <main className={styles.wrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <Link to="/" className={styles.mark} aria-label="내진(GENE)설계 홈으로">
            <GeneLogo className={styles.logo} title="" />
          </Link>

          <h1 className={styles.title}>
            내진<em>(GENE)</em>설계 로그인
          </h1>
          <p className={styles.subtitle}>유전체 데이터 기반 초개인화 정밀 보험 플랜</p>

          <div className={styles.field}>
            <label htmlFor="login-id" className={styles.label}>
              아이디 <i className={styles.required}>*</i>
            </label>
            <input
              id="login-id"
              className={styles.input}
              type="text"
              autoComplete="username"
              placeholder="아이디를 입력하세요"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>
              비밀번호 <i className={styles.required}>*</i>
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(e) => setRememberId(e.target.checked)}
              />
              <span className={styles.checkbox} aria-hidden="true">
                <Icon d={ICON.check} />
              </span>
              아이디 저장
            </label>
          </div>

          {error && (
            <p role="alert" style={{ margin: '16px 0 0', fontSize: 14, color: '#ff7a8a' }}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
            <Icon d={ICON.arrow} />
          </button>

          <nav className={styles.links} aria-label="계정 도움말">
            <Link to="/signup">회원가입</Link>
            <i aria-hidden="true" />
            {/* TODO: 아이디·비밀번호 찾기 페이지가 생기면 경로 연결 */}
            <a href="#">아이디 찾기</a>
            <i aria-hidden="true" />
            <a href="#">비밀번호 찾기</a>
          </nav>
        </form>
      </main>
    </div>
  )
}

export default Login
