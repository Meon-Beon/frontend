import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import './service_center.css'

/** 순차 등장 지연(ms)을 CSS 변수로 넘김 */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

const CATEGORIES = ['전체', '유전자검사', '건강리포트', '보험설계', '보험계약', '보험금지급'] as const
type Category = (typeof CATEGORIES)[number]

const KEYWORDS = ['DNA 검사 신청', '건강검진 불러오기', '종합 리포트', '50개 보험사', '암 진단자금']

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
  { title: '암 집중 보장형', desc: '유방암·대장암 등 유전적 암 취약도가 높은 분을 위한 표적항암 및 조기진단 집중 보장', note: '88종 유전자 중 암 관련 인자 매칭' },
  { title: '뇌·심장 혈관 케어형', desc: '뇌혈관·심혈관 질환 위험 인자 보유자를 위한 혈관 수술·진단비 중심 보장', note: '허혈성/뇌혈관 2대 진단비' },
  { title: '대사·내분비 만성질환형', desc: '당뇨·혈압 등 대사 위험 유전자 변이군 대상 합병증까지 이어지는 장기 케어', note: '만성질환 생활치료비 패키지' },
  { title: '맞춤 종합형', desc: '유전자 분석과 최근 10년 건강검진 수치를 함께 반영한 균형 잡힌 종합 보장', note: '다빈도 질환 빈틈 방어' },
]

