import { useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import './event.css'

/* EVENT — 11월의 이벤트: 내 GENE 체질 테스트. 유전형을 누르거나 뽑아서 술·담배·살 체질을 재미로 보는 화면 */

type Trait = {
  id: 'alc' | 'nic' | 'fat'
  name: string
  gene: string
  gts: [string, string, string]
  /** 한국인 유전형 비율(%) */
  kr: [number, number, number]
  /** 세계 평균 데이터(미국·영국 PGP 참가자) 수 */
  worldN: [number, number, number]
  verdicts: [string, string, string]
  descs: [string, string, string]
  stamps: [string, string, string]
  twist: string
}

const TRAITS: Trait[] = [
  {
    id: 'alc',
    name: '술 체질',
    gene: 'ALDH2 · rs671',
    gts: ['GG', 'AG', 'AA'],
    kr: [70.8, 26.7, 2.5],
    worldN: [417, 1, 0],
    verdicts: ['술 분해 정상형', '한 잔에 홍당무형', '타고난 알쓰형'],
    descs: [
      '얼굴은 멀쩡해서 더 마시게 되는 타입. 대신 간은 정직하게 일하고 있어요.',
      '알코올이 바뀐 독성물질(아세트알데하이드)을 잘 못 치워요. 빨개지는 얼굴은 몸의 경고등.',
      '분해 효소가 거의 일을 안 해요. 소주 반 잔에도 심장이 쿵쾅거리는 체질.',
    ],
    stamps: ['무난', '경고', '판정 완료'],
    twist: '서양인 418명 중 술에 약한 유전자를 가진 사람은 단\u00a01명. 한국인은 10명 중 약\u00a03명이에요.',
  },
  {
    id: 'nic',
    name: '니코틴 체질',
    gene: 'CHRNA5 · rs16969968',
    gts: ['GG', 'AG', 'AA'],
    kr: [94.1, 5.8, 0.1],
    worldN: [198, 162, 54],
    verdicts: ['니코틴 덤덤형', '한 대가 두 대 되는 형', '금연 난이도 최상형'],
    descs: [
      '니코틴에 덜 끌리는 편. 피워도 "한 대 더"를 덜 찾는 쪽이에요.',
      '니코틴 수용체가 조금 둔해서 같은 만족을 위해 더 피우는 경향이 있어요.',
      '하루 개비 수가 늘기 쉬운 체질. 처음부터 안 피우는 게 가장 큰 이득이에요.',
    ],
    stamps: ['무난', '주의', '경고'],
    twist: '서양인은 절반 넘게 니코틴에 끌리는 유전자를 갖고 있지만, 한국인은 100명 중 6명꼴이에요.',
  },
  {
    id: 'fat',
    name: '살찌는 체질',
    gene: 'FTO · rs9939609',
    gts: ['TT', 'AT', 'AA'],
    kr: [72.3, 25.5, 2.3],
    worldN: [153, 187, 71],
    verdicts: ['살 덜 찌는 형', '살짝 찌는 형', '물만 먹어도 찌는 형(?)'],
    descs: [
      '살이 쪘다면 유전자 탓은 못 해요. 범인은 야식일 확률이 높아요.',
      '위험 유전자 1개. 평균보다 BMI가 살짝 높아지는 경향이 있어요.',
      '살찌기 쉬운 유전자 2개. 식욕·포만감과 관련된 유전자라 간식 앞에서 의지가 약해지기 쉬워요.',
    ],
    stamps: ['무난', '주의', '경고'],
    twist: '위험 유전자 2개(AA)인 사람이 서양인은 17%, 한국인은 약 2%예요.',
  },
]

/** 세계 평균 데이터 참가자의 실제 유전형 조합(술|니코틴|살)과 그 조합의 사람 수 */
const WORLD_COMBOS: Record<string, number> = {
  'GG|AG|AA': 28,
  'GG|AG|AT': 71,
  'GG|GG|AT': 91,
  'GG|GG|TT': 69,
  'GG|AG|TT': 63,
  'GG|AA|AT': 24,
  'GG|AA|TT': 21,
  'GG|GG|AA': 35,
  'GG|AA|AA': 8,
  'AG|GG|AT': 1,
}

/** 유전형 설명: 체질마다 두 글자가 무슨 뜻인지. calm은 체질이 약하게, strong은 강하게 나타나는 유전자 */
const GUIDE: Record<
  Trait['id'],
  { tab: string; calm: string; strong: string; legend: [string, string]; titles: [string, string, string]; meter: string }
> = {
  alc: {
    tab: '술',
    calm: 'G',
    strong: 'A',
    legend: ['술에 강한 유전자', '술에 약하게 만드는 유전자'],
    titles: ['술에 강해요', '술에 약한 편이에요', '술에 아주 약해요'],
    meter: '술에 약한 정도',
  },
  nic: {
    tab: '담배',
    calm: 'G',
    strong: 'A',
    legend: ['니코틴에 덤덤한 유전자', '니코틴에 끌리게 하는 유전자'],
    titles: ['니코틴에 덤덤해요', '조금 끌리는 편이에요', '강하게 끌려요'],
    meter: '니코틴에 끌리는 정도',
  },
  fat: {
    tab: '살',
    calm: 'T',
    strong: 'A',
    legend: ['살이 덜 찌는 유전자', '살찌기 쉽게 하는 유전자'],
    titles: ['살이 잘 안 쪄요', '조금 찌는 편이에요', '잘 찌는 편이에요'],
    meter: '살찌기 쉬운 정도',
  },
}

/** 기능 설명: 화면 사용법 세 단계 */
const HOW_TO = [
  { title: '데이터 뽑기', desc: '한국인·서양인 중 한 명을 뽑아요' },
  { title: '유형 자동 선택', desc: '그 사람의 GG·AG·AA가 카드에 바로 눌려요' },
  { title: '비율 보기', desc: '아래 막대로 그 유형이 얼마나 흔한지 봐요' },
]

const BRIDGE = [
  { title: '홍당무형 + 음주 → 식도암', desc: '술에 약한 유전자(ALDH2)를 가진 동아시아인에게서 식도암과의 연관이 보고됐어요.' },
  { title: '니코틴 A형 → 폐암', desc: '니코틴에 끌리는 유전자(CHRNA5)는 흡연량 증가, 폐암 감수성과 함께 보고돼요.' },
  {
    title: '살찌는 A형 → 비만·당뇨',
    desc: '대립유전자 하나당 비만 위험 약 1.25배, 제2형 당뇨 약 1.15배(동·남아시아인 메타분석).',
  },
]

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const share = (n: number, all: number[]) => (sum(all) ? (n / sum(all)) * 100 : 0)
/** 1% 미만은 소수점 한 자리, 나머지는 반올림 */
const fmt = (x: number) => (x < 1 && x > 0 ? x.toFixed(1) : String(Math.round(x)))

/** 가장 많은 유형의 자리 */
const mostCommon = (weights: number[]) => weights.indexOf(Math.max(...weights))

/** 가중치 비율대로 하나를 뽑음 */
function pick(weights: number[]) {
  let r = Math.random() * sum(weights)
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

/* ---------- 체질별 그림 ---------- */

/** 술: 유전형에 따라 빨개지는 얼굴 + 소주병 */
function Face({ lv }: { lv: number }) {
  const skin = ['#f3d2b5', '#f29a8c', '#e2463f'][lv]
  const blush = [0.15, 0.5, 0.8][lv]
  const mouth = ['M134 122q16 12 32 0', 'M136 124q14 6 28 0', 'M136 126q7-8 14 0t14 0'][lv]
  return (
    <>
      <ellipse cx="150" cy="178" rx="70" ry="7" fill="#000" opacity=".25" />
      <circle className="event-skin" cx="150" cy="100" r="62" fill={skin} />
      <path d="M98 120a62 62 0 0 0 104 0a70 70 0 0 1-104 0z" fill="#000" opacity=".07" />
      <ellipse cx="118" cy="114" rx="13" ry="8" fill="#e2463f" opacity={blush} />
      <ellipse cx="182" cy="114" rx="13" ry="8" fill="#e2463f" opacity={blush} />
      {lv < 2 ? (
        <>
          <circle cx="128" cy="92" r="5" fill="#222" />
          <circle cx="172" cy="92" r="5" fill="#222" />
        </>
      ) : (
        <>
          <path d="M120 92a8 8 0 1 0 16 0a5 5 0 1 0-10 0" fill="none" stroke="#222" strokeWidth="3" />
          <path d="M164 92a8 8 0 1 0 16 0a5 5 0 1 0-10 0" fill="none" stroke="#222" strokeWidth="3" />
        </>
      )}
      <path d={mouth} fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
      {lv === 2 && (
        <>
          <path d="M204 70q8 12 0 18q-8-6 0-18z" fill="#7cc4f2" />
          <path d="M90 60q6 9 0 14q-6-5 0-14z" fill="#7cc4f2" />
        </>
      )}
      <g transform="translate(236 96)">
        <path d="M0 0h30l-4 66h-22z" fill="#3fb37f" opacity=".85" />
        <path d="M3 30h24l-2 34h-20z" fill="#fff" opacity=".55" />
        <rect x="-2" y="-4" width="34" height="6" rx="2" fill="#3fb37f" />
      </g>
    </>
  )
}

/** 니코틴: 유전형이 무거울수록 담배에 감기는 사슬과 연기 */
function Cigarette({ lv }: { lv: number }) {
  return (
    <>
      <ellipse cx="150" cy="176" rx="110" ry="7" fill="#000" opacity=".25" />
      <rect x="40" y="96" width="170" height="26" rx="4" fill="#fbfaf6" />
      <rect x="40" y="96" width="52" height="26" rx="4" fill="#e6a35c" />
      <rect x="40" y="114" width="170" height="8" fill="#000" opacity=".06" />
      <rect x="210" y="96" width="16" height="26" rx="3" fill="#8a8a8a" />
      <circle cx="226" cy="109" r="7" fill="var(--risk)" opacity=".9" />
      {Array.from({ length: 2 + lv * 2 }, (_, k) => (
        <circle key={`s${k}`} cx={236 + k * 6 + (k % 2 ? 8 : -6)} cy={78 - k * 14} r={8 + k * 2} fill="#8892a5" opacity={0.4 - k * 0.04} />
      ))}
      {Array.from({ length: lv * 3 }, (_, k) => {
        const cx = 64 + k * 22
        const cy = 120 + (k % 2 ? -6 : 6)
        return (
          <ellipse
            key={`l${k}`}
            cx={cx}
            cy={cy}
            rx="14"
            ry="8"
            fill="none"
            stroke="#b3bccb"
            strokeWidth="5"
            transform={`rotate(${k % 2 ? 20 : -20} ${cx} ${cy})`}
          />
        )
      })}
    </>
  )
}

/** 살: 유전형에 따라 올라가는 체중계 바늘 */
function Scale({ lv }: { lv: number }) {
  const angle = [-55, -5, 48][lv]
  return (
    <>
      <ellipse cx="150" cy="178" rx="96" ry="7" fill="#000" opacity=".25" />
      <rect x="62" y="70" width="176" height="104" rx="22" fill="#e4e8ef" />
      <rect x="62" y="150" width="176" height="24" rx="12" fill="#000" opacity=".12" />
      <path d="M96 128a54 54 0 0 1 108 0" fill="none" stroke="#0b1530" strokeWidth="14" strokeLinecap="round" opacity=".15" />
      <path d="M96 128a54 54 0 0 1 32-49" fill="none" stroke="#3fb37f" strokeWidth="14" strokeLinecap="round" />
      <path d="M172 79a54 54 0 0 1 32 49" fill="none" stroke="var(--risk)" strokeWidth="14" strokeLinecap="round" />
      <g className="event-needle" style={{ transform: `rotate(${angle}deg)` }}>
        <rect x="147" y="78" width="6" height="52" rx="3" fill="#0b1530" />
      </g>
      <circle cx="150" cy="128" r="9" fill="#0b1530" />
      <text x="150" y="58" textAnchor="middle" fontSize="16" fontWeight="700" fill="#8892a5">
        {['BMI 평소대로', 'BMI 조금 ↑', 'BMI ↑↑'][lv]}
      </text>
    </>
  )
}

const FIGURES = { alc: Face, nic: Cigarette, fat: Scale }

/** 엄마·아빠가 하나씩 준 유전자 캡슐 두 개 (청록: 약하게, 분홍: 강하게 나타나는 유전자) */
function GenePair({ pair, calm, strong }: { pair: [boolean, boolean]; calm: string; strong: string }) {
  const parents = [
    { x: 60, label: '엄마', variant: pair[0] },
    { x: 140, label: '아빠', variant: pair[1] },
  ]
  return (
    <svg className="event-guide-svg" viewBox="0 0 200 150" aria-hidden="true">
      {parents.map((p) => (
        <g key={p.label}>
          {/* 사람 */}
          <circle cx={p.x} cy="20" r="11" fill="#2a3a66" />
          <path d={`M${p.x - 17} 52a17 17 0 0 1 34 0z`} fill="#2a3a66" />
          <text x={p.x} y="66" textAnchor="middle" fontSize="11" fill="#8892a5">
            {p.label}
          </text>
          {/* 내려 주는 화살표 */}
          <path d={`M${p.x} 72v14`} stroke="#5d6780" strokeWidth="2" strokeLinecap="round" />
          <path d={`M${p.x - 5} 82l5 6 5-6`} fill="none" stroke="#5d6780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* 유전자 캡슐 */}
          <rect
            x={p.x - 20}
            y="96"
            width="40"
            height="44"
            rx="20"
            fill={p.variant ? '#f4a9c6' : '#5ef2e6'}
            opacity={p.variant ? 1 : 0.85}
          />
          <text x={p.x} y="125" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0b1530">
            {p.variant ? strong : calm}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ---------- 화면 ---------- */

type CardProps = {
  trait: Trait
  /** 카드 그림·판정에 쓰는 유전형 (유전형 버튼으로만 바뀜) */
  lv: number
  /** 한국인 데이터에서 뽑은 사람의 유전형 */
  krLv: number
  /** 서양인 데이터에서 뽑은 사람의 유전형 */
  westLv: number
  onPick: (lv: number) => void
}

function TraitCard({ trait, lv, krLv, westLv, onPick }: CardProps) {
  const Figure = FIGURES[trait.id]
  const kr = trait.kr[krLv]
  const west = share(trait.worldN[westLv], trait.worldN)
  return (
    <article className="event-card">
      <header className="event-card-head">
        <h3>{trait.name}</h3>
        <span className="event-gene">{trait.gene}</span>
      </header>
      <div className="event-seg" role="group" aria-label={`${trait.name} 유전형`}>
        {trait.gts.map((g, j) => (
          <button key={g} type="button" aria-pressed={j === lv} onClick={() => onPick(j)}>
            {g}
          </button>
        ))}
      </div>
      <div className="event-fig">
        <svg viewBox="0 0 300 190" aria-hidden="true">
          <Figure lv={lv} />
        </svg>
      </div>
      {lv > 0 && <span className="event-stamp">{trait.stamps[lv]}</span>}
      <p className="event-verdict">{trait.verdicts[lv]}</p>
      <p className="event-desc">{trait.descs[lv]}</p>
      <div className="event-share">
        {/* 뽑힌 사람의 유전형과, 그 유형이 각 집단에서 차지하는 비율 */}
        <div className="event-share-row">
          <span>한국인</span>
          <em className="event-gt is-kr">{trait.gts[krLv]}</em>
          <span className="event-track">
            <i className="is-kr" style={{ width: `${Math.max(kr, 0.6)}%` }} />
          </span>
          <b>{fmt(kr)}%</b>
        </div>
        <div className="event-share-row">
          <span>서양인</span>
          <em className="event-gt is-world">{trait.gts[westLv]}</em>
          <span className="event-track">
            <i className="is-world" style={{ width: `${Math.max(west, 0.6)}%` }} />
          </span>
          <b>{fmt(west)}%</b>
        </div>
      </div>
    </article>
  )
}

function EventPage() {
  // 뽑기 버튼은 카드 유전형과 자기 게이지 줄(한국인·서양인)을 바꾸고, 유전형 버튼은 카드만 바꿈
  const [sel, setSel] = useState([0, 0, 0])
  // 처음엔 각 집단에서 가장 흔한 유형
  const [krPick, setKrPick] = useState(() => TRAITS.map((t) => mostCommon(t.kr)))
  const [westPick, setWestPick] = useState(() => TRAITS.map((t) => mostCommon(t.worldN)))
  const [krWho, setKrWho] = useState('한국인: 가장 흔한 유형이에요.')
  const [westWho, setWestWho] = useState('서양인: 가장 흔한 유형이에요.')
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideTrait, setGuideTrait] = useState<Trait['id']>('alc')

  const pickOne = (i: number, lv: number) => {
    setSel((prev) => prev.map((v, k) => (k === i ? lv : v)))
  }

  // 뽑은 사람의 유전형으로 카드의 GG·AG·AA 버튼도 같이 눌림
  const drawKorean = () => {
    const picked = TRAITS.map((t) => pick(t.kr))
    setKrPick(picked)
    setSel(picked)
    setKrWho('한국인: 유전형 비율대로 무작위로 뽑은 가상의 한 사람이에요.')
  }

  const drawWest = () => {
    const keys = Object.keys(WORLD_COMBOS)
    const key = keys[pick(keys.map((k) => WORLD_COMBOS[k]))]
    const picked = key.split('|').map((g, i) => Math.max(0, TRAITS[i].gts.indexOf(g)))
    setWestPick(picked)
    setSel(picked)
    setWestWho(`서양인: 참가자 411명 중 한 명의 실제 조합이에요 (같은 조합 ${WORLD_COMBOS[key]}명).`)
  }

  return (
    <div className="event-page">
      <main>
        {/* ---------- 체질 테스트 ---------- */}
        <section className="event-band">
          <div className="event-wrap">
            <div className="event-top">
              <div>
                <span className="event-month">
                  <i /> 11월의 이벤트 · 11.01 ~ 11.30
                </span>
                <h1 className="event-title">내 GENE 체질 테스트</h1>
                <p className="event-lead">
                  침 한 번으로 알아보는 술·담배·살 체질. 유전형을 직접 누르고, 오른쪽 버튼으로 한국인·서양인 한 명씩 뽑아 비교해 보세요.
                </p>
              </div>
              <div className="event-draws">
                <button type="button" className="event-btn is-main" onClick={drawKorean}>
                  한국 데이터 중 하나 뽑아서 확인하기
                </button>
                <button type="button" className="event-btn is-world" onClick={drawWest}>
                  서양인 데이터 중 하나 뽑기
                </button>
                <button
                  type="button"
                  className="event-btn"
                  aria-expanded={guideOpen}
                  aria-controls="event-guide"
                  onClick={() => setGuideOpen((v) => !v)}
                >
                  기능 설명 {guideOpen ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* ---------- 유전형 설명 ---------- */}
            {guideOpen && (
              <section id="event-guide" className="event-guide" aria-label="기능 설명">
                {/* 화면 사용법 */}
                <ol className="event-guide-steps">
                  {HOW_TO.map((h, k) => (
                    <li key={h.title}>
                      <span className="event-guide-step-no">{k + 1}</span>
                      <strong>{h.title}</strong>
                      <span>{h.desc}</span>
                    </li>
                  ))}
                </ol>
                <p className="event-guide-lead">GG·AG·AA는 엄마·아빠에게 하나씩 받은 유전자 한 쌍이에요.</p>
                <div className="event-guide-tabs" role="group" aria-label="체질 고르기">
                  {TRAITS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={guideTrait === t.id}
                      onClick={() => setGuideTrait(t.id)}
                    >
                      {GUIDE[t.id].tab}
                    </button>
                  ))}
                </div>
                <p className="event-guide-legend">
                  <span className="is-calm">
                    {GUIDE[guideTrait].calm} {GUIDE[guideTrait].legend[0]}
                  </span>
                  <span className="is-strong">
                    {GUIDE[guideTrait].strong} {GUIDE[guideTrait].legend[1]}
                  </span>
                </p>
                <ul className="event-guide-cards">
                  {TRAITS.find((t) => t.id === guideTrait)!.gts.map((gt, k) => {
                    const pair: [boolean, boolean] = [k === 2, k >= 1]
                    const guide = GUIDE[guideTrait]
                    return (
                      <li key={gt}>
                        <GenePair pair={pair} calm={guide.calm} strong={guide.strong} />
                        <strong>{gt}</strong>
                        <span className="event-guide-title">{guide.titles[k]}</span>
                        {/* 분홍 유전자 개수만큼 칸이 참 */}
                        <span className="event-guide-meter" aria-label={`${guide.meter} ${k}칸`}>
                          <i className={k >= 1 ? 'is-on' : undefined} />
                          <i className={k >= 2 ? 'is-on' : undefined} />
                        </span>
                        <small className="event-guide-meter-label">{guide.meter}</small>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            <div className="event-cards">
              {TRAITS.map((t, i) => (
                <TraitCard
                  key={t.id}
                  trait={t}
                  lv={sel[i]}
                  krLv={krPick[i]}
                  westLv={westPick[i]}
                  onPick={(lv) => pickOne(i, lv)}
                />
              ))}
            </div>
            <p className="event-who">
              {krWho}
              <br />
              {westWho}
            </p>
          </div>
        </section>

        {/* ---------- 한국인 vs 서양인 ---------- */}
        <section className="event-band is-alt">
          <div className="event-wrap">
            <h2 className="event-h2">술은 한국인 체질, 담배와 살은 서양인 체질</h2>
            <p className="event-lead">
              같은 SNP라도 나라마다 흔한 유형이 다릅니다. 위 막대는 한국인 평균, 아래 막대는 세계 평균(참가자
              411~418명)이에요.
            </p>
            <div className="event-cmp">
              {TRAITS.map((t) => {
                const world = t.worldN.map((n) => share(n, t.worldN))
                const stack = (values: number[]) =>
                  values.map((x, k) => (
                    <span key={t.gts[k]} className={`event-stack-${k}`} style={{ width: `${x}%` }} title={`${t.gts[k]} ${fmt(x)}%`}>
                      {x >= 12 ? `${t.gts[k]} ${fmt(x)}%` : ''}
                    </span>
                  ))
                return (
                  <div key={t.id}>
                    <h3>
                      {t.name} <span className="event-gene">{t.gene}</span>
                    </h3>
                    <p className="event-cmp-label">한국인 평균</p>
                    <div className="event-stackbar">{stack(t.kr)}</div>
                    <p className="event-cmp-label">세계 평균 ({sum(t.worldN)}명)</p>
                    <div className="event-stackbar">{stack(world)}</div>
                    <p className="event-twist">{t.twist}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ---------- 체질 다음은 위험도 ---------- */}
        <section className="event-band is-alt">
          <div className="event-wrap">
            <h2 className="event-h2">체질 다음은 위험도</h2>
            <p className="event-lead">
              재미로 본 세 체질은 실제 질병 위험과 연결돼 있어요. 내진설계는 여기서 한 발 더 나아가 암·뇌·심장 위험을
              계산합니다.
            </p>
            <div className="event-bridge">
              {BRIDGE.map((b) => (
                <div key={b.title}>
                  <strong>{b.title}</strong>
                  <p>{b.desc}</p>
                </div>
              ))}
            </div>
            <div className="event-cta">
              <span>내 암·뇌·심장 위험도도 볼래요?</span>
              <Link to="/report" className="event-btn is-main">
                내진설계 위험도 보기
              </Link>
            </div>
            <p className="event-src">
              출처: 한국인 ALDH2 유전형 비율 KoGES(Medicine 2021, PMC8284761) · CHRNA5 동아시아 빈도 약 3% gnomAD · FTO
              동아시아 빈도 12~20%, 효과크기 Li et al. Diabetologia 2012(PMC3296006) · 식도암 Choi et al. BMC Cancer
              2021 · 세계 평균 수치는 Harvard PGP 367명·PGP-UK 57명 직접 집계. 한국인 CHRNA5·FTO 비율은 대립유전자
              빈도(3%, 15%)로 계산한 추정치예요. 이 페이지는 이벤트 시안이며 진단이 아닙니다.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default EventPage
