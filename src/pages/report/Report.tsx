import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/dna'
import { DEMO_PERSON } from '../../api/healthDemo'
import { fetchReport, type Report, type ReportDisease } from '../../api/report'
import Footer from '../../components/Footer/Footer'
import './Report.css'
import { readUser } from '../../auth/session'

/* 6번 건강 종합 리포트 — 건강검진 결과와 DNA 결과를 3단계 눈금(양호·위험·고위험)으로 합쳐 보여 주는 화면 */

/** 0 양호 · 1 위험 · 2 고위험 */
type Level = 0 | 1 | 2
const STEPS = ['양호', '위험', '고위험'] as const
const TONE = ['good', 'caution', 'danger'] as const

/** 생년월일(YYYY-MM-DD)로 오늘 기준 만 나이를 구함 */
function koreanAge(birth: string, today = new Date()) {
  const [y, m, d] = birth.split('-').map(Number)
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  return today.getFullYear() - y - (beforeBirthday ? 1 : 0)
}

// TODO: 리포트 API가 생기면 서버에서 받아오기. 지금은 건강검진 조회와 같은 시연용 인물(김재필)
const PERSON = {
  name: DEMO_PERSON.name,
  age: koreanAge(DEMO_PERSON.birth_date),
  gender: DEMO_PERSON.gender === 'M' ? '남성' : '여성',
}

/** 서버 눈금(일반군 1 · 위험군 3 · 고위험군 5)을 화면의 양호 · 위험 · 고위험으로 바꿈 */
const toLevel = (stage: number): Level => (stage >= 5 ? 2 : stage >= 3 ? 1 : 0)

/** "FTO rs9939609 AT" 같은 유전자 코드. 유전자 이름은 앞에 한 번만 나오기도 함 */
const GENE_CODE = /(?:([A-Za-z0-9]+)\s+)?(rs\d+)(?:\s+([ACGT]{2}))?/g

type GeneCode = { gene: string; rs: string; genotype?: string }

/**
 * 서버의 DNA 설명(코드가 섞인 문장)을
 * 오른쪽에 보여 줄 짧은 설명 줄과 왼쪽 아래에 모아 둘 코드로 나눔
 */
