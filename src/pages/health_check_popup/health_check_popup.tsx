import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../../api/dna'
import { fetchCheckups } from '../../api/health'
import type { HealthCheckup } from '../../api/health'
import HealthCheckResult from './health_check_result'
import './health_check_popup.css'

/** 조회에 넘기는 본인 정보. 주민번호는 넘기지 않고 생년월일·성별만 남김 */
export type HealthCheckIdentity = {
  name: string
  birth: string // YYYY-MM-DD
  gender: 'M' | 'F'
  carrier: string
  phone: string // 숫자만
}

export type HealthCheckLookup = { identity: HealthCheckIdentity; checkups: HealthCheckup[] }

type Props = {
  open: boolean
  onClose: () => void
  /** 조회에 성공하면 원래 페이지에도 알려 줌 */
  onResult?: (lookup: HealthCheckLookup) => void
  /** 이미 조회한 결과가 있으면 입력 없이 결과부터 보여 줌 */
  initialLookup?: HealthCheckLookup | null
  defaultName?: string
}

type Step = 'form' | 'loading' | 'result' | 'error'

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const CARRIERS = ['SKT', 'KT', 'LG U+', '알뜰폰']

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

/** 010-1234-5678 모양으로 하이픈을 넣음 */
function formatPhone(v: string) {
  const d = onlyDigits(v, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/** 주민번호 앞 6자리 + 뒷자리 첫 숫자(1~8)로 생년월일·성별을 구함. 맞지 않으면 null */
function parseRrn(front: string, back: string) {
  if (front.length !== 6 || !/^[1-8]$/.test(back)) return null
  const code = Number(back)
  const year = ([1, 2, 5, 6].includes(code) ? 1900 : 2000) + Number(front.slice(0, 2))
  const month = Number(front.slice(2, 4))
  const day = Number(front.slice(4, 6))
  const date = new Date(year, month - 1, day)
  if (date.getMonth() !== month - 1 || date.getDate() !== day || date > new Date()) return null
  const birth = `${year}-${front.slice(2, 4)}-${front.slice(4, 6)}`
  return { birth, gender: (code % 2 === 1 ? 'M' : 'F') as 'M' | 'F' }
}

type Errors = Partial<Record<'name' | 'rrn' | 'phone' | 'agree', string>>

/** 본인 정보를 받아 건강검진 내역을 조회하고, 결과까지 이 팝업 안에서 보여 줌. 열릴 때마다 새로 그려서 입력칸이 비워짐 */
function HealthCheckPopup({ open, ...rest }: Props) {
  if (!open) return null
  return <PopupBody {...rest} />
}

function PopupBody({ onClose, onResult, initialLookup, defaultName = '' }: Omit<Props, 'open'>) {
  const [step, setStep] = useState<Step>(initialLookup ? 'result' : 'form')
  const [lookup, setLookup] = useState<HealthCheckLookup | null>(initialLookup ?? null)
  const [failMessage, setFailMessage] = useState('')
  const [name, setName] = useState(defaultName)
  const [rrnFront, setRrnFront] = useState('')
  const [rrnBack, setRrnBack] = useState('')
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  // 열리면 이름 칸에 커서를 두고, Esc로 닫고, 뒤 페이지는 스크롤되지 않게 함
  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const lookUp = async (identity: HealthCheckIdentity) => {
    setStep('loading')
    try {
      // 너무 빨리 끝나도 불러오는 모습이 잠깐은 보이게 함
      const [checkups] = await Promise.all([
        fetchCheckups({ name: identity.name, birth_date: identity.birth, gender: identity.gender, phone: identity.phone }),
        wait(1200),
      ])
      const result = { identity, checkups }
      setLookup(result)
      setStep('result')
      onResult?.(result)
    } catch (error) {
      setFailMessage(errorMessage(error, '건강검진 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setStep('error')
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    const rrn = parseRrn(rrnFront, rrnBack)
    if (name.trim().length < 2) next.name = '이름을 2자 이상 입력해 주세요.'
    if (!rrn) next.rrn = '주민등록번호를 정확히 입력해 주세요.'
    if (onlyDigits(phone, 11).length < 10) next.phone = '휴대폰 번호를 정확히 입력해 주세요.'
    if (!agree) next.agree = '개인정보 수집·이용에 동의해 주세요.'
    setErrors(next)
    if (Object.keys(next).length > 0 || !rrn) return

    lookUp({ name: name.trim(), birth: rrn.birth, gender: rrn.gender, carrier, phone: onlyDigits(phone, 11) })
  }

  const showResult = step === 'result' && lookup

  return (
    <div className="health-check-popup__backdrop" onClick={onClose}>
      <div
        className={showResult ? 'health-check-popup health-check-popup--result' : 'health-check-popup'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-check-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="health-check-popup__close" onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {showResult && (
          <>
            <HealthCheckResult identity={lookup.identity} checkups={lookup.checkups} />
            <button type="button" className="health-check-popup__submit health-check-popup__done" onClick={onClose}>
              확인
            </button>
          </>
        )}

        {step === 'loading' && (
          <div className="health-check-popup__status" role="status" aria-live="polite">
            <span className="health-check-popup__spinner" aria-hidden="true" />
            <h2 id="health-check-popup-title" className="health-check-popup__title">
              건강검진 내역을 불러오는 중이에요
            </h2>
            <p className="health-check-popup__desc">국민건강보험공단에서 최근 10년 기록을 확인하고 있어요.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="health-check-popup__status" role="alert">
            <h2 id="health-check-popup-title" className="health-check-popup__title">
              {failMessage}
            </h2>
            <p className="health-check-popup__desc">입력한 이름·주민등록번호·휴대폰 번호가 맞는지 확인해 주세요.</p>
            <button type="button" className="health-check-popup__submit" onClick={() => setStep('form')}>
              다시 입력하기
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            <header className="health-check-popup__head">
              <h2 id="health-check-popup-title" className="health-check-popup__title">
                본인 확인
              </h2>
              <p className="health-check-popup__desc">
                국민건강보험공단에 등록된 건강검진 내역을 불러오기 위해
                <br />
                본인 정보를 입력해 주세요.
              </p>
            </header>

            <form className="health-check-popup__form" onSubmit={handleSubmit} noValidate>
              <label className="health-check-popup__field">
                <span className="health-check-popup__label">이름</span>
                <input
                  ref={nameRef}
                  className="health-check-popup__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <span className="health-check-popup__error">{errors.name}</span>}
              </label>

              <div className="health-check-popup__field">
                <span className="health-check-popup__label" id="health-check-rrn">
                  주민등록번호
                </span>
                <div className="health-check-popup__row" role="group" aria-labelledby="health-check-rrn">
                  <input
                    className="health-check-popup__input"
                    value={rrnFront}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 6)
                      setRrnFront(v)
                      if (v.length === 6) backRef.current?.focus()
                    }}
                    placeholder="생년월일 6자리"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label="주민등록번호 앞자리"
                    aria-invalid={!!errors.rrn}
                  />
                  <span className="health-check-popup__dash">-</span>
                  {/* 뒷자리는 성별을 나타내는 첫 숫자만 받고 나머지는 가림 */}
                  <div className="health-check-popup__input health-check-popup__rrn-back" aria-invalid={!!errors.rrn}>
                    <input
                      ref={backRef}
                      className="health-check-popup__rrn-digit"
                      value={rrnBack}
                      onChange={(e) => setRrnBack(onlyDigits(e.target.value, 1))}
                      placeholder="•"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="주민등록번호 뒷자리 첫 숫자"
                      aria-invalid={!!errors.rrn}
                    />
                    <span className="health-check-popup__rrn-mask" aria-hidden="true">
                      ●●●●●●
                    </span>
                  </div>
                </div>
                {errors.rrn && <span className="health-check-popup__error">{errors.rrn}</span>}
              </div>

              <div className="health-check-popup__field">
                <span className="health-check-popup__label" id="health-check-phone">
                  휴대폰 번호
                </span>
                <div className="health-check-popup__row" role="group" aria-labelledby="health-check-phone">
                  <select
                    className="health-check-popup__input health-check-popup__select"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    aria-label="통신사"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    className="health-check-popup__input"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-label="휴대폰 번호"
                    aria-invalid={!!errors.phone}
                  />
                </div>
                {errors.phone && <span className="health-check-popup__error">{errors.phone}</span>}
              </div>

              <label className="health-check-popup__agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span className="health-check-popup__check" aria-hidden="true" />
                <span>
                  <b>[필수]</b> 건강검진 내역 조회를 위한
                  <br />
                  개인정보 수집·이용에 동의합니다.
                </span>
              </label>
              {errors.agree && <span className="health-check-popup__error">{errors.agree}</span>}

              <p className="health-check-popup__note">주민등록번호는 생년월일·성별 확인에만 쓰이고 저장되지 않아요.</p>

              <button type="submit" className="health-check-popup__submit">
                건강검진 내역 조회하기
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default HealthCheckPopup
