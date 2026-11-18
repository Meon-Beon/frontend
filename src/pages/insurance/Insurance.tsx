import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { errorMessage } from '../../api/dna'
import {
  fetchExistingInsurance,
  fetchInsuranceDesign,
  type Coverage,
  type CoverageGap,
  type ExistingInsurance,
  type InsuranceDesign,
  type Recommendation,
} from '../../api/insurance'
import { readUser } from '../../auth/session'
import './insurance.css'

/*
 * 7-1. GENE 보험설계 (AI 추천 설계 & 드래그앤드롭 커스텀) + 7-1 팝업(보유 보험 정밀 분석)
 * - 위: 현재 보유 보험 요약 → "보험 상세보기" 를 누르면 팝업
 * - 왼쪽: 내 GENE에 적합한 추천 보험 목록 (끌어서 오른쪽에 놓거나 "담기")
 * - 오른쪽: AI 맞춤 추천 설계. 처음엔 AI가 공백 질환을 가장 싸게 채우는 조합으로 미리 채워 둠
 * 데이터: 보유 보험 /api/insurance/existing, 추천·공백 /api/insurance/design (모두 로그인한 회원 기준)
 */

const won = (n: number) => n.toLocaleString('ko-KR')

/** 상품명 끝의 판매 코드((2601), (26.07) 등)와 밑줄은 화면에서 뺌 */
const cleanName = (name: string) =>
  name
    .replace(/\([\d.]+\)/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** 태그용 짧은 보장 이름: 괄호 설명·갱신 표시는 덜어 냄 */
const shortName = (name: string) =>
  name
    .replace(/^갱\)/, '')
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .trim()

/** "2000만원" → "2,000만원". 조건이 붙은 금액은 그대로 */
const prettyAmount = (amount: string | null) => {
  if (!amount) return ''
  const m = amount.replace(/\s/g, '').match(/^(\d+)만원$/)
  return m ? `${won(Number(m[1]))}만원` : amount
}

/** 질병마다 고유 색: 질병 칩과 카드 왼쪽 띠에 씀 */
const DISEASE_COLOR: Record<string, string> = {
  심장: '#ff8aa0',
  뇌혈관: '#b48cff',
  당뇨: '#ffc857',
  고혈압: '#ff9f6b',
  치매: '#6fb8ff',
  대장암: '#5ee08a',
  유방암: '#f7a8ff',
}
const colorOf = (d: string) => DISEASE_COLOR[d] ?? '#5ef2e6'

/** 추천 카드 태그: 대상 질병마다 관련 보장을 하나씩 먼저 보여 줌 (KB처럼 보장이 28개인 상품도 당뇨·심장·뇌혈관이 다 보이게) */
const DISEASE_KEYWORDS: Record<string, string[]> = {
  심장: ['심장', '심근', '협심증'],
  뇌혈관: ['뇌'],
  당뇨: ['당뇨'],
  고혈압: ['고혈압'],
  치매: ['치매', '장기요양'],
  대장암: ['암'],
}
function keyCoverages(r: Recommendation, limit = 3) {
  const names = r.coverages.map((c) => shortName(c.coverage_name))
  const picked: string[] = []
  for (const d of r.target_diseases) {
    const words = DISEASE_KEYWORDS[d] ?? [d]
    const hit = names.find((n) => !picked.includes(n) && words.some((w) => n.includes(w)))
    if (hit) picked.push(hit)
  }
  for (const n of names) if (!picked.includes(n)) picked.push(n) // 남는 자리는 앞쪽 보장으로
  return picked.slice(0, limit)
}

/** 공백을 채워야 하는 질병: 잠재 위험 대상이면서 기존 보험으로 보장이 확인되지 않은 것 */
const needsCover = (g: CoverageGap) => g.at_risk && g.status !== '보장확인'