function splitDnaSummary(summary: string | null) {
  if (!summary)
    return {
      lines: ['유전적 특징에 대한 근거 정보 없음'],
      codes: [] as GeneCode[],
    }

  const lines: string[] = []
  const codes: GeneCode[] = []

  for (const raw of summary.split(/(?<=\.)\s+/)) {
    const sentence = raw.replace(/\.$/, '').trim()
    if (!sentence) continue

    let gene = ''
    const found: GeneCode[] = []
    for (const m of sentence.matchAll(GENE_CODE)) {
      gene = m[1] ?? gene
      found.push({ gene, rs: m[2], genotype: m[3] })
    }
    codes.push(...found)

    // 코드가 없는 문장(예: "효과 크기는 작음")은 그대로
    if (!found.length) {
      lines.push(sentence)
      continue
    }

    const name = found[0].gene || '일부 유전자'
    const type = sentence.match(/ε\d\/ε\d/)?.[0]
    const e4 = sentence.match(/ε4 대립유전자 (\d)개 보유/)?.[1]
    const topic = sentence.match(/([가-힣]+) 관련 위험 대립유전자/)?.[1]

    if (type) {
      lines.push(`${name} ${type} 유형${e4 ? ` (ε4 ${e4}개 보유)` : ''}`)
    } else if (sentence.includes('미보유')) {
      lines.push(`${name} 위험 유전자 없음`)
    } else if (sentence.includes('보유')) {
      const where = found.length > 1 ? ` (${found.length}곳)` : ''
      const weak = sentence.includes('약한 위험') ? ' · 약한 위험 신호' : ''
      lines.push(`${name}${topic ? ` ${topic} 관련` : ''} 위험 유전자 보유${where}${weak}`)
    } else {
      // 그 밖의 문장은 코드만 빼고 유전자 이름은 남김
      lines.push(
        sentence
          .replace(GENE_CODE, (_, g?: string) => g ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
    }
  }

  return { lines, codes }
}

/** 같은 유전자가 이어지면 이름은 첫 코드에만 붙여 한 줄을 짧게 */
const formatCode = (c: GeneCode, k: number, all: GeneCode[]) =>
  [k > 0 && all[k - 1].gene === c.gene ? '' : c.gene, c.rs, c.genotype].filter(Boolean).join(' ')

/** 숫자와 단위(48 mL/min 등)가 줄바꿈으로 갈라지지 않게 붙여 둠 */
const keepUnits = (text: string) => text.replace(/(\d) (?=mL\/min|mg\/dL|mmHg|IU\/L)/g, '$1\u00a0')

type Finding = {
  title: string
  level: Level
  lines: { label: string; text: string }[]
}

/** 건강검진으로 식별된 정보 카드 */
const checkupFinding = (d: ReportDisease): Finding => ({
  title: d.disease,
  level: toLevel(d.checkup_stage),
  lines: [
    { label: '검진 수치', text: d.checkup_values ?? '검진수치 정보 없음' },
    { label: '판정 소견', text: d.checkup_opinion ?? '판정소견 정보 없음' },
  ],
})

/** DNA로 식별된 정보 카드 */
const dnaFinding = (d: ReportDisease): Finding => ({
  title: d.disease,
  level: toLevel(d.dna_stage),
  lines: [
    { label: '검진', text: d.checkup_summary ?? '관련 검진 정보 없음' },
    {
      label: 'DNA',
      text: d.dna_summary ?? '유전적 특징에 대한 근거 정보 없음',
    },
  ],
})

/**
 * 유전자 코드 한 줄. 넘치면 오른쪽으로 밀어서(트랙패드·터치·마우스 드래그) 더 봄.
 * 더 볼 코드가 남아 있으면 끝을 흐리게 해 이어진다는 걸 알려 줌
 */
function CodeSlider({ codes }: { codes: GeneCode[] }) {
  const ref = useRef<HTMLUListElement>(null)
  const drag = useRef<{ x: number; left: number } | null>(null)
  const [edge, setEdge] = useState({ start: false, end: false })

  const updateEdge = () => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }

  useEffect(() => {
    updateEdge()
    window.addEventListener('resize', updateEdge)
    return () => window.removeEventListener('resize', updateEdge)
  }, [codes])

  // 마우스로 잡아 끌기 (터치는 브라우저 기본 스크롤로 동작)
  const onPointerDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return
    drag.current = { x: e.clientX, left: ref.current.scrollLeft }
    ref.current.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    if (!drag.current || !ref.current) return
    ref.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
  }
  const endDrag = () => {
    drag.current = null
  }

  return (
    <ul
      ref={ref}
      className={`report-check-code-list${edge.start ? ' is-start' : ''}${edge.end ? ' is-end' : ''}`}
      onScroll={updateEdge}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {codes.map((c, k, all) => (
        <li key={c.rs}>{formatCode(c, k, all)}</li>
      ))}
    </ul>
  )
}

