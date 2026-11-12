import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import './company.css'

/** 순차 등장 지연(ms)을 CSS 변수로 넘김 */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** company-reveal 요소가 화면에 들어오면 company-in을 붙여 차례로 떠오르게 함 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 화면에 들어왔거나, 빠르게 지나쳐 이미 위로 올라간 요소도 보이게 함
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add('company-in')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 },
    )
    root.querySelectorAll('.company-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}

const ICONS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  dna: 'M7 3c0 4.5 10 4.5 10 9s-10 4.5-10 9M17 3c0 4.5-10 4.5-10 9s10 4.5 10 9M8.5 6h7M8.5 18h7',
  family:
    'M7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4.5 21v-8.5A2.5 2.5 0 0 1 7 10a2.5 2.5 0 0 1 2.5 2.5V21M14.5 21v-8.5A2.5 2.5 0 0 1 17 10a2.5 2.5 0 0 1 2.5 2.5V21',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  badge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12l2.5 2.5 4.5-5',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="company-icon"
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

const HISTORY = [
  {
    title: '법인 설립 및 원천 알고리즘 특허 출원',
    desc: '국내 최초 유전체 분석 기반 맞춤형 인슈어테크 플랫폼 법인 설립 및 다인자 질환 위험도-보장금 매칭 알고리즘 핵심 원천 특허를 공식 출원하였습니다.',
  },
  {
    title: 'KDA 프로젝트 1등 수상 (대상)',
    desc: '키움디지털 아카데미 프로젝트에서 우수한 성과를 거두며 심사위원단 만장일치로 1등을 차지했고, 유전체 기반 맞춤 보험 설계 서비스의 완성도와 실현 가능성을 높이 인정받아 대상을 수상했습니다.',
    highlight: true,
  },
  {
    title: '국내 모든 생명보험사 계약 체결',
    desc: '삼성생명, 한화생명, 교보생명 등 국내 주요 생명보험사 전사 API 연동 가이드라인을 수립하고 단일 표준 데이터 커넥터 계약을 일괄 체결하였습니다.',
  },
  {
    title: '대통령상 수상 (대한민국 혁신 부문)',
    desc: '신세대 한국형 바이오 헬스케어 인슈어테크 혁신의 첫걸음을 내디딘 공로를 인정받아, 대한민국 혁신 부문에서 대통령 표창을 수상하며 기술의 공공성과 혁신성을 모두 공식적으로 인정받았습니다.',
    highlight: true,
  },
  {
    title: '글로벌 SaaS 엔진 첫 해외 수출 달성',
    desc: '싱가포르 및 도쿄 소재 글로벌 재보험사 컨소시엄을 대상으로 유전자 질환 보장 모델링 엔진 SaaS 공급 및 라이선스 수출 계약을 최종 성사시켰습니다.',
  },
]

const METRICS = [
  { label: ['유전분석', '정확도'], value: 'A', unit: '등급' },
  { label: ['전문', '연구원'], value: '5', unit: '명' },
  { label: ['파트너십', '보험사'], value: '50', unit: '사' },
]

const ANALYSIS = [
  { icon: ICONS.dna, label: 'DNA 분석' },
  { icon: ICONS.family, label: '가족력 조사' },
  { icon: ICONS.pulse, label: '건강검진 이력 확인' },
]

const CERTS = [
  { icon: ICONS.badge, label: '대통령 표창' },
  { icon: ICONS.db, label: 'K-DATA 1위' },
  { icon: ICONS.bank, label: '50개 보험사' },
  { icon: ICONS.globe, label: 'APAC 글로벌 수출' },
  { icon: ICONS.shield, label: '생명윤리법 준수' },
]

function Company() {
  const pageRef = useReveal()

  return (
    <div ref={pageRef} className="company-page">
      <main className="company-main">
        {/* ---------- 제목 ---------- */}
        <section className="company-intro company-reveal" style={delay(0)}>
          <h1 className="company-title">
            내진(GENE)설계 <em>회사소개</em>
          </h1>
          <p className="company-lead">
            국내 최초 유전체 정밀 분석 엔진과 의학적 임상 근거를 결합하여 보험 시장의 정보
            비대칭성을 해소하는 디지털 헬스케어 인슈어테크 혁신 기업입니다.
          </p>
        </section>

        {/* ---------- 비전 배너 ---------- */}
        <section className="company-vision company-reveal" style={delay(120)}>
          <h2 className="company-quote">“유전자는 운명이 아닌 준비의 지도입니다”</h2>
          <p className="company-vision-text">
            우리는 소비자가 알지 못하는 막연한 공포를 미끼로 보험을 팔지 않습니다.
            <br />
            과학적 유전자 데이터와 의학적 건강기록을 결합하여 불필요한 보장은 걷어내고,
            <br />내 몸이 진정 필요로 하는 대비책만을 합리적으로 선택할 수 있도록 맞춤형 보험
            설계를 제공합니다.
          </p>
        </section>

        <div className="company-grid">
          {/* ---------- 연혁 ---------- */}
          <section className="company-card company-history company-reveal" style={delay(240)}>
            <h2 className="company-card-title">우리 회사 성장 연혁</h2>
            <p className="company-card-sub">
              유전체 데이터 분석 기반 맞춤형 설계 특허 취득부터 대통령 표창과 글로벌 시장
              수출까지, 내진설계가 만들어 온 혁신의 발자취입니다.
            </p>

            <ol className="company-timeline">
              {HISTORY.map((h, i) => (
                <li key={h.title} className="company-reveal" style={delay(360 + i * 110)}>
                  <h3 className={h.highlight ? 'company-highlight' : undefined}>{h.title}</h3>
                  <p>{h.desc}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="company-side">
            {/* ---------- 성과 지표 ---------- */}
            <section className="company-card company-reveal" style={delay(320)}>
              <h2 className="company-side-title">플랫폼 핵심 성과 지표</h2>
              <ul className="company-metrics">
                {METRICS.map((m, i) => (
                  <li key={m.unit} className="company-reveal" style={delay(440 + i * 110)}>
                    <span className="company-metric-label">
                      {m.label[0]}
                      <br />
                      {m.label[1]}
                    </span>
                    <span className="company-metric-value">
                      {m.value}
                      <small>{m.unit}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ---------- 3개 지표 ---------- */}
            <section className="company-card company-reveal" style={delay(400)}>
              <h2 className="company-side-title">3개 지표 통합분석</h2>
              <ul className="company-chips">
                {ANALYSIS.map((a) => (
                  <li key={a.label}>
                    <Icon d={a.icon} />
                    {a.label}
                  </li>
                ))}
              </ul>
            </section>

            {/* ---------- R&D 센터 ---------- */}
            <section className="company-card company-lab company-reveal" style={delay(480)}>
              <h2 className="company-lab-title">자체 유전체 생명공학 R&amp;D 센터 운영</h2>
              <p>
                판교 테크노밸리 제2연구동 소재 유전체 연구소에서 국내 최고 수준의
                생물정보학(Bioinformatics) 연구원진이 진단 모형을 상시 고도화합니다.
              </p>
              <Link to="/lab" className="company-lab-link">
                연구소소개 살펴보기 <Icon d={ICONS.arrow} />
              </Link>
            </section>
          </div>
        </div>

        {/* ---------- 인증 · 파트너십 ---------- */}
        <section className="company-card company-certs company-reveal" style={delay(0)}>
          <h2 className="company-card-title">
            국가 공인 인증 및
            <br />
            글로벌 파트너십 에코시스템
          </h2>
          <ul className="company-cert-list">
            {CERTS.map((c, i) => (
              <li key={c.label} className="company-reveal" style={delay(150 + i * 90)}>
                <Icon d={c.icon} />
                {c.label}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Company
