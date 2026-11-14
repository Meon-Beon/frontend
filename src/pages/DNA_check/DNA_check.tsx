import { useEffect, useState, type ReactNode } from 'react'
import './DNA_check.css'

/* 4-1 약관동의 팝업 — DNA 검사 신청 화면의 "유전자 검사하고 종합 리포트 받기"에서 열림 */

type Term = { title: string; body: ReactNode }

const TERMS: Term[] = [
  {
    title: '유전자 검사 결과의 의학적 한계 및 면책에 대한 동의',
    body: (
      <p>
        본 검사는 질병의 진단이나 치료를 목적으로 하는 의학적 진단(확진) 서비스가 아닙니다. 유전자 분석
        결과는 통계적 확률에 기반한 건강 관리 및 영양·생활습관 개선 참고용 지표로만 제공되며, 의사의 진료나
        전문적인 의료 행위를 대체할 수 없습니다. 당사는 본 검사 결과에 따른 개인의 주관적인 해석이나 이에
        기반한 건강 관리 결과에 대해 법적 책임을 지지 않습니다.
      </p>
    ),
  },
  {
    title: '민감정보(유전자 정보) 수집 및 이용 동의',
    body: (
      <>
        <p>
          본 서비스는 원활한 유전자 분석 및 리포트 제공을 위해 <b>고유식별정보 및 생체정보</b>를 수집 및
          이용합니다.
        </p>
        <ul>
          <li>
            <b>수집 목적:</b> 유전자 분석 및 맞춤형 리포트 생성, 서비스 고도화
          </li>
          <li>
            <b>보유 및 이용 기간:</b> 서비스 제공 완료 후 관계 법령에 따라 [5년 / 또는 파기 요청 시 즉시]
            안전하게 파기됩니다.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '타인 정보 도용 및 허위 검체 제출 금지 서약',
    body: (
      <p>
        본인은 타인의 유전자 검체를 동의 없이 채취하거나 대리 제출하는 등의 부정한 행위를 하지 않을 것에
        동의합니다. 타인의 권리를 침해하거나 허위 정보를 제공하여 발생한 모든 법적 책임(형사처벌 및 손해배상
        등)은 전적으로 본인에게 있습니다.
      </p>
    ),
  },
  {
    title: '맞춤형 건강 정보 및 보험 상품 추천 알림 수신 동의',
    body: (
      <p>
        유전자 분석 결과 기반 건강 관리 팁, 맞춤형 보험 상품 비교 추천 및 혜택 정보를 앱 푸시로 받아보는
        것에 동의합니다.
      </p>
    ),
  },
]

type Props = {
  open: boolean
  onClose: () => void
  /** 모두 동의 후 결제하기를 누르면 호출 (4-2 결제방식으로 이어질 자리) */
  onConfirm: () => void
}

export default function DNA_check({ open, onClose, onConfirm }: Props) {
  const [checked, setChecked] = useState<boolean[]>(() => TERMS.map(() => false))
  const allChecked = checked.every(Boolean)

  // 열려 있는 동안 뒤 화면 스크롤을 막고, Esc로 닫기
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const toggle = (i: number) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
  const toggleAll = () => setChecked(TERMS.map(() => !allChecked))

  return (
    <div className="dc-backdrop" onClick={onClose}>
      <div
        className="dc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dc-head">
          <h2 id="dc-title">약관동의</h2>
          <button type="button" className="dc-close" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="dc-body">
          <label className="dc-check dc-all">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            <span className="dc-box" aria-hidden="true" />
            전체 동의
          </label>

          <ol className="dc-terms">
            {TERMS.map((t, i) => (
              <li key={t.title} className={checked[i] ? 'dc-term is-on' : 'dc-term'}>
                <label className="dc-check">
                  <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />
                  <span className="dc-box" aria-hidden="true" />
                  <span>
                    <b>{i + 1}.</b> {t.title}
                  </span>
                </label>
                <div className="dc-text">{t.body}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* 처음엔 흐리게 비활성, 4개 모두 체크하면 활성화 */}
        <footer className="dc-foot">
          <button type="button" className="dc-pay" onClick={onConfirm} disabled={!allChecked}>
            내 GENE설계 할인가로 결제하기
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  )
}