const ICON = {
  download: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="report-check-icon"
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

/** 양호 · 위험 · 고위험 3칸 막대. 현재 단계까지 칸이 색으로 차고, 그 단계 글자가 같은 색으로 강조됨 */
function Scale({ level, size = 'md' }: { level: Level; size?: 'sm' | 'md' }) {
  return (
    <div
      className={`report-check-scale is-${TONE[level]} is-${size}`}
      role="img"
      aria-label={`3단계 중 ${STEPS[level]}`}
    >
      <div className="report-check-scale-track">
        {STEPS.map((step, k) => (
          <span key={step} className={k <= level ? 'is-on' : undefined} />
        ))}
      </div>
      <div className="report-check-scale-labels" aria-hidden="true">
        {STEPS.map((step, k) => (
          <span key={step} className={k === level ? 'is-on' : undefined}>
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

function FindingCard({ f }: { f: Finding }) {
  return (
    <li className="report-check-finding">
      <h3 className={`report-check-finding-title is-${TONE[f.level]}`}>{f.title}</h3>
      <Scale level={f.level} size="sm" />
      <dl className="report-check-finding-lines">
        {f.lines.map((l) => (
          <div key={l.label}>
            <dt>{l.label}:</dt>
            <dd>{keepUnits(l.text)}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

function ReportCheck() {
  const user = readUser()
  const name = user?.name ?? PERSON.name
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // /report 는 RequireAuth 안쪽이라 보통 로그인 정보가 있음
    if (!user) return
    let ignore = false // 화면을 떠난 뒤 늦게 온 응답은 무시
    fetchReport(user.id)
      .then((data) => {
        if (!ignore) setReport(data)
      })
      .catch((e) => {
        if (!ignore) setError(errorMessage(e, '리포트를 불러오지 못했어요.'))
      })
    return () => {
      ignore = true
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const matrix = report?.matrix ?? []
  const checkupFindings = report?.checkup.map(checkupFinding) ?? []
  const dnaFindings = report?.dna.map(dnaFinding) ?? []
  const status = error || (!report ? '리포트를 불러오는 중이에요.' : '')

  return (
    <div className="report-check">
      <main className="report-check-main">
        {/* ---------- 인적사항 ---------- */}
        <section className="report-check-card report-check-profile">
          <h1 className="report-check-name">
            {name}
            <small>
              님 만 {PERSON.age}세 / {PERSON.gender}
            </small>
          </h1>
          {/* ---------- 다음 단계: 이름 오른쪽 ---------- */}
          <div className="report-check-actions">
            {/* TODO: PDF 생성 기능이 생기면 교체. 지금은 브라우저 인쇄(PDF로 저장) */}
            <button type="button" className="report-check-ghost" onClick={() => window.print()}>
              <Icon d={ICON.download} />
              리포트 PDF 저장
            </button>
            <Link to="/insurance" className="report-check-cta">
              맞춤 보험 설계 보러가기
              <Icon d={ICON.arrow} />
            </Link>
          </div>
        </section>

        {/* ---------- DNA × 건강검진 교차 분석 ---------- */}
        <section className="report-check-card">
          <header className="report-check-card-head">
            <h2>건강검진 결과와 DNA를 종합하여 분석했어요</h2>
            <p>
              선천적 유전 변이(DNA)와 후천적 현재 상태(검진표)를 양호 · 위험 · 고위험 3단계로 교차 분석하여 위험도를
              단계별로 표시합니다.
            </p>
          </header>
          {status && <p className="report-check-metric">{status}</p>}
          <ul className="report-check-matrix">
            {matrix.map((m) => {
              const dna = splitDnaSummary(m.dna_summary)
              return (
                <li key={m.disease} className="report-check-matrix-row">
                  <div className="report-check-matrix-bars">
                    <h3>{m.disease}</h3>
                    <p className="report-check-metric">DNA 선천위험도</p>
                    <Scale level={toLevel(m.dna_stage)} />
                    <p className="report-check-metric">현재 질환 의심도</p>
                    <Scale level={toLevel(m.checkup_stage)} />
                    {dna.codes.length > 0 && (
                      <div className="report-check-codes">
                        <p>분석한 유전자 코드</p>
                        <CodeSlider codes={dna.codes} />
                      </div>
                    )}
                  </div>
                  <dl className="report-check-comment">
                    <div>
                      <dt>건강검진</dt>
                      <dd>{m.checkup_summary ?? '관련 검진 정보 없음'}</dd>
                    </div>
                    <div>
                      <dt>유전 인자</dt>
                      {dna.lines.map((line) => (
                        <dd key={line}>{line}</dd>
                      ))}
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ---------- 출처별 식별 정보 ---------- */}
        <div className="report-check-columns">
          <section className="report-check-card">
            <header className="report-check-card-head">
              <h2>건강검진으로 식별된 정보예요</h2>
            </header>
            <ul className="report-check-findings">
              {checkupFindings.map((f) => (
                <FindingCard key={f.title} f={f} />
              ))}
            </ul>
          </section>

          <section className="report-check-card">
            <header className="report-check-card-head">
              <h2>DNA로 식별된 정보예요</h2>
            </header>
            <ul className="report-check-findings">
              {dnaFindings.map((f) => (
                <FindingCard key={f.title} f={f} />
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ReportCheck
