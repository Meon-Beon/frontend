import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { client } from '../../api/client'
import GeneLogo from '../../components/GeneLogo/GeneLogo'
import styles from './style.module.css'

const TERMS = [
  { key: 'service', label: '서비스 이용약관 동의' },
  { key: 'genetic', label: '유전정보 분석 및 민감정보 처리 동의' },
  { key: 'privacy', label: '개인정보 수집 및 이용 동의' },
] as const

type TermKey = (typeof TERMS)[number]['key']

const INITIAL_FORM = {
  name: '',
  rrnFront: '',
  rrnBack: '',
  zipcode: '',
  address: '',
  addressDetail: '',
  phone: '',
  verifyCode: '',
  loginId: '',
  password: '',
  passwordConfirm: '',
}

type FormState = typeof INITIAL_FORM

// 영문, 숫자, 특수문자를 모두 포함한 8자 이상
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
const LOGIN_ID_RULE = /^[A-Za-z0-9]{6,16}$/
// 010, 011, 016~019 로 시작하는 숫자 10~11자리
const PHONE_RULE = /^01[016789]\d{7,8}$/

// TODO: 실제 문자 발송(SMS) 서비스를 붙이면 지우기.
// 지금은 문자를 보내지 않고, 이 번호를 입력하면 인증된 것으로 처리함
const MOCK_VERIFY_CODE = '123456'

/** 주민등록번호 형식 검사: 앞 6자리가 실제 있는 날짜인지 + 뒷자리 첫 숫자가 1~8인지 */
function isValidRrn(front: string, back: string) {
  if (!/^\d{6}$/.test(front) || !/^[1-8]$/.test(back)) return false
  // 뒷자리 첫 숫자 1·2·5·6은 1900년대생, 3·4·7·8은 2000년대생
  const year = ('1256'.includes(back) ? 1900 : 2000) + Number(front.slice(0, 2))
  const month = Number(front.slice(2, 4))
  const day = Number(front.slice(4, 6))
  // 13월, 2월 30일 같은 없는 날짜는 Date가 다른 날짜로 바꿔 버리므로 그대로인지 비교
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

// ---------- 카카오(다음) 우편번호 서비스 ----------
const POSTCODE_SCRIPT = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string }
type PostcodeConstructor = new (options: { oncomplete: (data: PostcodeData) => void }) => {
  open: () => void
}

declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor }
    daum?: { Postcode?: PostcodeConstructor }
  }
}

let postcodeLoading: Promise<PostcodeConstructor> | null = null

/** 우편번호 스크립트를 처음 필요할 때 한 번만 불러옴 */
function loadPostcode() {
  const find = () => window.kakao?.Postcode ?? window.daum?.Postcode
  const loaded = find()
  if (loaded) return Promise.resolve(loaded)

  postcodeLoading ??= new Promise<PostcodeConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = POSTCODE_SCRIPT
    script.onload = () => {
      const Postcode = find()
      if (Postcode) resolve(Postcode)
      else reject(new Error('우편번호 서비스를 찾을 수 없습니다.'))
    }
    script.onerror = () => {
      postcodeLoading = null // 다음에 누르면 다시 시도
      reject(new Error('우편번호 스크립트를 불러오지 못했습니다.'))
    }
    document.head.appendChild(script)
  })
  return postcodeLoading
}

/** 입력칸 아래에 보여 주는 안내 문구. ok면 초록, 아니면 빨강 */
type Hint = { ok: boolean; text: string } | null

function HintText({ hint }: { hint: Hint }) {
  if (!hint) return null
  return (
    <p role="status" className={hint.ok ? `${styles.hint} ${styles.hintOk}` : styles.hint}>
      {hint.text}
    </p>
  )
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
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
}

function Checkbox({
  checked,
  onChange,
  children,
  large,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  large?: boolean
}) {
  return (
    <label className={large ? `${styles.check} ${styles.checkLarge}` : styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.checkbox} aria-hidden="true">
        {/* pathLength=1 이라 체크 표시가 그려지듯 나타나는 애니메이션을 쉽게 줄 수 있음 */}
        <svg className={styles.checkMark} viewBox="0 0 24 24" fill="none">
          <path d={ICON.check} pathLength={1} />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  )
}

