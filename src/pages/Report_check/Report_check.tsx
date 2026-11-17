import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_PERSON } from '../../api/healthDemo'
import Footer from '../../components/Footer/Footer'
import './Report_check.css'

/* 6번 유전자 검사 + 건강이력 결과 리포트 — 건강검진 결과와 DNA 결과를 합쳐 보여 주는 화면 */

type Level = 'good' | 'warn' | 'risk'

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

const SCORE = { value: 68, label: '주의 관리군', level: 'warn' as Level }

/** 건강검진(후천)과 DNA(선천)를 합쳐 본 질환군 */
const MATRIX: { title: string; dna: number; current: number; level: Level; comment: string }[] = [
  {
    title: '뇌혈관 질환',
    dna: 78,
    current: 75,
    level: 'risk',
    comment: '혈압이 경계치예요. 뇌혈관 탄력 저하 유전 인자도 있어요. 뇌질환 특약 보장을 권해요.',
  },
  {
    title: '당뇨병 및 인슐린',
    dna: 65,
    current: 60,
    level: 'warn',
    comment: '공복혈당 148로 당뇨약을 3년째 복용 중이에요. 합병증에 대비한 보장 설계를 권해요.',
  },
  {
    title: '간 및 심혈관',
    dna: 28,
    current: 30,
    level: 'good',
    comment: 'DNA 위험은 낮지만 간수치가 조금 높아요. 절주하고 정기적으로 확인하세요.',
  },
]

type Finding = { title: string; percent: number; level: Level; lines: { label: string; text: string }[] }

const CHECKUP_FINDINGS: Finding[] = [
  {
    title: '신장 질환',
    percent: 82,
    level: 'risk',
    lines: [
      { label: '검진 수치', text: 'eGFR 48 · 크레아티닌 1.62 · 요단백 2+' },
      { label: '판정 소견', text: '신장기능이 떨어졌어요. 신장내과 진료가 필요해요.' },
    ],
  },
  {
    title: '고혈압',
    percent: 72,
    level: 'warn',
    lines: [
      { label: '검진 수치', text: '138 / 88 mmHg (고혈압 전단계)' },
      { label: '판정 소견', text: '혈압이 계속 높아요. 싱겁게 먹고 혈압을 자주 재 보세요.' },
    ],
  },
  {
    title: '간 질환',
    percent: 58,
    level: 'good',
    lines: [
      { label: '검진 수치', text: 'ALT 46 · γ-GTP 78 (AST 38은 정상)' },
      { label: '판정 소견', text: '간수치가 조금 높아요. 절주하고 3개월 뒤 다시 검사하세요.' },
    ],
  },
]