/**
 * AI 미리 채우기: 채울 수 있는 공백 질병을 최대한 많이, 같으면 월 보험료 합계가 가장 적게, 같으면 상품 수가 적게.
 * 추천 상품은 많아야 열 개 남짓이라 모든 조합(2^n)을 다 따져 보는 완전탐색으로 정확한 답을 구한다.
 * (한 번에 가장 많이 채우는 상품부터 고르는 "탐욕법"은 비싼 상품 하나를 고르는 실수를 할 수 있음)
 */
function pickAiDesign(recs: Recommendation[], gaps: CoverageGap[]): number[] {
  const targets = gaps.filter(needsCover).map((g) => g.disease)
  const pool = recs.slice(0, 12)
  let best = { covered: 0, cost: 0, ids: [] as number[] }
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    const picked = pool.filter((_, i) => mask & (1 << i))
    const covered = targets.filter((d) => picked.some((r) => r.target_diseases.includes(d))).length
    // 보험료가 없는 상품은 비교할 수 없으니 아주 비싼 것으로 취급
    const cost = picked.reduce((sum, r) => sum + (r.premium ?? 1e9), 0)
    const better =
      covered > best.covered ||
      (covered === best.covered && covered > 0 && (cost < best.cost || (cost === best.cost && picked.length < best.ids.length)))
    if (better) best = { covered, cost, ids: picked.map((r) => r.id) }
  }
  return best.ids
}

type DiseaseState = { label: string; tone: 'owned' | 'designed' | 'gap' | 'check' }

/** 오른쪽 "위험 질환 보장 현황" 칩: 부족한 부분은 색으로 강조 */
function diseaseState(g: CoverageGap, designed: Recommendation[]): DiseaseState {
  if (g.status === '보장확인') return { label: '보유 보장', tone: 'owned' }
  if (designed.some((r) => r.target_diseases.includes(g.disease))) return { label: '설계로 보완', tone: 'designed' }
  return g.status === '공백의심' ? { label: '보장 공백', tone: 'gap' } : { label: '확인 필요', tone: 'check' }
}

const GAP_ORDER: Record<CoverageGap['status'], number> = { 공백의심: 0, 정보부족: 1, 보장확인: 2 }
const GAP_TITLE: Record<CoverageGap['status'], string> = {
  공백의심: '보장 공백 의심',
  정보부족: '보장 여부 확인 필요',
  보장확인: '기존 보장 확인',
}

type SortKey = 'rank' | 'cheap'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rank', label: '추천순' },
  { key: 'cheap', label: '보험료 낮은순' },
]
function sortRecs(recs: Recommendation[], key: SortKey) {
  const price = (r: Recommendation) => r.premium ?? Number.POSITIVE_INFINITY
  const list = [...recs]
  if (key === 'cheap') list.sort((a, b) => price(a) - price(b) || a.rec_rank - b.rec_rank)
  return list
}

const DRAG_TYPE = 'application/x-gene-recommendation'

/* ---------- 작은 조각들 ---------- */

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const ICON = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  drop: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
}

function DiseaseChips({ diseases }: { diseases: string[] }) {
  return (
    <span className="ins-diseases">
      {diseases.map((d) => (
        <i key={d} style={{ '--c': colorOf(d) } as CSSProperties}>
          {d}
        </i>
      ))}
    </span>
  )
}

function Price({ value, unit = '원' }: { value: number | null; unit?: string }) {
  if (value == null) return <span className="ins-price ins-price-none">보험료 정보 없음</span>
  return (
    <span className="ins-price">
      <em>월</em> <strong>{won(value)}</strong> {unit}
    </span>
  )
}

/* ---------- 왼쪽: 추천 카드 ---------- */

