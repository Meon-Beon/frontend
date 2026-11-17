import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_PERSON } from '../../api/healthDemo'
import Footer from '../../components/Footer/Footer'
import './Report.css'
import { readUser } from '../../auth/session'

/* 6번 건강 종합 리포트 — 건강검진 결과와 DNA 결과를 5단계 눈금(안전~위험)으로 합쳐 보여 주는 화면 */

/** 0 안전 · 1 양호 · 2 보통 · 3 경계 · 4 위험 */
type Level = 0 | 1 | 2 | 3 | 4
const STEPS = ['안전', '양호', '보통', '경계', '위험'] as const
const TONE = ['safe', 'good', 'normal', 'caution', 'danger'] as const

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

/** 종합 건강위험도 */
const TOTAL: Level = 3

/** 건강검진(후천)과 DNA(선천)를 합쳐 본 질환군. comment 는 줄 단위, 빈 문자열은 한 줄 띄움 */
const MATRIX: { title: string; dna: Level; current: Level; comment: string[] }[] = [
  {
    title: '뇌혈관 질환',
    dna: 4,
    current: 3,
    comment: [
      '건강검진: 혈압 수치 경계',
      '유전 인자: 복합 작용하여 뇌출혈·뇌경색 발병 위험 상존',
      '',
      '집중적인 예방 및 선제적 뇌질환 특약 보장이 권장',
    ],
  },
  {
    title: '당뇨병 및 인슐린',
    dna: 3,
    current: 2,
    comment: [
      '건강검진: 공복혈당 관리군 수치',
      '유전 인자: 인슐린 감수성 저하',
      '',
      '식이 개선 미이행 시 합병증 위험, 선제적 보장 설계 권장',
    ],
  },
  {
    title: '간 및 심혈관',
    dna: 0,
    current: 1,
    comment: [
      '건강검진, 유전 인자: 모두 양호한 안전군',
      '',
      '생활습관 변화에 따른 혈관 탄력도 저하 방지 목적,',
      '정기적 추적관찰을 유지',
    ],
  },
]

/** 숫자와 단위(48 mL/min 등)가 줄바꿈으로 갈라지지 않게 붙여 둠 */
const keepUnits = (text: string) => text.replace(/(\d) (?=mL\/min|mg\/dL|mmHg|IU\/L)/g, '$1\u00a0')

/** "건강검진: …" 처럼 앞에 이름이 있는 줄은 이름을 굵게 */
function CommentLine({ line }: { line: string }) {
  const at = line.indexOf(': ')
  if (at < 0) return <span className="report-check-sentence">{line}</span>
  return (
    <span className="report-check-sentence">
      <b>{line.slice(0, at + 1)}</b> {line.slice(at + 2)}
    </span>
  )
}

type Finding = { title: string; level: Level; lines: { label: string; text: ReactNode }[] }

/** 문구 안에서 위험색으로 강조할 부분 */
const Hot = ({ children }: { children: ReactNode }) => <b className="report-check-hot">{children}</b>

const CHECKUP_FINDINGS: Finding[] = [
  {
    title: '신장 질환 (만성신장기능 저하 / 요단백)',
    level: 4,
    lines: [
      {
        label: '검진 수치',
        text: (
          <>
            e-GFR 48{'\u00a0'}mL/min (신장기능 저하), 요단백 <Hot>양성{'\u00a0'}(2+)</Hot>, 크레아티닌 1.62{'\u00a0'}mg/dL
          </>
        ),
      },
      { label: '판정 소견', text: '사구체 여과율 저하 및 단백뇨 지속 관찰, 정밀 신장내과 진료 필요' },
    ],
  },
  {
    title: '고혈압 (혈압 관리군 / 혈관 압력 상승)',
    level: 3,
    lines: [
      { label: '검진 수치', text: '수축기 138 mmHg / 이완기 88 mmHg (고혈압 전단계~1기 경계)' },
      { label: '판정 소견', text: '수축기 혈압 지속 상승 소견, 식이 저염식 및 주기적 혈압 모니터링 요망' },
    ],
  },
  {
    title: '간장 질환 (간기능 수치 경미 상승)',
    level: 2,
    lines: [
      { label: '검진 수치', text: 'AST 38 IU/L, ALT 46 IU/L, γ-GTP 78 IU/L (경미한 간기능 이상)' },
      { label: '판정 소견', text: '음주 및 대사 관련 간수치 소폭 상승, 생활습관 개선 및 3개월 후 재검 권고' },
    ],
  },
]

