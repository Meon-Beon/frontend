import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
// STEP 표시에만 쓰는 둥근 글꼴
import '@fontsource/nunito/800.css'
import styles from './style.module.css'
import DNA_check from '../DNA_check/DNA_check'

/** 순차 등장 지연(ms)을 CSS 변수로 넘김 */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

// 꼭 지켜야 할 부분은 <b>로 감싸 흰색으로 강조
const STEPS: { title: string; desc: ReactNode }[] = [
  {
    title: '키트 수령 및 검사 준비',
    desc: (
      <>
        밀봉 DTC 채취 키트를 자택으로 배송받습니다. 채취 전 <b>30분간</b> 음식물 섭취 및 양치를
        삼가주세요.
      </>
    ),
  },
  {
    title: '타액(구강상피세포) 채취',
    desc: (
      <>
        키트를 개봉하여 멸균 면봉 및 채취 튜브에 타액을 <b>표시선</b>까지 묻힙니다. 손이나 이물질이{' '}
        <b>닿지 않도록</b> 주의합니다.
      </>
    ),
  },
  {
    title: '보존 용기 밀봉 & 보관',
    desc: (
      <>
        동봉된 유전자 보존액을 넣고 뚜껑을 <b>딸깍</b> 소리가 날 때까지 닫은 뒤, 10회 흔들어 밀봉
        비닐백에 포장합니다.
      </>
    ),
  },
  {
    title: '반송 접수 및 연구소 전달',
    desc: '반송 송장을 부착하여 반송함에 넣거나 기사 방문 수거를 신청합니다. 연구소 도착 즉시 정밀 분석이 시작됩니다.',
  },
]

const BENEFITS = [
  {
    title: '주요 4대 질환 및 암 유전적 취약도 정밀 분석',
    desc: '위·대장·간·폐암과 심뇌혈관 질환의 유전적 위험도를 한눈에 파악합니다.',
  },
  {
    title: '생활습관형 대사 지표 (혈당, 혈압, 비만 등)',
    desc: '카페인·비타민 대사 등 체질에 맞춘 영양·운동 솔루션을 제시합니다.',
  },
  {
    title: '내 유전체 맞춤형 보험 보장 분석 (과부족 진단)',
    desc: '필요한 특약은 강화하고 중복 보장은 줄인 맞춤 리포트를 제공합니다.',
  },
  {
    title: '보건복지부 DTC 인증 연구소 정밀 분석',
    desc: '질병관리청 승인 기관의 공인 시스템으로 99.9% 신뢰도를 보장합니다.',
  },
]

/** 화면에 들어오면 차례로 떠오르게 함 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add(styles.in)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1 },
    )
    root.querySelectorAll(`.${styles.reveal}`).forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}

/** 고정 헤더 높이와, 화면이 낮을 때 헤더 아래로 남길 최소 여백 */
const HEADER_HEIGHT = 96
const MIN_GAP = 16

/**
 * 오른쪽 열을 화면 세로 정가운데에 딱 고정함(CSS sticky).
 * 가운데 위치는 열 높이·화면 높이에 따라 달라서 여기서 계산해 --sticky-top으로 넘김.
 */
function useCenteredSticky() {
  const colRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const col = colRef.current
    if (!col) return

    const update = () => {
      // 화면 전체 기준 정가운데. 화면이 낮으면 헤더에 가리지 않도록 헤더 바로 아래
      const center = (window.innerHeight - col.offsetHeight) / 2
      const top = Math.max(center, HEADER_HEIGHT + MIN_GAP)
      col.style.setProperty('--sticky-top', `${Math.round(top)}px`)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(col)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return colRef
}

function DnaApply() {
  const pageRef = useReveal()
  const colRef = useCenteredSticky()
  const [consentOpen, setConsentOpen] = useState(false)
  const closeConsent = useCallback(() => setConsentOpen(false), [])

  return (
    <div ref={pageRef} className={styles.page}>
      <main className={styles.main}>
        <h1 className={`${styles.title} ${styles.reveal}`} style={delay(0)}>
          DNA 검사 신청
        </h1>

        <div className={styles.grid}>
          {/* ---------- 왼쪽: 절차 · 확인할 수 있는 것 ---------- */}
          <div className={styles.col}>
            <section className={`${styles.card} ${styles.reveal}`} style={delay(100)}>
              <h2 className={styles.cardTitle}>DNA 검사 절차</h2>
              <ol className={styles.steps}>
                {STEPS.map((s, i) => (
                  <li key={s.title} className={styles.reveal} style={delay(200 + i * 90)}>
                    <span className={styles.stepLabel}>STEP {i + 1}</span>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className={`${styles.card} ${styles.reveal}`} style={delay(0)}>
              <h2 className={styles.cardTitle}>DNA 검사로 확인할 수 있는 것</h2>
              <ul className={styles.benefits}>
                {BENEFITS.map((b, i) => (
                  <li key={b.title} className={styles.reveal} style={delay(120 + i * 90)}>
                    <h3>{b.title}</h3>
                    <p>{b.desc}</p>
                  </li>
                ))}
              </ul>
              <p className={styles.medical}>
                “본 서비스는 의료기관의 진료를 대체할 수 없으며, 발병 여부를 확진하지 않습니다.”
              </p>
            </section>
          </div>

          {/* ---------- 오른쪽: 유의사항 · 가격 (스크롤해도 화면 가운데에 고정) ---------- */}
          <div ref={colRef} className={`${styles.col} ${styles.follow}`}>
            <section className={`${styles.card} ${styles.reveal}`} style={delay(160)}>
              <h2 className={styles.cardTitle}>유의사항</h2>
              <div className={styles.notice}>
                <p>
                  검체 채취 시 <b className={styles.warn}>오염되지 않아야 합니다.</b> 면봉 끝을 손으로
                  만지거나 이물질이 들어갈 경우 유전자 증폭이 실패하거나 결과가 연구소에서 시행하는
                  것보다 정확하지 않을 수 있습니다.
                </p>
                <p>
                  <b className={styles.must}>개인정보 및 민감정보 제3자 제공 동의를 반드시 완료</b>
                  하셔야만 유전자 분석 검사 진행 및 리포트 열람이 가능합니다.
                </p>
              </div>
            </section>

            <section className={`${styles.card} ${styles.price} ${styles.reveal}`} style={delay(260)}>
              <span className={styles.product}>DTC 유전자 96종 종합 분석 키트 + 리포트</span>
              <p className={styles.amount}>
                <s>정상가 150,000원</s>
                <strong>
                  50,000<small>원</small>
                </strong>
              </p>
              {/* 4-1 약관동의 → (예정) 4-2 결제방식 → 4-3 결제완료 */}
              <button type="button" className={styles.cta} onClick={() => setConsentOpen(true)}>
                유전자 검사하고 종합 리포트 받기
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* TODO: 결제하기 → 4-2 결제방식(DNA_paymethod) 팝업 연결. 지금은 동의창만 닫힘 */}
      <DNA_check open={consentOpen} onClose={closeConsent} onConfirm={closeConsent} />
    </div>
  )
}

export default DnaApply
