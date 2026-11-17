import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
// STEP 표시에만 쓰는 둥근 글꼴
import '@fontsource/nunito/800.css'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { confirmDnaPayment, createDnaOrder, errorMessage } from '../../api/dna'
import { readUser } from '../../auth/session'
import styles from './style.module.css'
import DNA_check from '../DNA_check/DNA_check'
import DNA_paycomplete, { type PayState } from '../DNA_paycomplete/DNA_paycomplete'

/* ---------- 토스페이먼츠 결제창(결제창형 결제위젯) ---------- */
// 본인 키를 쓰려면 frontend/.env 에 VITE_TOSS_CLIENT_KEY=test_gck_... 를 넣으면 됨
// 기본값은 토스 문서 공개용 테스트 키라 실제로 돈이 빠져나가지 않음
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'

/**
 * 1) 서버에 주문 생성 → 2) 토스 결제창 표시 → 3) 구매자가 결제하기를 누르면 결제 요청
 * 주문번호와 금액은 서버가 정한 값을 써야 승인 단계에서 금액 검증을 할 수 있음
 */
async function openTossPayment() {
  const order = await createDnaOrder(readUser()?.id)

  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
  // 아직 회원 결제 연동 전이라 비회원(ANONYMOUS)으로 결제
  const widgets = tossPayments.widgets({ customerKey: ANONYMOUS })

  // 금액은 결제창을 그리기 전에 먼저 설정해야 함
  await widgets.setAmount({ currency: 'KRW', value: order.amount })

  const paymentWindow = await widgets.renderPaymentWindow({
    orderName: order.order_name,
    variantKey: { paymentMethod: 'DEFAULT', agreement: 'AGREEMENT' },
  })

  paymentWindow.on('paymentRequest', async () => {
    try {
      // 결제 성공/실패 시 이 페이지로 돌아오며 쿼리스트링에 결과가 붙음
      // 성공: ?payment=success&paymentKey=...&orderId=...&amount=...
      // 실패: ?payment=fail&code=...&message=...&orderId=...
      const back = `${window.location.origin}/dna-apply`
      await widgets.requestPayment({
        orderId: order.order_id,
        orderName: order.order_name,
        successUrl: `${back}?payment=success`,
        failUrl: `${back}?payment=fail`,
      })
    } catch (error) {
      console.error('[토스 결제 요청 실패]', error)
    }
  })

  paymentWindow.on('cancel', async () => {
    console.log('[토스 결제] 구매자가 결제창을 닫음')
  })
}

/** 결제 후 돌아온 주소(쿼리스트링)를 보고 결제완료 팝업의 첫 상태를 정함 */
function initialPayState(params: URLSearchParams): PayState | null {
  const result = params.get('payment')
  if (result === 'success') {
    const ok = params.get('paymentKey') && params.get('orderId') && Number(params.get('amount'))
    return ok ? { status: 'confirming' } : { status: 'error', message: '결제 정보가 올바르지 않아요.' }
  }
  if (result === 'fail') {
    // 구매자가 직접 취소한 경우는 오류로 보여주지 않음
    if (params.get('code') === 'PAY_PROCESS_CANCELED') return null
    return { status: 'error', message: params.get('message') ?? '결제에 실패했어요.' }
  }
  return null
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  // 4-3 결제완료 팝업 상태 (null이면 닫힘)
  const [payState, setPayState] = useState(() => initialPayState(searchParams))
  const closePayState = useCallback(() => setPayState(null), [])
  const confirmedRef = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()

  // 약관 모두 동의 → 결제하기: 동의창을 닫고 토스 결제창을 띄움
  const startPayment = useCallback(() => {
    setConsentOpen(false)

    // 로그인 안 했으면 결제 대신 로그인 페이지로. 로그인하면 이 페이지로 다시 돌아옴 (Login.tsx의 getRedirectPath)
    if (!readUser()) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }

    openTossPayment().catch((error) => {
      console.error('[토스 결제창 열기 실패]', error)
      setPayState({
        status: 'error',
        message: errorMessage(error, '결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.'),
      })
    })
  }, [navigate, location])

  // 결제 성공으로 돌아왔으면 서버에 승인 요청 → 결과를 결제완료 팝업에 표시
  useEffect(() => {
    if (!searchParams.get('payment')) return
    // 새로고침해도 다시 처리하지 않도록 주소의 쿼리스트링을 지움
    setSearchParams({}, { replace: true })

    // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 승인은 한 번만 요청
    if (searchParams.get('payment') !== 'success' || confirmedRef.current) return
    confirmedRef.current = true

    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = Number(searchParams.get('amount'))
    // 값이 빠졌으면 initialPayState에서 이미 오류 팝업으로 처리됨
    if (!paymentKey || !orderId || !amount) return

    confirmDnaPayment({ payment_key: paymentKey, order_id: orderId, amount })
      .then((result) => setPayState({ status: 'done', result }))
      .catch((error) =>
        setPayState({
          status: 'error',
          message: errorMessage(error, '결제 승인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'),
        }),
      )
  }, [searchParams, setSearchParams])

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
              {/* 4-1 약관동의 → 4-2 토스 결제창 → 4-3 결제완료 */}
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

      {/* 결제하기 → 동의창 닫고 토스 결제창 */}
      <DNA_check open={consentOpen} onClose={closeConsent} onConfirm={startPayment} />
      <DNA_paycomplete state={payState} onClose={closePayState} />
    </div>
  )
}

export default DnaApply