function RecommendCard({
  r,
  added,
  onAdd,
  index,
}: {
  r: Recommendation
  added: boolean
  onAdd: () => void
  index: number
}) {
  const [open, setOpen] = useState(false)
  const detailId = `ins-rec-detail-${r.id}`

  const onDragStart = (e: DragEvent<HTMLLIElement>) => {
    e.dataTransfer.setData(DRAG_TYPE, String(r.id))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <li
      className={`ins-rec${added ? ' is-added' : ''}`}
      draggable={!added}
      onDragStart={onDragStart}
      style={{ animationDelay: `${index * 50}ms`, '--accent': colorOf(r.target_diseases[0] ?? '') } as CSSProperties}
    >
      <div className="ins-rec-top">
        <span className="ins-company">
          <b>{r.rec_rank}</b>
          {r.company_name}
        </span>
        <DiseaseChips diseases={r.target_diseases} />
      </div>
      <p className="ins-name">{cleanName(r.product_name)}</p>
      <div className="ins-tags">
        {keyCoverages(r).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="ins-rec-foot">
        <Price value={r.premium} />
        <div className="ins-rec-actions">
          <button type="button" className="ins-text-btn" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(!open)}>
            {open ? '접기' : '추천 이유'}
          </button>
          <button type="button" className="ins-add" onClick={onAdd} disabled={added}>
            {added ? (
              <>
                <Icon d={ICON.check} /> 담김
              </>
            ) : (
              <>
                <span className="ins-drag-hint">드래그 가능</span> 담기 <Icon d={ICON.arrow} />
              </>
            )}
          </button>
        </div>
      </div>

      <div id={detailId} className="ins-rec-detail" hidden={!open}>
        {r.reason && (
          <>
            <h4>추천 이유</h4>
            <p>{r.reason}</p>
          </>
        )}
        <h4>보장 내용 ({r.coverages.length}개)</h4>
        <dl className="ins-coverage-list">
          {r.coverages.map((c, i) => (
            <div key={`${c.coverage_name}-${i}`}>
              <dt>{c.coverage_name}</dt>
              <dd>{prettyAmount(c.coverage_amount)}</dd>
            </div>
          ))}
        </dl>
        {r.checks && (
          <>
            <h4>가입 전 확인할 점</h4>
            <p className="ins-checks">{r.checks}</p>
          </>
        )}
        {r.join_age && <p className="ins-meta">가입연령 {r.join_age}세 · {r.insurer_type}보험 · {r.product_type}</p>}
      </div>
    </li>
  )
}

/* ---------- 오른쪽: 설계에 담긴 카드 ---------- */