const DNA_FINDINGS: Finding[] = [
  {
    title: '유방암',
    level: 4,
    lines: [
      { label: '검진', text: '유방 촬영 치밀유방 소견' },
      { label: 'DNA', text: 'BRCA 유전자 변이 및 감수성 취약 (5단계 위험군)' },
    ],
  },
  {
    title: '대장암',
    level: 4,
    lines: [
      {
        label: '검진',
        text: (
          <>
            분변잠혈 <Hot>"양성 (+)"</Hot>
          </>
        ),
      },
      { label: 'DNA', text: '유전성 용종 및 대장암 취약 인자 5단계 위험군' },
    ],
  },
  {
    title: '알츠하이머 (치매)',
    level: 3,
    lines: [
      { label: '검진', text: '인지기능 간이선별 주의군' },
      { label: 'DNA', text: 'APOE-ε4 대립유전자 보유 경계군' },
    ],
  },
]

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

/** 안전 · 양호 · 보통 · 경계 · 위험 5칸 막대. 현재 단계까지 칸이 색으로 차고, 그 단계 글자가 같은 색으로 강조됨 */
function Scale({ level, size = 'md' }: { level: Level; size?: 'sm' | 'md' }) {
  return (
    <div className={`report-check-scale is-${TONE[level]} is-${size}`} role="img" aria-label={`5단계 중 ${STEPS[level]}`}>
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
            <dd>{typeof l.text === 'string' ? keepUnits(l.text) : l.text}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

function ReportCheck() {
  const name = readUser()?.name ?? PERSON.name

  return (
    <div className="report-check">
      <main className="report-check-main">
        {/* ---------- 인적사항 · 종합 건강위험도 ---------- */}
        <section className="report-check-card report-check-profile">
          <h1 className="report-check-name">
            {name}
            <small>
              님 만 {PERSON.age}세 / {PERSON.gender}
            </small>
          </h1>
          <div className="report-check-total">
            <p>종합 건강위험도</p>
            <Scale level={TOTAL} size="sm" />
          </div>
        </section>

        {/* ---------- DNA × 건강검진 교차 분석 ---------- */}
        <section className="report-check-card">
          <header className="report-check-card-head">
            <h2>건강검진 결과와 DNA를 종합하여 분석했어요</h2>
            <p>
              선천적 유전 변이(DNA)와 후천적 현재 상태(검진표)를 1단계(안전)~5단계(위험) 정밀 5점 척도 눈금으로 교차
              분석하여 위험도를 단계별로 표시합니다.
            </p>
          </header>
          <ul className="report-check-matrix">
            {MATRIX.map((m) => (
              <li key={m.title} className="report-check-matrix-row">
                <div className="report-check-matrix-bars">
                  <h3>{m.title}</h3>
                  <p className="report-check-metric">DNA 선천위험도</p>
                  <Scale level={m.dna} />
                  <p className="report-check-metric">현재 질환 의심도</p>
                  <Scale level={m.current} />
                </div>
                <p className="report-check-comment">
                  <span>
                    {m.comment.map((line, k) =>
                      line ? (
                        <CommentLine key={k} line={line} />
                      ) : (
                        <span key={k} className="report-check-gap" aria-hidden="true" />
                      ),
                    )}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- 출처별 식별 정보 ---------- */}
        <div className="report-check-columns">
          <section className="report-check-card">
            <header className="report-check-card-head">
              <h2>건강검진으로 식별된 정보예요</h2>
            </header>
            <ul className="report-check-findings">
              {CHECKUP_FINDINGS.map((f) => (
                <FindingCard key={f.title} f={f} />
              ))}
            </ul>
          </section>

          <section className="report-check-card">
            <header className="report-check-card-head">
              <h2>DNA로 식별된 정보예요</h2>
            </header>
            <ul className="report-check-findings">
              {DNA_FINDINGS.map((f) => (
                <FindingCard key={f.title} f={f} />
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- 다음 단계 ---------- */}
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
      </main>

      <Footer />
    </div>
  )
}

export default ReportCheck
