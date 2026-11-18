import { useEffect, useState, type ReactNode } from 'react'
import './DNA_check.css'

/* 4-1 약관동의 팝업 — DNA 검사 신청 화면의 "유전자 검사하고 종합 리포트 받기"에서 열림 */

/** accent: 제목을 민트로 강조할 항목 */
type Term = { title: string; body: ReactNode; accent?: boolean }

const TERMS: Term[] = [
  {
    title: '유전자 검사 결과의 의학적 한계 및 면책에 대한 동의',
    body: (
      <>
        <p>
          본 검사는 질병의 진단이나 확진을 목적으로 하는 의학적 진단 서비스가 아닙니다. 유전자 분석 결과는 통계적
          확률에 기반한 질병 발생 위험도를 나타내며, 개인의 건강 상태를 이해하고 관리하기 위한 참고 자료로 활용됩니다.
        </p>
        <p>
          본 서비스는 유전자 분석 결과와 건강검진 정보를 종합하여 의료진의 전문적 소견을 제공하지만, 이는 특정 질병의
          발병 여부를 확정하거나 향후 발병을 보장하는 것이 아닙니다. 따라서 분석 결과는 참고용으로 활용되어야 하며,
          당사는 검사 결과에 대한 개인의 자의적인 해석이나 이에 따른 건강 관리 결과에 대해 관련 법령상 허용되는 범위
          내에서만 책임을 제한합니다.
        </p>
      </>
    ),
  },
  {
    title: '민감정보(유전정보) 수집 및 이용 동의',
    body: (
      <>
        <p>
          본 서비스는 유전자 분석 및 맞춤형 건강 리포트 제공을 위해 유전정보 등 민감정보를 수집·이용합니다.{' '}
          <b>유전자 검사는 제휴 전문 검사기관인 제노플랜코리아에서 수행하며</b>, 검사 결과는 이용자의 건강검진 정보와
          결합하여 맞춤형 리포트 및 보험 포트폴리오 추천에 활용됩니다.
        </p>
        <ul>
          <li>
            <b>수집 및 이용 목적:</b> 제노플랜코리아를 통한 유전자 분석, 맞춤형 건강 리포트 생성 및 보험 포트폴리오
            추천
          </li>
          <li>
            <b>유전자 검사 수행기관:</b> 제노플랜코리아
          </li>
          <li>
            <b>보유 및 이용 기간:</b> 서비스 제공 목적 달성 시까지 보유하며, 관련 법령에 따른 보존 의무가 있는 경우 해당
            기간 동안 보관 후 안전하게 파기합니다.
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
  {
    title: '[필수] 제휴 의료기관 비대면진료 동의',
    accent: true,
    body: (
      <>
        <p>
          내진설계의 유전자 검사는 질병 위험 정보를 포함하므로, <b>「생명윤리 및 안전에 관한 법률」 제50조 제3항</b>에
          따라 의료기관의 의뢰를 통해서만 시행됩니다. 본 항목에 동의하시면 선택하신 제휴 의료기관의 비대면진료(화상
          혹은 전화 상담) 예약이 신청되며, 검사 키트는 진료 후 의사의 검사 의뢰가 완료된 뒤 발송됩니다.
        </p>
        <p>
          검사 여부와 검사 항목은 담당 의사가 진료 후 결정하며, 검사 전 별도의 설명과 서면 동의 절차가 진행됩니다.
          의사가 검사를 진행하지 않기로 판단한 경우 결제 금액은 <b>[환불 정책]</b>에 따라 처리됩니다. 본 항목에
          동의하지 않으시면 서비스를 이용하실 수 없습니다.
        </p>
      </>
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
                  <span className={t.accent ? 'dc-title-accent' : undefined}>
                    <b>{i + 1}.</b> {t.title}
                  </span>
                </label>
                <div className="dc-text">{t.body}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* 처음엔 흐리게 비활성, 모든 항목을 체크하면 활성화 */}
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
