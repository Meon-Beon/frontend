import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clearKakaoSession, kakaoError, kakaoLogin, kakaoSignup, readKakaoSession } from '../../api/kakao'
import { saveUser } from '../../auth/session'
import GeneLogo from '../../components/GeneLogo/GeneLogo'
import styles from '../login/style.module.css'

/*
 * 카카오 로그인 콜백 (/oauth/kakao?code=…&state=…)
 * - 이미 가입한 카카오 회원 → 바로 로그인
 * - 처음 온 카카오 회원 → 생년월일·성별·휴대폰만 받는 추가 정보 화면 → 가입 후 로그인
 */

type Step = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'profile'; ticket: string; redirect: string }

const RRN_FRONT = /^\d{6}$/
const RRN_BACK = /^[1-8]$/
const PHONE = /^01[016789]\d{7,8}$/

function ProfileForm({ ticket, nickname, redirect }: { ticket: string; nickname: string; redirect: string }) {
  const navigate = useNavigate()
  const [name, setName] = useState(nickname)
  const [rrnFront, setRrnFront] = useState('')
  const [rrnBack, setRrnBack] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // 서버도 다시 검사하지만, 먼저 화면에서 걸러 바로 알려 줌
    if (!name.trim()) return setError('이름을 입력해 주세요.')
    if (!RRN_FRONT.test(rrnFront) || !RRN_BACK.test(rrnBack)) return setError('주민등록번호 앞 6자리와 뒷자리 첫 숫자를 확인해 주세요.')
    if (!PHONE.test(phone)) return setError('휴대폰 번호를 숫자만 정확히 입력해 주세요.')
    setError('')
    setLoading(true)
    try {
      const user = await kakaoSignup({ ticket, name: name.trim(), rrn_front: rrnFront, rrn_back: rrnBack, phone })
      saveUser(user)
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(kakaoError(err, '가입하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setLoading(false)
    }
  }

  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

  return (
    <form className={styles.card} onSubmit={onSubmit} noValidate>
      <Link to="/" className={styles.mark} aria-label="내진(GENE)설계 홈으로">
        <GeneLogo className={styles.logo} title="" />
      </Link>
      <h1 className={styles.title}>추가 정보 입력</h1>
      <p className={styles.subtitle}>
        카카오 계정으로 처음 오셨어요. 건강검진 조회와 보험 설계에 필요한 정보만 한 번 받을게요.
      </p>

      <div className={styles.field}>
        <label htmlFor="kakao-name" className={styles.label}>
          이름 <i className={styles.required}>*</i>
        </label>
        <input id="kakao-name" className={styles.input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="kakao-rrn-front" className={styles.label}>
          주민등록번호 <i className={styles.required}>*</i>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="kakao-rrn-front"
            className={styles.input}
            inputMode="numeric"
            placeholder="앞 6자리"
            value={rrnFront}
            onChange={(e) => setRrnFront(digits(e.target.value, 6))}
          />
          <span aria-hidden="true">-</span>
          <input
            aria-label="주민등록번호 뒷자리 첫 숫자"
            className={styles.input}
            style={{ width: 56, flex: 'none', textAlign: 'center' }}
            inputMode="numeric"
            value={rrnBack}
            onChange={(e) => setRrnBack(digits(e.target.value, 1))}
          />
          <span aria-hidden="true" style={{ letterSpacing: 2, color: '#6f7a8f' }}>
            ●●●●●●
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6f7a8f' }}>생년월일과 성별만 저장하고 주민등록번호는 저장하지 않아요.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="kakao-phone" className={styles.label}>
          휴대폰 번호 <i className={styles.required}>*</i>
        </label>
        <input
          id="kakao-phone"
          className={styles.input}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="숫자만 입력 (01012345678)"
          value={phone}
          onChange={(e) => setPhone(digits(e.target.value, 11))}
        />
      </div>

      {error && (
        <p role="alert" style={{ margin: '16px 0 0', fontSize: 14, color: '#ff7a8a' }}>
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? '가입하는 중…' : '가입하고 시작하기'}
      </button>
    </form>
  )
}

/** 주소창 값만 보고 바로 알 수 있는 상태(취소·잘못된 요청)는 첫 화면에서 정함 */
function initialStep(params: URLSearchParams): Step & { code?: string; redirect: string } {
  const { valid, redirect } = readKakaoSession(params.get('state'))
  if (params.get('error')) return { kind: 'error', message: '카카오 로그인이 취소되었어요.', redirect } // 동의 화면에서 취소(access_denied)
  const code = params.get('code')
  if (!code || !valid) return { kind: 'error', message: '잘못된 로그인 요청이에요. 다시 시도해 주세요.', redirect }
  return { kind: 'loading', code, redirect }
}

function KakaoCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [first] = useState(() => initialStep(params))
  const [step, setStep] = useState<Step>(first)
  const [nickname, setNickname] = useState('')
  // 인가 코드는 한 번만 쓸 수 있음. 개발 모드 StrictMode 가 effect 를 두 번 실행해도 서버 요청은 한 번만
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    clearKakaoSession()
    if (!first.code) return

    const { redirect } = first
    kakaoLogin(first.code)
      .then((res) => {
        if (res.status === 'ok') {
          saveUser(res.user)
          navigate(redirect, { replace: true })
        } else {
          setNickname(res.nickname ?? '')
          setStep({ kind: 'profile', ticket: res.ticket, redirect })
        }
      })
      .catch((e) => setStep({ kind: 'error', message: kakaoError(e, '카카오 로그인에 실패했어요.') }))
  }, [first, navigate])

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <main className={styles.wrap}>
        {step.kind === 'profile' ? (
          <ProfileForm ticket={step.ticket} nickname={nickname} redirect={step.redirect} />
        ) : (
          <section className={styles.card} aria-live="polite">
            <h1 className={styles.title}>카카오 로그인</h1>
            <p className={styles.subtitle} role={step.kind === 'error' ? 'alert' : undefined}>
              {step.kind === 'loading' ? '카카오 계정을 확인하고 있어요…' : step.message}
            </p>
            {step.kind === 'error' && (
              <Link to="/login" className={styles.submit} style={{ textDecoration: 'none' }}>
                로그인 화면으로
              </Link>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default KakaoCallback