function DesignedCard({ r, onRemove }: { r: Recommendation; onRemove: () => void }) {
  const [menu, setMenu] = useState(false)
  return (
    <li className="ins-designed" style={{ '--accent': colorOf(r.target_diseases[0] ?? '') } as CSSProperties}>
      <div className="ins-rec-top">
        <span className="ins-company">{r.company_name}</span>
        <div className="ins-more">
          <button type="button" aria-label={`${cleanName(r.product_name)} 메뉴`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <Icon d={ICON.more} />
          </button>
          {menu && (
            <div className="ins-more-menu" role="menu">
              <button type="button" role="menuitem" onClick={onRemove}>
                설계에서 빼기
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="ins-name">{cleanName(r.product_name)}</p>
      <DiseaseChips diseases={r.target_diseases} />
      <div className="ins-designed-foot">
        <span>월 예상 보험료</span>
        <Price value={r.premium} />
      </div>
    </li>
  )
}

/* ---------- 팝업: 보유 보험 정밀 분석 및 보장 공백 진단 ---------- */

function CoverageBullets({ coverages }: { coverages: Coverage[] }) {
  return (
    <ul className="ins-bullets">
      {coverages.map((c, i) => (
        <li key={`${c.coverage_name}-${i}`} title={c.coverage_detail ?? undefined}>
          {c.coverage_name}
          {c.coverage_amount && <b>{prettyAmount(c.coverage_amount)}</b>}
        </li>
      ))}
    </ul>
  )
}

function OwnedModal({
  name,
  existing,
  gaps,
  onClose,
}: {
  name: string
  existing: ExistingInsurance
  gaps: CoverageGap[]
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // 팝업이 떠 있는 동안 뒤 화면은 스크롤되지 않게
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      opener?.focus() // 닫으면 팝업을 연 버튼으로 초점을 돌려줌
    }
  }, [onClose])

  // 위험 대상 질병만, 공백 의심 → 확인 필요 → 기존 보장 순
  const summary = gaps.filter((g) => g.at_risk).sort((a, b) => GAP_ORDER[a.status] - GAP_ORDER[b.status])

  return (
    <div className="ins-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ins-modal" role="dialog" aria-modal="true" aria-labelledby="ins-modal-title">
        <header className="ins-modal-head">
          <h2 id="ins-modal-title">
            {name} 님의 보유 보험 정밀 분석 및 보장 공백 진단
          </h2>
          <button ref={closeRef} type="button" className="ins-icon-btn" aria-label="닫기" onClick={onClose}>
            <Icon d={ICON.close} />
          </button>
        </header>

        <div className="ins-modal-body">
          <dl className="ins-stats">
            <div>
              <dt>총 월 납입 보험료</dt>
              <dd>
                <strong>{won(existing.total_premium)}</strong> 원
              </dd>
            </div>
            <div>
              <dt>주요 보장 카테고리</dt>
              <dd>{existing.main_category ?? '-'}</dd>
            </div>
            <div>
              <dt>유지 계약 건수</dt>
              <dd>{existing.products.length}건</dd>
            </div>
          </dl>

          <h3 className="ins-modal-sub">현재 보유 중인 보험 상세 내역 ({existing.products.length}건)</h3>
          {existing.products.length === 0 ? (
            <p className="ins-empty">등록된 보험이 없어요.</p>
          ) : (
            <ul className="ins-owned-grid">
              {existing.products.map((p) => (
                <li key={p.id} className="ins-owned">
                  <div className="ins-owned-head">
                    <span className="ins-badge">{p.company_name}</span>
                    <Price value={p.premium} />
                  </div>
                  <p className="ins-name">{cleanName(p.product_name)}</p>
                  <div className="ins-tags ins-tags-cat">
                    {p.categories.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                  <CoverageBullets coverages={p.coverages} />
                  {p.features.length > 0 && (
                    <details className="ins-features">
                      <summary>상품 특성 {p.features.length}개 보기</summary>
                      <dl>
                        {p.features.map((f) => (
                          <div key={f.feature_name}>
                            <dt>{f.feature_name}</dt>
                            <dd>{f.feature_detail}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}

          <section className="ins-gap-summary">
            <h3>GENE 유전체 · 임상 데이터 대조 보장 공백 요약</h3>
            {summary.length === 0 ? (
              <p className="ins-empty">보장 공백 분석 결과가 아직 없어요.</p>
            ) : (
              <ul>
                {summary.map((g) => (
                  <li key={g.disease} className={`ins-gap ins-gap-${GAP_ORDER[g.status]}`}>
                    <p className="ins-gap-title">
                      <span>{GAP_TITLE[g.status]}</span>
                      {g.disease}
                    </p>
                    {g.gap_detail && <p>{g.gap_detail}</p>}
                    {g.current_summary && <p className="ins-gap-current">현재 보장: {g.current_summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- 화면 ---------- */

function Insurance() {
  const user = readUser()
  const location = useLocation()
  const name = user?.name ?? '회원'

  const [existing, setExisting] = useState<ExistingInsurance | null>(null)
  const [design, setDesign] = useState<InsuranceDesign | null>(null)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<SortKey>('rank')
  // null 이면 아직 손대지 않은 상태 → AI 추천 조합을 보여 줌
  const [designedIds, setDesignedIds] = useState<number[] | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let ignore = false // 화면을 떠난 뒤 늦게 온 응답은 무시
    Promise.all([fetchExistingInsurance(user.id), fetchInsuranceDesign(user.id)])
      .then(([e, d]) => {
        if (ignore) return
        setExisting(e)
        setDesign(d)
      })
      .catch((e) => {
        if (!ignore) setError(errorMessage(e, '보험 정보를 불러오지 못했어요. 서버가 켜져 있는지 확인해 주세요.'))
      })
    return () => {
      ignore = true
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const recs = useMemo(() => design?.recommendations ?? [], [design])
  const gaps = useMemo(() => design?.gaps ?? [], [design])
  const aiIds = useMemo(() => pickAiDesign(recs, gaps), [recs, gaps])
  const ids = designedIds ?? aiIds
  const designed = ids.map((id) => recs.find((r) => r.id === id)).filter((r): r is Recommendation => !!r)
  const designedTotal = designed.reduce((sum, r) => sum + (r.premium ?? 0), 0)
  const riskDiseases = gaps.filter((g) => g.at_risk)
  const sorted = useMemo(() => sortRecs(recs, sort), [recs, sort])
  const isAiPick = designedIds === null
  // 팝업의 useEffect 가 렌더마다 다시 돌지 않도록 같은 함수를 계속 넘김
  const closeModal = useCallback(() => setModalOpen(false), [])

  const add = (id: number) => !ids.includes(id) && setDesignedIds([...ids, id])
  const remove = (id: number) => setDesignedIds(ids.filter((x) => x !== id))

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragOver(false)
    const id = Number(e.dataTransfer.getData(DRAG_TYPE))
    if (id) add(id)
  }
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return // 우리 카드가 아닌 것(파일 등)은 받지 않음
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  /* 로그인 전: /insurance 는 누구나 들어올 수 있는 메뉴라 안내만 보여 줌 */
  if (!user) {
    return (
      <div className="ins-page">
        <div className="ins-wrap ins-center">
          <section className="ins-card ins-login">
            <h1>GENE 보험설계</h1>
            <p>로그인하면 내 보유 보험과 유전체 분석 기반 맞춤 보험 설계를 볼 수 있어요.</p>
            <Link to="/login" state={{ from: location.pathname }} className="ins-cta">
              로그인하러 가기 <Icon d={ICON.arrow} />
            </Link>
          </section>
        </div>
      </div>
    )
  }

  const loading = !error && (!existing || !design)

  return (
    <div className="ins-page">
      <div className="ins-wrap">
        <div className="ins-titlebar">
          <h1>GENE 보험설계</h1>
          {/* 서버 리포트(PDF)가 생기기 전까지는 이 화면을 인쇄·PDF 저장 */}
          <button type="button" className="ins-ghost" onClick={() => window.print()}>
            <Icon d={ICON.download} />
            리포트 다운로드
          </button>
        </div>

        {error && <p className="ins-status ins-status-error">{error}</p>}
        {loading && <p className="ins-status">보험 정보를 불러오는 중이에요.</p>}

        {existing && design && (
          <>
            {/* ---------- 현재 보유 보험 분석 ---------- */}
            <section className="ins-card ins-owned-summary">
              <div className="ins-owned-summary-head">
                <h2>
                  <u>{name}</u> 님의 현재 보유 보험 분석
                </h2>
                <button type="button" className="ins-cta ins-cta-sm" onClick={() => setModalOpen(true)}>
                  보험 상세보기 <Icon d={ICON.arrow} />
                </button>
              </div>
              <div className="ins-owned-summary-body">
                <div className="ins-total">
                  <p>월 납입 보험료</p>
                  <strong>
                    {won(existing.total_premium)}
                    <small>원 / 월</small>
                  </strong>
                </div>
                {existing.main_category && (
                  <div className="ins-main-cat">
                    <p>주요 보장</p>
                    <span className="ins-pill">{existing.main_category}</span>
                  </div>
                )}
                <div className="ins-count">
                  <p>유지 계약 건수</p>
                  <strong>총 {existing.products.length}건</strong>
                </div>
              </div>
            </section>

            <div className="ins-layout">
              {/* ---------- 왼쪽: 추천 보험 ---------- */}
              <section className="ins-card ins-left" aria-labelledby="ins-left-title">
                <div className="ins-panel-head">
                  <div>
                    <h2 id="ins-left-title">내 GENE에 적합한 보험이에요</h2>
                    <p>유전체·검진 분석으로 고른 상품이에요. 오른쪽 설계 칸으로 끌어다 놓거나 담기를 누르세요.</p>
                  </div>
                  <label className="ins-select">
                    <span className="ins-sr">정렬</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                      {SORTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {recs.length === 0 ? (
                  <p className="ins-empty">아직 추천 결과가 없어요. 유전자 분석이 끝나면 여기에 표시돼요.</p>
                ) : (
                  <ul className="ins-recs">
                    {sorted.map((r, i) => (
                      <RecommendCard key={r.id} r={r} index={i} added={ids.includes(r.id)} onAdd={() => add(r.id)} />
                    ))}
                  </ul>
                )}
                {recs.length > 0 && (
                  <p className="ins-footnote">보험료는 보험사 공시 기준 예시 금액(남자 40세 등)이며 본인 견적이 아니에요.</p>
                )}
              </section>

              {/* ---------- 오른쪽: AI 맞춤 추천 설계 ---------- */}
              <section
                className={`ins-card ins-right${dragOver ? ' is-dragover' : ''}`}
                aria-labelledby="ins-right-title"
                onDragOver={onDragOver}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="ins-panel-head">
                  <div>
                    <h2 id="ins-right-title">AI 맞춤 추천 설계</h2>
                    <p>{isAiPick ? 'AI가 보장 공백을 가장 적은 보험료로 채우는 조합을 담아 두었어요.' : '직접 고친 설계예요.'}</p>
                  </div>
                  {!isAiPick && (
                    <button type="button" className="ins-text-btn" onClick={() => setDesignedIds(null)}>
                      <Icon d={ICON.reset} /> AI 추천으로 되돌리기
                    </button>
                  )}
                </div>

                <div className="ins-dropzone" aria-hidden="true">
                  <Icon d={ICON.drop} />
                  <p>드래그하여 보험 상품 추가</p>
                  <span>왼쪽 목록에서 상품을 끌어다 놓으면 설계에 담겨요.</span>
                </div>

                {riskDiseases.length > 0 && (
                  <div className="ins-risk">
                    <h3>위험 질환 보장 현황</h3>
                    <ul>
                      {riskDiseases.map((g) => {
                        const s = diseaseState(g, designed)
                        return (
                          <li key={g.disease} className={`ins-risk-${s.tone}`} title={g.gap_detail ?? undefined}>
                            <b>{g.disease}</b>
                            <span>{s.label}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {designed.length === 0 ? (
                  <p className="ins-empty">아직 담은 보험이 없어요.</p>
                ) : (
                  <ul className="ins-designed-list">
                    {designed.map((r) => (
                      <DesignedCard key={r.id} r={r} onRemove={() => remove(r.id)} />
                    ))}
                  </ul>
                )}

                <dl className="ins-design-total">
                  <div>
                    <dt>설계된 보험 건수</dt>
                    <dd>총 {designed.length}건</dd>
                  </div>
                  <div>
                    <dt>월 납입 합계</dt>
                    <dd>
                      <strong>{won(designedTotal)}</strong> 원
                    </dd>
                  </div>
                  <div className="ins-design-total-all">
                    <dt>기존 보험 포함</dt>
                    <dd>월 {won(designedTotal + existing.total_premium)} 원</dd>
                  </div>
                </dl>
              </section>
            </div>
          </>
        )}
      </div>

      {modalOpen && existing && <OwnedModal name={name} existing={existing} gaps={gaps} onClose={closeModal} />}
    </div>
  )
}

export default Insurance