const FAQS: Faq[] = [
  {
    id: 'kit-apply',
    category: '유전자검사',
    tag: '유전자검사 · 신청',
    question: 'DNA 검사는 어떻게 신청하나요? 비용은 얼마인가요?',
    keywords: 'DNA 검사 신청 DTC 88종 키트 비용 가격 80,000원 결제',
    answer: (
      <>
        <p>
          메인 화면의 <b>DNA 검사 신청</b>에서 신청하실 수 있습니다. 개인정보 및 민감정보 제3자 제공 동의를
          완료한 뒤 결제하시면 <b>DTC 유전자 88종 종합 분석 키트</b>가 집으로 배송됩니다.
        </p>
        <p>
          검사 비용은 키트와 리포트를 포함해 <b>80,000원</b>입니다. (정상가 198,000원)
        </p>
      </>
    ),
  },
  {
    id: 'kit-sample',
    category: '유전자검사',
    tag: '유전자검사 · 채취·반송',
    question: '타액은 어떻게 채취하고 보내나요?',
    keywords: '타액 채취 키트 반송 수거 택배 30분 양치 음식',
    answer: (
      <>
        <p>
          채취 전 <b>30분간</b>은 음식물 섭취, 양치, 흡연을 삼가 주세요. 키트를 열어 멸균 면봉과 채취 튜브에
          타액을 표시선까지 묻히고, 면봉 끝에 손이나 이물질이 닿지 않도록 주의해 주세요.
        </p>
        <p>
          채취한 튜브를 동봉된 봉투에 넣고 반송 송장을 붙여 반송함에 넣거나 기사 방문 수거를 신청하시면
          됩니다.
        </p>
        <p className="sc-note">이물질이 섞이면 유전자 증폭이 실패해 재채취를 요청드릴 수 있습니다.</p>
      </>
    ),
  },
  {
    id: 'kit-result',
    category: '유전자검사',
    tag: '유전자검사 · 분석기간',
    question: '검사 결과는 언제 받아볼 수 있나요?',
    keywords: '결과 기간 72시간 연구소 분석 제노플랜코리아',
    answer: (
      <>
        <p>
          검체는 채취 후 24시간 안에 판교의 <b>제노플랜코리아 연구소</b>로 입고되며, 입고 후 약{' '}
          <b>72시간</b> 안에 분석이 끝납니다.
        </p>
        <p>
          연구소는 보건복지부 질병관리청 DTC 유전자검사 인증을 받은 기관으로, 당뇨·심장질환·뇌혈관질환·
          유방암·대장암·치매 등의 유전적 위험도를 분석합니다.
        </p>
      </>
    ),
  },
  {
    id: 'checkup',
    category: '건강리포트',
    tag: '건강리포트 · 건강검진 연동',
    question: '건강검진 기록은 어떻게 불러오나요?',
    keywords: '건강검진 불러오기 입력 건보공단 국민건강보험 10년 마이데이터 주민번호',
    answer: (
      <>
        <p>
          메인 화면의 <b>건강검진기록 입력</b>에서 국민건강보험공단의 최근 <b>10년</b> 국가건강검진 기록을
          한 번에 불러올 수 있습니다. 직접 서류를 올리실 필요가 없습니다.
        </p>
        <p className="sc-note">조회에 쓰인 주민등록번호는 저장하지 않습니다.</p>
      </>
    ),
  },
  {
    id: 'report',
    category: '건강리포트',
    tag: '건강리포트 · 읽는 법',
    question: '건강 종합 리포트는 어떻게 보나요?',
    keywords: '종합 리포트 5단계 안전 양호 보통 경계 위험 DNA 선천위험도 현재 질환 의심도 PDF',
    answer: (
      <>
        <p>
          건강 종합 리포트는 유전자 검사(선천적 위험)와 건강검진(현재 상태)을 함께 분석해, 질환별 위험도를{' '}
          <b>안전 · 양호 · 보통 · 경계 · 위험</b> 5단계로 보여 드립니다.
        </p>
        <p>
          질환마다 <b>DNA 선천위험도</b>와 <b>현재 질환 의심도</b>를 나란히 보여 주므로, 지금은 수치가
          괜찮아도 유전적으로 주의가 필요한 부분까지 함께 확인할 수 있습니다.
        </p>
        <p className="sc-note">리포트 하단의 리포트 PDF 저장 버튼으로 언제든 내려받을 수 있습니다.</p>
      </>
    ),
  },
  {
    id: 'report-limit',
    category: '건강리포트',
    tag: '건강리포트 · 유의사항',
    question: '유전자 검사 결과로 질병을 진단받을 수 있나요?',
    keywords: '진단 의학적 한계 면책 참고용 의사 진료',
    answer: (
      <>
        <p>
          아닙니다. 유전자 검사 결과는 통계적 확률에 기반한 <b>건강 관리 참고 지표</b>이며, 의사의 진료나
          진단을 대신할 수 없습니다.
        </p>
        <p>위험도가 높게 나온 항목은 병원 진료나 정밀 검사를 통해 꼭 확인해 주세요.</p>
      </>
    ),
  },
  {
    id: 'privacy',
    category: '유전자검사',
    tag: '유전자검사 · 개인정보',
    question: '제 유전자 정보는 안전하게 관리되나요?',
    keywords: '개인정보 민감정보 유전정보 보안 제3자 제공 동의 ISO 27001',
    answer: (
      <>
        <p>
          유전자 정보는 분석과 리포트 제공 목적으로만 쓰이며, 제3자 제공은 고객님이 동의하신 범위 안에서만
          이루어집니다.
        </p>
        <p>
          연구소와 서비스는 <b>ISO/IEC 27001 정보보호 국제인증</b> 체계에 따라 관리되고, 검체는 바코드로
          추적해 이송 과정에서도 신원이 드러나지 않습니다.
        </p>
      </>
    ),
  },
  {
    id: 'design',
    category: '보험설계',
    tag: '보험설계 · 비교 추천',
    question: '맞춤 보험 설계는 어떻게 이루어지나요?',
    keywords: '맞춤 보험 설계 50개 보험사 비교 추천 포트폴리오 암 뇌 심장 대사 종합',
    answer: (
      <>
        <p>
          유전자 분석 결과와 건강검진 이력을 바탕으로 <b>약 50개 보험사</b>의 상품을 비교해, 불필요한 과다
          보장은 덜고 내게 필요한 보장만 담아 추천해 드립니다. 아래 4가지 유형 중 가장 알맞은 구성으로
          제안됩니다.
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
      </>
    ),
  },
  {
    id: 'join',
    category: '보험설계',
    tag: '보험설계 · 이용 조건',
    question: '유전자 검사 없이도 보험 설계를 받을 수 있나요?',
    keywords: '검사 없이 건강검진만 기본 설계',
    answer: (
      <p>
        네, 건강검진 기록만으로도 기본 설계를 받아보실 수 있습니다. 다만 건강검진만으로는 보이지 않는 유전적
        잠재 위험까지 반영하려면 유전자 검사를 함께 진행하시길 권해 드립니다.
      </p>
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
    category: '보험설계',
    tag: '보험설계 · 암 분류',
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
            DNA 검사 신청부터 건강 종합 리포트, 맞춤 보험 설계, 보험금 청구까지 자주 묻는 질문을
            정리했습니다.
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
              placeholder="검색어를 입력해주세요 (예: DNA 검사, 건강검진, 리포트)"
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