function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [terms, setTerms] = useState<Record<TermKey, boolean>>({
    service: false,
    genetic: false,
    privacy: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 중복확인을 통과한 아이디. 아이디를 고치면 다시 확인해야 함
  const [checkedId, setCheckedId] = useState('')
  const [idHint, setIdHint] = useState<Hint>(null)

  // 휴대폰 인증 상태
  const [codeSent, setCodeSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneHint, setPhoneHint] = useState<Hint>(null)
  const [codeHint, setCodeHint] = useState<Hint>(null)

  const allAgreed = TERMS.every((t) => terms[t.key])

  const update =
    (key: keyof FormState, digitsOnly = false) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value
      setForm((prev) => ({ ...prev, [key]: value }))

      // 확인이 끝난 값을 고치면 확인을 다시 받게 함
      if (key === 'loginId') {
        setCheckedId('')
        setIdHint(null)
      }
      if (key === 'phone') {
        setCodeSent(false)
        setPhoneVerified(false)
        setPhoneHint(null)
        setCodeHint(null)
      }
    }

  const setAllTerms = (checked: boolean) =>
    setTerms({ service: checked, genetic: checked, privacy: checked })

  const handleSearchZipcode = async () => {
    try {
      const Postcode = await loadPostcode()
      new Postcode({
        oncomplete: (data) => {
          setForm((prev) => ({
            ...prev,
            zipcode: data.zonecode,
            // 도로명 주소가 비어 있는 주소는 지번 주소를 대신 씀
            address: data.roadAddress || data.jibunAddress,
          }))
        },
      }).open()
    } catch {
      setError('우편번호 검색을 열 수 없습니다. 인터넷 연결을 확인해 주세요.')
    }
  }

  // 가짜 인증: 문자를 실제로 보내지 않고 번호 형식만 검사함
  const handleSendCode = () => {
    if (!PHONE_RULE.test(form.phone)) {
      setPhoneHint({ ok: false, text: '휴대폰 번호 형식이 올바르지 않습니다. (예: 01012345678)' })
      return
    }
    setCodeSent(true)
    setPhoneVerified(false)
    setCodeHint(null)
    setPhoneHint({
      ok: true,
      text: `인증번호를 발송했습니다. (테스트용 인증번호: ${MOCK_VERIFY_CODE})`,
    })
  }

  const handleVerifyCode = () => {
    if (!codeSent) {
      setCodeHint({ ok: false, text: '먼저 인증번호 발송을 눌러 주세요.' })
      return
    }
    if (form.verifyCode !== MOCK_VERIFY_CODE) {
      setPhoneVerified(false)
      setCodeHint({ ok: false, text: '인증번호가 일치하지 않습니다.' })
      return
    }
    setPhoneVerified(true)
    setCodeHint({ ok: true, text: '휴대폰 인증이 완료되었습니다.' })
  }

  const handleCheckId = async () => {
    if (!LOGIN_ID_RULE.test(form.loginId)) {
      setIdHint({ ok: false, text: '아이디는 영문, 숫자 6~16자로 입력해 주세요.' })
      return
    }
    try {
      const { data } = await client.get<{ available: boolean }>('/api/check-id', {
        params: { login_id: form.loginId },
      })
      if (data.available) {
        setCheckedId(form.loginId)
        setIdHint({ ok: true, text: '사용할 수 있는 아이디입니다.' })
      } else {
        setCheckedId('')
        setIdHint({ ok: false, text: '이미 사용 중인 아이디입니다.' })
      }
    } catch {
      setIdHint({ ok: false, text: '서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.' })
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isValidRrn(form.rrnFront, form.rrnBack)) {
      setError('주민등록번호 형식이 올바르지 않습니다.')
      return
    }
    if (!form.zipcode) {
      setError('우편번호 검색으로 주소를 입력해 주세요.')
      return
    }
    if (!PHONE_RULE.test(form.phone)) {
      setError('휴대폰 번호 형식이 올바르지 않습니다.')
      return
    }
    if (!phoneVerified) {
      setError('휴대폰 인증을 완료해 주세요.')
      return
    }
    if (!LOGIN_ID_RULE.test(form.loginId)) {
      setError('아이디는 영문, 숫자 6~16자로 입력해 주세요.')
      return
    }
    if (checkedId !== form.loginId) {
      setError('아이디 중복확인을 해 주세요.')
      return
    }
    if (!PASSWORD_RULE.test(form.password)) {
      setError('비밀번호는 영문, 숫자, 특수문자를 조합해 8자리 이상으로 입력해 주세요.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }
    if (!allAgreed) {
      setError('필수 약관에 모두 동의해 주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      // 서버가 201을 주면 성공. 그 외에는 axios가 에러를 던져 catch로 간다
      // 주민등록번호는 서버에서 생년월일·성별만 뽑아 쓰고 저장하지 않음
      await client.post('/api/signup', {
        name: form.name,
        rrn_front: form.rrnFront,
        rrn_back: form.rrnBack,
        zipcode: form.zipcode,
        address: form.address,
        address_detail: form.addressDetail,
        phone: form.phone,
        login_id: form.loginId,
        password: form.password,
      })
      navigate('/login')
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setCheckedId('')
        setError('이미 사용 중인 아이디입니다. 다른 아이디로 다시 중복확인해 주세요.')
      } else if (isAxiosError(err) && err.response) {
        // 400(주민등록번호 형식), 422(서버 형식 검사 실패) 등
        const detail = err.response.data?.detail
        setError(typeof detail === 'string' ? detail : '입력한 정보를 다시 확인해 주세요.')
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

      <div className={styles.wrap}>
        <header className={styles.top}>
          <Link to="/" className={styles.mark} aria-label="내진(GENE)설계 홈으로">
            <GeneLogo className={styles.logo} background="#08112a" title="" />
          </Link>
          <h1 className={styles.title}>회원가입</h1>
        </header>

        <form className={styles.card} onSubmit={handleSubmit}>
          {/* ---------- 1. 회원 정보 ---------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>1.</span> 회원 정보 입력 <small>(실명 확인용)</small>
            </h2>

            <div className={styles.field}>
              <label htmlFor="su-name" className={styles.label}>
                이름 <i className={styles.required}>*</i>
              </label>
              <input
                id="su-name"
                className={styles.input}
                autoComplete="name"
                placeholder="이름을 입력하세요."
                value={form.name}
                onChange={update('name')}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-rrn" className={styles.label}>
                주민등록번호 <i className={styles.required}>*</i>
              </label>
              <div className={styles.rrn}>
                <input
                  id="su-rrn"
                  className={styles.input}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="앞 6자리 (YYMMDD)"
                  value={form.rrnFront}
                  onChange={update('rrnFront', true)}
                  required
                />
                <span className={styles.dash} aria-hidden="true">
                  -
                </span>
                {/* 뒷자리는 성별 구분 첫 숫자만 받고 나머지는 가림 */}
                <div className={`${styles.input} ${styles.rrnBack}`}>
                  <input
                    className={styles.rrnDigit}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label="주민등록번호 뒷자리 첫 숫자"
                    placeholder="•"
                    value={form.rrnBack}
                    onChange={update('rrnBack', true)}
                    required
                  />
                  <span className={styles.rrnMask} aria-hidden="true">
                    ●●●●●●
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="su-zipcode" className={styles.label}>
                주소 <i className={styles.required}>*</i>
              </label>
              <div className={styles.row}>
                <input
                  id="su-zipcode"
                  className={`${styles.input} ${styles.zipcode}`}
                  placeholder="우편번호"
                  value={form.zipcode}
                  readOnly
                />
                <button type="button" className={styles.ghostBtn} onClick={handleSearchZipcode}>
                  <Icon d={ICON.search} />
                  우편번호 검색
                </button>
              </div>
              <input
                className={`${styles.input} ${styles.stack}`}
                aria-label="주소"
                autoComplete="address-line1"
                placeholder="주소를 입력하세요."
                value={form.address}
                onChange={update('address')}
                required
              />
              <input
                className={`${styles.input} ${styles.stack}`}
                aria-label="상세주소"
                autoComplete="address-line2"
                placeholder="상세주소를 입력하세요 (동, 호수 등)"
                value={form.addressDetail}
                onChange={update('addressDetail')}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-phone" className={styles.label}>
                휴대폰 번호 <i className={styles.required}>*</i>
              </label>
              <div className={styles.row}>
                <input
                  id="su-phone"
                  className={styles.input}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={11}
                  placeholder="전화번호를 입력하세요."
                  value={form.phone}
                  onChange={update('phone', true)}
                  required
                />
                {/* TODO: 인증번호 발송 API 연결 (지금은 가짜 인증) */}
                <button type="button" className={styles.solidBtn} onClick={handleSendCode}>
                  {codeSent ? '재발송' : '인증번호 발송'}
                </button>
              </div>
              <HintText hint={phoneHint} />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-code" className={styles.label}>
                인증번호 확인 <i className={styles.required}>*</i>
              </label>
              <div className={styles.row}>
                <input
                  id="su-code"
                  className={styles.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="인증번호 6자리 입력"
                  value={form.verifyCode}
                  onChange={update('verifyCode', true)}
                  required
                />
                {/* TODO: 인증번호 확인 API 연결 (지금은 가짜 인증) */}
                <button type="button" className={styles.ghostBtn} onClick={handleVerifyCode}>
                  확인
                </button>
              </div>
              <HintText hint={codeHint} />
            </div>
          </section>

          {/* ---------- 2. 계정 정보 ---------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>2.</span> 계정 정보
            </h2>

            <div className={styles.field}>
              <label htmlFor="su-id" className={styles.label}>
                아이디 <i className={styles.required}>*</i>
              </label>
              <div className={styles.row}>
                <input
                  id="su-id"
                  className={styles.input}
                  autoComplete="username"
                  maxLength={16}
                  placeholder="사용할 아이디를 입력하세요 (영문, 숫자 포함 6~16자)"
                  value={form.loginId}
                  onChange={update('loginId')}
                  required
                />
                <button type="button" className={styles.ghostBtn} onClick={handleCheckId}>
                  중복확인
                </button>
              </div>
              <HintText hint={idHint} />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-pw" className={styles.label}>
                비밀번호 <i className={styles.required}>*</i>
              </label>
              <input
                id="su-pw"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="영문, 숫자, 특수문자 조합 8자리 이상"
                value={form.password}
                onChange={update('password')}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="su-pw2" className={styles.label}>
                비밀번호 확인 <i className={styles.required}>*</i>
              </label>
              <input
                id="su-pw2"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호를 다시 한번 입력해주세요."
                value={form.passwordConfirm}
                onChange={update('passwordConfirm')}
                required
              />
            </div>
          </section>

          {/* ---------- 3. 약관 동의 ---------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>3.</span> 약관 동의
            </h2>

            <div className={styles.terms}>
              <Checkbox checked={allAgreed} onChange={setAllTerms} large>
                모든 약관에 전체 동의합니다 <small>(필수 3건)</small>
              </Checkbox>
              <ul>
                {TERMS.map((t) => (
                  <li key={t.key}>
                    <Checkbox
                      checked={terms[t.key]}
                      onChange={(checked) => setTerms((prev) => ({ ...prev, [t.key]: checked }))}
                    >
                      <b>[필수]</b> {t.label}
                    </Checkbox>
                    {/* TODO: 약관 전문 페이지/모달 연결 */}
                    <a href="#" className={styles.viewTerms}>
                      전문보기
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? '가입 처리 중…' : '회원가입 완료하기'}
            <Icon d={ICON.arrow} />
          </button>

          <p className={styles.toLogin}>
            이미 계정이 있으신가요? <Link to="/login">로그인하기</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Signup
