import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/dna'
import { DEMO_PERSON } from '../../api/healthDemo'
import { fetchReport, type Report, type ReportDisease } from '../../api/report'
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

// TODO: CSV에 종합위험분류 값이 아직 없어서 고정값. 값이 생기면 서버에서 받아오기
/** 종합 건강위험도 */
const TOTAL: Level = 3

/** 서버의 5단계 눈금(1~5)을 화면의 0~4로 바꿈 */
const toLevel = (stage: number) => Math.min(4, Math.max(0, stage - 1)) as Level

/** 위쪽 종합 분석 칸의 설명 줄 */
const matrixComment = (d: ReportDisease) => [
  `건강검진: ${d.checkup_summary ?? '관련 검진 정보 없음'}`,
  `유전 인자: ${d.dna_summary ?? '유전적 특징에 대한 근거 정보 없음'}`,
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

type Finding = { title: string; level: Level; lines: { label: string; text: string }[] }

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
    { label: 'DNA', text: d.dna_summary ?? '유전적 특징에 대한 근거 정보 없음' },
  ],
})

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
          {status && <p className="report-check-metric">{status}</p>}
          <ul className="report-check-matrix">
            {matrix.map((m) => (
              <li key={m.disease} className="report-check-matrix-row">
                <div className="report-check-matrix-bars">
                  <h3>{m.disease}</h3>
                  <p className="report-check-metric">DNA 선천위험도</p>
                  <Scale level={toLevel(m.dna_stage)} />
                  <p className="report-check-metric">현재 질환 의심도</p>
                  <Scale level={toLevel(m.checkup_stage)} />
                </div>
                <p className="report-check-comment">
                  <span>
                    {matrixComment(m).map((line, k) =>
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
