import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import './insurance_setting.css'

/* ------------------------------------------------------------------ 왼쪽: 건강정보 요약 */

type Risk = '높음' | '주의' | '보통'

type HealthSummary = {
  title: string
  desc: string
  risk: Risk
  color: string
  /** 레이더 차트 축(5개)과 점수(0~100) */
  axes: [string, number][]
}

// TODO: 실제 건강정보 리포트 데이터 연결
const SUMMARIES: HealthSummary[] = [
  {
    title: '암·종양 유전 소인',
    desc: '유방·소화기 계열 유전자 반응이 높게 나타났어요.',
    risk: '높음',
    color: '#b48cff',
    axes: [['유방', 82], ['위', 74], ['대장', 68], ['폐', 41], ['간', 52]],
  },
  {
    title: '심혈관·심근경색',
    desc: '관상동맥 쪽 혈관 탄성이 다소 떨어져 있어요.',
    risk: '주의',
    color: '#ff8a9a',
    axes: [['관상동맥', 71], ['혈관탄성', 64], ['혈중지질', 48], ['혈압반응', 55], ['심근', 38]],
  },
  {
    title: '뇌혈관·신경계',
    desc: '항목 전반이 고르게 중간 이상으로 나타났어요.',
    risk: '주의',
    color: '#ffc457',
    axes: [['뇌졸중', 62], ['뇌동맥류', 58], ['혈전', 60], ['신경전달', 55], ['혈압', 63]],
  },
  {
    title: '대사증후군·당뇨',
    desc: '인슐린 저항성과 당화혈색소가 높은 편이에요.',
    risk: '주의',
    color: '#5ef2a0',
    axes: [['인슐린저항', 69], ['공복혈당', 52], ['당화혈색소', 66], ['체지방', 44], ['중성지방', 47]],
  },
  {
    title: '간·담도 해독 대사',
    desc: '알코올 대사가 느린 체질이에요.',
    risk: '보통',
    color: '#ff9f6b',
    axes: [['알코올대사', 72], ['지방간', 45], ['담즙', 30], ['해독효소', 50], ['간수치', 36]],
  },
  {
    title: '치매·장기케어',
    desc: 'APOE4 관련 인지 기능 조기 관리를 권해요.',
    risk: '보통',
    color: '#6fb8ff',
    axes: [['APOE4', 58], ['기억력', 42], ['수면', 50], ['혈관성', 46], ['신경염증', 40]],
  },
]

/** 그래프가 그려지는 시간(ms). 막대·숫자·레이더가 함께 맞춤 */
const GROW_MS = 1600

/** 0에서 목표 숫자까지 게이지 차듯 올라가는 숫자 */
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function CountUp({ value, delay }: { value: number; delay: number }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0))

  useEffect(() => {
    if (reduceMotion()) return
    let frame = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / GROW_MS, 0), 1)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, delay])

  return <>{shown}</>
}

/** 카드마다 조금씩 늦게 그려지도록 넘기는 지연 시간 */
const growDelay = (ms: number) => ({ '--grow-delay': `${ms}ms` }) as CSSProperties

/** 5각 레이더 차트(모양만). 항목별 수치는 옆 막대 목록에서 읽음 */
function Radar({ axes, color, delay }: { axes: [string, number][]; color: string; delay: number }) {
  const c = 60
  const r = 50
  const point = (i: number, ratio: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length
    return [c + Math.cos(angle) * r * ratio, c + Math.sin(angle) * r * ratio]
  }
  const ring = (ratio: number) => axes.map((_, i) => point(i, ratio).join(',')).join(' ')
  const shape = axes.map(([, v], i) => point(i, v / 100).join(',')).join(' ')

  return (
    <svg className="is-radar" viewBox="0 0 120 120" aria-hidden="true">
      {[1, 0.66, 0.33].map((ratio) => (
        <polygon key={ratio} points={ring(ratio)} className="is-radar-ring" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="is-radar-ring" />
      })}
      {/* 가운데에서 바깥으로 슉 펼쳐짐 */}
      <g className="is-radar-shape" style={growDelay(delay)}>
        <polygon points={shape} fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2" />
        {axes.map(([, v], i) => {
          const [x, y] = point(i, v / 100)
          return <circle key={i} cx={x} cy={y} r="1.5" fill={color} />
        })}
      </g>
    </svg>
  )
}