const DNA_FINDINGS: Finding[] = [
  {
    title: '대장암',
    percent: 92,
    level: 'risk',
    lines: [
      { label: '검진', text: '분변잠혈 "양성 (+)", 대장용종 절제 이력' },
      { label: 'DNA', text: '유전성 용종 및 대장암 취약 인자 (92%)' },
    ],
  },
  {
    title: '전립선암',
    percent: 88,
    level: 'risk',
    lines: [
      { label: '검진', text: '국가검진 미포함 항목 (PSA 검사 권장)' },
      { label: 'DNA', text: 'HOXB13 · BRCA2 유전자 변이 감수성 취약 (88%)' },
    ],
  },
  {
    title: '알츠하이머 (치매)',
    percent: 76,
    level: 'warn',
    lines: [
      { label: '검진', text: '인지기능 검사 대상 연령 전 (만 66세부터 시행)' },
      { label: 'DNA', text: 'APOE-ε4 대립유전자 보유 위험군' },
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

/** 문장이 끝날 때마다 줄을 바꿔서, 한 줄에 한 문장씩 보여 줌 */
function Sentences({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  return (
    <>
      {sentences.map((sentence) => (
        <span key={sentence} className="report-check-sentence">
          {sentence}
        </span>
      ))}
    </>
  )
}

/** 퍼센트 막대. 처음 그려질 때 0에서 차오름 */
function Bar({ percent, level }: { percent: number; level: Level }) {
  return (
    <span className={`report-check-bar is-${level}`} aria-hidden="true">
      <span style={{ width: `${percent}%` }} />
    </span>
  )
}

/** 종합 점수 도넛 */
function ScoreRing({ value, level }: { value: number; level: Level }) {
  const r = 42
  const circumference = 2 * Math.PI * r
  return (
    <div className={`report-check-ring is-${level}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="report-check-ring-track" cx="50" cy="50" r={r} />
        <circle
          className="report-check-ring-value"
          cx="50"
          cy="50"
          r={r}
          style={{ '--dash': `${(value / 100) * circumference} ${circumference}` } as CSSProperties}
        />
      </svg>
      {/* 숫자와 "점"을 한 줄로 묶어 도넛 정가운데에 둠 */}
      <span className="report-check-ring-text">
        <span>
          <b>{value}</b>점
        </span>
      </span>
    </div>
  )
}

function FindingCard({ f }: { f: Finding }) {
  return (
    <li className="report-check-finding">
      <div className="report-check-finding-head">
        <span className={`report-check-finding-title is-${f.level}`}>{f.title}</span>
        <b className={`report-check-tone is-${f.level}`}>{f.percent}%</b>
      </div>
      <Bar percent={f.percent} level={f.level} />
      <dl className="report-check-finding-lines">
        {f.lines.map((l) => (
          <div key={l.label}>
            <dt>{l.label}</dt>
            <dd>
              <Sentences text={l.text} />
            </dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

function ReportCheck() {
  return (
    <div className="report-check">
      <main className="report-check-main">
        {/* ---------- 인적사항 · 종합 점수 ---------- */}
        <section className="report-check-card report-check-profile">
          <h1 className="report-check-name">
            {PERSON.name}
            <small>
              님 만 {PERSON.age}세 / {PERSON.gender}
            </small>
          </h1>
          <div className="report-check-score">
            <ScoreRing value={SCORE.value} level={SCORE.level} />
            <div>
              <p className={`report-check-score-label report-check-tone is-${SCORE.level}`}>{SCORE.label}</p>
              <p className="report-check-score-title">종합 건강위험도 {SCORE.value}점</p>
            </div>
          </div>
        </section>

        {/* ---------- DNA × 건강검진 교차 분석 ---------- */}
        <section className="report-check-card">
          <header className="report-check-card-head">
            <h2>건강검진 결과와 DNA를 종합하여 분석했어요</h2>
            <p>
              선천적 유전 변이(DNA)와 후천적 현재 상태(검진표)를 2차원 교차 매트릭스로 정밀 분석하여 실질 발병
              확률을 추산합니다.
            </p>
          </header>
          <ul className="report-check-matrix">
            {MATRIX.map((m) => (
              <li key={m.title} className="report-check-matrix-row">
                <div className="report-check-matrix-bars">
                  <h3>{m.title}</h3>
                  <div className="report-check-metric">
                    <span>DNA 선천위험도</span>
                    <b className={`report-check-tone is-${m.level}`}>{m.dna}%</b>
                  </div>
                  <Bar percent={m.dna} level={m.level} />
                  <div className="report-check-metric">
                    <span>현재 질환 의심도</span>
                    <b className={`report-check-tone is-${m.level}`}>{m.current}%</b>
                  </div>
                  <Bar percent={m.current} level={m.level} />
                </div>
                <p className="report-check-comment">
                  <span>
                    <Sentences text={m.comment} />
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
              <h2>건강검진으로 식별된 정보에요</h2>
            </header>
            <ul className="report-check-findings">
              {CHECKUP_FINDINGS.map((f) => (
                <FindingCard key={f.title} f={f} />
              ))}
            </ul>
          </section>

          <section className="report-check-card">
            <header className="report-check-card-head">
              <h2>DNA로 식별된 정보에요</h2>
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
