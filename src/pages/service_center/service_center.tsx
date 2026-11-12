import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import './service_center.css'

/** 순차 등장 지연(ms)을 CSS 변수로 넘김 */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

const CATEGORIES = ['전체', '보험상품', '보험가입', '보험계약', '보험금지급', '서비스이용'] as const
type Category = (typeof CATEGORIES)[number]

const KEYWORDS = ['암 진단자금', 'DTC 96종 검사', '보험료 연체', '소액암', '분할 지급']

type Faq = {
  id: string
  category: Exclude<Category, '전체'>
  tag: string
  question: string
  /** 검색에 쓰는 답변 요약 */
  keywords: string
  answer: ReactNode
}

const PORTFOLIOS = [
  { title: '암 집중 보장형', desc: '유전체 암 민감도 지표 상위군을 위한 표적항암 및 조기진단 집중', note: '96개 유전자 중 38종 매칭' },
  { title: '뇌·심장 혈관 케어형', desc: '심뇌혈관 질환 대사증후군 인자 보유자 전용 혈관 수술·산정특례 보장', note: '허혈성/뇌혈관 2대 진단비' },
  { title: '대사·내분비 만성질환형', desc: '당뇨, 혈압, 비만 등 대사 위험 유전자 변이군 대상 합병증 평생 케어', note: '만성질환 생활치료비 패키지' },
  { title: '맞춤 종합형', desc: '가족력과 건강검진 최근 5개년 수치를 복합 산출한 밸런스 풀커버리지', note: '다빈도 질환 빈틈 방어' },
]