/** 항목 이름 · 막대 · 점수를 한 줄씩 보여줌 */
function Bars({ axes, color, delay }: { axes: [string, number][]; color: string; delay: number }) {
  return (
    <ul className="is-bars">
      {axes.map(([label, v], i) => (
        <li key={label}>
          <span className="is-bar-label">{label}</span>
          <span className="is-bar-track">
            <span style={{ width: `${v}%`, background: color, ...growDelay(delay + i * 60) }} />
          </span>
          <b>
            <CountUp value={v} delay={delay + i * 60} />
          </b>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ 오른쪽: 보험 추천 */

type Product = {
  insurer: string
  name: string
  tags: string[]
  /** 청록색으로 강조할 특징 */
  highlight?: string
  premium: number
  /** 적합도(%) — 추천순 기준 */
  fit: number
  /** 보장 범위 점수(0~100) */
  coverage: number
  /** 최근 1개월 / 6개월 가입 수 */
  pop1m: number
  pop6m: number
}

type Category = { name: string; products: Product[] }

const SORTS = [
  { key: 'recommend', label: '추천순(기본)' },
  { key: 'priceLow', label: '보험료 낮은 순' },
  { key: 'priceHigh', label: '보험료 높은 순' },
  { key: 'coverage', label: '보장 범위 넓은 순' },
  { key: 'pop1m', label: '인기 순(최근 1개월 내)' },
  { key: 'pop6m', label: '인기 순(최근 6개월 내)' },
] as const

type SortKey = (typeof SORTS)[number]['key']

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  recommend: (a, b) => b.fit - a.fit,
  priceLow: (a, b) => a.premium - b.premium,
  priceHigh: (a, b) => b.premium - a.premium,
  coverage: (a, b) => b.coverage - a.coverage,
  pop1m: (a, b) => b.pop1m - a.pop1m,
  pop6m: (a, b) => b.pop6m - a.pop6m,
}

/** 카테고리마다 이 수만큼만 골라서 보여줌 */
const SHOW_COUNT = 3

// TODO: 추천 API 연결. 지금은 정렬 기준이 바뀌면 후보 중에서 다시 골라 보여줌
const CATEGORIES: Category[] = [
  {
    name: '암보험',
    products: [
      { insurer: '보험사D', name: '(무)GENE 위암 집중 표적치료', tags: ['위암 진단비 1억', '표적항암약물 허가치료'], highlight: '비갱신형', premium: 38200, fit: 98.2, coverage: 88, pop1m: 412, pop6m: 2210 },
      { insurer: '보험사B', name: '위암 조기진단·내시경 시술케어', tags: ['위 점막하 절제술(ESD)', '소화기질환 정밀보장', '20년만기 갱신'], premium: 37600, fit: 94.6, coverage: 72, pop1m: 530, pop6m: 1980 },
      { insurer: '보험사F', name: '소화기암 다이렉트 실속보장보험', tags: ['위·식도·십이지장', '항암방사선 치료비', '온라인 전용할인'], premium: 41900, fit: 91.8, coverage: 80, pop1m: 288, pop6m: 2460 },
      { insurer: '보험사A', name: '위·대장 통합 암케어 플랜', tags: ['소화기암 진단비 7천', '재진단암 보장'], premium: 45300, fit: 89.4, coverage: 92, pop1m: 196, pop6m: 1320 },
      { insurer: '보험사E', name: '위암 간편심사 실속보험', tags: ['간편고지', '위암 진단비 5천'], premium: 29800, fit: 86.1, coverage: 58, pop1m: 610, pop6m: 1740 },
      { insurer: '보험사A', name: '(무)GENE 핑크케어 유방정밀표적', tags: ['유방암 진단 8천', 'PARP 억제제 표적항암'], highlight: '100세만기 비갱신', premium: 40300, fit: 99.1, coverage: 90, pop1m: 498, pop6m: 2890 },
      { insurer: '보험사E', name: '유방암 로봇수술·유방재건 특화플랜', tags: ['다빈치 로봇수술 2천', '유방재건 성형보장', '무해지환급형'], premium: 35800, fit: 95.3, coverage: 78, pop1m: 365, pop6m: 1650 },
      { insurer: '보험사C', name: '여성특정암 간편케어 건강보험', tags: ['유방·난소·자궁암', '초기 유방암 수술비', '간편심사'], premium: 39200, fit: 92.0, coverage: 84, pop1m: 552, pop6m: 2140 },
      { insurer: '보험사D', name: '유방암 재발 방지 관리보험', tags: ['재진단암 보장', '호르몬치료비'], premium: 43800, fit: 88.7, coverage: 86, pop1m: 210, pop6m: 1190 },
      { insurer: '보험사B', name: '여성 3대암 실속 다이렉트', tags: ['온라인 전용할인', '유방암 진단 5천'], premium: 27400, fit: 85.2, coverage: 61, pop1m: 640, pop6m: 1880 },
      { insurer: '보험사C', name: '(무)GENE 대장암 올케어 표적항암', tags: ['대장점막내암 일반암동일', '면역항암 1억'], highlight: '비갱신형', premium: 41500, fit: 97.9, coverage: 91, pop1m: 388, pop6m: 2050 },
      { insurer: '보험사F', name: '대장용종절제 및 대장암 집중보장', tags: ['용종제거 연간 30만', '인공항문 케어급여', '20년납'], premium: 43200, fit: 93.7, coverage: 85, pop1m: 301, pop6m: 1730 },
      { insurer: '보험사A', name: '정밀대장암 스마트케어 암보험', tags: ['유전자 검사연계 할인', '항암세기조절 방사선', '순수보장형'], premium: 34300, fit: 90.4, coverage: 74, pop1m: 476, pop6m: 1610 },
      { insurer: '보험사B', name: '소화기 내시경 실속보험', tags: ['대장내시경 수술비', '간편고지'], premium: 26900, fit: 87.6, coverage: 55, pop1m: 590, pop6m: 1440 },
      { insurer: '보험사E', name: '대장암 재진단 장기케어', tags: ['재진단암 3회', '요양급여 연계'], premium: 46100, fit: 86.3, coverage: 89, pop1m: 154, pop6m: 980 },
    ],
  },
  {
    name: '심혈관보험',
    products: [
      { insurer: '보험사E', name: '(무)GENE 뇌혈관 통합케어', tags: ['뇌혈관질환 I60~I69 전범위', '혈전용해치료비 3천'], highlight: '비갱신형', premium: 51900, fit: 96.5, coverage: 94, pop1m: 342, pop6m: 2380 },
      { insurer: '보험사B', name: '스마트 뇌동맥류 코일색전술 특화', tags: ['비파열 뇌동맥류 수술 2천', '혈관조영술 지원', '환급형'], premium: 26500, fit: 93.8, coverage: 66, pop1m: 451, pop6m: 1590 },
      { insurer: '보험사D', name: '뇌혈관·심장 2대질환 종합보장보험', tags: ['중증 뇌경색 후유장해', '재활 재택치료비', '간편가입'], premium: 38200, fit: 90.1, coverage: 87, pop1m: 389, pop6m: 2010 },
      { insurer: '보험사A', name: '뇌졸중 간병 실속플랜', tags: ['간병인 지원일당', '뇌졸중 진단 3천'], premium: 31800, fit: 87.9, coverage: 71, pop1m: 268, pop6m: 1270 },
      { insurer: '보험사C', name: '뇌혈관 다이렉트 미니보험', tags: ['월 보험료 부담 최소화', '온라인 전용'], premium: 18900, fit: 84.5, coverage: 48, pop1m: 702, pop6m: 1950 },
    ],
  },
  {
    name: '치아보험',
    products: [
      { insurer: '보험사F', name: '(무)든든한 백세 치아간병 평생보장', tags: ['경도치매 1,000만', '간병일당 15만'], highlight: '비갱신형', premium: 38700, fit: 96.8, coverage: 89, pop1m: 377, pop6m: 2290 },
      { insurer: '보험사D', name: '스마트 치아 솔루션보험', tags: ['환급형'], premium: 41200, fit: 93.1, coverage: 86, pop1m: 298, pop6m: 1660 },
      { insurer: '보험사E', name: '노후안심 치아 보험', tags: ['방문요양 서비스', '85세 순수보장'], premium: 34500, fit: 89.9, coverage: 79, pop1m: 425, pop6m: 1940 },
      { insurer: '보험사A', name: '임플란트·브릿지 실속 치아보험', tags: ['임플란트 개당 150만', '크라운 30만'], premium: 27600, fit: 87.4, coverage: 64, pop1m: 512, pop6m: 1400 },
      { insurer: '보험사B', name: '치아 통합케어 플랜', tags: ['보존치료 연 3회', '납입면제'], premium: 45900, fit: 85.8, coverage: 93, pop1m: 184, pop6m: 1050 },
    ],
  },
]

const won = (n: number) => n.toLocaleString('ko-KR')

function CategoryBlock({ category }: { category: Category }) {
  const [sort, setSort] = useState<SortKey>('recommend')
  const shown = useMemo(
    () => [...category.products].sort(SORTERS[sort]).slice(0, SHOW_COUNT),
    [category.products, sort],
  )
  const selectId = `is-sort-${category.name}`

  return (
    <section className="is-category">
      <div className="is-category-side">
        <h3>{category.name}</h3>
        <label htmlFor={selectId} className="is-sort">
          <span className="is-sr">{category.name} 정렬 기준</span>
          <select id={selectId} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 정렬이 바뀌면 key가 바뀌어 목록이 다시 떠오르듯 나타남 */}
      <ul className="is-products" key={sort}>
        {shown.map((p, i) => (
          <li key={p.name} className="is-product" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="is-product-head">
              <span>{p.insurer}</span>
              <span>
                적합도 <b>{p.fit}%</b>
              </span>
            </div>
            <h4>{p.name}</h4>
            <ul className="is-tags">
              {p.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
              {p.highlight && <li className="is-tag-hl">{p.highlight}</li>}
            </ul>
            <p className="is-price">
              월 <strong>{won(p.premium)}</strong> 원
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function InsuranceSetting() {
  return (
    <div className="is-page">
      <div className="is-wrap">
        <div className="is-titlebar">
          <h1>GENE 보험설계</h1>
          {/* 서버 리포트(PDF)가 생기기 전까지는 이 화면을 인쇄·PDF 저장 */}
          <button type="button" className="is-download" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            리포트 다운로드
          </button>
        </div>

        <div className="is-layout">
          {/* ---------- 왼쪽: 고정 ---------- */}
          <section className="is-panel is-summary">
            <h2>건강정보 리포트 중 중요내용 요약</h2>
            <ul className="is-summary-grid">
              {SUMMARIES.map((s, i) => (
                <li key={s.title}>
                  <div className="is-summary-head">
                    <h3>
                      <span>{i + 1}</span>
                      {s.title}
                    </h3>
                    <em className={`is-risk is-risk-${s.risk === '높음' ? 'high' : s.risk === '주의' ? 'mid' : 'low'}`}>{s.risk}</em>
                  </div>
                  <p>{s.desc}</p>
                  <div className="is-summary-body">
                    <Radar axes={s.axes} color={s.color} delay={700 + i * 150} />
                    <Bars axes={s.axes} color={s.color} delay={700 + i * 150} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- 오른쪽: 이 영역만 스크롤 ---------- */}
          <section className="is-panel is-recommend">
            <h2>내 GENE에 적합한 보험이에요</h2>
            <div className="is-scroll">
              {CATEGORIES.map((c) => (
                <CategoryBlock key={c.name} category={c} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default InsuranceSetting