const FAQS: Faq[] = [
  {
    id: 'portfolio',
    category: '보험상품',
    tag: '보험상품 · DTC 연계',
    question: '맞춤보장 상품 구분은 어떻게 되나요?',
    keywords: 'DTC 96종 검사 유전자 포트폴리오 암 뇌 심장 대사 종합',
    answer: (
      <>
        <p>
          한국유전자정보센터에서 분석한 96종 DTC(Direct To Consumer) 검사 결과에 따라, 아래 4가지
          핵심 포트폴리오 중 가장 알맞은 구성으로 분류해 제안해 드립니다.
        </p>
        <ul className="sc-portfolios">
          {PORTFOLIOS.map((p) => (
            <li key={p.title}>
              <strong>{p.title}</strong>
              <span>{p.desc}</span>
              <small>{p.note}</small>
            </li>
          ))}
        </ul>
        <p className="sc-note">
          DTC 검사 결과지는 마이페이지 &gt; 나의 유전자 리포트에서 언제든 열람하고 PDF로 내려받을
          수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 'overdue',
    category: '보험계약',
    tag: '보험계약 · 유지관리',
    question: '보험료를 연체하면 보장이 되나요?',
    keywords: '보험료 연체 납입 유예 해지 부활',
    answer: (
      <>
        <p>
          보험료 납입일이 지나도 바로 해지되지 않고, 약관에서 정한 <b>납입최고(유예) 기간</b> 동안은
          보장이 유지됩니다. 이 기간 안에 밀린 보험료를 내시면 계약이 그대로 이어집니다.
        </p>
        <p>
          유예 기간이 끝날 때까지 납입하지 않으면 계약이 해지될 수 있으며, 해지 후에도 일정 기간
          안에는 밀린 보험료와 이자를 내고 계약을 다시 살리는 <b>부활 신청</b>이 가능합니다. 다만
          부활 시에는 건강 상태를 다시 알려야 할 수 있습니다.
        </p>
        <p className="sc-note">구체적인 유예·부활 기간은 가입하신 상품의 약관을 기준으로 합니다.</p>
      </>
    ),
  },
  {
    id: 'cancer-period',
    category: '보험금지급',
    tag: '보험금지급 · 보장기준',
    question: '암 진단자금을 생명보험사에서 지급하는 기간이 있나요?',
    keywords: '암 진단자금 면책 감액 기간 90일',
    answer: (
      <>
        <p>
          일반적으로 암 진단자금에는 계약일부터 일정 기간 보장하지 않는 <b>면책기간</b>과, 그 이후
          일정 기간 보험금의 일부만 지급하는 <b>감액기간</b>이 있습니다.
        </p>
        <p>
          많은 상품이 면책기간 90일, 감액기간 1~2년(가입금액의 50% 지급)으로 운영되며, 이후에는
          가입금액 전액이 지급됩니다.
        </p>
        <p className="sc-note">면책·감액 기간은 보험사와 상품마다 다르니 설계 결과 화면에서 꼭 확인해 주세요.</p>
      </>
    ),
  },
  {
    id: 'installment',
    category: '보험금지급',
    tag: '보험금지급 · 수령방식',
    question: '보험금을 분할 받아 보장되나요?',
    keywords: '분할 지급 일시금 연금형 수령',
    answer: (
      <>
        <p>
          상품에 따라 보험금을 한 번에 받는 <b>일시금</b> 방식과, 매월 또는 매년 나누어 받는{' '}
          <b>분할(생활자금형)</b> 방식 중에서 고를 수 있습니다.
        </p>
        <p>
          분할 지급을 선택하면 치료 기간 동안 생활비처럼 꾸준히 받을 수 있고, 일시금은 큰 치료비가
          한 번에 필요할 때 유리합니다. 내진설계는 진단 결과와 생활 패턴을 함께 보고 알맞은 수령
          방식을 추천해 드립니다.
        </p>
      </>
    ),
  },
  {
    id: 'minor-cancer',
    category: '보험상품',
    tag: '보험상품 · 정밀분류',
    question: '소액암과 특정암의 종류는 어떻게 되나요?',
    keywords: '소액암 유사암 특정암 갑상선암 제자리암 경계성종양 고액암',
    answer: (
      <>
        <p>
          <b>소액암(유사암)</b>은 상대적으로 치료가 쉬운 암으로, 보통 갑상선암, 기타피부암,
          제자리암, 경계성종양 등이 해당하며 일반암보다 적은 금액이 지급됩니다.
        </p>
        <p>
          <b>특정암</b>은 상품에서 따로 정한 암으로, 뇌암·골수암처럼 치료비가 큰 고액암이나 특정
          부위 암을 별도로 더 크게 보장하는 경우가 많습니다.
        </p>
        <p className="sc-note">암의 분류 기준은 상품 약관마다 다르므로 약관의 분류표를 기준으로 합니다.</p>
      </>
    ),
  },
  {
    id: 'join',
    category: '보험가입',
    tag: '보험가입 · 절차',
    question: '유전자 검사 없이도 보험 설계를 받을 수 있나요?',
    keywords: '가입 검사 없이 결과지 등록 건강검진',
    answer: (
      <p>
        네, 가능합니다. 다른 기관에서 받은 유전자 검사 결과지를 등록하거나, 건강검진 이력과
        가족력만으로도 기본 설계를 받아보실 수 있습니다. 유전자 검사를 함께 진행하면 더 정밀한
        맞춤 설계가 제공됩니다.
      </p>
    ),
  },
  {
    id: 'kit',
    category: '서비스이용',
    tag: '서비스이용 · 검사 키트',
    question: 'DTC 유전자 검사 키트는 어떻게 받고 보내나요?',
    keywords: 'DTC 96종 검사 키트 타액 배송 반송',
    answer: (
      <p>
        메인의 DNA 검사 신청에서 신청하시면 타액 채취 키트가 집으로 배송됩니다. 안내에 따라 타액을
        채취해 동봉된 봉투에 넣어 보내시면, 연구소 입고 후 약 72시간 안에 결과가 마이페이지에
        등록됩니다.
      </p>
    ),
  },
]

function SearchIcon() {
  return (
    <svg className="sc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg className="sc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** sc-reveal 요소가 화면에 들어오면 sc-in을 붙여 차례로 떠오르게 함 */
function useReveal(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add('sc-in')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1 },
    )
    root.querySelectorAll('.sc-reveal:not(.sc-in)').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // 검색·필터로 새로 그려진 항목도 관찰하도록 deps를 받음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}

function ServiceCenter() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [category, setCategory] = useState<Category>('전체')
  const [openId, setOpenId] = useState<string | null>(FAQS[0].id)

  const results = useMemo(() => {
    const q = submitted.trim().replace(/\s+/g, '')
    return FAQS.filter((f) => {
      if (category !== '전체' && f.category !== category) return false
      if (!q) return true
      return `${f.question}${f.keywords}${f.tag}`.replace(/\s+/g, '').includes(q)
    })
  }, [submitted, category])

  const pageRef = useReveal([results])

  const search = (value: string) => {
    setQuery(value)
    setSubmitted(value)
    setCategory('전체')
    const first = FAQS.find((f) =>
      `${f.question}${f.keywords}${f.tag}`.replace(/\s+/g, '').includes(value.replace(/\s+/g, '')),
    )
    setOpenId(first?.id ?? null)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    search(query)
  }

  return (
    <div ref={pageRef} className="sc-page">
      <main className="sc-main">
        {/* ---------- 제목 ---------- */}
        <section className="sc-intro sc-reveal" style={delay(0)}>
          <h1 className="sc-title">
            고객센터 <span>자주 묻는 질문(FAQ)</span>
          </h1>
          <p className="sc-lead">
            유전체 분석 기반 맞춤형 보험 가입, 보장 분류 기준, 납입 및 보험금 청구 절차에 대한 핵심
            질문들을 정리했습니다.
          </p>
        </section>

        {/* ---------- 검색 · 분류 ---------- */}
        <section className="sc-card sc-search sc-reveal" style={delay(120)}>
          <h2 className="sc-search-title">어떤 보장 내용이 궁금하신가요?</h2>
          <form className="sc-search-bar" onSubmit={handleSubmit} role="search">
            <SearchIcon />
            <input
              type="search"
              aria-label="자주 묻는 질문 검색"
              placeholder="검색어를 입력해주세요 (예: 암 진단자금, 유전자 키트, 연체)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!e.target.value) setSubmitted('')
              }}
            />
            <button type="submit">검색</button>
          </form>

          <div className="sc-keywords">
            <span>추천 키워드</span>
            {KEYWORDS.map((k) => (
              <button key={k} type="button" onClick={() => search(k)}>
                #{k}
              </button>
            ))}
          </div>

          <div className="sc-tabs" role="tablist" aria-label="질문 분류">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                className={category === c ? 'sc-tab sc-tab-active' : 'sc-tab'}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- 질문 목록 ---------- */}
        <section className="sc-list" aria-live="polite">
          {submitted && (
            <p className="sc-result">
              ‘{submitted}’ 검색 결과 <b>{results.length}건</b>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSubmitted('')
                }}
              >
                전체 보기
              </button>
            </p>
          )}

          {results.length === 0 && (
            <p className="sc-card sc-empty">
              찾으시는 질문이 없어요. 다른 검색어를 입력하시거나 아래 상담 전화로 문의해 주세요.
            </p>
          )}

          {results.map((f, i) => {
            const open = openId === f.id
            return (
              // 등장 효과는 바깥 div에만 줌(열림 상태로 className이 바뀌어도 사라지지 않게)
              <div key={f.id} className="sc-reveal" style={delay(200 + i * 90)}>
                <article className={open ? 'sc-card sc-faq sc-open' : 'sc-card sc-faq'}>
                  <button
                    type="button"
                    className="sc-question"
                    aria-expanded={open}
                    aria-controls={`sc-answer-${f.id}`}
                    onClick={() => setOpenId(open ? null : f.id)}
                  >
                    <span className="sc-q-text">
                      <small>{f.tag}</small>
                      {f.question}
                    </span>
                    <Chevron />
                  </button>
                  <div id={`sc-answer-${f.id}`} className="sc-answer" hidden={!open}>
                    {f.answer}
                  </div>
                </article>
              </div>
            )
          })}
        </section>

        {/* ---------- 상담 안내 ---------- */}
        <section className="sc-contact sc-reveal" style={delay(0)}>
          <div>
            <h2>추가 문의사항이 있으신가요?</h2>
            <p>평일 09:00 - 18:00 (점심시간 12:00 - 13:00, 공휴일 제외)</p>
          </div>
          <a href="tel:1588-0921" className="sc-phone">
            <small>유전체 상담 전화</small>
            1588-0921
          </a>
        </section>
      </main>
    </div>
  )
}

export default ServiceCenter
